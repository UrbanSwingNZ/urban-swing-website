// merchandise-firestore.js - Firestore operations for merchandise orders

/**
 * Generate custom document ID from customer name and timestamp
 * Format: merchOrder_fullName_YYYY-MM-DD_HHMMSS
 */
function generateOrderId(fullName) {
    const now = new Date();
    const datePart = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timePart = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS
    
    // Clean and format name (lowercase, replace spaces with underscores)
    const cleanName = fullName.trim().toLowerCase().replace(/\s+/g, '_');
    
    return `merchOrder_${cleanName}_${datePart}_${timePart}`;
}

/**
 * Filter out items with zero quantity
 */
function filterItems(items) {
    const filtered = {};
    
    for (const [itemName, itemData] of Object.entries(items)) {
        if (itemData.quantity > 0) {
            filtered[itemName] = itemData;
        }
    }
    
    return filtered;
}

/**
 * Save merchandise order to Firestore
 * @param {Object} orderData - The complete order data including customer info and items
 * @returns {Promise<string>} - The generated order ID
 */
async function saveMerchOrder(orderData) {
    // Filter out items with zero quantity
    const filteredItems = filterItems(orderData.items);
    
    // Build Firestore document
    const firestoreDoc = {
        email: orderData.email,
        fullName: orderData.fullName,
        address: orderData.address,
        phoneNumber: orderData.phoneNumber,
        shipping: orderData.shipping,
        acceptTerms: orderData.acceptTerms,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Add optional fields if present
    if (orderData.eventName) {
        firestoreDoc.eventName = orderData.eventName;
    }
    
    if (orderData.chosenName) {
        firestoreDoc.chosenName = orderData.chosenName;
    }
    
    if (orderData.additionalNotes) {
        firestoreDoc.additionalNotes = orderData.additionalNotes;
    }
    
    // Add filtered items
    if (Object.keys(filteredItems).length > 0) {
        firestoreDoc.items = filteredItems;
    }
    
    // Generate custom document ID
    const orderId = generateOrderId(orderData.fullName);
    
    // Save to Firestore
    await firebase.firestore()
        .collection('merchOrders')
        .doc(orderId)
        .set(firestoreDoc);
    
    return orderId;
}
