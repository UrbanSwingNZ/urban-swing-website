// Membership Types Manager - Initialization
// This file extends the existing auth.js to add membership management

// Wait for page to load and existing auth to initialize
window.addEventListener('load', () => {
  // Wait for the main auth initialization to complete
  // then set up membership-specific handlers
  setTimeout(() => {
    initializeMembershipManagement();
  }, 500);
});

function initializeMembershipManagement() {
  console.log('Initializing membership management...');
  
  // Setup add membership button
  const addMembershipBtn = document.getElementById('add-membership-btn');
  if (addMembershipBtn) {
    addMembershipBtn.addEventListener('click', () => {
      openAddMembershipModal();
    });
  }
  
  // Load memberships if user is authenticated
  if (auth && auth.currentUser) {
    loadMembershipTypes();
  }
}

// Export to global scope
window.initializeMembershipManagement = initializeMembershipManagement;
