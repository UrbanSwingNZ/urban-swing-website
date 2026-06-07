// Status Toggle Functionality for Active/Inactive Memberships

async function handleMembershipStatusToggle(membershipId, isActive) {
  try {
    await db.collection('membershipTypes').doc(membershipId).update({
      isActive: isActive,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Membership ${membershipId} ${isActive ? 'activated' : 'deactivated'}`);
    
    // Update the card appearance
    const card = document.querySelector(`[data-membership-id="${membershipId}"]`);
    if (card) {
      const statusLabel = card.querySelector('.status-label');
      if (statusLabel) {
        statusLabel.textContent = isActive ? 'Active' : 'Inactive';
        statusLabel.className = `status-label ${isActive ? 'active' : 'inactive'}`;
      }
      
      // Update card class
      card.className = `membership-card ${isActive ? 'active' : 'inactive'}`;
    }
    
    // Show brief success message
    showMembershipStatusUpdateSuccess(isActive ? 'activated' : 'deactivated');
    
  } catch (error) {
    console.error('Error updating membership status:', error);
    alert('Failed to update membership status: ' + error.message);
    
    // Revert the toggle
    const toggleInput = document.querySelector(`[data-membership-id="${membershipId}"] input[type="checkbox"]`);
    if (toggleInput) {
      toggleInput.checked = !isActive;
    }
  }
}

function showMembershipStatusUpdateSuccess(action) {
  const dragHint = document.getElementById('membership-drag-hint');
  if (!dragHint) return;
  
  const originalHTML = dragHint.innerHTML;
  const originalColor = dragHint.style.color;
  
  const isActivated = action === 'activated';
  dragHint.innerHTML = `<i class="fas fa-check-circle"></i> Membership ${action}!`;
  dragHint.style.color = isActivated ? 'var(--success)' : 'var(--error)';
  
  setTimeout(() => {
    dragHint.innerHTML = originalHTML;
    dragHint.style.color = originalColor;
  }, 2000);
}

// Export to global scope
window.handleMembershipStatusToggle = handleMembershipStatusToggle;
