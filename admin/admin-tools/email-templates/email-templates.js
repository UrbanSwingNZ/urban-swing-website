/**
 * email-templates.js
 * Main logic for Email Templates Management Tool
 * Version: 1.0.1
 */

// Global state (db is already declared in firebase-config.js)
let currentUser = null;
let currentTemplate = null;
let htmlEditor = null;
let templates = [];
let hasUnsavedChanges = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check authentication
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                document.getElementById('user-email').textContent = user.email;
                
                // Restrict access to dance@urbanswing.co.nz only
                if (user.email !== 'dance@urbanswing.co.nz') {
                    alert('Access Denied: Email template management is restricted to dance@urbanswing.co.nz');
                    window.location.href = '../index.html';
                    return;
                }
                
                // Initialize the app
                await initializeApp();
            } else {
                window.location.href = '../../index.html';
            }
        });
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize: ' + error.message);
    }
});

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        showLoading(true);
        
        // Load templates
        await loadTemplates();
        
        // Initialize CodeMirror
        initializeCodeMirror();
        
        showLoading(false);
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to load templates: ' + error.message);
        showLoading(false);
    }
}

/**
 * Initialize CodeMirror editor
 */
function initializeCodeMirror() {
    const textarea = document.getElementById('html-editor');
    htmlEditor = CodeMirror.fromTextArea(textarea, {
        mode: 'htmlmixed',
        theme: 'monokai',
        lineNumbers: true,
        lineWrapping: true,
        indentUnit: 2,
        tabSize: 2,
        autoCloseTags: true
    });
    
    // Track changes
    htmlEditor.on('change', () => {
        hasUnsavedChanges = true;
        updateSaveButton();
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        firebase.auth().signOut();
    });
    
    // Refresh templates
    document.getElementById('refresh-templates-btn').addEventListener('click', loadTemplates);
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Save button
    document.getElementById('save-btn').addEventListener('click', saveTemplate);
    
    // Preview button
    document.getElementById('preview-btn').addEventListener('click', showPreview);
    
    // Test send button
    document.getElementById('test-send-btn').addEventListener('click', showTestSendModal);
    
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
    
    // Update preview button
    document.getElementById('update-preview-btn').addEventListener('click', updatePreview);
    
    // Confirm test send
    document.getElementById('confirm-test-send').addEventListener('click', sendTestEmail);
    
    // Track changes in form fields
    document.getElementById('email-subject').addEventListener('input', () => {
        hasUnsavedChanges = true;
        updateSaveButton();
    });
    
    document.getElementById('text-template').addEventListener('input', () => {
        hasUnsavedChanges = true;
        updateSaveButton();
    });
    
    document.getElementById('template-active').addEventListener('change', () => {
        hasUnsavedChanges = true;
        updateSaveButton();
    });
    
    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

/**
 * Load all email templates from Firestore
 */
async function loadTemplates() {
    try {
        showLoading(true);
        
        const snapshot = await db.collection('emailTemplates').get();
        
        templates = snapshot.docs.map(doc => ({
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
        
        renderTemplateList();
        showLoading(false);
    } catch (error) {
        console.error('Error loading templates:', error);
        showError('Failed to load templates: ' + error.message);
        showLoading(false);
    }
}

/**
 * Render template list in sidebar
 */
function renderTemplateList() {
    const container = document.getElementById('template-list');
    
    if (templates.length === 0) {
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-inbox"></i>
                <p>No templates found</p>
            </div>
        `;
        return;
    }
    
    // Group templates by category
    const grouped = templates.reduce((acc, template) => {
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
            const isActive = currentTemplate && currentTemplate.id === template.id;
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

/**
 * Select and load a template for editing
 */
async function selectTemplate(templateId) {
    // Check for unsaved changes
    if (hasUnsavedChanges) {
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
        
        currentTemplate = {
            id: doc.id,
            ...doc.data()
        };
        
        loadTemplateIntoEditor();
        
        // Update UI
        document.getElementById('no-selection-state').style.display = 'none';
        document.getElementById('editor-view').style.display = 'flex';
        
        // Update active state in list
        document.querySelectorAll('.template-item').forEach(item => {
            item.classList.toggle('active', item.dataset.templateId === templateId);
        });
        
        hasUnsavedChanges = false;
        updateSaveButton();
        
        showLoading(false);
    } catch (error) {
        console.error('Error loading template:', error);
        showError('Failed to load template: ' + error.message);
        showLoading(false);
    }
}

/**
 * Load current template data into editor
 */
function loadTemplateIntoEditor() {
    if (!currentTemplate) return;
    
    // Update toolbar
    document.getElementById('template-name').textContent = currentTemplate.name;
    const statusBadge = document.getElementById('template-status');
    statusBadge.textContent = currentTemplate.active ? 'Active' : 'Inactive';
    statusBadge.className = `status-badge ${currentTemplate.active ? 'active' : 'inactive'}`;
    
    // Load content
    document.getElementById('email-subject').value = currentTemplate.subject || '';
    htmlEditor.setValue(currentTemplate.htmlTemplate || '');
    document.getElementById('text-template').value = currentTemplate.textTemplate || '';
    document.getElementById('template-active').checked = currentTemplate.active !== false;
    
    // Load settings
    document.getElementById('template-id').textContent = currentTemplate.id;
    document.getElementById('template-category').textContent = currentTemplate.category || 'N/A';
    document.getElementById('template-type').textContent = currentTemplate.type || 'N/A';
    document.getElementById('template-created').textContent = formatDate(currentTemplate.createdAt);
    document.getElementById('template-updated').textContent = formatDate(currentTemplate.updatedAt);
    document.getElementById('template-updated-by').textContent = currentTemplate.updatedBy || 'N/A';
    
    // Load variables
    renderVariablesList();
}

/**
 * Render variables list
 */
function renderVariablesList() {
    const container = document.getElementById('variables-list');
    
    if (!currentTemplate.variables || currentTemplate.variables.length === 0) {
        container.innerHTML = '<p style="color: #999;">No variables defined</p>';
        return;
    }
    
    let html = '';
    currentTemplate.variables.forEach(variable => {
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

/**
 * Insert variable into editor at cursor position
 */
function insertVariable(variableName) {
    const doc = htmlEditor.getDoc();
    const cursor = doc.getCursor();
    doc.replaceRange(`\${${variableName}}`, cursor);
    htmlEditor.focus();
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `${tabName}-tab`);
    });
}

/**
 * Save template changes
 */
async function saveTemplate() {
    if (!currentTemplate) return;
    
    try {
        showLoading(true);
        
        // Get current values
        const subject = document.getElementById('email-subject').value.trim();
        const htmlTemplate = htmlEditor.getValue();
        const textTemplate = document.getElementById('text-template').value;
        const active = document.getElementById('template-active').checked;
        
        // Validate
        if (!subject) {
            throw new Error('Subject line is required');
        }
        
        if (!htmlTemplate) {
            throw new Error('HTML template is required');
        }
        
        // Validate template syntax
        const htmlValidation = validateTemplate(htmlTemplate);
        if (!htmlValidation.valid) {
            throw new Error('HTML template has errors:\n' + htmlValidation.errors.join('\n'));
        }
        
        // Create new version
        const newVersion = {
            version: (currentTemplate.currentVersion || 0) + 1,
            createdAt: new Date(), // Use regular Date for arrays
            createdBy: currentUser.email,
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
            updatedBy: currentUser.email
        };
        
        await db.collection('emailTemplates').doc(currentTemplate.id).update(updateData);
        
        // Reload template
        await selectTemplate(currentTemplate.id);
        await loadTemplates();
        
        hasUnsavedChanges = false;
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
 * Show preview modal
 */
function showPreview() {
    if (!currentTemplate) return;
    
    const modal = document.getElementById('preview-modal');
    
    // Generate variable inputs
    const variablesContainer = document.getElementById('preview-variables');
    const sampleData = getSampleData(currentTemplate.id);
    
    let html = '';
    if (currentTemplate.variables && currentTemplate.variables.length > 0) {
        currentTemplate.variables.forEach(variable => {
            const value = sampleData[variable.name] !== undefined ? sampleData[variable.name] : (variable.example || '');
            html += `
                <div class="preview-variable-input">
                    <label>${variable.name}</label>
                    <input type="text" data-variable="${variable.name}" value="${value}" placeholder="${variable.description || ''}">
                </div>
            `;
        });
    } else {
        html = '<p style="color: #999;">No variables for this template</p>';
    }
    
    variablesContainer.innerHTML = html;
    
    // Initial preview
    updatePreview();
    
    modal.classList.add('active');
}

/**
 * Update preview with current values
 */
function updatePreview() {
    const subject = document.getElementById('email-subject').value;
    const htmlTemplate = htmlEditor.getValue();
    const textTemplate = document.getElementById('text-template').value;
    
    // Get variable values from form
    const variables = getVariablesFromForm(document.getElementById('preview-variables'));
    
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

/**
 * Switch preview tabs
 */
function switchPreviewTab(tabName) {
    document.querySelectorAll('.preview-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.previewTab === tabName);
    });
    
    document.querySelectorAll('.preview-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `preview-${tabName}`);
    });
}

/**
 * Show test send modal
 */
function showTestSendModal() {
    if (!currentTemplate) return;
    
    const modal = document.getElementById('test-send-modal');
    const container = document.getElementById('test-send-variables');
    
    // Generate variable inputs
    const sampleData = getSampleData(currentTemplate.id);
    
    let html = '';
    if (currentTemplate.variables && currentTemplate.variables.length > 0) {
        currentTemplate.variables.forEach(variable => {
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
async function sendTestEmail() {
    if (!currentTemplate) return;
    
    try {
        showLoading(true);
        
        const subject = document.getElementById('email-subject').value;
        const htmlTemplate = htmlEditor.getValue();
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
            templateId: currentTemplate.id
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

/**
 * Show version history modal
 */
async function showVersionHistory() {
    if (!currentTemplate) return;
    
    const modal = document.getElementById('history-modal');
    const container = document.getElementById('version-list');
    
    const versions = currentTemplate.versions || [];
    
    if (versions.length === 0) {
        container.innerHTML = '<p style="color: #999;">No version history available</p>';
    } else {
        let html = '';
        
        // Sort versions by version number (descending)
        const sortedVersions = [...versions].sort((a, b) => b.version - a.version);
        
        sortedVersions.forEach(version => {
            const isCurrent = version.version === currentTemplate.currentVersion;
            html += `
                <div class="version-item ${isCurrent ? 'current' : ''}">
                    <div class="version-header">
                        <div class="version-info">
                            <span class="version-number">Version ${version.version}</span>
                            ${isCurrent ? '<span class="version-badge">Current</span>' : ''}
                        </div>
                        <div class="version-actions">
                            ${!isCurrent ? `<button class="btn-secondary" onclick="restoreVersion(${version.version})">
                                <i class="fas fa-undo"></i> Restore
                            </button>` : ''}
                        </div>
                    </div>
                    <div class="version-meta">
                        ${formatDate(version.createdAt)} by ${version.createdBy || 'Unknown'}
                        ${version.changeNote ? `<br><em>${version.changeNote}</em>` : ''}
                    </div>
                    <div class="version-preview">
                        <h4>Subject</h4>
                        <pre>${version.subject}</pre>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    modal.classList.add('active');
}

/**
 * Restore a previous version
 */
async function restoreVersion(versionNumber) {
    if (!currentTemplate) return;
    
    if (!confirm(`Are you sure you want to restore Version ${versionNumber}? This will create a new version with the old content.`)) {
        return;
    }
    
    try {
        showLoading(true);
        
        const version = currentTemplate.versions.find(v => v.version === versionNumber);
        if (!version) {
            throw new Error('Version not found');
        }
        
        // Create new version with restored content
        const newVersion = {
            version: currentTemplate.currentVersion + 1,
            createdAt: new Date(), // Use regular Date for arrays
            createdBy: currentUser.email,
            subject: version.subject,
            htmlTemplate: version.htmlTemplate,
            textTemplate: version.textTemplate,
            changeNote: `Restored from Version ${versionNumber}`
        };
        
        // Update document
        await db.collection('emailTemplates').doc(currentTemplate.id).update({
            subject: version.subject,
            htmlTemplate: version.htmlTemplate,
            textTemplate: version.textTemplate,
            currentVersion: newVersion.version,
            versions: firebase.firestore.FieldValue.arrayUnion(newVersion),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.email
        });
        
        // Reload
        await selectTemplate(currentTemplate.id);
        document.getElementById('history-modal').classList.remove('active');
        
        showSuccess(`Version ${versionNumber} restored successfully!`);
        showLoading(false);
    } catch (error) {
        console.error('Error restoring version:', error);
        showError('Failed to restore version: ' + error.message);
        showLoading(false);
    }
}

/**
 * Update save button state
 */
function updateSaveButton() {
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = !hasUnsavedChanges;
    saveBtn.innerHTML = hasUnsavedChanges 
        ? '<i class="fas fa-save"></i> Save Changes *'
        : '<i class="fas fa-save"></i> Save Changes';
}

/**
 * Format Firestore timestamp to readable date
 */
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        return 'N/A';
    }
    
    return date.toLocaleString('en-NZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Show loading spinner
 */
function showLoading(show) {
    document.getElementById('loading-spinner').style.display = show ? 'flex' : 'none';
}

/**
 * Show success message
 */
function showSuccess(message) {
    alert('✅ ' + message);
}

/**
 * Show error message
 */
function showError(message) {
    alert('❌ ' + message);
}

// Make restoreVersion available globally for onclick
window.restoreVersion = restoreVersion;
