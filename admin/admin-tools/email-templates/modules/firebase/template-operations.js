/**
 * template-operations.js
 * Firestore operations for email templates
 */

import { state, setCurrentTemplate, setTemplates, setHasUnsavedChanges } from '../core/state.js';
import { showLoading, showSuccess, showError } from '../ui/notifications.js';
import { updateSaveButton } from '../ui/save-button.js';
import { renderTemplateList } from '../ui/template-list.js';
import { loadTemplateIntoEditor } from '../ui/template-editor.js';

// db is globally available from firebase-config.js
/* global db, firebase */

/**
 * Load all email templates from Firestore
 */
export async function loadTemplates() {
    try {
        showLoading(true);
        
        const snapshot = await db.collection('emailTemplates').get();
        
        const templates = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Sort in JavaScript instead of using Firestore orderBy (avoids index requirement)
        templates.sort((a, b) => {
            // Sort by category first
            const categoryCompare = (a.category || '').localeCompare(b.category || '');
            if (categoryCompare !== 0) return categoryCompare;
            
            // Then by name
            return (a.name || '').localeCompare(b.name || '');
        });
        
        setTemplates(templates);
        renderTemplateList();
        showLoading(false);
    } catch (error) {
        console.error('Error loading templates:', error);
        showError('Failed to load templates: ' + error.message);
        showLoading(false);
    }
}

/**
 * Select and load a template for editing
 */
export async function selectTemplate(templateId) {
    // Check for unsaved changes
    if (state.hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Do you want to discard them?')) {
            return;
        }
    }
    
    try {
        showLoading(true);
        
        const doc = await db.collection('emailTemplates').doc(templateId).get();
        
        if (!doc.exists) {
            throw new Error('Template not found');
        }
        
        setCurrentTemplate({
            id: doc.id,
            ...doc.data()
        });
        
        loadTemplateIntoEditor();
        
        // Update UI
        document.getElementById('no-selection-state').style.display = 'none';
        document.getElementById('editor-view').style.display = 'flex';
        
        // Update active state in list
        document.querySelectorAll('.template-item').forEach(item => {
            item.classList.toggle('active', item.dataset.templateId === templateId);
        });
        
        setHasUnsavedChanges(false);
        updateSaveButton();
        
        showLoading(false);
    } catch (error) {
        console.error('Error loading template:', error);
        showError('Failed to load template: ' + error.message);
        showLoading(false);
    }
}

/**
 * Save template changes
 */
export async function saveTemplate() {
    if (!state.currentTemplate) return;
    
    try {
        // Clear unsaved changes flag immediately to prevent confirmation dialog
        setHasUnsavedChanges(false);
        updateSaveButton();
        
        showLoading(true);
        
        // Get current values
        const subject = document.getElementById('email-subject').value.trim();
        
        // Get HTML content from the active editor
        let htmlTemplate;
        if (state.currentEditorMode === 'visual' && state.visualEditor) {
            htmlTemplate = state.visualEditor.getContent();
            // Also sync to code editor
            state.htmlEditor.setValue(htmlTemplate);
        } else {
            htmlTemplate = state.htmlEditor.getValue();
            // Also sync to visual editor if it exists
            if (state.visualEditor) {
                state.visualEditor.setContent(htmlTemplate);
            }
        }
        
        const textTemplate = document.getElementById('text-template').value;
        const active = document.getElementById('template-active').checked;
        
        // Validate
        if (!subject) {
            throw new Error('Subject line is required');
        }
        
        if (!htmlTemplate) {
            throw new Error('HTML template is required');
        }
        
        // Validate template syntax (using global function from template-renderer.js)
        if (typeof validateTemplate === 'function') {
            const htmlValidation = validateTemplate(htmlTemplate);
            if (!htmlValidation.valid) {
                throw new Error('HTML template has errors:\n' + htmlValidation.errors.join('\n'));
            }
        }
        
        // Create new version
        const newVersion = {
            version: (state.currentTemplate.currentVersion || 0) + 1,
            createdAt: new Date(), // Use regular Date for arrays
            createdBy: state.currentUser.email,
            subject,
            htmlTemplate,
            textTemplate,
            changeNote: 'Manual edit via admin tool'
        };
        
        // Update document
        const updateData = {
            subject,
            htmlTemplate,
            textTemplate,
            active,
            currentVersion: newVersion.version,
            versions: firebase.firestore.FieldValue.arrayUnion(newVersion),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: state.currentUser.email
        };
        
        await db.collection('emailTemplates').doc(state.currentTemplate.id).update(updateData);
        
        // Reload template
        await selectTemplate(state.currentTemplate.id);
        await loadTemplates();
        
        setHasUnsavedChanges(false);
        updateSaveButton();
        
        showSuccess('Template saved successfully!');
        showLoading(false);
    } catch (error) {
        console.error('Error saving template:', error);
        showError('Failed to save template: ' + error.message);
        showLoading(false);
    }
}

/**
 * Delete template
 */
export async function deleteTemplate() {
    if (!state.currentTemplate) return;
    
    // Show delete confirmation modal
    const modal = document.getElementById('delete-template-modal');
    const infoDiv = document.getElementById('delete-template-info');
    
    // Populate modal with template info
    infoDiv.innerHTML = `
        <strong>${state.currentTemplate.name}</strong>
        <div style="font-size: 0.85rem; color: #666; margin-top: 4px;">
            ID: ${state.currentTemplate.id}<br>
            Category: ${state.currentTemplate.category || 'N/A'}
        </div>
    `;
    
    modal.classList.add('active');
}

/**
 * Confirm and execute template deletion
 */
export async function confirmDeleteTemplate() {
    if (!state.currentTemplate) return;
    
    try {
        showLoading(true);
        
        await db.collection('emailTemplates').doc(state.currentTemplate.id).delete();
        
        showSuccess('Template deleted successfully!');
        
        // Clear current template
        setCurrentTemplate(null);
        
        // Update UI
        document.getElementById('editor-view').style.display = 'none';
        document.getElementById('no-selection-state').style.display = 'flex';
        
        // Close modal
        document.getElementById('delete-template-modal').classList.remove('active');
        
        // Reload templates list
        await loadTemplates();
        
        showLoading(false);
    } catch (error) {
        console.error('Error deleting template:', error);
        showError('Failed to delete template: ' + error.message);
        showLoading(false);
    }
}
