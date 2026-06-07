// Drag and Drop Functionality for Membership Reordering

let draggedMembershipElement = null;

function setupMembershipDragListeners(card) {
  card.addEventListener('dragstart', handleMembershipDragStart);
  card.addEventListener('dragend', handleMembershipDragEnd);
  card.addEventListener('dragover', handleMembershipDragOver);
  card.addEventListener('drop', handleMembershipDrop);
  card.addEventListener('dragenter', handleMembershipDragEnter);
  card.addEventListener('dragleave', handleMembershipDragLeave);
}

function handleMembershipDragStart(e) {
  draggedMembershipElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleMembershipDragEnd(e) {
  this.classList.remove('dragging');
  
  // Remove drag-over class from all cards
  document.querySelectorAll('.membership-card').forEach(card => {
    card.classList.remove('drag-over');
  });
}

function handleMembershipDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleMembershipDragEnter(e) {
  if (this !== draggedMembershipElement) {
    this.classList.add('drag-over');
  }
}

function handleMembershipDragLeave(e) {
  this.classList.remove('drag-over');
}

async function handleMembershipDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  if (draggedMembershipElement !== this) {
    // Get the container
    const container = document.getElementById('memberships-container');
    const allCards = Array.from(container.querySelectorAll('.membership-card'));
    
    // Get positions
    const draggedIndex = allCards.indexOf(draggedMembershipElement);
    const targetIndex = allCards.indexOf(this);
    
    // Reorder in DOM
    if (draggedIndex < targetIndex) {
      this.parentNode.insertBefore(draggedMembershipElement, this.nextSibling);
    } else {
      this.parentNode.insertBefore(draggedMembershipElement, this);
    }
    
    // Update displayOrder in Firestore
    await updateMembershipDisplayOrders();
  }
  
  return false;
}

async function updateMembershipDisplayOrders() {
  const container = document.getElementById('memberships-container');
  const allCards = Array.from(container.querySelectorAll('.membership-card'));
  
  try {
    // Create batch update
    const batch = db.batch();
    
    allCards.forEach((card, index) => {
      const membershipId = card.getAttribute('data-membership-id');
      const docRef = db.collection('membershipTypes').doc(membershipId);
      batch.update(docRef, { displayOrder: index + 1 });
    });
    
    await batch.commit();
    console.log('Membership display orders updated successfully');
    
    // Show brief success message
    showMembershipOrderUpdateSuccess();
    
  } catch (error) {
    console.error('Error updating membership display orders:', error);
    alert('Failed to save new order: ' + error.message);
    // Reload to restore correct order
    loadMembershipTypes();
  }
}

function showMembershipOrderUpdateSuccess() {
  const dragHint = document.getElementById('membership-drag-hint');
  if (!dragHint) return;
  
  const originalHTML = dragHint.innerHTML;
  dragHint.innerHTML = '<i class="fas fa-check-circle"></i> Order updated successfully!';
  
  setTimeout(() => {
    dragHint.innerHTML = originalHTML;
  }, 2000);
}

// Export to global scope
window.setupMembershipDragListeners = setupMembershipDragListeners;
