// Concession Types Manager Logic
// Handles CRUD operations for concessionPackages collection

let currentUser = null;
let currentEditId = null;
let packageToDelete = null;

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
  
  // Setup modal buttons
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
  
  const numberOfClasses = pkg.numberOfClasses || 0;
  const price = pkg.price || 0;
  const pricePerClass = numberOfClasses > 0 ? (price / numberOfClasses).toFixed(2) : '0.00';
  
  card.innerHTML = `
    <div class="package-status ${isActive ? 'active' : 'inactive'}">
      ${isActive ? 'Active' : 'Inactive'}
    </div>
    
    <h3 class="package-name">${escapeHtml(pkg.name)}</h3>
    
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
  
  return card;
}

// ========================================
// Modal Handlers
// ========================================

function setupModalHandlers() {
  const modal = document.getElementById('package-modal');
  const deleteModal = document.getElementById('delete-modal');
  const form = document.getElementById('package-form');
  
  // Add package button
  document.getElementById('add-package-btn').addEventListener('click', () => {
    openModal();
  });
  
  // Close modal buttons
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  
  // Close modal on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Delete modal handlers
  document.getElementById('cancel-delete-btn').addEventListener('click', closeDeleteModal);
  document.getElementById('confirm-delete-btn').addEventListener('click', deletePackage);
  
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });
  
  // Form submit
  form.addEventListener('submit', handleFormSubmit);
}

function openModal(packageId = null, packageData = null) {
  const modal = document.getElementById('package-modal');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('package-form');
  
  currentEditId = packageId;
  
  if (packageId && packageData) {
    // Edit mode
    title.innerHTML = '<i class="fas fa-edit"></i> Edit Concession Package';
    document.getElementById('package-name').value = packageData.name;
    document.getElementById('package-classes').value = packageData.numberOfClasses;
    document.getElementById('package-price').value = packageData.price;
    document.getElementById('package-description').value = packageData.description || '';
    document.getElementById('package-active').checked = packageData.isActive !== false;
  } else {
    // Add mode
    title.innerHTML = '<i class="fas fa-plus"></i> Add Concession Package';
    form.reset();
    document.getElementById('package-active').checked = true;
  }
  
  modal.classList.add('show');
}

function closeModal() {
  const modal = document.getElementById('package-modal');
  modal.classList.remove('show');
  currentEditId = null;
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('save-btn');
  const originalText = submitBtn.innerHTML;
  
  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    const packageData = {
      name: document.getElementById('package-name').value.trim(),
      numberOfClasses: parseInt(document.getElementById('package-classes').value),
      price: parseFloat(document.getElementById('package-price').value),
      description: document.getElementById('package-description').value.trim(),
      isActive: document.getElementById('package-active').checked,
      updateAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (currentEditId) {
      // Update existing package
      await db.collection('concessionPackages').doc(currentEditId).update(packageData);
      console.log('Package updated:', currentEditId);
    } else {
      // Create new package
      packageData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('concessionPackages').add(packageData);
      console.log('Package created');
    }
    
    closeModal();
    loadPackages();
    
  } catch (error) {
    console.error('Error saving package:', error);
    alert('Failed to save package: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// ========================================
// Edit Package
// ========================================

async function editPackage(id) {
  try {
    const doc = await db.collection('concessionPackages').doc(id).get();
    
    if (!doc.exists) {
      alert('Package not found');
      return;
    }
    
    openModal(id, doc.data());
    
  } catch (error) {
    console.error('Error loading package:', error);
    alert('Failed to load package: ' + error.message);
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
