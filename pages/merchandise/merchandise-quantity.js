// merchandise-quantity.js - Quantity and Size Selection Handlers

/**
 * Initialize all quantity and size selection handlers
 */
function initializeQuantityHandlers() {
    // Handle quantity buttons
    const qtyButtons = document.querySelectorAll('.qty-btn');
    qtyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const qtySelector = input?.closest('.quantity-selector');
            let currentValue = parseInt(input.value) || 0;
            
            if (this.classList.contains('plus')) {
                currentValue = Math.min(currentValue + 1, 99);
            } else if (this.classList.contains('minus')) {
                currentValue = Math.max(currentValue - 1, 0);
            }
            
            input.value = currentValue;
            
            // Deselect size and hide controls if quantity is 0
            if (currentValue === 0) {
                deselectSizeForItem(targetId);
                if (qtySelector) {
                    qtySelector.classList.remove('visible');
                }
            }
        });
    });
    
    // Auto-set quantity to 1 when size is selected and show qty controls
    const sizeRadios = document.querySelectorAll('.size-radio input[type="radio"]');
    sizeRadios.forEach(radio => {
        // Allow deselection by clicking the same radio button
        radio.addEventListener('click', function() {
            const radioName = this.name;
            const qtyInputId = getQuantityInputIdFromRadioName(radioName);
            const qtyInput = qtyInputId ? document.getElementById(qtyInputId) : null;
            const qtySelector = qtyInput?.closest('.quantity-selector');
            
            // If this radio was already checked, deselect it
            if (this.dataset.checked === 'true') {
                this.checked = false;
                this.dataset.checked = 'false';
                
                // Reset quantity to 0 and hide controls
                if (qtyInput) {
                    qtyInput.value = 0;
                }
                if (qtySelector) {
                    qtySelector.classList.remove('visible');
                }
            } else {
                // Mark this radio as checked and unmark others in the same group
                const radiosInGroup = document.querySelectorAll(`input[name="${radioName}"]`);
                radiosInGroup.forEach(r => r.dataset.checked = 'false');
                this.dataset.checked = 'true';
                
                // Set quantity to 1 if currently 0 and show controls
                if (qtyInput) {
                    if (parseInt(qtyInput.value) === 0) {
                        qtyInput.value = 1;
                    }
                    if (qtySelector && !qtySelector.classList.contains('visible')) {
                        qtySelector.classList.add('visible');
                    }
                }
            }
        });
    });
}

/**
 * Deselect size radio buttons for a given quantity input
 */
function deselectSizeForItem(qtyInputId) {
    const radioName = getRadioNameFromQuantityInputId(qtyInputId);
    
    if (radioName) {
        const sizeRadios = document.querySelectorAll(`input[name="${radioName}"]`);
        sizeRadios.forEach(radio => {
            radio.checked = false;
            radio.dataset.checked = 'false';
        });
    }
}

/**
 * Map quantity input ID to radio button name
 */
function getRadioNameFromQuantityInputId(qtyInputId) {
    const mapping = {
        'maliTeeQty': 'maliTeeSize',
        'cropTeeQty': 'cropTeeSize',
        'stapleTeeQty': 'stapleTeeSize',
        'womensZipHoodQty': 'womensZipHoodSize',
        'mensZipHoodQty': 'mensZipHoodSize',
        'womensCrewQty': 'womensCrewSize',
        'mensCrewQty': 'mensCrewSize'
    };
    
    return mapping[qtyInputId] || null;
}

/**
 * Map radio button name to quantity input ID
 */
function getQuantityInputIdFromRadioName(radioName) {
    const mapping = {
        'maliTeeSize': 'maliTeeQty',
        'cropTeeSize': 'cropTeeQty',
        'stapleTeeSize': 'stapleTeeQty',
        'womensZipHoodSize': 'womensZipHoodQty',
        'mensZipHoodSize': 'mensZipHoodQty',
        'womensCrewSize': 'womensCrewQty',
        'mensCrewSize': 'mensCrewQty'
    };
    
    return mapping[radioName] || null;
}
