// merch-orders-data.js - Firestore data operations

import { showNotification } from './merch-orders-utils.js';

/**
 * Load all orders from Firestore
 */
export async function loadOrders() {
    try {
        const snapshot = await db.collection('merchOrders')
            .orderBy('createdAt', 'desc')
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
    } catch (error) {
        console.error('Error loading orders:', error);
        throw error;
    }
}

/**
 * Mark order as complete
 */
export async function markOrderComplete(orderId) {
    try {
        await db.collection('merchOrders').doc(orderId).update({
            status: 'completed'
        });
        showNotification('Order marked as complete', 'success');
        return true;
    } catch (error) {
        console.error('Error marking order as complete:', error);
        showNotification('Error updating order status. Please try again.', 'error');
        return false;
    }
}

/**
 * Delete order from Firestore
 */
export async function deleteOrderFromDb(orderId) {
    try {
        await db.collection('merchOrders').doc(orderId).delete();
        showNotification('Order deleted successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error deleting order:', error);
        showNotification('Error deleting order. Please try again.', 'error');
        return false;
    }
}
