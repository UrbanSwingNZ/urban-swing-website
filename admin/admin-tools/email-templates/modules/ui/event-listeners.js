/**
 * event-listeners.js
 * Setup all event listeners for the application
 */

import { state, setHasUnsavedChanges } from '../core/state.js';
import { switchEditorMode } from '../core/editor.js';
import { loadTemplates, saveTemplate } from '../firebase/template-operations.js';
import { switchTab, switchPreviewTab } from './tabs.js';
import { showPreview } from './preview.js';
import { sendTestEmail } from './test-send.js';
import { showVersionHistory } from './version-history.js';
import { updateSaveButton } from './save-button.js';
import { showCreateTemplateModal, setupCreateTemplateForm } from './template-creator.js';

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
    
    // Preview button
    document.getElementById('preview-btn').addEventListener('click', showPreview);
    
    // Test send button - sends directly without modal
    document.getElementById('test-send-btn').addEventListener('click', sendTestEmail);
    
    // History button
    document.getElementById('history-btn').addEventListener('click', showVersionHistory);
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });
    
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
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
    
    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (state.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}
