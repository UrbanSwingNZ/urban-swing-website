/**
 * checkin-form.js - Form reset, validation, and entry type listeners
 */

/**
 * Reset check-in form
 */
function resetCheckinForm() {
    // Clear student search
    const modalSearchInput = document.getElementById('modal-student-search');
    const modalSearchResults = document.getElementById('modal-search-results');
    if (modalSearchInput) modalSearchInput.value = '';
    if (modalSearchResults) modalSearchResults.style.display = 'none';
    
    // Clear entry type selection
    document.querySelectorAll('input[name="entry-type"]').forEach(radio => {
        radio.checked = false;
    });
    
    // Clear payment method
    document.getElementById('payment-method').value = '';
    document.getElementById('payment-section').style.display = 'none';
    
    // Clear free entry reason
    document.getElementById('free-entry-reason').value = '';
    document.getElementById('free-entry-section').style.display = 'none';
    
    // Clear notes
    document.getElementById('checkin-notes').value = '';
    
    // Disable submit button (will be re-enabled when student is selected)
    document.getElementById('confirm-checkin-btn').disabled = true;
}

/**
 * Setup entry type radio listeners
 */
let entryTypeListenersInitialized = false;

function setupEntryTypeListeners() {
    // Only set up listeners once to avoid duplicates
    if (entryTypeListenersInitialized) {
        return;
    }
    entryTypeListenersInitialized = true;
    
    const entryRadios = document.querySelectorAll('input[name="entry-type"]');
    const paymentSection = document.getElementById('payment-section');
    const freeEntrySection = document.getElementById('free-entry-section');
    const onlinePaymentMessages = document.getElementById('online-payment-messages');
    const confirmBtn = document.getElementById('confirm-checkin-btn');
    
    entryRadios.forEach(radio => {
        radio.addEventListener('change', async () => {
            // Hide all sections first
            paymentSection.style.display = 'none';
            freeEntrySection.style.display = 'none';
            if (onlinePaymentMessages) {
                onlinePaymentMessages.style.display = 'none';
                onlinePaymentMessages.innerHTML = '';
            }
            
            // Show appropriate section based on selection
            if (radio.value === 'casual' || radio.value === 'casual-student') {
                paymentSection.style.display = 'block';
                // Check if payment method is selected
                const paymentMethod = document.getElementById('payment-method').value;
                confirmBtn.disabled = paymentMethod === '';
            } else if (radio.value === 'free') {
                freeEntrySection.style.display = 'block';
                // Check if reason is selected
                const freeReason = document.getElementById('free-entry-reason').value;
                confirmBtn.disabled = freeReason === '';
            } else if (radio.value === 'online-payment') {
                // Online payment selected - validate and show available transactions
                const student = getSelectedStudent();
                const checkinDate = getSelectedCheckinDate();
                
                if (student && checkinDate) {
                    confirmBtn.disabled = true; // Disable until valid transaction is selected
                    await validateOnlinePayment(student.id, checkinDate);
                } else {
                    confirmBtn.disabled = true;
                }
            } else {
                // Concession - no additional selection needed
                confirmBtn.disabled = false;
            }
        });
    });
    
    // Payment method required for casual entries
    document.getElementById('payment-method').addEventListener('change', (e) => {
        const casualRadio = document.getElementById('entry-casual');
        const casualStudentRadio = document.getElementById('entry-casual-student');
        if (casualRadio.checked || casualStudentRadio.checked) {
            confirmBtn.disabled = e.target.value === '';
        }
    });
    
    // Free entry reason required for free
    document.getElementById('free-entry-reason').addEventListener('change', (e) => {
        const freeRadio = document.getElementById('entry-free');
        if (freeRadio.checked) {
            confirmBtn.disabled = e.target.value === '';
        }
    });
}
