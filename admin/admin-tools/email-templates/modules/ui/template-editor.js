/**
 * template-editor.js
 * Load template data into editor
 */

import { state, setHasUnsavedChanges } from '../core/state.js';
import { updateSaveButton } from './save-button.js';
import { formatDate } from '../utils/format.js';
import { insertVariable } from '../core/editor.js';

/**
 * Load current template data into editor
 */
export function loadTemplateIntoEditor() {
    if (!state.currentTemplate) return;
    
    const isBaseTemplate = state.currentTemplate.id === '_base-template';
    
    // Toggle toolbar visibility
    document.getElementById('regular-toolbar').style.display = isBaseTemplate ? 'none' : 'flex';
    document.getElementById('base-template-toolbar').style.display = isBaseTemplate ? 'flex' : 'none';
    
    // Update toolbar
    document.getElementById('template-name').textContent = state.currentTemplate.name;
    const statusBadge = document.getElementById('template-status');
    statusBadge.textContent = state.currentTemplate.active ? 'Active' : 'Inactive';
    statusBadge.className = `status-badge ${state.currentTemplate.active ? 'active' : 'inactive'}`;
    
    // Load content into both editors
    document.getElementById('email-subject').value = state.currentTemplate.subject || '';
    const htmlContent = state.currentTemplate.htmlTemplate || '';
    
    // Update CodeMirror
    state.htmlEditor.setValue(htmlContent);
    
    // Update TinyMCE (if initialized)
    if (state.visualEditor) {
        state.visualEditor.setContent(htmlContent);
    }
    
    document.getElementById('text-template').value = state.currentTemplate.textTemplate || '';
    document.getElementById('template-active').checked = state.currentTemplate.active !== false;
    
    // Load settings
    document.getElementById('template-id').textContent = state.currentTemplate.id;
    document.getElementById('template-category').textContent = state.currentTemplate.category || 'N/A';
    document.getElementById('template-type').textContent = state.currentTemplate.type || 'N/A';
    document.getElementById('template-created').textContent = formatDate(state.currentTemplate.createdAt);
    document.getElementById('template-updated').textContent = formatDate(state.currentTemplate.updatedAt);
    document.getElementById('template-updated-by').textContent = state.currentTemplate.updatedBy || 'N/A';
    
    // Load variables
    renderVariablesList();
}

/**
 * Render variables list
 */
export function renderVariablesList() {
    const container = document.getElementById('variables-list');
    
    if (!state.currentTemplate.variables || state.currentTemplate.variables.length === 0) {
        container.innerHTML = '<p style="color: #999;">No variables defined</p>';
        return;
    }
    
    let html = '';
    state.currentTemplate.variables.forEach(variable => {
        html += `
            <div class="variable-item" data-variable="${variable.name}">
                <div class="variable-name">\${${variable.name}}</div>
                <div class="variable-description">${variable.description || ''}</div>
                ${variable.example ? `<div class="variable-example">Example: ${variable.example}</div>` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add click to insert
    container.querySelectorAll('.variable-item').forEach(item => {
        item.addEventListener('click', () => {
            const variableName = item.dataset.variable;
            insertVariable(variableName);
        });
    });
}
