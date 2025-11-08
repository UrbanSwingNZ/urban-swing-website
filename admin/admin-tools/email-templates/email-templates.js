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
        
        // Check if templates have been migrated
        const templatesSnapshot = await db.collection('emailTemplates').limit(1).get();
        
        if (templatesSnapshot.empty) {
            // Show migration banner
            document.getElementById('migration-banner').style.display = 'block';
        } else {
            // Load templates
            await loadTemplates();
        }
        
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
    
    // Migration
    document.getElementById('migrate-btn').addEventListener('click', migrateTemplates);
    
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

/**
 * Migrate existing email templates from code to Firestore
 */
async function migrateTemplates() {
    if (!confirm('This will migrate email templates to Firestore. This should only be done once. Continue?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const batch = db.batch();
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        const now = new Date(); // Use regular Date for array timestamps
        
        // Template 1: Welcome Student
        const welcomeRef = db.collection('emailTemplates').doc('welcome-student');
        batch.set(welcomeRef, {
            name: 'Student Welcome Email',
            type: 'automated',
            category: 'student',
            subject: 'Welcome to Urban Swing!',
            htmlTemplate: getWelcomeStudentHtmlTemplate(),
            textTemplate: getWelcomeStudentTextTemplate(),
            variables: [
                { name: 'student', description: 'Student object with firstName', required: true, example: '{firstName: "Sarah"}' },
                { name: 'casualRate', description: 'Single class price', required: true, example: '20' },
                { name: 'studentRate', description: 'Student casual entry price', required: true, example: '15' },
                { name: 'fiveClassPrice', description: '5-class concession price', required: true, example: '90' },
                { name: 'tenClassPrice', description: '10-class concession price', required: true, example: '170' },
                { name: 'hasUserAccount', description: 'Whether student has portal access', required: true, example: 'true' }
            ],
            systemTemplate: true,
            active: true,
            currentVersion: 1,
            versions: [{
                version: 1,
                createdAt: now,
                createdBy: currentUser.email,
                subject: 'Welcome to Urban Swing!',
                htmlTemplate: getWelcomeStudentHtmlTemplate(),
                textTemplate: getWelcomeStudentTextTemplate(),
                changeNote: 'Initial migration from code'
            }],
            createdAt: timestamp,
            updatedAt: timestamp,
            updatedBy: currentUser.email
        });
        
        // Template 2: Admin Notification
        const adminNotificationRef = db.collection('emailTemplates').doc('admin-notification');
        batch.set(adminNotificationRef, {
            name: 'New Student Admin Notification',
            type: 'automated',
            category: 'admin',
            subject: 'New Student Registration',
            htmlTemplate: getAdminNotificationHtmlTemplate(),
            textTemplate: getAdminNotificationTextTemplate(),
            variables: [
                { name: 'student', description: 'Student object with all details', required: true, example: '{firstName: "Sarah", lastName: "Johnson", ...}' },
                { name: 'studentId', description: 'Student document ID', required: true, example: 'ABC123DEF456' },
                { name: 'registeredAt', description: 'Formatted registration date', required: true, example: 'November 8, 2025 at 2:30 PM' }
            ],
            systemTemplate: true,
            active: true,
            currentVersion: 1,
            versions: [{
                version: 1,
                createdAt: now,
                createdBy: currentUser.email,
                subject: 'New Student Registration',
                htmlTemplate: getAdminNotificationHtmlTemplate(),
                textTemplate: getAdminNotificationTextTemplate(),
                changeNote: 'Initial migration from code'
            }],
            createdAt: timestamp,
            updatedAt: timestamp,
            updatedBy: currentUser.email
        });
        
        // Template 3: Account Setup
        const accountSetupRef = db.collection('emailTemplates').doc('account-setup');
        batch.set(accountSetupRef, {
            name: 'Account Setup Confirmation',
            type: 'automated',
            category: 'student',
            subject: 'Your Urban Swing Portal Account is Ready!',
            htmlTemplate: getAccountSetupHtmlTemplate(),
            textTemplate: getAccountSetupTextTemplate(),
            variables: [
                { name: 'student', description: 'Student object with firstName and lastName', required: true, example: '{firstName: "Sarah", lastName: "Johnson"}' },
                { name: 'user', description: 'User object with email', required: true, example: '{email: "sarah@example.com"}' },
                { name: 'setupDate', description: 'Formatted setup date', required: true, example: 'November 8, 2025' }
            ],
            systemTemplate: true,
            active: true,
            currentVersion: 1,
            versions: [{
                version: 1,
                createdAt: now,
                createdBy: currentUser.email,
                subject: 'Your Urban Swing Portal Account is Ready!',
                htmlTemplate: getAccountSetupHtmlTemplate(),
                textTemplate: getAccountSetupTextTemplate(),
                changeNote: 'Initial migration from code'
            }],
            createdAt: timestamp,
            updatedAt: timestamp,
            updatedBy: currentUser.email
        });
        
        // Template 4: Error Notification
        const errorNotificationRef = db.collection('emailTemplates').doc('error-notification');
        batch.set(errorNotificationRef, {
            name: 'System Error Notification',
            type: 'automated',
            category: 'system',
            subject: '⚠️ System Error: Failed to send welcome email',
            htmlTemplate: getErrorNotificationHtmlTemplate(),
            textTemplate: getErrorNotificationTextTemplate(),
            variables: [
                { name: 'student', description: 'Student object with details', required: true, example: '{firstName: "Sarah", lastName: "Johnson", email: "sarah@example.com"}' },
                { name: 'studentId', description: 'Student document ID', required: true, example: 'ABC123DEF456' },
                { name: 'error', description: 'Error object with message', required: true, example: '{message: "Pricing configuration not found"}' }
            ],
            systemTemplate: true,
            active: true,
            currentVersion: 1,
            versions: [{
                version: 1,
                createdAt: now,
                createdBy: currentUser.email,
                subject: '⚠️ System Error: Failed to send welcome email',
                htmlTemplate: getErrorNotificationHtmlTemplate(),
                textTemplate: getErrorNotificationTextTemplate(),
                changeNote: 'Initial migration from code'
            }],
            createdAt: timestamp,
            updatedAt: timestamp,
            updatedBy: currentUser.email
        });
        
        // Commit batch
        await batch.commit();
        
        // Hide migration banner and reload
        document.getElementById('migration-banner').style.display = 'none';
        await loadTemplates();
        
        showSuccess('Successfully migrated 4 email templates to Firestore!');
        showLoading(false);
    } catch (error) {
        console.error('Migration error:', error);
        showError('Failed to migrate templates: ' + error.message);
        showLoading(false);
    }
}

// Template content functions (converted from original email.js files)
// Note: Using template literals with ${} for variable interpolation

function getWelcomeStudentHtmlTemplate() {
    return `    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3534Fa 0%, #9a16f5 50%, #e800f2 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0 0 10px 0;">Welcome to Urban Swing!</h1>
        <p style="color: white; margin: 0; font-size: 1.1rem;">Get ready to dance</p>
      </div>
      
      <div style="padding: 30px; background: #fff;">
        <h2 style="color: #9a16f5; margin-top: 0;">Hi \${student.firstName}! 👋</h2>
        
        <p style="font-size: 1rem; line-height: 1.6; color: #333;">
          Thank you for registering with Urban Swing! We're excited to have you join our dance community.
        </p>
        
        <h3 style="color: #9a16f5; margin-top: 30px;">📅 Class Information</h3>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 15px 0; font-size: 1rem; color: #333;">
            <strong style="color: #9a16f5;">When:</strong> Every Thursday, 7:15 PM - 9:15 PM
          </p>
          <p style="margin: 0; font-size: 1rem; color: #333;">
            <strong style="color: #9a16f5;">Where:</strong> Dance Express Studios, Cnr Taradale Rd & Austin St, Onekawa, Napier
          </p>
        </div>

        <h3 style="color: #9a16f5; margin-top: 30px;">💰 Pricing</h3>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 12px; border-bottom: 2px solid #e0e0e0; font-weight: bold; color: #9a16f5;">Option</td>
            <td style="padding: 12px; border-bottom: 2px solid #e0e0e0; font-weight: bold; color: #9a16f5;">Price</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">Single Class</td>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;"><strong>$\${casualRate}</strong></td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">Single Class (Student)</td>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;"><strong>$\${studentRate}</strong></td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">5 Class Concession</td>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;"><strong>$\${fiveClassPrice}</strong> <span style="color: #28a745; font-size: 0.9rem;">(Save $\${casualRate * 5 - fiveClassPrice}!)</span></td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">10 Class Concession</td>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;"><strong>$\${tenClassPrice}</strong> <span style="color: #28a745; font-size: 0.9rem;">(Save $\${casualRate * 10 - tenClassPrice}!)</span></td>
          </tr>
        </table>

        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; margin-top: 20px;">
          <p style="margin: 0; color: #1b5e20; font-size: 0.95rem;">
            <strong>💡 Tip:</strong> 5 Class Concessions are valid for 6 months, and 10 Class Concessions are valid for 9 months from date of purchase.
          </p>
        </div>

        <h3 style="color: #9a16f5; margin-top: 30px;">🎉 What to Expect</h3>
        
        <ul style="line-height: 1.8; color: #333;">
          <li>Fun, energetic West Coast Swing classes for all levels</li>
          <li>Welcoming community of dancers</li>
          <li>No partner required - we rotate partners during class</li>
          <li>Beginner-friendly instruction</li>
        </ul>

        \${hasUserAccount ? \`
        <h3 style="color: #9a16f5; margin-top: 30px;">📱 Your Student Portal</h3>
        
        <p style="font-size: 1rem; line-height: 1.6; color: #333;">
          As a registered student, you now have access to your own Student Portal where you can:
        </p>
        
        <ul style="line-height: 1.8; color: #333;">
          <li>View your class check-in history</li>
          <li>Manage your concession packages</li>
          <li>Purchase new concessions online</li>
          <li>Update your profile information</li>
          <li>View your transaction history</li>
        </ul>

        <div style="margin-top: 30px; text-align: center;">
          <a href="https://urbanswing.co.nz/pages/classes.html" 
             style="display: inline-block; padding: 14px 28px; background: #9a16f5; color: white; text-decoration: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; margin-right: 10px; margin-bottom: 10px;">
            View Full Class Schedule
          </a>
          <a href="https://urbanswing.co.nz/student-portal/" 
             style="display: inline-block; padding: 14px 28px; background: #9a16f5; color: white; text-decoration: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; margin-bottom: 10px;">
            Access Student Portal
          </a>
        </div>
        \` : \`
        <h3 style="color: #9a16f5; margin-top: 30px;">📱 Create Your Student Portal Account</h3>
        
        <p style="font-size: 1rem; line-height: 1.6; color: #333;">
          We're excited to introduce our new <strong>Student Portal</strong> – your personal hub for managing everything Urban Swing!
        </p>
        
        <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; border-left: 4px solid #9a16f5; margin: 20px 0;">
          <p style="margin: 0 0 15px 0; color: #333; font-weight: bold;">With your Student Portal account, you can:</p>
          <ul style="line-height: 1.8; color: #333; margin: 0;">
            <li>View your complete class check-in history</li>
            <li>Track your concession packages and remaining classes</li>
            <li>Purchase new concessions online</li>
            <li>Update your profile information anytime</li>
            <li>Review your transaction history</li>
          </ul>
        </div>
        
        <p style="font-size: 1rem; line-height: 1.6; color: #333;">
          Creating your account is quick and easy – it only takes a minute! Click the button below to get started and unlock all these features.
        </p>

        <div style="margin-top: 30px; text-align: center;">
          <a href="https://urbanswing.co.nz/pages/classes.html" 
             style="display: inline-block; padding: 14px 28px; background: #9a16f5; color: white; text-decoration: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; margin-right: 10px; margin-bottom: 10px;">
            View Full Class Schedule
          </a>
          <a href="https://urbanswing.co.nz/student-portal/" 
             style="display: inline-block; padding: 14px 28px; background: #9a16f5; color: white; text-decoration: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; margin-bottom: 10px;">
            Create Portal Account
          </a>
        </div>
        \`}

        <p style="margin-top: 30px; font-size: 0.95rem; color: #666; line-height: 1.6;">
          If you have any questions, feel free to reply to this email or contact us at 
          <a href="mailto:dance@urbanswing.co.nz" style="color: #9a16f5;">dance@urbanswing.co.nz</a>.
        </p>

        <p style="font-size: 1rem; color: #333; margin-top: 20px;">
          See you on the dance floor!<br>
          <strong style="color: #9a16f5;">The Urban Swing Team</strong>
        </p>
      </div>
      
      <div style="padding: 20px; text-align: center; background: #f8f9fa; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0 0 15px 0; font-size: 0.9rem; color: #666;">
          Follow us for updates and events:
        </p>
        
        <div style="margin-bottom: 15px;">
          <a href="https://www.facebook.com/UrbanSwingNZ" style="display: inline-block; margin: 0 8px;" target="_blank">
            <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" style="width: 32px; height: 32px; vertical-align: middle;">
          </a>
          <a href="https://www.instagram.com/urbanswingnz" style="display: inline-block; margin: 0 8px;" target="_blank">
            <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" style="width: 32px; height: 32px; vertical-align: middle;">
          </a>
          <a href="https://urbanswing.co.nz" style="display: inline-block; margin: 0 8px;" target="_blank">
            <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 32px; height: 32px; vertical-align: middle;">
          </a>
          <a href="mailto:dance@urbanswing.co.nz" style="display: inline-block; margin: 0 8px;">
            <img src="https://cdn-icons-png.flaticon.com/512/732/732200.png" alt="Email" style="width: 32px; height: 32px; vertical-align: middle;">
          </a>
        </div>
      </div>
    </div>`;
}

function getWelcomeStudentTextTemplate() {
    return `Welcome to Urban Swing!

Hi \${student.firstName}!

Thank you for registering with Urban Swing! We're excited to have you join our dance community.

CLASS INFORMATION
When: Every Thursday, 7:15 PM - 9:15 PM
Where: Dance Express Studios, Cnr Taradale Rd & Austin St, Onekawa, Napier

PRICING
- Single Class: $\${casualRate}
- Single Class (Student): $\${studentRate}
- 5 Class Concession: $\${fiveClassPrice} (Save $\${casualRate * 5 - fiveClassPrice}!) - valid for 6 months
- 10 Class Concession: $\${tenClassPrice} (Save $\${casualRate * 10 - tenClassPrice}!) - valid for 9 months

WHAT TO EXPECT
- Fun, energetic West Coast Swing classes for all levels
- Welcoming community of dancers
- No partner required - we rotate partners during class
- Beginner-friendly instruction

\${hasUserAccount ? \`YOUR STUDENT PORTAL
As a registered student, you now have access to your own Student Portal where you can:
- View your class check-in history
- Manage your concession packages
- Purchase new concessions online
- Update your profile information
- View your transaction history

Access your portal: https://urbanswing.co.nz/student-portal/\` : \`CREATE YOUR STUDENT PORTAL ACCOUNT
We're excited to introduce our new Student Portal – your personal hub for managing everything Urban Swing!

With your Student Portal account, you can:
- View your complete class check-in history
- Track your concession packages and remaining classes
- Purchase new concessions online
- Update your profile information anytime
- Review your transaction history

Creating your account is quick and easy – it only takes a minute!
Create your account: https://urbanswing.co.nz/student-portal/\`}

View full class schedule: https://urbanswing.co.nz/pages/classes.html

If you have any questions, feel free to reply to this email or contact us at dance@urbanswing.co.nz.

See you on the dance floor!
The Urban Swing Team

---
Follow us:
Facebook: https://www.facebook.com/UrbanSwingNZ
Instagram: https://www.instagram.com/urbanswingnz
Website: https://urbanswing.co.nz
Email: dance@urbanswing.co.nz`;
}

function getAdminNotificationHtmlTemplate() {
    return `    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3534Fa 0%, #9a16f5 50%, #e800f2 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">New Student Registration</h1>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa;">
        <h2 style="color: #9a16f5; margin-top: 0;">Student Details</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Name:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">\${student.firstName} \${student.lastName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="mailto:\${student.email}">\${student.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Phone:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">\${student.phoneNumber || 'N/A'}</td>
          </tr>
          \${student.pronouns ? \`
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Pronouns:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">\${student.pronouns}</td>
          </tr>
          \` : ''}
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Registered:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">\${registeredAt}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email Consent:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">\${student.emailConsent ? '✅ Yes' : '❌ No'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Student ID:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><code>\${studentId}</code></td>
          </tr>
        </table>
        
        \${student.adminNotes ? \`
        <div style="margin-top: 20px; padding: 15px; background: #fff; border-left: 4px solid #9a16f5;">
          <strong>Admin Notes:</strong><br>
          \${student.adminNotes}
        </div>
        \` : ''}
        
        <div style="margin-top: 30px; text-align: center;">
          <p style="color: #666;">View this student in the admin database:</p>
          <a href="https://urbanswing.co.nz/admin/student-database/" 
             style="display: inline-block; padding: 12px 24px; background: #9a16f5; color: white; text-decoration: none; border-radius: 6px;">
            Open Student Database
          </a>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #666; font-size: 12px; background: #e9ecef;">
        <p>This is an automated notification from Urban Swing student registration system.</p>
      </div>
    </div>`;
}

function getAdminNotificationTextTemplate() {
    return `New Student Registration

Name: \${student.firstName} \${student.lastName}
Email: \${student.email}
Phone: \${student.phoneNumber || 'N/A'}
\${student.pronouns ? \`Pronouns: \${student.pronouns}\\n\` : ''}
Registered: \${registeredAt}
Email Consent: \${student.emailConsent ? 'Yes' : 'No'}
Student ID: \${studentId}
\${student.adminNotes ? \`\\nAdmin Notes:\\n\${student.adminNotes}\` : ''}

View in admin database: https://urbanswing.co.nz/admin/student-database/`;
}

function getAccountSetupHtmlTemplate() {
    return `    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #9a16f5 0%, #ed217c 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 2rem;">Welcome Back! 🎉</h1>
      </div>
      
      <div style="padding: 40px 30px; background: #fff;">
        <h2 style="color: #333; margin-top: 0;">Your Urban Swing Portal Account is Ready!</h2>
        
        <p style="font-size: 1.1rem; line-height: 1.6; color: #333;">
          Hi \${student.firstName},
        </p>
        
        <p style="font-size: 1rem; line-height: 1.6; color: #333;">
          Great news! You've successfully set up your Urban Swing Student Portal account. 
          You can now access your account to view your class history, manage your concessions, 
          and stay up to date with everything Urban Swing.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #9a16f5;">
          <h3 style="color: #9a16f5; margin-top: 0;">Account Details</h3>
          <p style="margin: 5px 0; color: #333;"><strong>Name:</strong> \${student.firstName} \${student.lastName}</p>
          <p style="margin: 5px 0; color: #333;"><strong>Email:</strong> \${user.email}</p>
          <p style="margin: 5px 0; color: #333;"><strong>Setup Date:</strong> \${setupDate}</p>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="https://urbanswing.co.nz/student-portal/" 
             style="display: inline-block; padding: 16px 32px; background: #9a16f5; 
                    color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 1.1rem;">
            Access Your Portal
          </a>
        </div>
        
        <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <h3 style="color: #0c5aa6; margin-top: 0;">What You Can Do in the Portal:</h3>
          <ul style="line-height: 1.8; color: #333;">
            <li>View your class check-in history</li>
            <li>Manage your concession packages</li>
            <li>Update your profile information</li>
            <li>View transaction history</li>
            <li>Purchase new concessions</li>
          </ul>
        </div>
        
        <p style="font-size: 1rem; line-height: 1.6; color: #333; margin-top: 30px;">
          If you have any questions or need help with your account, don't hesitate to reach out to us at 
          <a href="mailto:dance@urbanswing.co.nz" style="color: #9a16f5;">dance@urbanswing.co.nz</a>.
        </p>
        
        <p style="font-size: 1rem; line-height: 1.6; color: #333; margin-top: 20px;">
          See you on the dance floor! 💃🕺
        </p>
        
        <p style="font-size: 1rem; line-height: 1.6; color: #333;">
          The Urban Swing Team
        </p>
      </div>
      
      <div style="padding: 30px; text-align: center; background: #f8f9fa; border-top: 1px solid #dee2e6;">
        <h3 style="color: #333; margin-top: 0; font-size: 1.1rem;">Stay Connected</h3>
        <p style="margin: 10px 0;">
          <a href="https://www.facebook.com/UrbanSwingNZ" style="color: #9a16f5; text-decoration: none; margin: 0 10px;">Facebook</a> | 
          <a href="https://www.instagram.com/urbanswingnz" style="color: #9a16f5; text-decoration: none; margin: 0 10px;">Instagram</a> | 
          <a href="https://urbanswing.co.nz" style="color: #9a16f5; text-decoration: none; margin: 0 10px;">Website</a>
        </p>
        <p style="color: #666; font-size: 0.9rem; margin-top: 20px;">
          Urban Swing Dance School<br>
          Auckland, New Zealand<br>
          <a href="mailto:dance@urbanswing.co.nz" style="color: #9a16f5;">dance@urbanswing.co.nz</a>
        </p>
      </div>
    </div>`;
}

function getAccountSetupTextTemplate() {
    return `Welcome Back to Urban Swing! 🎉

Hi \${student.firstName},

Great news! You've successfully set up your Urban Swing Student Portal account.

Account Details:
- Name: \${student.firstName} \${student.lastName}
- Email: \${user.email}
- Setup Date: \${setupDate}

You can now access your portal at: https://urbanswing.co.nz/student-portal/

What You Can Do in the Portal:
- View your class check-in history
- Manage your concession packages
- Update your profile information
- View transaction history
- Purchase new concessions

If you have any questions or need help with your account, don't hesitate to reach out to us at dance@urbanswing.co.nz.

See you on the dance floor! 💃🕺

The Urban Swing Team

---
Follow us:
Facebook: https://www.facebook.com/UrbanSwingNZ
Instagram: https://www.instagram.com/urbanswingnz
Website: https://urbanswing.co.nz
Email: dance@urbanswing.co.nz`;
}

function getErrorNotificationHtmlTemplate() {
    return `    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc3545; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">⚠️ System Error</h1>
      </div>
      
      <div style="padding: 30px; background: #fff;">
        <h2 style="color: #dc3545; margin-top: 0;">Failed to send student welcome email</h2>
        
        <p style="font-size: 1rem; line-height: 1.6; color: #333;">
          An error occurred while processing the registration for:
        </p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Name:</strong> \${student.firstName} \${student.lastName}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> \${student.email}</p>
          <p style="margin: 5px 0;"><strong>Student ID:</strong> \${studentId}</p>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            <strong>Error Message:</strong><br>
            \${error.message}
          </p>
        </div>
        
        <h3 style="color: #dc3545;">Action Required:</h3>
        <ul style="line-height: 1.8; color: #333;">
          <li>Check the pricing configuration in <strong>Admin Tools > Concession Types Manager</strong></li>
          <li>Ensure all casual rates are active (Casual Entry and Student Casual Entry)</li>
          <li>Ensure 5-class and 10-class concession packages are active</li>
          <li>Manually send the welcome email to the student once pricing is fixed</li>
        </ul>
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="https://console.firebase.google.com/project/directed-curve-447204-j4/functions/logs" 
             style="display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 6px; margin-right: 10px;">
            View Function Logs
          </a>
          <a href="https://urbanswing.co.nz/admin/admin-tools/concession-types.html" 
             style="display: inline-block; padding: 12px 24px; background: #9a16f5; color: white; text-decoration: none; border-radius: 6px;">
            Fix Pricing Configuration
          </a>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #666; font-size: 12px; background: #e9ecef;">
        <p>This is an automated error notification from Urban Swing student registration system.</p>
      </div>
    </div>`;
}

function getErrorNotificationTextTemplate() {
    return `⚠️ SYSTEM ERROR: Failed to send student welcome email

An error occurred while processing the registration for:

Name: \${student.firstName} \${student.lastName}
Email: \${student.email}
Student ID: \${studentId}

Error Message:
\${error.message}

ACTION REQUIRED:
- Check the pricing configuration in Admin Tools > Concession Types Manager
- Ensure all casual rates are active (Casual Entry and Student Casual Entry)
- Ensure 5-class and 10-class concession packages are active
- Manually send the welcome email to the student once pricing is fixed

View Function Logs: https://console.firebase.google.com/project/directed-curve-447204-j4/functions/logs
Fix Pricing Configuration: https://urbanswing.co.nz/admin/admin-tools/concession-types.html

This is an automated error notification from Urban Swing student registration system.`;
}

// Make restoreVersion available globally for onclick
window.restoreVersion = restoreVersion;
