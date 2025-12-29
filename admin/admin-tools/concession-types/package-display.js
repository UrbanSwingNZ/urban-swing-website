// Package Display Logic for Concession Types Manager

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
  const isPromo = pkg.isPromo === true; // Check if this is a promo package
  card.className = `package-card ${isActive ? 'active' : 'inactive'} ${isPromo ? 'promo' : ''}`;
  card.setAttribute('data-package-id', id);
  card.setAttribute('draggable', 'true');
  
  const numberOfClasses = pkg.numberOfClasses || 0;
  const price = pkg.price || 0;
  const pricePerClass = numberOfClasses > 0 ? (price / numberOfClasses).toFixed(2) : '0.00';
  
  // Check if this is shown on registration
  const showOnRegistration = pkg.showOnRegistration === true;
  
  // Format package name - if it contains "PROMO", put it on separate line
  let formattedName = pkg.name;
  if (formattedName.match(/promo/i)) {
    // Replace "PROMO - " or "promo - " with "PROMO<br>"
    formattedName = formattedName.replace(/promo\s*-\s*/i, 'PROMO<br>');
  }
  
  // Create promo badge if isPromo is true
  const promoBadge = isPromo ? '<span class="promo-badge"><i class="fas fa-star"></i> PROMO <i class="fas fa-star"></i></span>' : '';
  
  // Create registration badge if showOnRegistration is true
  const registrationBadge = showOnRegistration ? '<span class="registration-badge"><i class="fas fa-user-plus"></i> AVAILABLE ON REGISTRATION FORM</span>' : '';
  
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
    
    <h3 class="package-name">${formattedName}${promoBadge}</h3>
    
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
    
    ${registrationBadge ? `<div class="package-registration-indicator">${registrationBadge}</div>` : ''}
    
    <div class="package-actions">
      <button class="btn-primary btn-edit" onclick="editPackage('${id}')">
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
