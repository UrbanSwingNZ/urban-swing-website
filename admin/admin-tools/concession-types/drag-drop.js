// Drag and Drop Functionality for Package Reordering

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
  dragHint.style.color = 'var(--success)';
  
  setTimeout(() => {
    dragHint.innerHTML = originalHTML;
    dragHint.style.color = '';
  }, 2000);
}
