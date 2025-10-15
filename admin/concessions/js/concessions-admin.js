/**
 * concessions-admin.js - Concession package administration
 * Handles creating, editing, and managing concession packages
 */

/**
 * Initialize the add concession package modal HTML
 */
function initializeAddConcessionModal() {
    // Check if modal already exists
    if (document.getElementById('add-concession-modal')) {
        return;
    }
    
    // Create modal HTML
    const modalHTML = `
    <div id="add-concession-modal" class="modal" style="display: none;">
        <div class="modal-content modal-small">
            <div class="modal-header">
                <h3><i class="fas fa-plus-circle"></i> Add Concession Package</h3>
                <button class="modal-close" onclick="closeAddConcessionModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="add-concession-form">
                    <div class="form-group">
                        <label for="concession-name">
                            <i class="fas fa-tag"></i> Package Name *
                        </label>
                        <input 
                            type="text" 
                            id="concession-name" 
                            class="form-control" 
                            placeholder="e.g., 5 Classes, 10 Classes"
                            required
                        />
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="concession-classes">
                                <i class="fas fa-list-ol"></i> Number of Classes *
                            </label>
                            <input 
                                type="number" 
                                id="concession-classes" 
                                class="form-control" 
                                min="1"
                                placeholder="5"
                                required
                            />
                        </div>
                        <div class="form-group">
                            <label for="concession-price">
                                <i class="fas fa-dollar-sign"></i> Price ($) *
                            </label>
                            <input 
                                type="number" 
                                id="concession-price" 
                                class="form-control" 
                                min="0"
                                step="0.01"
                                placeholder="55.00"
                                required
                            />
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="concession-expiry">
                            <i class="fas fa-clock"></i> Expiry (Months) *
                        </label>
                        <input 
                            type="number" 
                            id="concession-expiry" 
                            class="form-control" 
                            min="1"
                            placeholder="6"
                            required
                        />
                        <small class="form-hint">How many months until the concession expires</small>
                    </div>

                    <div class="form-group checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="concession-promo" />
                            <span>Mark as promotional package</span>
                        </label>
                        <small class="form-hint">Promotional packages can be highlighted or shown separately</small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeAddConcessionModal()">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button type="button" class="btn-primary" id="save-concession-btn">
                    <i class="fas fa-save"></i> Create Package
                </button>
            </div>
        </div>
    </div>`;
    
    // Append to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize event listeners
    setupAddConcessionModalListeners();
}

/**
 * Setup event listeners for add concession modal
 */
function setupAddConcessionModalListeners() {
    const saveBtn = document.getElementById('save-concession-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSaveConcession);
    }
    
    // Enter key submits form
    const form = document.getElementById('add-concession-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSaveConcession();
        });
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('add-concession-modal');
            if (modal && modal.style.display === 'flex') {
                closeAddConcessionModal();
            }
        }
    });
    
    // Close when clicking outside
    const modal = document.getElementById('add-concession-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAddConcessionModal();
            }
        });
    }
}

/**
 * Open add concession modal
 */
function openAddConcessionModal() {
    const modal = document.getElementById('add-concession-modal');
    resetAddConcessionForm();
    modal.style.display = 'flex';
    
    // Focus first input
    setTimeout(() => {
        document.getElementById('concession-name')?.focus();
    }, 100);
}

/**
 * Close add concession modal
 */
function closeAddConcessionModal() {
    const modal = document.getElementById('add-concession-modal');
    modal.style.display = 'none';
    resetAddConcessionForm();
}

/**
 * Reset add concession form
 */
function resetAddConcessionForm() {
    const form = document.getElementById('add-concession-form');
    if (form) {
        form.reset();
    }
}

/**
 * Generate document ID from package name
 */
function generatePackageId(name) {
    // Convert to lowercase and replace spaces with hyphens
    let id = name.toLowerCase()
        .replace(/\s+/g, '-')        // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, '')  // Remove special characters
        .replace(/-+/g, '-')         // Replace multiple hyphens with single
        .replace(/^-|-$/g, '');      // Remove leading/trailing hyphens
    
    return id;
}

/**
 * Handle save concession package
 */
async function handleSaveConcession() {
    const saveBtn = document.getElementById('save-concession-btn');
    const originalText = saveBtn.innerHTML;
    
    try {
        // Get form values
        const name = document.getElementById('concession-name').value.trim();
        const numberOfClasses = parseInt(document.getElementById('concession-classes').value);
        const price = parseFloat(document.getElementById('concession-price').value);
        const expiryMonths = parseInt(document.getElementById('concession-expiry').value);
        const isPromo = document.getElementById('concession-promo').checked;
        
        // Validate
        if (!name || !numberOfClasses || !price || !expiryMonths) {
            showSnackbar('Please fill in all required fields', 'error');
            return;
        }
        
        if (numberOfClasses < 1) {
            showSnackbar('Number of classes must be at least 1', 'error');
            return;
        }
        
        if (price < 0) {
            showSnackbar('Price cannot be negative', 'error');
            return;
        }
        
        if (expiryMonths < 1) {
            showSnackbar('Expiry must be at least 1 month', 'error');
            return;
        }
        
        // Disable button and show loading
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        
        // Generate meaningful document ID (just use the name, no promo prefix)
        const docId = generatePackageId(name);
        
        // Check if ID already exists
        const existingDoc = await db.collection('concessionPackages').doc(docId).get();
        if (existingDoc.exists) {
            showSnackbar('A package with this name already exists', 'error');
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            return;
        }
        
        // Get the highest display order for new package
        const existingPackages = await loadConcessionPackages();
        const maxDisplayOrder = existingPackages.reduce((max, pkg) => 
            Math.max(max, pkg.displayOrder || 0), 0);
        
        // Create package object
        const packageData = {
            name: name,
            numberOfClasses: numberOfClasses,
            price: price,
            expiryMonths: expiryMonths,
            displayOrder: maxDisplayOrder + 1,
            isActive: true,
            isPromo: isPromo,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Save to Firestore with custom ID
        await db.collection('concessionPackages').doc(docId).set(packageData);
        
        // Success!
        showSnackbar(`Concession package "${name}" created successfully!`, 'success');
        
        // Close add modal
        closeAddConcessionModal();
        
        // Reload packages in purchase modal
        await populatePackageOptions();
        
    } catch (error) {
        console.error('Error creating concession package:', error);
        showSnackbar('Failed to create concession package: ' + error.message, 'error');
    } finally {
        // Reset button
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}
