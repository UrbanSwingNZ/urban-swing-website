// Admin Tools Page Logic
// Handles Firebase authentication and page state

// Wait for Firebase to initialize
window.addEventListener('load', () => {
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded');
    showError('Firebase SDK failed to load. Please check your internet connection.');
    return;
  }

  if (!auth) {
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

  // Listen for authentication state changes
  auth.onAuthStateChanged((user) => {
    showLoading(false);
    
    if (user) {
      // User is logged in
      showAdminTools(user);
    } else {
      // User is not logged in - redirect to admin login
      window.location.href = '../index.html';
    }
  });
}

// ========================================
// Admin Tools Page Display
// ========================================

function showAdminTools(user) {
  // Display user email
  const userEmailElement = document.getElementById('user-email');
  userEmailElement.textContent = user.email;
  
  // Setup logout button
  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn.addEventListener('click', handleLogout);
  
  console.log('Admin Tools page loaded for user:', user.email);
}

// handleLogout now provided by centralized utilities (window.handleLogout)

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

// ========================================
// Auto-logout on Inactivity (30 minutes)
// ========================================

let inactivityTimer;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

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

// Reset timer on user activity
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach((event) => {
  document.addEventListener(event, resetInactivityTimer, true);
});
