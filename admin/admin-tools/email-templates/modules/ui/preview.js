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
    
    // Initial preview with first student or sample data
    updatePreview();
    
    modal.classList.add('active');
}

/**
 * Update preview with current values
 */
export async function updatePreview() {
    const subject = document.getElementById('email-subject').value;
    
    // Get HTML from the active editor
    let htmlTemplate;
    if (state.currentEditorMode === 'visual' && state.visualEditor) {
        htmlTemplate = state.visualEditor.getContent();
    } else {
        htmlTemplate = state.htmlEditor.getValue();
    }
    
    const textTemplate = document.getElementById('text-template').value;
    
    // Get student data for preview (either selected student or sample data)
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
}

// Export switchPreviewTab from tabs module
export { switchPreviewTab };
