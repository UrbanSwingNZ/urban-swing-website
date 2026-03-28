/**
 * Workshop Display & Rendering
 * Handles table rendering, empty states, and workshop row display
 */

import { filteredWorkshops, formatDate, formatCost } from './workshop-manager.js';

// ============================================
// MAIN RENDERING FUNCTION
// ============================================

function renderWorkshops() {
    const tbody = document.getElementById('workshops-tbody');
    const cardsContainer = document.getElementById('workshops-cards-container');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const tableContainer = document.getElementById('workshops-table-container');
    
    if (!tbody || !cardsContainer || !loadingState || !emptyState || !tableContainer) {
        console.error('Required DOM elements not found');
        return;
    }
    
    // Handle empty state
    if (filteredWorkshops.length === 0) {
        loadingState.style.display = 'none';
        tableContainer.style.display = 'none';
        cardsContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    // Show table and clear inline styles to let CSS control card visibility
    loadingState.style.display = 'none';
    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';
    cardsContainer.style.display = ''; // Clear inline style, let CSS media query control visibility
    
    // Render table rows
    tbody.innerHTML = filteredWorkshops.map(workshop => renderWorkshopRow(workshop)).join('');
    
    // Render cards (for mobile - visibility controlled by CSS media query)
    cardsContainer.innerHTML = filteredWorkshops.map(workshop => renderWorkshopCard(workshop)).join('');
}

// ============================================
// WORKSHOP ROW RENDERING
// ============================================

function renderWorkshopRow(workshop) {
    const visibilityBadge = getVisibilityBadge(workshop.openToAll);
    const registrationCount = workshop.registeredStudents?.length || 0;
    const videoCount = workshop.videos?.length || 0;
    const formattedDate = formatDate(workshop.date);
    
    return `
        <tr data-workshop-id="${workshop.id}">
            <td>
                <strong>${workshop.name}</strong>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${workshop.topic || ''}</div>
            </td>
            <td>${formattedDate}</td>
            <td>${visibilityBadge}</td>
            <td class="text-center">
                <span class="count-badge">
                    <i class="fas fa-users"></i> ${registrationCount}
                </span>
            </td>
            <td class="text-center">
                <span class="count-badge">
                    <i class="fas fa-video"></i> ${videoCount}
                </span>
            </td>
            <td class="action-buttons">
                <button class="btn-icon" onclick="window.openEditWorkshopModal('${workshop.id}')" title="Edit Workshop">
                    <i class="fas fa-edit"></i>
                </button>
                ${!workshop.openToAll ? `
                    <button class="btn-icon" onclick="window.openManageInvitesModal('${workshop.id}')" title="Manage Invites">
                        <i class="fas fa-user-plus"></i>
                    </button>
                ` : ''}
                <button class="btn-icon btn-video" onclick="window.openManageVideosModal('${workshop.id}')" title="Manage Videos">
                    <i class="fas fa-video"></i>
                </button>
                <button class="btn-icon btn-delete" onclick="window.confirmDeleteWorkshop('${workshop.id}')" 
                    ${registrationCount > 0 ? 'disabled title="Cannot delete workshop with registrations"' : 'title="Delete Workshop"'}>
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    `;
}

// ============================================
// WORKSHOP CARD RENDERING (MOBILE)
// ============================================

function renderWorkshopCard(workshop) {
    const visibilityBadge = getVisibilityBadge(workshop.openToAll);
    const registrationCount = workshop.registeredStudents?.length || 0;
    const videoCount = workshop.videos?.length || 0;
    const formattedDate = formatDate(workshop.date);
    
    return `
        <div class="workshop-card" data-workshop-id="${workshop.id}">
            <div class="workshop-card-header">
                <strong>${workshop.name}</strong>
                <div class="workshop-card-date">${formattedDate}</div>
                <div class="workshop-card-topic">${workshop.topic || ''}</div>
            </div>
            
            <div class="workshop-card-info">
                ${visibilityBadge}
                <span class="count-badge">
                    <i class="fas fa-users"></i> ${registrationCount}
                </span>
                <span class="count-badge">
                    <i class="fas fa-video"></i> ${videoCount}
                </span>
            </div>
            
            <div class="workshop-card-actions">
                <button class="btn-icon" onclick="window.openEditWorkshopModal('${workshop.id}')" title="Edit Workshop">
                    <i class="fas fa-edit"></i>
                </button>
                ${!workshop.openToAll ? `
                    <button class="btn-icon" onclick="window.openManageInvitesModal('${workshop.id}')" title="Manage Invites">
                        <i class="fas fa-user-plus"></i>
                    </button>
                ` : ''}
                <button class="btn-icon btn-video" onclick="window.openManageVideosModal('${workshop.id}')" title="Manage Videos">
                    <i class="fas fa-video"></i>
                </button>
                <button class="btn-icon btn-delete" onclick="window.confirmDeleteWorkshop('${workshop.id}')" 
                    ${registrationCount > 0 ? 'disabled title="Cannot delete workshop with registrations"' : 'title="Delete Workshop"'}>
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `;
}

// ============================================
// BADGE HELPERS
// ============================================

function getVisibilityBadge(openToAll) {
    if (openToAll) {
        return `<span class="visibility-badge open-to-all">
            <i class="fas fa-globe"></i> Open to All
        </span>`;
    } else {
        return `<span class="visibility-badge invite-only">
            <i class="fas fa-lock"></i> Invite Only
        </span>`;
    }
}

// ============================================
// EXPORTS
// ============================================

// Expose to window for workshop-manager.js to call
window.renderWorkshops = renderWorkshops;

export { renderWorkshops };
