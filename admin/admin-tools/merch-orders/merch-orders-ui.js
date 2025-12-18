// merch-orders-ui.js - UI rendering and interactions

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';
import { formatDate, getShippingLabel, formatItemName, escapeHtml } from './merch-orders-utils.js';
import { markOrderComplete as markCompleteInDb, deleteOrderFromDb } from './merch-orders-data.js';

// UI state
let allOrders = [];
let displayedOrders = [];
let currentSort = { field: 'createdAt', direction: 'desc' };

/**
 * Set orders data
 */
export function setOrders(orders) {
    allOrders = orders;
    displayedOrders = [...orders];
}

/**
 * Get all orders
 */
export function getAllOrders() {
    return allOrders;
}

/**
 * Get displayed orders
 */
export function getDisplayedOrders() {
    return displayedOrders;
}

/**
 * Render orders in the table
 */
export function renderOrders() {
    const tbody = document.getElementById('orders-tbody');
    const emptyState = document.getElementById('empty-state');

    if (displayedOrders.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = displayedOrders.map(order => {
        const itemCount = order.items ? Object.keys(order.items).length : 0;
        const shippingLabel = getShippingLabel(order.shipping);
        
        return `
            <tr onclick="viewOrderDetails('${order.id}')">
                <td>${formatDate(order.createdAt)}</td>
                <td><strong>${escapeHtml(order.fullName)}</strong></td>
                <td>${escapeHtml(order.email)}</td>
                <td>${escapeHtml(order.phoneNumber)}</td>
                <td>${shippingLabel}</td>
                <td class="items-summary">${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                <td><span class="badge badge-${order.status || 'pending'}">${order.status || 'pending'}</span></td>
                <td onclick="event.stopPropagation()">
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="viewOrderDetails('${order.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon ${order.status === 'completed' ? 'btn-disabled' : ''}" 
                                onclick="markOrderComplete('${order.id}')" 
                                title="${order.status === 'completed' ? 'Order already completed' : 'Mark as Complete'}"
                                ${order.status === 'completed' ? 'disabled' : ''}>
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteOrder('${order.id}')" title="Delete Order">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * View order details in modal
 */
export function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('order-modal');
    const content = document.getElementById('order-details-content');

    content.innerHTML = `
        <div class="order-detail-section">
            <h3>Customer Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Full Name</span>
                    <span class="detail-value">${escapeHtml(order.fullName)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">${escapeHtml(order.email)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Phone Number</span>
                    <span class="detail-value">${escapeHtml(order.phoneNumber)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Address</span>
                    <span class="detail-value">${escapeHtml(order.address)}</span>
                </div>
            </div>
        </div>

        <div class="order-detail-section">
            <h3>Shipping Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Shipping Method</span>
                    <span class="detail-value">${order.shipping === 'collect-event' && order.eventName ? `Collect at ${escapeHtml(order.eventName)}` : getShippingLabel(order.shipping)}</span>
                </div>
                ${order.eventName && order.shipping === 'collect-event' ? '' : order.eventName ? `
                <div class="detail-item">
                    <span class="detail-label">Event Name</span>
                    <span class="detail-value">${escapeHtml(order.eventName)}</span>
                </div>
                ` : ''}
            </div>
        </div>

        ${order.items ? `
        <div class="order-detail-section">
            <h3>Ordered Items</h3>
            <ul class="items-list">
                ${Object.entries(order.items).map(([key, item]) => `
                    <li>
                        <div>
                            <span class="item-name">${formatItemName(key)}</span>
                            <span class="item-details">Size: ${item.size || 'N/A'} | Qty: ${item.quantity}</span>
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>
        ` : ''}

        ${order.chosenName ? `
        <div class="order-detail-section">
            <h3>Personalization</h3>
            <div class="detail-item">
                <span class="detail-label">Chosen Name for Garment</span>
                <span class="detail-value">${escapeHtml(order.chosenName)}</span>
            </div>
        </div>
        ` : ''}

        ${order.additionalNotes ? `
        <div class="order-detail-section">
            <h3>Additional Notes</h3>
            <div class="detail-item">
                <span class="detail-value">${escapeHtml(order.additionalNotes)}</span>
            </div>
        </div>
        ` : ''}

        <div class="order-detail-section">
            <h3>Order Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Order ID</span>
                    <span class="detail-value">${order.id}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <span class="detail-value"><span class="badge badge-${order.status || 'pending'}">${order.status || 'pending'}</span></span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Order Date</span>
                    <span class="detail-value">${formatDate(order.createdAt, true)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Terms Accepted</span>
                    <span class="detail-value">${order.acceptTerms ? 'Yes' : 'No'}</span>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

/**
 * Close order modal
 */
export function closeOrderModal() {
    document.getElementById('order-modal').style.display = 'none';
}

/**
 * Mark order as complete
 */
export async function markOrderComplete(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order || order.status === 'completed') return;

    const success = await markCompleteInDb(orderId);
    if (success) {
        // Update local data
        const orderIndex = allOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].status = 'completed';
        }
        
        const displayedIndex = displayedOrders.findIndex(o => o.id === orderId);
        if (displayedIndex !== -1) {
            displayedOrders[displayedIndex].status = 'completed';
        }
        
        renderOrders();
    }
}

/**
 * Delete order
 */
export function deleteOrder(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const modal = new ConfirmationModal({
        title: 'Delete Order',
        message: `Are you sure you want to permanently delete the order from <strong>${escapeHtml(order.fullName)}</strong>? This action cannot be undone.`,
        icon: 'fas fa-exclamation-triangle',
        variant: 'danger',
        confirmText: 'Delete',
        confirmClass: 'btn-danger',
        cancelClass: 'btn-cancel',
        onConfirm: async () => {
            const success = await deleteOrderFromDb(orderId);
            if (success) {
                // Remove from local arrays
                allOrders = allOrders.filter(o => o.id !== orderId);
                displayedOrders = displayedOrders.filter(o => o.id !== orderId);
                
                updateOrderCount();
                renderOrders();
            }
        }
    });

    modal.show();
}

/**
 * Handle search
 */
export function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    const clearBtn = document.getElementById('clear-search');
    const resultsInfo = document.getElementById('search-results-info');

    clearBtn.style.display = query ? 'block' : 'none';

    if (!query) {
        displayedOrders = [...allOrders];
        resultsInfo.style.display = 'none';
    } else {
        displayedOrders = allOrders.filter(order => 
            order.fullName?.toLowerCase().includes(query) ||
            order.email?.toLowerCase().includes(query) ||
            order.phoneNumber?.includes(query) ||
            order.id?.toLowerCase().includes(query)
        );

        resultsInfo.textContent = `Found ${displayedOrders.length} order${displayedOrders.length !== 1 ? 's' : ''}`;
        resultsInfo.style.display = 'block';
    }

    renderOrders();
}

/**
 * Clear search
 */
export function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('clear-search').style.display = 'none';
    document.getElementById('search-results-info').style.display = 'none';
    displayedOrders = [...allOrders];
    renderOrders();
}

/**
 * Handle table sorting
 */
export function handleSort(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort = { field, direction: 'asc' };
    }

    displayedOrders.sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];

        // Handle dates
        if (field === 'createdAt') {
            aVal = aVal?.getTime() || 0;
            bVal = bVal?.getTime() || 0;
        }

        // Handle strings
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = (bVal || '').toLowerCase();
        }

        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return currentSort.direction === 'asc' ? comparison : -comparison;
    });

    updateSortIcons();
    renderOrders();
}

/**
 * Update sort icons
 */
function updateSortIcons() {
    document.querySelectorAll('.sortable').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.dataset.sort === currentSort.field) {
            header.classList.add(`sort-${currentSort.direction}`);
        }
    });
}

/**
 * Update order count display
 */
export function updateOrderCount() {
    document.getElementById('order-count').textContent = allOrders.length;
}
