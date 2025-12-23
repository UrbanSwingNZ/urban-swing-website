/**
 * Rates Actions Module
 * Handles create, edit, and delete operations for casual rates
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';
import { getCasualRatesData } from './rates-loader.js';
import { displayCasualRates } from './rates-display.js';

/**
 * Utility function to escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Open add/edit rate modal
 * @param {string|null} rateId - Rate ID to edit, or null for new rate
 */
export function openRateModal(rateId = null) {
    const modal = document.getElementById('rate-modal');
    const modalTitle = document.getElementById('rate-modal-title');
    const form = document.getElementById('rate-form');
    
    if (rateId) {
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Casual Rate';
        const casualRatesData = getCasualRatesData();
        const rate = casualRatesData.find(r => r.id === rateId);
        if (rate) {
            document.getElementById('rate-name').value = rate.data.name || '';
            document.getElementById('rate-price').value = rate.data.price || '';
            document.getElementById('rate-description').value = rate.data.description || '';
            document.getElementById('rate-is-promo').checked = rate.data.isPromo || false;
            document.getElementById('rate-is-active').checked = rate.data.isActive !== false;
        }
        form.setAttribute('data-rate-id', rateId);
    } else {
        modalTitle.innerHTML = '<i class="fas fa-plus"></i> Add Casual Rate';
        document.getElementById('rate-name').value = '';
        document.getElementById('rate-price').value = '';
        document.getElementById('rate-description').value = '';
        document.getElementById('rate-is-promo').checked = false;
        document.getElementById('rate-is-active').checked = true;
        form.removeAttribute('data-rate-id');
    }
    
    modal.style.display = 'flex';
}

/**
 * Close rate modal
 */
export function closeRateModal() {
    const modal = document.getElementById('rate-modal');
    modal.style.display = 'none';
}

/**
 * Save casual rate (create or update)
 * @param {Event} e - Form submit event
 * @returns {Promise<void>}
 */
export async function saveCasualRate(e) {
    e.preventDefault();
    
    const form = document.getElementById('rate-form');
    const rateId = form.getAttribute('data-rate-id');
    
    const name = document.getElementById('rate-name').value.trim();
    const priceStr = document.getElementById('rate-price').value.trim();
    const description = document.getElementById('rate-description').value.trim();
    const isPromo = document.getElementById('rate-is-promo').checked;
    const isActive = document.getElementById('rate-is-active').checked;
    
    if (!name || !priceStr) {
        if (typeof showSnackbar === 'function') {
            showSnackbar('Please fill in all required fields', 'error');
        }
        return;
    }
    
    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
        if (typeof showSnackbar === 'function') {
            showSnackbar('Please enter a valid price', 'error');
        }
        return;
    }
    
    const rateData = {
        name,
        price,
        description,
        isPromo,
        isActive,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }
        
        if (rateId) {
            // Update existing rate
            await db.collection('casualRates').doc(rateId).update(rateData);
            if (typeof showSnackbar === 'function') {
                showSnackbar('Casual rate updated successfully', 'success');
            }
        } else {
            // Create new rate with custom document ID: name-price format
            const snapshot = await db.collection('casualRates').get();
            rateData.displayOrder = snapshot.size + 1;
            rateData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // Generate document ID from name and price
            // e.g., "Casual Entry" + 15 -> "casual-entry-15"
            const docId = name.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
                .replace(/\s+/g, '-') // Replace spaces with hyphens
                .replace(/-+/g, '-') // Replace multiple hyphens with single
                .trim() + '-' + Math.round(price);
            
            await db.collection('casualRates').doc(docId).set(rateData);
            if (typeof showSnackbar === 'function') {
                showSnackbar('Casual rate added successfully', 'success');
            }
        }
        
        closeRateModal();
        await displayCasualRates();
        
    } catch (error) {
        console.error('Error saving casual rate:', error);
        if (typeof showSnackbar === 'function') {
            showSnackbar('Error saving rate: ' + error.message, 'error');
        }
    } finally {
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
    }
}

/**
 * Confirm delete rate
 * @param {string} rateId - Rate ID to delete
 * @param {string} rateName - Rate name for confirmation message
 */
export function confirmDeleteRate(rateId, rateName) {
    // Create and show delete confirmation modal
    const deleteModal = new ConfirmationModal({
        title: 'Delete Casual Rate',
        message: `
            <p>Are you sure you want to delete this casual rate?</p>
            <div class="student-info-delete">
                <strong>${escapeHtml(rateName)}</strong>
            </div>
            <p class="text-muted" style="margin-top: 15px;">
                <i class="fas fa-info-circle"></i> This will affect check-ins and pricing across the system.
            </p>
        `,
        icon: 'fas fa-trash',
        variant: 'danger',
        confirmText: 'Delete Rate',
        confirmClass: 'btn-delete',
        cancelText: 'Cancel',
        cancelClass: 'btn-cancel',
        onConfirm: async () => {
            await deleteCasualRate(rateId);
        }
    });
    
    deleteModal.show();
}

/**
 * Delete casual rate
 * @param {string} rateId - Rate ID to delete
 * @returns {Promise<void>}
 */
async function deleteCasualRate(rateId) {
    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }
        
        await db.collection('casualRates').doc(rateId).delete();
        
        if (typeof showSnackbar === 'function') {
            showSnackbar('Casual rate deleted successfully', 'success');
        }
        
        await displayCasualRates();
        
    } catch (error) {
        console.error('Error deleting casual rate:', error);
        if (typeof showSnackbar === 'function') {
            showSnackbar('Error deleting rate: ' + error.message, 'error');
        }
    } finally {
        if (typeof showLoading === 'function') {
            showLoading(false);
        }
    }
}
