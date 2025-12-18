// merch-orders-data.js - Firestore data operations

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
 * Toggle order completion status
 */
export async function markOrderComplete(orderId, newStatus) {
    try {
        await db.collection('merchOrders').doc(orderId).update({
            status: newStatus
        });
        return true;
    } catch (error) {
        console.error('Error toggling order completion:', error);
        return false;
    }
}

/**
 * Toggle invoiced status
 */
export async function toggleInvoicedStatus(orderId, currentStatus) {
    try {
        const newStatus = !currentStatus;
        await db.collection('merchOrders').doc(orderId).update({
            invoiced: newStatus
        });
        return newStatus;
    } catch (error) {
        console.error('Error toggling invoiced status:', error);
        return null;
    }
}

/**
 * Delete order from Firestore (soft delete)
 */
export async function deleteOrderFromDb(orderId) {
    try {
        await db.collection('merchOrders').doc(orderId).update({
            deleted: true,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error deleting order:', error);
        return false;
    }
}

/**
 * Restore deleted order
 */
export async function restoreOrderInDb(orderId) {
    try {
        await db.collection('merchOrders').doc(orderId).update({
            deleted: false
        });
        return true;
    } catch (error) {
        console.error('Error restoring order:', error);
        return false;
    }
}
