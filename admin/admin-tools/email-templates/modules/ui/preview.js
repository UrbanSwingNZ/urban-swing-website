/**
 * preview.js
 * Email preview functionality
 */

import { state } from '../core/state.js';
import { loadStudentsForPreview, getStudentDataForPreview } from '../firebase/student-operations.js';
import { switchPreviewTab } from './tabs.js';

/* global renderTemplate, sanitizeHTML */

/**
 * Show preview modal
 */
export async function showPreview() {
    if (!state.currentTemplate) return;
    
    const modal = document.getElementById('preview-modal');
    
    // Load students into dropdown
    await loadStudentsForPreview();
    
    // Initial preview with first student (now that students are loaded)
    await updatePreview();
    
    modal.classList.add('active');
}

/**
 * Update preview with current values
 */
export async function updatePreview() {
    try {
        const subject = document.getElementById('email-subject').value;
        
        // Get HTML from the active editor
        let htmlTemplate;
        if (state.currentEditorMode === 'visual' && state.visualEditor) {
            htmlTemplate = state.visualEditor.getContent();
        } else {
            htmlTemplate = state.htmlEditor.getValue();
        }
        
        const textTemplate = document.getElementById('text-template').value;
        
        // Get student data for preview
        const variables = await getStudentDataForPreview();
        
        // Render templates
        const renderedSubject = renderTemplate(subject, variables);
        const renderedHtml = renderTemplate(htmlTemplate, variables);
        const renderedText = renderTemplate(textTemplate, variables);
        
        // Update preview
        document.getElementById('preview-subject-text').textContent = renderedSubject;
        
        const iframe = document.getElementById('preview-frame');
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(sanitizeHTML(renderedHtml));
        iframeDoc.close();
        
        document.getElementById('preview-text-content').textContent = renderedText;
    } catch (error) {
        // Display error in preview
        const errorHtml = `
            <div style="font-family: Arial, sans-serif; padding: 40px; text-align: center; color: #dc3545;">
                <h2 style="color: #dc3545; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle"></i> Preview Error
                </h2>
                <p style="font-size: 16px; margin-bottom: 10px;"><strong>Cannot generate preview:</strong></p>
                <p style="font-size: 14px; background: #f8d7da; padding: 15px; border-radius: 6px; border-left: 4px solid #dc3545;">
                    ${error.message}
                </p>
                <p style="font-size: 13px; color: #666; margin-top: 20px;">
                    This error would trigger an error notification email to dance@urbanswing.co.nz if this template were used in production.
                </p>
            </div>
        `;
        
        document.getElementById('preview-subject-text').textContent = 'Error - Cannot Preview';
        
        const iframe = document.getElementById('preview-frame');
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(errorHtml);
        iframeDoc.close();
        
        document.getElementById('preview-text-content').textContent = `ERROR: ${error.message}\n\nThis error would trigger an error notification email to dance@urbanswing.co.nz if this template were used in production.`;
        
        console.error('Preview error:', error);
    }
}

// Export switchPreviewTab from tabs module
export { switchPreviewTab };
