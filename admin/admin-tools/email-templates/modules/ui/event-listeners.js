/**
 * event-listeners.js
 * Setup all event listeners for the application
 */

import { state, setHasUnsavedChanges } from '../core/state.js';
import { switchEditorMode } from '../core/editor.js';
import { loadTemplates, saveTemplate, deleteTemplate, confirmDeleteTemplate, updateBaseTemplate, confirmUpdateBaseTemplate } from '../firebase/template-operations.js';
import { switchTab, switchPreviewTab } from './tabs.js';
import { showPreview } from './preview.js';
import { sendTestEmail } from './test-send.js';
import { showVersionHistory } from './version-history.js';
import { updateSaveButton } from './save-button.js';
import { showCreateTemplateModal, setupCreateTemplateForm } from './template-creator.js';
import { showAddVariableModal, closeVariableModal, saveVariable, handleVariableSelection, showInsertVariableModal, closeInsertVariableModal } from './variable-manager.js';

/* global firebase */

/**
 * Setup event listeners
 */
export function setupEventListeners() {
    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        firebase.auth().signOut();
    });
    
    // Refresh templates
    document.getElementById('refresh-templates-btn').addEventListener('click', loadTemplates);
    
    // Add new template
    document.getElementById('add-template-btn').addEventListener('click', showCreateTemplateModal);
    
    // Setup create template form
    setupCreateTemplateForm();
    
    // Cancel button in add template modal
    document.getElementById('cancel-template-btn').addEventListener('click', () => {
        document.getElementById('add-template-modal').classList.remove('active');
    });
    
    // Variable management
    document.getElementById('add-variable-btn').addEventListener('click', showAddVariableModal);
    document.getElementById('cancel-variable-btn').addEventListener('click', closeVariableModal);
    document.getElementById('variable-form').addEventListener('submit', saveVariable);
    document.getElementById('variable-select').addEventListener('change', handleVariableSelection);
    
    // Insert Variable modal
    document.getElementById('insert-variable-btn').addEventListener('click', showInsertVariableModal);
    document.getElementById('insert-variable-text-btn').addEventListener('click', showInsertVariableModal);
    document.getElementById('close-insert-variable-modal').addEventListener('click', closeInsertVariableModal);
    
    // Variable search in Insert Variable modal
    let variableSearchTimeout;
    document.getElementById('variable-search').addEventListener('input', async (e) => {
        const searchTerm = e.target.value;
        
        // Debounce the search
        clearTimeout(variableSearchTimeout);
        variableSearchTimeout = setTimeout(async () => {
            const { renderInsertVariablesList } = await import('./variable-manager.js');
            renderInsertVariablesList(searchTerm);
        }, 300);
    });
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Editor mode tabs
    document.querySelectorAll('.editor-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => switchEditorMode(btn.dataset.mode));
    });
    
    // Save button
    document.getElementById('save-btn').addEventListener('click', saveTemplate);
    
    // Delete button
    document.getElementById('delete-btn').addEventListener('click', deleteTemplate);
    
    // Preview button
    document.getElementById('preview-btn').addEventListener('click', showPreview);
    
    // Test send button - sends directly without modal
    document.getElementById('test-send-btn').addEventListener('click', sendTestEmail);
    
    // History button
    document.getElementById('history-btn').addEventListener('click', showVersionHistory);
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            modal.classList.remove('active');
            modal.style.display = 'none';
            
            // If it's the variable modal, call the close function
            if (modal.id === 'variable-modal') {
                closeVariableModal();
            }
            
            // If it's the insert variable modal, call the close function
            if (modal.id === 'insert-variable-modal') {
                closeInsertVariableModal();
            }
        });
    });
    
    // Delete modal buttons
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDeleteTemplate);
    document.getElementById('cancel-delete-btn').addEventListener('click', () => {
        document.getElementById('delete-template-modal').classList.remove('active');
    });
    
    // Base template buttons
    document.getElementById('create-from-base-btn').addEventListener('click', showCreateTemplateModal);
    document.getElementById('update-base-btn').addEventListener('click', updateBaseTemplate);
    
    // Update base template modal buttons
    document.getElementById('confirm-update-base-btn').addEventListener('click', confirmUpdateBaseTemplate);
    document.getElementById('cancel-update-base-btn').addEventListener('click', () => {
        document.getElementById('update-base-modal').classList.remove('active');
    });
    
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
                
                // If it's the variable modal, call the close function
                if (modal.id === 'variable-modal') {
                    closeVariableModal();
                }
                
                // If it's the insert variable modal, call the close function
                if (modal.id === 'insert-variable-modal') {
                    closeInsertVariableModal();
                }
            }
        });
    });
    
    // Preview tabs
    document.querySelectorAll('.preview-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchPreviewTab(btn.dataset.previewTab));
    });
    
    // Track changes in form fields
    document.getElementById('email-subject').addEventListener('input', () => {
        setHasUnsavedChanges(true);
        updateSaveButton();
    });
    
    document.getElementById('text-template').addEventListener('input', () => {
        setHasUnsavedChanges(true);
        updateSaveButton();
    });
    
    document.getElementById('template-active').addEventListener('change', () => {
        setHasUnsavedChanges(true);
        updateSaveButton();
    });
    
    // Variable management
    document.getElementById('add-variable-btn').addEventListener('click', showAddVariableModal);
    document.getElementById('cancel-variable-btn').addEventListener('click', closeVariableModal);
    document.getElementById('variable-form').addEventListener('submit', saveVariable);
    
    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (state.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}
