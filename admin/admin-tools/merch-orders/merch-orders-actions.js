// merch-orders-actions.js - Order action functions

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';
import { escapeHtml } from './merch-orders-utils.js';
import { markOrderComplete as markCompleteInDb, toggleInvoicedStatus, deleteOrderFromDb, restoreOrderInDb } from './merch-orders-data.js';
import { getAllOrders, getDisplayedOrders, setDisplayedOrders } from './merch-orders-state.js';
import { renderOrders } from './merch-orders-render.js';

/**
 * Toggle invoiced status
 */
export async function toggleInvoiced(orderId) {
    const allOrders = getAllOrders();
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const newStatus = await toggleInvoicedStatus(orderId, order.invoiced || false);
    if (newStatus !== null) {
        // Update local data
        const orderIndex = allOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].invoiced = newStatus;
        }
        
        const displayedOrders = getDisplayedOrders();
        const displayedIndex = displayedOrders.findIndex(o => o.id === orderId);
        if (displayedIndex !== -1) {
            displayedOrders[displayedIndex].invoiced = newStatus;
        }
        
        renderOrders();
    }
}

/**
 * Toggle order completion status
 */
export async function markOrderComplete(orderId) {
    const allOrders = getAllOrders();
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const newStatus = order.status === 'completed' ? null : 'completed';
    const success = await markCompleteInDb(orderId, newStatus);
    if (success) {
        // Update local data
        const orderIndex = allOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].status = newStatus;
        }
        
        const displayedOrders = getDisplayedOrders();
        const displayedIndex = displayedOrders.findIndex(o => o.id === orderId);
        if (displayedIndex !== -1) {
            displayedOrders[displayedIndex].status = newStatus;
        }
        
        renderOrders();
    }
}

/**
 * Delete order (soft delete)
 */
export function deleteOrder(orderId) {
    const allOrders = getAllOrders();
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const modal = new ConfirmationModal({
        title: 'Delete Order',
        message: `Are you sure you want to delete the order from <strong>${escapeHtml(order.fullName)}</strong>? The order can be restored later.`,
        icon: 'fas fa-exclamation-triangle',
        variant: 'danger',
        confirmText: 'Delete',
        confirmClass: 'btn-danger',
        cancelClass: 'btn-cancel',
        onConfirm: async () => {
            const success = await deleteOrderFromDb(orderId);
            if (success) {
                // Update local data
                const orderIndex = allOrders.findIndex(o => o.id === orderId);
                if (orderIndex !== -1) {
                    allOrders[orderIndex].deleted = true;
                }
                
                // Re-filter to hide deleted order if checkbox is unchecked
                const showDeleted = document.getElementById('show-deleted-checkbox')?.checked || false;
                let displayedOrders = getDisplayedOrders();
                if (!showDeleted) {
                    displayedOrders = displayedOrders.filter(o => o.id !== orderId);
                    setDisplayedOrders(displayedOrders);
                } else {
                    const displayedIndex = displayedOrders.findIndex(o => o.id === orderId);
                    if (displayedIndex !== -1) {
                        displayedOrders[displayedIndex].deleted = true;
                    }
                }
                
                renderOrders();
            }
        }
    });

    modal.show();
}

/**
 * Restore deleted order
 */
export async function restoreOrder(orderId) {
    const success = await restoreOrderInDb(orderId);
    if (success) {
        const allOrders = getAllOrders();
        const displayedOrders = getDisplayedOrders();
        
        // Update local data
        const orderIndex = allOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].deleted = false;
        }
        
        const displayedIndex = displayedOrders.findIndex(o => o.id === orderId);
        if (displayedIndex !== -1) {
            displayedOrders[displayedIndex].deleted = false;
        }
        
        renderOrders();
    }
}
