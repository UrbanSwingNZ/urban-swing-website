/**
 * tabs.js
 * Tab switching functionality
 */

/**
 * Switch between tabs
 */
export function switchTab(tabName) {
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
 * Switch preview tabs
 */
export function switchPreviewTab(tabName) {
    document.querySelectorAll('.preview-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.previewTab === tabName);
    });
    
    document.querySelectorAll('.preview-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `preview-${tabName}`);
    });
}
