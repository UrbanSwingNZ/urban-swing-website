/**
 * Rates Loader Module
 * Handles loading casual rates data from Firestore
 */

let casualRatesData = [];

/**
 * Get the current casual rates data
 * @returns {Array} Array of rate objects with id and data properties
 */
export function getCasualRatesData() {
    return casualRatesData;
}

/**
 * Load casual rates from Firestore
 * @returns {Promise<Array>} Loaded rates data
 */
export async function loadCasualRates() {
    console.log('Loading casualRates from Firestore...');
    
    let snapshot;
    try {
        snapshot = await db.collection('casualRates')
            .orderBy('displayOrder', 'asc')
            .get();
    } catch (orderError) {
        console.warn('OrderBy failed, using simple get:', orderError);
        snapshot = await db.collection('casualRates').get();
    }

    console.log(`Found ${snapshot.size} casual rates`);

    // Sort rates by displayOrder
    casualRatesData = [];
    snapshot.forEach(doc => {
        casualRatesData.push({ id: doc.id, data: doc.data() });
    });
    
    casualRatesData.sort((a, b) => (a.data.displayOrder || 999) - (b.data.displayOrder || 999));

    return casualRatesData;
}

/**
 * Update display orders after drag and drop
 * @param {HTMLElement} container - Container element with rate cards
 * @returns {Promise<void>}
 */
export async function updateRateDisplayOrders(container) {
    const cards = container.querySelectorAll('.casual-rate-card');
    
    const batch = db.batch();
    
    cards.forEach((card, index) => {
        const rateId = card.getAttribute('data-rate-id');
        const rateRef = db.collection('casualRates').doc(rateId);
        batch.update(rateRef, { displayOrder: index + 1 });
    });
    
    try {
        await batch.commit();
        console.log('Display orders updated successfully');
        if (typeof showSnackbar === 'function') {
            showSnackbar('Rate order updated', 'success');
        }
    } catch (error) {
        console.error('Error updating display orders:', error);
        if (typeof showSnackbar === 'function') {
            showSnackbar('Error updating order: ' + error.message, 'error');
        }
    }
}

/**
 * Handle rate status toggle
 * @param {string} rateId - ID of the rate to toggle
 * @param {boolean} isActive - New active status
 * @returns {Promise<void>}
 */
export async function handleRateStatusToggle(rateId, isActive) {
    try {
        await db.collection('casualRates').doc(rateId).update({
            isActive: isActive,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const card = document.querySelector(`[data-rate-id="${rateId}"]`);
        if (card) {
            if (isActive) {
                card.classList.remove('inactive');
                card.classList.add('active');
            } else {
                card.classList.remove('active');
                card.classList.add('inactive');
            }
            
            const statusLabel = card.querySelector('.status-label');
            if (statusLabel) {
                statusLabel.textContent = isActive ? 'Active' : 'Inactive';
                statusLabel.className = `status-label ${isActive ? 'active' : 'inactive'}`;
            }
        }
        
        if (typeof showSnackbar === 'function') {
            showSnackbar(`Rate ${isActive ? 'activated' : 'deactivated'}`, 'success');
        }
    } catch (error) {
        console.error('Error toggling rate status:', error);
        if (typeof showSnackbar === 'function') {
            showSnackbar('Error updating status: ' + error.message, 'error');
        }
    }
}
