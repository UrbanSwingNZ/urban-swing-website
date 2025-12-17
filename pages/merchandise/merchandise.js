// merchandise.js - Merchandise Order Form UI and Event Handling

document.addEventListener('DOMContentLoaded', function() {
    const merchandiseForm = document.getElementById('merchandise-form');
    const shippingRadios = document.querySelectorAll('input[name="shipping"]');
    const eventNameGroup = document.getElementById('eventNameGroup');
    const eventNameInput = document.getElementById('eventName');
    
    // Handle shipping option changes
    shippingRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'collect-event') {
                eventNameGroup.style.display = 'block';
                eventNameInput.required = true;
            } else {
                eventNameGroup.style.display = 'none';
                eventNameInput.required = false;
                eventNameInput.value = '';
            }
        });
    });
    
    // Initialize quantity and size selection handlers
    initializeQuantityHandlers();
    
    if (merchandiseForm) {
        merchandiseForm.addEventListener('submit', handleFormSubmit);
    }
});

/**
 * Show loading state
 */
function showLoading(show) {
    const loadingSpinner = document.getElementById('loading-spinner');
    const submitButton = document.querySelector('button[type="submit"]');
    
    if (show) {
        loadingSpinner.style.display = 'flex';
        submitButton.disabled = true;
    } else {
        loadingSpinner.style.display = 'none';
        submitButton.disabled = false;
    }
}

/**
 * Show success or error message
 */
function showMessage(message, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${isError ? '#dc3545' : '#28a745'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Show loading state
    showLoading(true);
    
    try {
        // Collect form data
        const orderData = {
            email: document.getElementById('email').value,
            fullName: document.getElementById('fullName').value,
            address: document.getElementById('address').value,
            phoneNumber: document.getElementById('phoneNumber').value,
            shipping: document.querySelector('input[name="shipping"]:checked').value,
            eventName: document.getElementById('eventName').value || null,
            chosenName: document.getElementById('chosenName').value || null,
            additionalNotes: document.getElementById('additionalNotes').value || null,
            acceptTerms: document.getElementById('acceptTerms').checked,
            items: {
                maliTee: {
                    size: document.querySelector('input[name="maliTeeSize"]:checked')?.value || null,
                    quantity: parseInt(document.getElementById('maliTeeQty').value) || 0
                },
                cropTee: {
                    size: document.querySelector('input[name="cropTeeSize"]:checked')?.value || null,
                    quantity: parseInt(document.getElementById('cropTeeQty').value) || 0
                },
                stapleTee: {
                    size: document.querySelector('input[name="stapleTeeSize"]:checked')?.value || null,
                    quantity: parseInt(document.getElementById('stapleTeeQty').value) || 0
                },
                womensZipHood: {
                    size: document.querySelector('input[name="womensZipHoodSize"]:checked')?.value || null,
                    quantity: parseInt(document.getElementById('womensZipHoodQty').value) || 0
                },
                mensZipHood: {
                    size: document.querySelector('input[name="mensZipHoodSize"]:checked')?.value || null,
                    quantity: parseInt(document.getElementById('mensZipHoodQty').value) || 0
                },
                womensCrew: {
                    size: document.querySelector('input[name="womensCrewSize"]:checked')?.value || null,
                    quantity: parseInt(document.getElementById('womensCrewQty').value) || 0
                },
                mensCrew: {
                    size: document.querySelector('input[name="mensCrewSize"]:checked')?.value || null,
                    quantity: parseInt(document.getElementById('mensCrewQty').value) || 0
                }
            }
        };
        
        // Save to Firestore
        await saveMerchOrder(orderData);
        
        // Hide loading and show success
        showLoading(false);
        showMessage('Thank you! Your order has been submitted successfully. We will send you an invoice shortly.');
        
        // Reset form after short delay
        setTimeout(() => {
            document.getElementById('merchandise-form').reset();
        }, 1500);
        
    } catch (error) {
        console.error('Error submitting order:', error);
        showLoading(false);
        showMessage('Sorry, there was an error submitting your order. Please try again or contact us at dance@UrbanSwing.co.nz', true);
    }
}
