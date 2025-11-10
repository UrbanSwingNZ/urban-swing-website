/**
 * test-send.js
 * Test email sending functionality
 */

import { state } from '../core/state.js';
import { showLoading, showSuccess, showError } from './notifications.js';

/* global renderTemplate, functions */

/**
 * Send test email directly using selected student data
 */
export async function sendTestEmail() {
    if (!state.currentTemplate) {
        showError('No template selected.');
        return;
    }
    
    try {
        showLoading(true);
        
        // Get selected student
        const previewStudentSelect = document.getElementById('preview-student-select');
        const selectedStudentId = previewStudentSelect?.value;
        
        if (!selectedStudentId || selectedStudentId === '') {
            showError('Please select a student to send a test email.');
            showLoading(false);
            return;
        }
        
        // Get student data
        const { getStudentDataForPreview } = await import('../firebase/student-operations.js');
        const variables = await getStudentDataForPreview(selectedStudentId);
        
        // Get current template content
        const subject = document.getElementById('email-subject').value;
        let htmlTemplate;
        if (state.currentEditorMode === 'visual' && state.visualEditor) {
            htmlTemplate = state.visualEditor.getContent();
        } else {
            htmlTemplate = state.htmlEditor.getValue();
        }
        const textTemplate = document.getElementById('text-template').value;
        
        // Render templates
        const renderedSubject = renderTemplate(subject, variables);
        const renderedHtml = renderTemplate(htmlTemplate, variables);
        const renderedText = renderTemplate(textTemplate, variables);
        
        // Call cloud function using Firebase SDK (onCall function)
        const sendEmail = functions.httpsCallable('sendTestEmail');
        const result = await sendEmail({
            to: 'dance@urbanswing.co.nz',
            subject: `[TEST] ${renderedSubject}`,
            html: renderedHtml,
            text: renderedText,
            templateId: state.currentTemplate.id
        });
        
        showSuccess('Test email sent to dance@urbanswing.co.nz');
        showLoading(false);
    } catch (error) {
        console.error('Error sending test email:', error);
        showError('Failed to send test email: ' + error.message);
        showLoading(false);
    }
}

