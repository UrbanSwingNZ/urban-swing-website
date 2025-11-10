/**
 * version-history.js
 * Version history modal and restore functionality
 */

import { state, setHasUnsavedChanges } from '../core/state.js';
import { showLoading, showSuccess, showError } from './notifications.js';
import { selectTemplate } from '../firebase/template-operations.js';
import { formatDate } from '../utils/format.js';

/* global db, firebase */

/**
 * Show version history modal
 */
export async function showVersionHistory() {
    if (!state.currentTemplate) return;
    
    const modal = document.getElementById('history-modal');
    const container = document.getElementById('version-list');
    
    const versions = state.currentTemplate.versions || [];
    
    if (versions.length === 0) {
        container.innerHTML = '<p style="color: #999;">No version history available</p>';
    } else {
        let html = '';
        
        // Sort versions by version number (descending)
        const sortedVersions = [...versions].sort((a, b) => b.version - a.version);
        
        sortedVersions.forEach(version => {
            const isCurrent = version.version === state.currentTemplate.currentVersion;
            html += `
                <div class="version-item ${isCurrent ? 'current' : ''}">
                    <div class="version-header">
                        <div class="version-info">
                            <span class="version-number">Version ${version.version}</span>
                            ${isCurrent ? '<span class="version-badge">Current</span>' : ''}
                        </div>
                        <div class="version-actions">
                            ${!isCurrent ? `<button class="btn-secondary" onclick="window.restoreVersion(${version.version})">
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
export async function restoreVersion(versionNumber) {
    if (!state.currentTemplate) return;
    
    if (!confirm(`Are you sure you want to restore Version ${versionNumber}? This will create a new version with the old content.`)) {
        return;
    }
    
    try {
        showLoading(true);
        
        const version = state.currentTemplate.versions.find(v => v.version === versionNumber);
        if (!version) {
            throw new Error('Version not found');
        }
        
        // Create new version with restored content
        const newVersion = {
            version: state.currentTemplate.currentVersion + 1,
            createdAt: new Date(), // Use regular Date for arrays
            createdBy: state.currentUser.email,
            subject: version.subject,
            htmlTemplate: version.htmlTemplate,
            textTemplate: version.textTemplate,
            changeNote: `Restored from Version ${versionNumber}`
        };
        
        // Update document
        await db.collection('emailTemplates').doc(state.currentTemplate.id).update({
            subject: version.subject,
            htmlTemplate: version.htmlTemplate,
            textTemplate: version.textTemplate,
            currentVersion: newVersion.version,
            versions: firebase.firestore.FieldValue.arrayUnion(newVersion),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: state.currentUser.email
        });
        
        // Reload
        await selectTemplate(state.currentTemplate.id);
        document.getElementById('history-modal').classList.remove('active');
        
        showSuccess(`Version ${versionNumber} restored successfully!`);
        showLoading(false);
    } catch (error) {
        console.error('Error restoring version:', error);
        showError('Failed to restore version: ' + error.message);
        showLoading(false);
    }
}
