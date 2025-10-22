// Concession Types Manager Logic
// Handles CRUD operations for concessionPackages collection

let currentUser = null;
let currentEditId = null;
let packageToDelete = null;
let editingPackageId = null; // Track which package is being edited

// Wait for Firebase to initialize
window.addEventListener('load', () => {
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded');
    showError('Firebase SDK failed to load. Please check your internet connection.');
    return;
  }

  if (!auth || !db) {
    console.error('Firebase not properly initialized');
    showError('Firebase configuration error. Please contact the administrator.');
    return;
  }

  initializeAuth();
});

// ========================================
// Authentication State Management
// ========================================

function initializeAuth() {
  showLoading(true);

  auth.onAuthStateChanged((user) => {
    showLoading(false);
    
    if (user) {
      currentUser = user;
      showPage(user);
      loadPackages();
    } else {
      // Redirect to admin login
      window.location.href = '../index.html';
    }
  });
}

function showPage(user) {
  // Display user email
  document.getElementById('user-email').textContent = user.email;
  
  // Setup logout button
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  
  // IMPORTANT: Override handleSaveConcession BEFORE initializing the modal
  // so the event listeners attach to our overridden version
  overrideHandleSaveConcession();
  
  // Initialize the existing add concession modal
  initializeAddConcessionModal();
  
  // Setup other modal handlers
  setupModalHandlers();
  
  console.log('Concession Types Manager loaded for user:', user.email);
}

