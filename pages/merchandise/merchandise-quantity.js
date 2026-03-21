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
            let currentValue = parseInt(input.value) || 0;
            
            if (this.classList.contains('plus')) {
                currentValue = Math.min(currentValue + 1, 99);
            } else if (this.classList.contains('minus')) {
                currentValue = Math.max(currentValue - 1, 0);
            }
            
            input.value = currentValue;
            
            // Check if this is a color quantity (part of color-quantity-container)
            const colorQtyContainer = input.closest('.color-quantity-container');
            if (colorQtyContainer) {
                // Get both black and white quantities
                const allInputs = colorQtyContainer.querySelectorAll('input[type="number"]');
                const totalQty = Array.from(allInputs).reduce((sum, inp) => sum + (parseInt(inp.value) || 0), 0);
                
                // If both are 0, deselect size and hide container
                if (totalQty === 0) {
                    deselectSizeForColorContainer(colorQtyContainer);
                    colorQtyContainer.classList.remove('visible');
                }
            } else {
                // Handle single quantity selector (hoodies, etc.)
                const qtySelector = input?.closest('.quantity-selector');
                if (currentValue === 0) {
                    deselectSizeForItem(targetId);
                    if (qtySelector) {
                        qtySelector.classList.remove('visible');
                    }
                }
            }
        });
    });
    
    // Auto-show color quantity controls when size is selected
    const sizeRadios = document.querySelectorAll('.size-radio input[type="radio"]');
    sizeRadios.forEach(radio => {
        // Allow deselection by clicking the same radio button
        radio.addEventListener('click', function() {
            const radioName = this.name;
            const merchItem = this.closest('.merch-item');
            const colorQtyContainer = merchItem?.querySelector('.color-quantity-container');
            const singleQtySelector = merchItem?.querySelector('.quantity-selector:not(.color-quantity-container .quantity-selector)');
            
            // If this radio was already checked, deselect it
            if (this.dataset.checked === 'true') {
                this.checked = false;
                this.dataset.checked = 'false';
                
                // Reset quantities and hide controls
                if (colorQtyContainer) {
                    // Reset all color quantities to 0
                    const allInputs = colorQtyContainer.querySelectorAll('input[type="number"]');
                    allInputs.forEach(inp => inp.value = 0);
                    colorQtyContainer.classList.remove('visible');
                } else if (singleQtySelector) {
                    // Reset single quantity to 0
                    const qtyInput = singleQtySelector.querySelector('input[type="number"]');
                    if (qtyInput) qtyInput.value = 0;
                    singleQtySelector.classList.remove('visible');
                }
            } else {
                // Mark this radio as checked and unmark others in the same group
                const radiosInGroup = document.querySelectorAll(`input[name="${radioName}"]`);
                radiosInGroup.forEach(r => r.dataset.checked = 'false');
                this.dataset.checked = 'true';
                
                // Show controls and set default quantities if needed
                if (colorQtyContainer) {
                    // Show the color quantity container (both controls visible)
                    if (!colorQtyContainer.classList.contains('visible')) {
                        colorQtyContainer.classList.add('visible');
                    }
                    // Don't auto-set quantities - user must choose
                } else if (singleQtySelector) {
                    // Set quantity to 1 if currently 0 and show controls
                    const qtyInput = singleQtySelector.querySelector('input[type="number"]');
                    if (qtyInput && parseInt(qtyInput.value) === 0) {
                        qtyInput.value = 1;
                    }
                    if (!singleQtySelector.classList.contains('visible')) {
                        singleQtySelector.classList.add('visible');
                    }
                }
            }
        });
    });
}

/**
 * Deselect size for items with color-quantity-container
 */
function deselectSizeForColorContainer(colorQtyContainer) {
    const merchItem = colorQtyContainer.closest('.merch-item');
    if (merchItem) {
        const sizeRadios = merchItem.querySelectorAll('.size-radio input[type="radio"]');
        sizeRadios.forEach(radio => {
            radio.checked = false;
            radio.dataset.checked = 'false';
        });
    }
}

/**
 * Deselect size radio buttons for a given quantity input (for single quantity items)
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
 * Map quantity input ID to radio button name (for single quantity items only)
 */
function getRadioNameFromQuantityInputId(qtyInputId) {
    const mapping = {
        'womensZipHoodQty': 'womensZipHoodSize',
        'mensZipHoodQty': 'mensZipHoodSize',
        'womensCrewQty': 'womensCrewSize',
        'mensCrewQty': 'mensCrewSize'
    };
    
    return mapping[qtyInputId] || null;
}
