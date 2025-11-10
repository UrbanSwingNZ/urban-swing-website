/**
 * test-send.js
 * Test email sending functionality
 */

import { state } from '../core/state.js';
import { showLoading, showSuccess, showError } from './notifications.js';

/* global db, firebase, getSampleData, renderTemplate, getVariablesFromForm */

/**
 * Show test send modal
 */
export function showTestSendModal() {
    if (!state.currentTemplate) return;
    
    const modal = document.getElementById('test-send-modal');
    const container = document.getElementById('test-send-variables');
    
    // Generate variable inputs
    const sampleData = getSampleData(state.currentTemplate.id);
    
    let html = '';
    if (state.currentTemplate.variables && state.currentTemplate.variables.length > 0) {
        state.currentTemplate.variables.forEach(variable => {
            const value = sampleData[variable.name] !== undefined ? sampleData[variable.name] : (variable.example || '');
            html += `
                <div class="form-group">
                    <label>${variable.name} ${variable.required ? '*' : ''}</label>
                    <input type="text" data-variable="${variable.name}" value="${value}" placeholder="${variable.description || ''}">
                </div>
            `;
        });
    } else {
        html = '<p style="color: #999;">No variables for this template</p>';
    }
    
    container.innerHTML = html;
    modal.classList.add('active');
}

/**
 * Send test email
 */
export async function sendTestEmail() {
    if (!state.currentTemplate) return;
    
    try {
        showLoading(true);
        
        const subject = document.getElementById('email-subject').value;
        const htmlTemplate = state.htmlEditor.getValue();
        const textTemplate = document.getElementById('text-template').value;
        
        // Get variable values
        const variables = getVariablesFromForm(document.getElementById('test-send-variables'));
        
        // Render templates
        const renderedSubject = renderTemplate(subject, variables);
        const renderedHtml = renderTemplate(htmlTemplate, variables);
        const renderedText = renderTemplate(textTemplate, variables);
        
        // Call cloud function to send email
        const sendEmail = firebase.functions().httpsCallable('sendTestEmail');
        const result = await sendEmail({
            to: 'dance@urbanswing.co.nz',
            subject: `[TEST] ${renderedSubject}`,
            html: renderedHtml,
            text: renderedText,
            templateId: state.currentTemplate.id
        });
        
        document.getElementById('test-send-modal').classList.remove('active');
        showSuccess('Test email sent to dance@urbanswing.co.nz');
        showLoading(false);
    } catch (error) {
        console.error('Error sending test email:', error);
        showError('Failed to send test email: ' + error.message);
        showLoading(false);
    }
}
