// merch-orders-render.js - Rendering functions

import { formatDate, getShippingLabel, formatItemName, escapeHtml, getBadgeStatus, getBadgeLabel, toTitleCase } from './merch-orders-utils.js';
import { getDisplayedOrders, getAllOrders } from './merch-orders-state.js';

/**
 * Render orders in the table
 */
export function renderOrders() {
    const tbody = document.getElementById('orders-tbody');
    const emptyState = document.getElementById('empty-state');
    const displayedOrders = getDisplayedOrders();

    if (displayedOrders.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = displayedOrders.map(order => {
        const itemCount = order.items ? Object.keys(order.items).length : 0;
        const shippingLabel = getShippingLabel(order.shipping);
        const isDeleted = order.deleted === true;
        const badgeStatus = getBadgeStatus(order);
        const badgeLabel = getBadgeLabel(badgeStatus);
        
        // Determine action button (restore for deleted, delete for active)
        const actionButton = isDeleted
            ? `<button class="btn-icon" onclick="restoreOrder('${order.id}')" title="Restore Order">
                    <i class="fas fa-undo"></i>
                </button>`
            : `<button class="btn-icon btn-delete" onclick="deleteOrder('${order.id}')" title="Delete Order">
                    <i class="fas fa-trash"></i>
                </button>`;
        
        return `
            <tr class="${isDeleted ? 'deleted-order' : ''}" onclick="viewOrderDetails('${order.id}')">
                <td>${formatDate(order.createdAt)}</td>
                <td><strong>${escapeHtml(toTitleCase(order.fullName))}</strong></td>
                <td>${escapeHtml(order.email)}</td>
                <td>${escapeHtml(order.phoneNumber)}</td>
                <td>${shippingLabel}</td>
                <td class="items-summary">${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                <td><span class="badge badge-${badgeStatus}">${badgeLabel}</span></td>
                <td onclick="event.stopPropagation()">
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="viewOrderDetails('${order.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-invoice ${order.invoiced ? 'invoiced' : ''}" 
                                onclick="toggleInvoiced('${order.id}')" 
                                title="${isDeleted ? 'Cannot invoice deleted order' : (order.invoiced ? 'Mark as Not Invoiced' : 'Mark as Invoiced')}"
                                ${isDeleted ? 'disabled style="opacity: 0.3;"' : ''}>
                            <i class="fas fa-file-invoice"></i>
                        </button>
                        <button class="btn-icon btn-complete ${order.status === 'completed' ? 'completed' : ''} ${isDeleted ? 'btn-disabled' : ''}" 
                                onclick="markOrderComplete('${order.id}')" 
                                title="${isDeleted ? 'Cannot toggle completion for deleted order' : (order.status === 'completed' ? 'Mark as Incomplete' : 'Mark as Complete')}"
                                ${isDeleted ? 'disabled style="opacity: 0.3;"' : ''}>
                            <i class="fas fa-check"></i>
                        </button>
                        ${actionButton}
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
    const allOrders = getAllOrders();
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
                    <span class="detail-value">${escapeHtml(toTitleCase(order.fullName))}</span>
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
 * Update order count display
 */
export function updateOrderCount() {
    const displayedOrders = getDisplayedOrders();
    document.getElementById('order-count').textContent = displayedOrders.length;
}
