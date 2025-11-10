/**
 * template-list.js
 * Template list rendering
 */

import { state } from '../core/state.js';
import { selectTemplate } from '../firebase/template-operations.js';

/**
 * Render template list in sidebar
 */
export function renderTemplateList() {
    const container = document.getElementById('template-list');
    
    if (state.templates.length === 0) {
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-inbox"></i>
                <p>No templates found</p>
            </div>
        `;
        return;
    }
    
    // Group templates by category
    const grouped = state.templates.reduce((acc, template) => {
        const category = template.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(template);
        return acc;
    }, {});
    
    // Category labels
    const categoryLabels = {
        'student': 'Student Emails',
        'admin': 'Admin Emails',
        'system': 'System Emails',
        'other': 'Other'
    };
    
    let html = '';
    
    Object.entries(grouped).forEach(([category, categoryTemplates]) => {
        html += `
            <div class="template-category">
                <div class="category-header">${categoryLabels[category] || category}</div>
        `;
        
        categoryTemplates.forEach(template => {
            const isActive = state.currentTemplate && state.currentTemplate.id === template.id;
            html += `
                <div class="template-item ${isActive ? 'active' : ''}" data-template-id="${template.id}">
                    <i class="fas fa-envelope"></i>
                    <div class="template-item-content">
                        <div class="template-item-name">${template.name}</div>
                        <div class="template-item-id">${template.id}</div>
                    </div>
                    <div class="status-indicator ${template.active ? '' : 'inactive'}"></div>
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    container.innerHTML = html;
    
    // Add click listeners
    container.querySelectorAll('.template-item').forEach(item => {
        item.addEventListener('click', () => {
            const templateId = item.dataset.templateId;
            selectTemplate(templateId);
        });
    });
}
