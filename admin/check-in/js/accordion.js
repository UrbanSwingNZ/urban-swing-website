/**
 * accordion.js
 * Handles accordion functionality for collapsible sections
 */

/**
 * Initialize accordion headers
 */
function initializeAccordions() {
    // Check-ins accordion
    const checkinsHeader = document.getElementById('checkins-header');
    if (checkinsHeader) {
        checkinsHeader.addEventListener('click', (e) => {
            // Don't toggle if clicking on buttons or toggles
            if (e.target.closest('.btn-secondary') || 
                e.target.closest('.toggle-switch') || 
                e.target.closest('.toggle-label')) {
                return;
            }
            toggleAccordion('checkins');
        });
    }
    
    // Transactions accordion
    const transactionsHeader = document.getElementById('transactions-header');
    if (transactionsHeader) {
        transactionsHeader.addEventListener('click', () => {
            toggleAccordion('transactions');
        });
    }
}

/**
 * Toggle accordion open/closed
 */
function toggleAccordion(section) {
    const header = document.getElementById(`${section}-header`);
    const content = document.getElementById(`${section}-content`);
    
    if (!header || !content) return;
    
    // Toggle collapsed state
    const isCollapsed = header.classList.contains('collapsed');
    
    if (isCollapsed) {
        // Expand
        header.classList.remove('collapsed');
        content.classList.remove('collapsed');
    } else {
        // Collapse
        header.classList.add('collapsed');
        content.classList.add('collapsed');
    }
}

/**
 * Expand a specific accordion section
 */
function expandAccordion(section) {
    const header = document.getElementById(`${section}-header`);
    const content = document.getElementById(`${section}-content`);
    
    if (!header || !content) return;
    
    header.classList.remove('collapsed');
    content.classList.remove('collapsed');
}

/**
 * Collapse a specific accordion section
 */
function collapseAccordion(section) {
    const header = document.getElementById(`${section}-header`);
    const content = document.getElementById(`${section}-content`);
    
    if (!header || !content) return;
    
    header.classList.add('collapsed');
    content.classList.add('collapsed');
}
