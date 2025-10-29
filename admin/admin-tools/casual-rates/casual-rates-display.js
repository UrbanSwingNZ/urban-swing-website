// Casual Rates Display and Management

let casualRatesData = [];

/**
 * Load casual rates from Firestore
 */
async function loadCasualRates() {
    const container = document.getElementById('casual-rates-container');
    
    if (!container) {
        console.log('Casual rates container not found on this page');
        return;
    }
    
    container.innerHTML = '<div class="empty-state-rates"><i class="fas fa-spinner fa-spin"></i><h3>Loading rates...</h3></div>';

    try {
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

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state-rates">
                    <i class="fas fa-dollar-sign"></i>
                    <h3>No Casual Rates</h3>
                    <p>Click "Add Casual Rate" to create your first rate.</p>
                </div>
            `;
            return;
        }

        // Sort rates by displayOrder
        casualRatesData = [];
        snapshot.forEach(doc => {
            casualRatesData.push({ id: doc.id, data: doc.data() });
        });
        
        casualRatesData.sort((a, b) => (a.data.displayOrder || 999) - (b.data.displayOrder || 999));

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
        badges += '<span class="rate-badge promo">PROMO</span>';
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
            <button class="btn-edit-rate" onclick="editCasualRate('${id}')">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-delete-rate" onclick="confirmDeleteRate('${id}', '${escapeHtml(rate.name)}')">
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
    
    return card;
}

/**
 * Setup drag and drop for rate cards
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
        
        await updateRateDisplayOrders();
    }
    
    return false;
}

/**
 * Update display orders after drag and drop
 */
async function updateRateDisplayOrders() {
    const container = document.getElementById('casual-rates-container');
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
 */
async function handleRateStatusToggle(rateId, isActive) {
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

/**
 * Open add/edit rate modal
 */
function openRateModal(rateId = null) {
    const modal = document.getElementById('rate-modal');
    const modalTitle = document.getElementById('rate-modal-title');
    const form = document.getElementById('rate-form');
    
    if (rateId) {
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Casual Rate';
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

function editCasualRate(rateId) {
    openRateModal(rateId);
}

function closeRateModal() {
    const modal = document.getElementById('rate-modal');
    modal.style.display = 'none';
}

/**
 * Save casual rate
 */
async function saveCasualRate(e) {
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
        await loadCasualRates();
        
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
 */
function confirmDeleteRate(rateId, rateName) {
    const modal = document.getElementById('delete-rate-modal');
    document.getElementById('delete-rate-name').textContent = rateName;
    
    const confirmBtn = document.getElementById('confirm-delete-rate-btn');
    confirmBtn.onclick = () => deleteCasualRate(rateId);
    
    modal.style.display = 'flex';
}

function closeDeleteRateModal() {
    const modal = document.getElementById('delete-rate-modal');
    modal.style.display = 'none';
}

/**
 * Delete casual rate
 */
async function deleteCasualRate(rateId) {
    try {
        if (typeof showLoading === 'function') {
            showLoading();
        }
        
        await db.collection('casualRates').doc(rateId).delete();
        
        closeDeleteRateModal();
        
        if (typeof showSnackbar === 'function') {
            showSnackbar('Casual rate deleted successfully', 'success');
        }
        
        await loadCasualRates();
        
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

// Utility function (if not already available)
if (typeof escapeHtml !== 'function') {
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
