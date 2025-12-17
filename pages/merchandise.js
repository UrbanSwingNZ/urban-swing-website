// merchandise.js - Merchandise Order Form Functionality

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

function handleFormSubmit(event) {
    event.preventDefault();
    
    // Get form data
    const formData = {
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
    
    console.log('Form submitted:', formData);
    
    // TODO: Add form submission logic (e.g., send to backend, Firebase, etc.)
    alert('Thank you for your order! We will be in touch soon.');
    
    // Optionally reset the form
    // merchandiseForm.reset();
}