async function handleLogout() {
  showLoading(true);
  
  try {
    await auth.signOut();
    console.log('Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    alert('Failed to logout. Please try again.');
    showLoading(false);
  }
}

// ========================================
// Load and Display Packages
// ========================================

async function loadPackages() {
  const container = document.getElementById('packages-container');
  container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><h3>Loading packages...</h3></div>';

  try {
    console.log('Loading concessionPackages from Firestore...');
    
    // Try with orderBy first
    let snapshot;
    try {
      snapshot = await db.collection('concessionPackages')
        .orderBy('displayOrder', 'asc')
        .get();
    } catch (orderError) {
      // If orderBy fails (missing index), fall back to simple get
      console.warn('OrderBy failed, using simple get:', orderError);
      snapshot = await db.collection('concessionPackages').get();
    }

    console.log(`Found ${snapshot.size} packages`);

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-ticket-alt"></i>
          <h3>No Concession Packages</h3>
          <p>Click "Add New Package" to create your first concession package.</p>
        </div>
      `;
      return;
    }

    // Sort packages by displayOrder in JavaScript if orderBy failed
    const packages = [];
    snapshot.forEach(doc => {
      packages.push({ id: doc.id, data: doc.data() });
    });
    
    packages.sort((a, b) => (a.data.displayOrder || 999) - (b.data.displayOrder || 999));

    container.innerHTML = '';
    packages.forEach(pkg => {
      container.appendChild(createPackageCard(pkg.id, pkg.data));
    });
    
    // Show drag hint if there are 2+ packages
    const dragHint = document.getElementById('drag-hint');
    if (dragHint && packages.length >= 2) {
      dragHint.style.display = 'flex';
    } else if (dragHint) {
      dragHint.style.display = 'none';
    }

  } catch (error) {
    console.error('Error loading packages:', error);
    console.error('Error details:', error.code, error.message);
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error Loading Packages</h3>
        <p>${error.message}</p>
        <p style="font-size: 0.9rem; margin-top: 10px;">Check the browser console for more details.</p>
      </div>
    `;
  }
}

function createPackageCard(id, pkg) {
  const card = document.createElement('div');
  const isActive = pkg.isActive !== false; // Default to true if not specified
  card.className = `package-card ${isActive ? 'active' : 'inactive'}`;
  card.setAttribute('data-package-id', id);
  card.setAttribute('draggable', 'true');
  
  const numberOfClasses = pkg.numberOfClasses || 0;
  const price = pkg.price || 0;
  const pricePerClass = numberOfClasses > 0 ? (price / numberOfClasses).toFixed(2) : '0.00';
  
  // Format package name - if it contains "PROMO", put it on separate line
  let formattedName = pkg.name;
  if (formattedName.match(/promo/i)) {
    // Replace "PROMO - " or "promo - " with "PROMO<br>"
    formattedName = formattedName.replace(/promo\s*-\s*/i, 'PROMO<br>');
  }
  
  card.innerHTML = `
    <div class="drag-handle" title="Drag to reorder">
      <i class="fas fa-grip-vertical"></i>
    </div>
    
    <div class="package-status-toggle">
      <label class="toggle-switch" title="${isActive ? 'Click to deactivate' : 'Click to activate'}">
        <input type="checkbox" ${isActive ? 'checked' : ''} data-package-id="${id}" class="status-toggle-input">
        <span class="toggle-slider"></span>
      </label>
      <span class="status-label ${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span>
    </div>
    
    <h3 class="package-name">${formattedName}</h3>
    
    <div class="package-details">
      <div class="package-detail">
        <i class="fas fa-receipt"></i>
        <span><strong>${numberOfClasses}</strong> classes</span>
      </div>
      <div class="package-detail">
        <i class="fas fa-dollar-sign"></i>
        <span class="package-price">$${price.toFixed(2)}</span>
      </div>
      <div class="package-detail">
        <i class="fas fa-calculator"></i>
        <span><strong>$${pricePerClass}</strong> per class</span>
      </div>
    </div>
    
    ${pkg.description ? `<div class="package-description">${escapeHtml(pkg.description)}</div>` : ''}
    
    <div class="package-actions">
      <button class="btn-edit" onclick="editPackage('${id}')">
        <i class="fas fa-edit"></i> Edit
      </button>
      <button class="btn-delete" onclick="confirmDelete('${id}', '${escapeHtml(pkg.name)}')">
        <i class="fas fa-trash"></i> Delete
      </button>
    </div>
  `;
  
  // Add drag event listeners
  setupDragListeners(card);
  
  // Add toggle event listener
  const toggleInput = card.querySelector('.status-toggle-input');
  toggleInput.addEventListener('change', (e) => {
    e.stopPropagation(); // Prevent drag events
    handleStatusToggle(id, e.target.checked);
  });
  
  return card;
}

// ========================================
// Modal Handlers
// ========================================

// ========================================
// Override handleSaveConcession for Edit Support
// ========================================

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

// ========================================
// Modal Handlers
// ========================================

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

// Note: Add/Create functionality now uses the existing modal from concessions-admin.js
// Edit functionality extends the same modal by tracking editingPackageId

// ========================================
// Edit Package - Extends the existing modal for edit mode
// ========================================

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

// ========================================
// Update Package (Edit Mode Handler)
// ========================================

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

// ========================================
// Delete Package
// ========================================

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

// ========================================
// UI Helper Functions
// ========================================

function showLoading(show) {
  const spinner = document.getElementById('loading-spinner');
  spinner.style.display = show ? 'flex' : 'none';
}

function showError(message) {
  alert(message);
}

function showStatusMessage(message, type = 'success') {
  const dragHint = document.getElementById('drag-hint');
  if (!dragHint) {
    // Fallback to alert if drag hint element doesn't exist
    alert(message);
    return;
  }
  
  const originalHTML = dragHint.innerHTML;
  const originalColor = dragHint.style.color;
  
  const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
  const color = type === 'success' ? 'var(--admin-success)' : 'var(--admin-error)';
  
  dragHint.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
  dragHint.style.color = color;
  
  setTimeout(() => {
    dragHint.innerHTML = originalHTML;
    dragHint.style.color = originalColor;
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========================================
// Auto-logout on Inactivity (30 minutes)
// ========================================

let inactivityTimer;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  
  if (auth.currentUser) {
    inactivityTimer = setTimeout(() => {
      console.log('Auto-logout due to inactivity');
      auth.signOut();
      alert('You have been logged out due to inactivity.');
    }, INACTIVITY_TIMEOUT);
  }
}

['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach((event) => {
  document.addEventListener(event, resetInactivityTimer, true);
});

// ========================================
// Drag and Drop Functionality
// ========================================

let draggedElement = null;

function setupDragListeners(card) {
  card.addEventListener('dragstart', handleDragStart);
  card.addEventListener('dragend', handleDragEnd);
  card.addEventListener('dragover', handleDragOver);
  card.addEventListener('drop', handleDrop);
  card.addEventListener('dragenter', handleDragEnter);
  card.addEventListener('dragleave', handleDragLeave);
}

function handleDragStart(e) {
  draggedElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  
  // Remove drag-over class from all cards
  document.querySelectorAll('.package-card').forEach(card => {
    card.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  if (this !== draggedElement) {
    this.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

async function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  if (draggedElement !== this) {
    // Get the container
    const container = document.getElementById('packages-container');
    const allCards = Array.from(container.querySelectorAll('.package-card'));
    
    // Get positions
    const draggedIndex = allCards.indexOf(draggedElement);
    const targetIndex = allCards.indexOf(this);
    
    // Reorder in DOM
    if (draggedIndex < targetIndex) {
      this.parentNode.insertBefore(draggedElement, this.nextSibling);
    } else {
      this.parentNode.insertBefore(draggedElement, this);
    }
    
    // Update displayOrder in Firestore
    await updateDisplayOrders();
  }
  
  return false;
}

async function updateDisplayOrders() {
  const container = document.getElementById('packages-container');
  const allCards = Array.from(container.querySelectorAll('.package-card'));
  
  try {
    // Create batch update
    const batch = db.batch();
    
    allCards.forEach((card, index) => {
      const packageId = card.getAttribute('data-package-id');
      const docRef = db.collection('concessionPackages').doc(packageId);
      batch.update(docRef, { displayOrder: index + 1 });
    });
    
    await batch.commit();
    console.log('Display orders updated successfully');
    
    // Show brief success message
    showOrderUpdateSuccess();
    
  } catch (error) {
    console.error('Error updating display orders:', error);
    alert('Failed to save new order: ' + error.message);
    // Reload to restore correct order
    loadPackages();
  }
}

function showOrderUpdateSuccess() {
  const dragHint = document.getElementById('drag-hint');
  if (!dragHint) return;
  
  const originalHTML = dragHint.innerHTML;
  dragHint.innerHTML = '<i class="fas fa-check-circle"></i> Order saved!';
  dragHint.style.color = 'var(--admin-success)';
  
  setTimeout(() => {
    dragHint.innerHTML = originalHTML;
    dragHint.style.color = '';
  }, 2000);
}

// ========================================
// Status Toggle Functionality
// ========================================

async function handleStatusToggle(packageId, isActive) {
  try {
    await db.collection('concessionPackages').doc(packageId).update({
      isActive: isActive,
      updateAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Package ${packageId} ${isActive ? 'activated' : 'deactivated'}`);
    
    // Update the card appearance
    const card = document.querySelector(`[data-package-id="${packageId}"]`);
    if (card) {
      const statusLabel = card.querySelector('.status-label');
      if (statusLabel) {
        statusLabel.textContent = isActive ? 'Active' : 'Inactive';
        statusLabel.className = `status-label ${isActive ? 'active' : 'inactive'}`;
      }
      
      // Update card class
      card.className = `package-card ${isActive ? 'active' : 'inactive'}`;
    }
    
    // Show brief success message (pass the correct state)
    showStatusUpdateSuccess(isActive ? 'activated' : 'deactivated');
    
  } catch (error) {
    console.error('Error updating package status:', error);
    alert('Failed to update package status: ' + error.message);
    
    // Revert the toggle
    const toggleInput = document.querySelector(`[data-package-id="${packageId}"]`);
    if (toggleInput) {
      toggleInput.checked = !isActive;
    }
  }
}

function showStatusUpdateSuccess(action) {
  const dragHint = document.getElementById('drag-hint');
  if (!dragHint) return;
  
  const originalHTML = dragHint.innerHTML;
  const originalColor = dragHint.style.color;
  
  const isActivated = action === 'activated';
  dragHint.innerHTML = `<i class="fas fa-check-circle"></i> Package ${action}!`;
  dragHint.style.color = isActivated ? 'var(--admin-success)' : 'var(--admin-error)';
  
  setTimeout(() => {
    dragHint.innerHTML = originalHTML;
    dragHint.style.color = originalColor;
  }, 2000);
}
