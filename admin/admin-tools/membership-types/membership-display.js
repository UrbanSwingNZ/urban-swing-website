// Membership Display Logic for Concession Types Manager

async function loadMembershipTypes() {
  const container = document.getElementById('memberships-container');
  container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><h3>Loading membership types...</h3></div>';

  try {
    console.log('Loading membershipTypes from Firestore...');
    
    // Try with orderBy first
    let snapshot;
    try {
      snapshot = await db.collection('membershipTypes')
        .orderBy('displayOrder', 'asc')
        .get();
    } catch (orderError) {
      // If orderBy fails (missing index), fall back to simple get
      console.warn('OrderBy failed, using simple get:', orderError);
      snapshot = await db.collection('membershipTypes').get();
    }

    console.log(`Found ${snapshot.size} membership types`);

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-id-card"></i>
          <h3>No Membership Types</h3>
          <p>Click "Add Membership Type" to create your first membership.</p>
        </div>
      `;
      return;
    }

    // Sort memberships by displayOrder in JavaScript if orderBy failed
    const memberships = [];
    snapshot.forEach(doc => {
      memberships.push({ id: doc.id, data: doc.data() });
    });
    
    memberships.sort((a, b) => (a.data.displayOrder || 999) - (b.data.displayOrder || 999));

    container.innerHTML = '';
    memberships.forEach(membership => {
      container.appendChild(createMembershipCard(membership.id, membership.data));
    });
    
    // Show drag hint if there are 2+ memberships
    const dragHint = document.getElementById('membership-drag-hint');
    if (dragHint && memberships.length >= 2) {
      dragHint.style.display = 'flex';
    } else if (dragHint) {
      dragHint.style.display = 'none';
    }

  } catch (error) {
    console.error('Error loading membership types:', error);
    console.error('Error details:', error.code, error.message);
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error Loading Membership Types</h3>
        <p>${error.message}</p>
        <p style="font-size: 0.9rem; margin-top: 10px;">Check the browser console for more details.</p>
      </div>
    `;
  }
}

function createMembershipCard(id, membership) {
  const card = document.createElement('div');
  const isActive = membership.isActive !== false; // Default to true if not specified
  card.className = `membership-card ${isActive ? 'active' : 'inactive'}`;
  card.setAttribute('data-membership-id', id);
  card.setAttribute('draggable', 'true');
  
  const price = membership.price || 0;
  
  // Check if this is shown on registration
  const showOnRegistration = membership.showOnRegistration === true;
  
  // Create registration badge if showOnRegistration is true
  const registrationBadge = showOnRegistration ? '<span class="registration-badge"><i class="fas fa-user-plus"></i> AVAILABLE ON REGISTRATION FORM</span>' : '';
  
  card.innerHTML = `
    <div class="drag-handle" title="Drag to reorder">
      <i class="fas fa-grip-vertical"></i>
    </div>
    
    <div class="membership-status-toggle">
      <span class="status-label ${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span>
      <label class="toggle-switch">
        <input 
          type="checkbox" 
          ${isActive ? 'checked' : ''} 
          onchange="handleMembershipStatusToggle('${id}', this.checked)"
        >
        <span class="toggle-slider"></span>
      </label>
    </div>
    
    <div class="membership-name">
      <h3>${membership.name || 'Unnamed Membership'}</h3>
    </div>
    
    ${registrationBadge}
    
    <div class="membership-details">
      <div class="detail-row">
        <span class="detail-label"><i class="fas fa-dollar-sign"></i> Monthly Price:</span>
        <span class="detail-value">$${price.toFixed(2)}</span>
      </div>
      
      ${membership.description ? `
        <div class="detail-row description">
          <span class="detail-label"><i class="fas fa-info-circle"></i> Description:</span>
          <span class="detail-value">${membership.description}</span>
        </div>
      ` : ''}
    </div>
    
    <div class="card-actions">
      <button class="btn-primary btn-edit" onclick="editMembership('${id}')">
        <i class="fas fa-edit"></i> Edit
      </button>
      <button class="btn-delete" onclick="confirmDeleteMembership('${id}', '${membership.name}')">
        <i class="fas fa-trash"></i> Delete
      </button>
    </div>
  `;
  
  // Setup drag listeners
  setupMembershipDragListeners(card);
  
  return card;
}

// Export functions to global scope
window.loadMembershipTypes = loadMembershipTypes;
window.createMembershipCard = createMembershipCard;
