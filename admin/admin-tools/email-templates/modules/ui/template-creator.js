/**
 * template-creator.js
 * Handle new template creation
 */

import { state } from '../core/state.js';
import { showLoading, showSuccess, showError } from './notifications.js';
import { loadTemplates, selectTemplate } from '../firebase/template-operations.js';

/* global db, firebase */

/**
 * Create a new email template
 */
export async function createTemplate(templateData) {
    try {
        showLoading(true);
        
        // Check if template ID already exists
        const existingDoc = await db.collection('emailTemplates').doc(templateData.id).get();
        if (existingDoc.exists) {
            throw new Error('A template with this ID already exists');
        }
        
        // Create initial version
        const initialVersion = {
            version: 1,
            createdAt: new Date(),
            createdBy: state.currentUser.email,
            subject: 'New Template - Add Subject',
            htmlTemplate: '<p>Start editing your template here...</p>',
            textTemplate: 'Start editing your plain text template here...',
            changeNote: 'Initial template creation'
        };
        
        // Create new template document
        const newTemplate = {
            name: templateData.name,
            category: templateData.category,
            type: templateData.type,
            description: templateData.description || '',
            subject: initialVersion.subject,
            htmlTemplate: initialVersion.htmlTemplate,
            textTemplate: initialVersion.textTemplate,
            active: false, // Start as inactive
            variables: [], // Will be populated as user adds them
            currentVersion: 1,
            versions: [initialVersion],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: state.currentUser.email,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: state.currentUser.email
        };
        
        // Save to Firestore
        await db.collection('emailTemplates').doc(templateData.id).set(newTemplate);
        
        // Reload templates list
        await loadTemplates();
        
        // Select the newly created template
        await selectTemplate(templateData.id);
        
        showSuccess('Template created successfully!');
        showLoading(false);
        
        return true;
    } catch (error) {
        console.error('Error creating template:', error);
        showError('Failed to create template: ' + error.message);
        showLoading(false);
        return false;
    }
}

/**
 * Show the create template modal
 */
export function showCreateTemplateModal() {
    document.getElementById('add-template-modal').classList.add('active');
    // Reset form
    document.getElementById('add-template-form').reset();
}

/**
 * Setup create template form handler
 */
export function setupCreateTemplateForm() {
    document.getElementById('add-template-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const templateData = {
            id: document.getElementById('new-template-id').value.trim(),
            name: document.getElementById('new-template-name').value.trim(),
            category: document.getElementById('new-template-category').value,
            type: document.getElementById('new-template-type').value,
            description: document.getElementById('new-template-description').value.trim()
        };
        
        const success = await createTemplate(templateData);
        
        if (success) {
            // Close modal
            document.getElementById('add-template-modal').classList.remove('active');
        }
    });
}
