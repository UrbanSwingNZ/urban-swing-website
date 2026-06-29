// Modal Handlers for Membership Types Manager

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';
import { showSnackbar } from '/js/utils/index.js';

let editingMembershipId = null;

// Open Add Membership Modal
function openAddMembershipModal() {
  editingMembershipId = null;
  
  // Reset form
  document.getElementById('membership-form').reset();
  
  // Set modal title and button
  document.getElementById('membership-modal-title').innerHTML = '<i class="fas fa-plus"></i> Add Membership Type';
  document.getElementById('save-membership-btn').innerHTML = '<i class="fas fa-save"></i> Create Membership';
  
  // Show modal
  document.getElementById('membership-modal').style.display = 'flex';
}

// Close Membership Modal
function closeMembershipModal() {
  editingMembershipId = null;
  document.getElementById('membership-modal').style.display = 'none';
  document.getElementById('membership-form').reset();
}

// Save Membership (Add or Update)
async function saveMembership(event) {
  event.preventDefault();
  
  const saveBtn = document.getElementById('save-membership-btn');
  const originalText = saveBtn.innerHTML;
  
  try {
    // Get form values
    const name = document.getElementById('membership-name').value.trim();
    const price = parseFloat(document.getElementById('membership-price').value);
    const description = document.getElementById('membership-description').value.trim();
    const showOnRegistration = document.getElementById('membership-show-registration').checked;
    
    // Validate
    if (!name) {
      showSnackbar('Please enter a membership name', 'error');
      return;
    }
    
    if (!price || price < 0) {
      showSnackbar('Please enter a valid price', 'error');
      return;
    }
    
    // Disable button and show loading
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    const membershipData = {
      name: name,
      price: price,
      description: description || '',
      showOnRegistration: showOnRegistration,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (editingMembershipId) {
      // Update existing membership (keep existing displayOrder and isActive)
      await db.collection('membershipTypes').doc(editingMembershipId).update(membershipData);
      showSnackbar('Membership updated successfully', 'success');
    } else {
      // Create new membership
      // Get the highest displayOrder
      const snapshot = await db.collection('membershipTypes')
        .orderBy('displayOrder', 'desc')
        .limit(1)
        .get();
      
      let nextOrder = 1;
      if (!snapshot.empty) {
        const lastMembership = snapshot.docs[0].data();
        nextOrder = (lastMembership.displayOrder || 0) + 1;
      }
      
      membershipData.displayOrder = nextOrder;
      membershipData.isActive = true;
      membershipData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      
      // Generate document ID from name (like concessionPackages)
      const docId = name.toLowerCase()
        .replace(/\s+/g, '-')        // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, '')  // Remove special characters
        .replace(/-+/g, '-')         // Replace multiple hyphens with single
        .replace(/^-|-$/g, '');      // Remove leading/trailing hyphens
      
      // Check if ID already exists
      const existingDoc = await db.collection('membershipTypes').doc(docId).get();
      if (existingDoc.exists) {
        showSnackbar('A membership type with this name already exists', 'error');
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
        return;
      }
      
      await db.collection('membershipTypes').doc(docId).set(membershipData);
      showSnackbar('Membership created successfully', 'success');
    }
    
    // Close modal and reload
    closeMembershipModal();
    await window.loadMembershipTypes();
    
  } catch (error) {
    console.error('Error saving membership:', error);
    showSnackbar('Failed to save membership: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
  }
}

// Edit Membership
async function editMembership(id) {
  try {
    const doc = await db.collection('membershipTypes').doc(id).get();
    
    if (!doc.exists) {
      showSnackbar('Membership not found', 'error');
      return;
    }
    
    const membership = doc.data();
    editingMembershipId = id;
    
    // Fill form
    document.getElementById('membership-name').value = membership.name || '';
    document.getElementById('membership-price').value = membership.price || '';
    document.getElementById('membership-description').value = membership.description || '';
    document.getElementById('membership-show-registration').checked = membership.showOnRegistration || false;
    
    // Update modal title and button
    document.getElementById('membership-modal-title').innerHTML = '<i class="fas fa-edit"></i> Edit Membership Type';
    document.getElementById('save-membership-btn').innerHTML = '<i class="fas fa-save"></i> Update Membership';
    
    // Show modal
    document.getElementById('membership-modal').style.display = 'flex';
    
  } catch (error) {
    console.error('Error loading membership:', error);
    showSnackbar('Failed to load membership: ' + error.message, 'error');
  }
}

// Confirm Delete Membership
async function confirmDeleteMembership(id, name) {
  const modal = new ConfirmationModal({
    title: 'Delete Membership Type',
    message: `
      <p>Are you sure you want to delete this membership type?</p>
      <div class="student-info-delete">
        <strong>${name}</strong>
      </div>
      <p class="text-muted" style="margin-top: 15px;">
        <i class="fas fa-info-circle"></i> This will affect students and memberships across the system.
      </p>
    `,
    icon: 'fas fa-trash',
    variant: 'danger',
    confirmText: 'Delete Membership',
    confirmClass: 'btn-delete',
    cancelText: 'Cancel',
    cancelClass: 'btn-cancel',
    onConfirm: async () => {
      await deleteMembership(id);
    }
  });
  
  modal.show();
}

// Delete Membership
async function deleteMembership(id) {
  try {
    // Check if any students have this membership
    const membershipsSnapshot = await db.collection('memberships')
      .where('typeId', '==', id)
      .where('status', 'in', ['active', 'pending'])
      .limit(1)
      .get();
    
    if (!membershipsSnapshot.empty) {
      showSnackbar('Cannot delete membership type: Students are currently using this membership', 'error');
      return;
    }
    
    // Delete the membership type
    await db.collection('membershipTypes').doc(id).delete();
    showSnackbar('Membership deleted successfully', 'success');
    
    // Reload list
    await window.loadMembershipTypes();
    
  } catch (error) {
    console.error('Error deleting membership:', error);
    showSnackbar('Failed to delete membership: ' + error.message, 'error');
  }
}

// Export functions to global scope
window.openAddMembershipModal = openAddMembershipModal;
window.closeMembershipModal = closeMembershipModal;
window.saveMembership = saveMembership;
window.editMembership = editMembership;
window.confirmDeleteMembership = confirmDeleteMembership;
