// Admin Dashboard Logic
// Handles Firebase authentication and dashboard state

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
      showDashboard(user);
    } else {
      // User is logged out
      showLogin();
    }
  });
}

// ========================================
// Login Functionality
// ========================================

function showLogin() {
  document.getElementById('login-container').style.display = 'flex';
  document.getElementById('dashboard-container').style.display = 'none';
  
  // Clear the login form
  const loginForm = document.getElementById('login-form');
  loginForm.reset();
  
  // Clear any error messages
  const errorDiv = document.getElementById('login-error');
  errorDiv.textContent = '';
  errorDiv.classList.remove('show');
  
  // Setup login form handler
  loginForm.addEventListener('submit', handleLogin);
}

async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('login-btn');
  const errorDiv = document.getElementById('login-error');
  
  // Clear previous errors
  errorDiv.textContent = '';
  errorDiv.classList.remove('show');
  
  // Disable button during login
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
  
  try {
    // Attempt to sign in with Firebase
    await auth.signInWithEmailAndPassword(email, password);
    
    // Success! Auth state listener will handle showing dashboard
    console.log('Login successful');
    
  } catch (error) {
    console.error('Login error:', error);
    
    // Display user-friendly error messages
    let errorMessage = 'Login failed. Please try again.';
    
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address format.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled.';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed login attempts. Please try again later.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your internet connection.';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Invalid email or password.';
        break;
    }
    
    showError(errorMessage, errorDiv);
    
  } finally {
    // Re-enable button
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
  }
}

// ========================================
// Dashboard Functionality
// ========================================

function showDashboard(user) {
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('dashboard-container').style.display = 'flex';
  
  // Display user email
  const userEmailElement = document.getElementById('user-email');
  userEmailElement.textContent = user.email;
  
  // Setup logout button
  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn.addEventListener('click', handleLogout);
  
  // Setup tile buttons (disabled for now - coming soon)
  setupTileButtons();
  
  console.log('Dashboard loaded for user:', user.email);
}

function setupTileButtons() {
  const playlistBtn = document.getElementById('playlist-manager-btn');
  const checkinBtn = document.getElementById('checkin-btn');
  
  // Playlist Manager - Now available!
  playlistBtn.addEventListener('click', () => {
    window.location.href = 'playlist-manager/index.html';
  });
  
  // Check-in system - Coming soon
  checkinBtn.addEventListener('click', () => {
    alert('Student Check-in system is coming soon! ✅');
  });
}

async function handleLogout() {
  showLoading(true);
  
  try {
    await auth.signOut();
    console.log('Logout successful');
    // Auth state listener will handle showing login screen
    
  } catch (error) {
    console.error('Logout error:', error);
    showError('Failed to logout. Please try again.');
    showLoading(false);
  }
}

// ========================================
// UI Helper Functions
// ========================================

function showLoading(show) {
  const spinner = document.getElementById('loading-spinner');
  spinner.style.display = show ? 'flex' : 'none';
}

function showError(message, element = null) {
  if (element) {
    element.textContent = message;
    element.classList.add('show');
  } else {
    alert(message);
  }
}

// ========================================
// Security: Prevent right-click and inspect
// (Optional - uncomment if you want extra protection)
// ========================================

/*
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

document.addEventListener('keydown', (e) => {
  // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
    (e.ctrlKey && e.key === 'U')
  ) {
    e.preventDefault();
  }
});
*/

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

// ========================================
// Service Worker for Offline Support (Optional)
// ========================================

if ('serviceWorker' in navigator) {
  // Uncomment to enable offline caching
  /*
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('Service Worker registered:', registration);
    })
    .catch(error => {
      console.log('Service Worker registration failed:', error);
    });
  */
}
