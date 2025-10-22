// Modal Handlers for Concession Types Manager

let currentEditId = null;
let packageToDelete = null;
let editingPackageId = null; // Track which package is being edited

// Override handleSaveConcession for Edit Support
function overrideHandleSaveConcession() {
  // Store reference to the original save handler before we override it
  const originalHandleSave = window.handleSaveConcession;
  
  // Override handleSaveConcession globally to support both add and edit modes
  window.handleSaveConcession = async function() {
    console.log('handleSaveConcession called, editingPackageId:', editingPackageId);
    // Check if we're in edit mode
    if (editingPackageId) {
      console.log('Edit mode - calling handleUpdatePackage');
      await handleUpdatePackage(editingPackageId);
    } else {
      console.log('Add mode - calling original handler');
      // Normal add mode - call the original handler
      await originalHandleSave.call(this);
      // Reload the package list after adding
      await loadPackages();
    }
  };
}

function setupModalHandlers() {
  const deleteModal = document.getElementById('delete-modal');
  
  // Add package button - use existing modal
  document.getElementById('add-package-btn').addEventListener('click', () => {
    editingPackageId = null; // Ensure we're in add mode
    openAddConcessionModal();
  });
  
  // Delete modal handlers
  document.getElementById('cancel-delete-btn').addEventListener('click', closeDeleteModal);
  document.getElementById('confirm-delete-btn').addEventListener('click', deletePackage);
  
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });
  
  // Override the close handler to reset edit mode
  const originalCloseModal = window.closeAddConcessionModal;
  window.closeAddConcessionModal = function() {
    editingPackageId = null; // Clear edit mode
    
    // Reset modal title and button text
    const modalTitle = document.querySelector('#add-concession-modal .modal-header h3');
    if (modalTitle) {
      modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add Concession Package';
    }
    
    const saveBtn = document.getElementById('save-concession-btn');
    if (saveBtn) {
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Create Package';
    }
    
    originalCloseModal();
  };
}

// Edit Package - Extends the existing modal for edit mode
async function editPackage(id) {
  try {
    const doc = await db.collection('concessionPackages').doc(id).get();
    
    if (!doc.exists) {
      alert('Package not found');
      return;
    }
    
    const pkg = doc.data();
    editingPackageId = id; // Store the ID we're editing
    console.log('Edit mode activated, editingPackageId set to:', editingPackageId);
    
    // Open the existing add modal
    openAddConcessionModal();
    
    // Pre-fill the form and modify for edit mode
    setTimeout(() => {
      // Fill in the existing package data
      document.getElementById('concession-name').value = pkg.name || '';
      document.getElementById('concession-classes').value = pkg.numberOfClasses || '';
      document.getElementById('concession-price').value = pkg.price || '';
      document.getElementById('concession-expiry').value = pkg.expiryMonths || '';
      document.getElementById('concession-promo').checked = pkg.isPromo || false;
      
      // Change modal appearance for edit mode
      const modalTitle = document.querySelector('#add-concession-modal .modal-header h3');
      if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Concession Package';
      }
      
      const saveBtn = document.getElementById('save-concession-btn');
      if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Package';
      }
    }, 100);
    
  } catch (error) {
    console.error('Error loading package:', error);
    alert('Failed to load package: ' + error.message);
  }
}

// Update Package (Edit Mode Handler)
async function handleUpdatePackage(packageId) {
  const saveBtn = document.getElementById('save-concession-btn');
  const originalText = saveBtn.innerHTML;
  
  try {
    // Get form values
    const name = document.getElementById('concession-name').value.trim();
    const numberOfClasses = parseInt(document.getElementById('concession-classes').value);
    const price = parseFloat(document.getElementById('concession-price').value);
    const expiryMonths = parseInt(document.getElementById('concession-expiry').value);
    const isPromo = document.getElementById('concession-promo').checked;
    
    // Validate (same validation as the original modal)
    if (!name || !numberOfClasses || !price || !expiryMonths) {
      showStatusMessage('Please fill in all required fields', 'error');
      return;
    }
    
    if (numberOfClasses < 1) {
      showStatusMessage('Number of classes must be at least 1', 'error');
      return;
    }
    
    if (price < 0) {
      showStatusMessage('Price cannot be negative', 'error');
      return;
    }
    
    if (expiryMonths < 1) {
      showStatusMessage('Expiry must be at least 1 month', 'error');
      return;
    }
    
    // Disable button and show loading
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    // Update package (keep existing displayOrder and isActive)
    const packageData = {
      name: name,
      numberOfClasses: numberOfClasses,
      price: price,
      expiryMonths: expiryMonths,
      isPromo: isPromo,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('concessionPackages').doc(packageId).update(packageData);
    
    console.log('Package updated:', packageId);
    
    // Close modal (this will trigger our override that resets edit mode)
    closeAddConcessionModal();
    
    // Reload packages
    loadPackages();
    
    // Show success message
    showStatusMessage(`Package "${name}" updated successfully!`, 'success');
    
  } catch (error) {
    console.error('Error updating package:', error);
    showStatusMessage('Failed to update package: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
  }
}

// Delete Package Functions
function confirmDelete(id, name) {
  packageToDelete = id;
  document.getElementById('delete-package-name').textContent = name;
  document.getElementById('delete-modal').classList.add('show');
}

function closeDeleteModal() {
  document.getElementById('delete-modal').classList.remove('show');
  packageToDelete = null;
}

async function deletePackage() {
  if (!packageToDelete) return;
  
  const confirmBtn = document.getElementById('confirm-delete-btn');
  const originalText = confirmBtn.innerHTML;
  
  try {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    
    await db.collection('concessionPackages').doc(packageToDelete).delete();
    console.log('Package deleted:', packageToDelete);
    
    closeDeleteModal();
    loadPackages();
    
  } catch (error) {
    console.error('Error deleting package:', error);
    alert('Failed to delete package: ' + error.message);
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = originalText;
  }
}
