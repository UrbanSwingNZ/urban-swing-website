// Status Toggle Functionality for Active/Inactive Packages

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
