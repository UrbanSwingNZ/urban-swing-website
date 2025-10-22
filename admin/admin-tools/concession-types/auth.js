// Authentication State Management for Concession Types Manager

let currentUser = null;

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

// Auto-logout on Inactivity (30 minutes)
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

// Export for use in other modules
window.currentUser = currentUser;
