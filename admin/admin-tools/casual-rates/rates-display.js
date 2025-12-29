/**
 * Rates Display Module
 * Handles rendering and displaying casual rates in the UI
 */

import { loadCasualRates, updateRateDisplayOrders, handleRateStatusToggle } from './rates-loader.js';
import { openRateModal, confirmDeleteRate } from './rates-actions.js';

/**
 * Utility function to escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Display casual rates in the container
 * @returns {Promise<void>}
 */
export async function displayCasualRates() {
    const container = document.getElementById('casual-rates-container');
    
    if (!container) {
        console.log('Casual rates container not found on this page');
        return;
    }
    
    container.innerHTML = '<div class="empty-state-rates"><i class="fas fa-spinner fa-spin"></i><h3>Loading rates...</h3></div>';

    try {
        const casualRatesData = await loadCasualRates();

        if (casualRatesData.length === 0) {
            container.innerHTML = `
                <div class="empty-state-rates">
                    <i class="fas fa-dollar-sign"></i>
                    <h3>No Casual Rates</h3>
                    <p>Click "Add Casual Rate" to create your first rate.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        casualRatesData.forEach(rate => {
            container.appendChild(createRateCard(rate.id, rate.data));
        });

    } catch (error) {
        console.error('Error loading casual rates:', error);
        container.innerHTML = `
            <div class="empty-state-rates">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Rates</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

/**
 * Create a casual rate card
 * @param {string} id - Rate document ID
 * @param {Object} rate - Rate data
 * @returns {HTMLElement} Rate card element
 */
function createRateCard(id, rate) {
    const card = document.createElement('div');
    const isActive = rate.isActive !== false;
    const isPromo = rate.isPromo === true;
    
    card.className = `casual-rate-card ${isActive ? 'active' : 'inactive'} ${isPromo ? 'promo' : ''}`;
    card.setAttribute('data-rate-id', id);
    card.setAttribute('draggable', 'true');
    
    let badges = '';
    if (isPromo) {
        badges += '<span class="promo-badge"><i class="fas fa-star"></i> PROMO <i class="fas fa-star"></i></span>';
    }
    
    card.innerHTML = `
        <div class="rate-drag-handle" title="Drag to reorder">
            <i class="fas fa-grip-vertical"></i>
        </div>
        
        <div class="rate-status-toggle">
            <label class="toggle-switch" title="${isActive ? 'Click to deactivate' : 'Click to activate'}">
                <input type="checkbox" ${isActive ? 'checked' : ''} data-rate-id="${id}" class="rate-status-toggle-input">
                <span class="toggle-slider"></span>
            </label>
            <span class="status-label ${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span>
        </div>
        
        <h3 class="rate-name">${escapeHtml(rate.name)}</h3>
        
        <div class="rate-price">$${rate.price.toFixed(2)}</div>
        
        ${badges ? `<div class="rate-badges">${badges}</div>` : ''}
        
        ${rate.description ? `<div class="rate-description">${escapeHtml(rate.description)}</div>` : ''}
        
        <div class="rate-actions">
            <button class="btn-primary btn-edit-rate" data-rate-id="${id}">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-delete" data-rate-id="${id}" data-rate-name="${escapeHtml(rate.name)}">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    // Setup drag listeners
    setupRateDragListeners(card);
    
    // Setup toggle listener
    const toggleInput = card.querySelector('.rate-status-toggle-input');
    toggleInput.addEventListener('change', (e) => {
        e.stopPropagation();
        handleRateStatusToggle(id, e.target.checked);
    });
    
    // Setup button listeners
    const editBtn = card.querySelector('.btn-edit-rate');
    editBtn.addEventListener('click', () => openRateModal(id));
    
    const deleteBtn = card.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', () => confirmDeleteRate(id, rate.name));
    
    return card;
}

/**
 * Setup drag and drop for rate cards
 * @param {HTMLElement} card - Rate card element
 */
function setupRateDragListeners(card) {
    card.addEventListener('dragstart', handleRateDragStart);
    card.addEventListener('dragend', handleRateDragEnd);
    card.addEventListener('dragover', handleRateDragOver);
    card.addEventListener('drop', handleRateDrop);
    card.addEventListener('dragenter', handleRateDragEnter);
    card.addEventListener('dragleave', handleRateDragLeave);
}

let draggedRateElement = null;

function handleRateDragStart(e) {
    draggedRateElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleRateDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.casual-rate-card').forEach(card => {
        card.classList.remove('drag-over');
    });
}

function handleRateDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleRateDragEnter(e) {
    if (this !== draggedRateElement) {
        this.classList.add('drag-over');
    }
}

function handleRateDragLeave(e) {
    this.classList.remove('drag-over');
}

async function handleRateDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedRateElement !== this) {
        const container = document.getElementById('casual-rates-container');
        const allCards = Array.from(container.querySelectorAll('.casual-rate-card'));
        const draggedIndex = allCards.indexOf(draggedRateElement);
        const targetIndex = allCards.indexOf(this);
        
        if (draggedIndex < targetIndex) {
            this.parentNode.insertBefore(draggedRateElement, this.nextSibling);
        } else {
            this.parentNode.insertBefore(draggedRateElement, this);
        }
        
        await updateRateDisplayOrders(container);
    }
    
    return false;
}
