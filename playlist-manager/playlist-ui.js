// Playlist Manager - UI Utilities Module
// Handles UI helpers, loading states, snackbars, and mobile sidebar

import { loadUserInfo } from './playlist-auth.js';
import { loadPlaylists } from './playlist-operations.js';

// ========================================
// UI HELPERS
// ========================================

export function showLoading(show) {
  document.getElementById('loading-spinner').style.display = show ? 'flex' : 'none';
}

export function showError(message) {
  showSnackbar('Error: ' + message, 'error');
}

export function showSuccess(message) {
  showSnackbar(message, 'success');
}

export function showSnackbar(message, type = 'success') {
  const snackbar = document.getElementById('snackbar');
  
  // Clear any existing classes
  snackbar.className = 'snackbar';
  
  // Add type class
  if (type) {
    snackbar.classList.add(type);
  }
  
  // Set message
  snackbar.textContent = message;
  
  // Show snackbar
  snackbar.classList.add('show');
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    snackbar.classList.remove('show');
  }, 3000);
}

// ========================================
// AUTHENTICATION UI STATES
// ========================================

export function showConnectPrompt() {
  console.log('Showing connect prompt');
  document.getElementById('connect-prompt').style.display = 'flex';
  document.getElementById('main-content').style.display = 'none';
  
  // Force button states for connect screen
  const connectBtn = document.getElementById('spotify-connect-btn');
  const disconnectBtn = document.getElementById('spotify-disconnect-btn');
  
  if (connectBtn) connectBtn.style.setProperty('display', 'flex', 'important');
  if (disconnectBtn) disconnectBtn.style.setProperty('display', 'none', 'important');
}

export async function showAuthenticatedState() {
  console.log('Showing authenticated state');
  document.getElementById('connect-prompt').style.display = 'none';
  document.getElementById('main-content').style.display = 'flex';
  
  // Force button states for authenticated screen
  const connectBtn = document.getElementById('spotify-connect-btn');
  const disconnectBtn = document.getElementById('spotify-disconnect-btn');
  
  if (connectBtn) connectBtn.style.setProperty('display', 'none', 'important');
  if (disconnectBtn) disconnectBtn.style.setProperty('display', 'flex', 'important');
  
  // Load user info and playlists
  await loadUserInfo();
  await loadPlaylists();
}

// ========================================
// MOBILE SIDEBAR TOGGLE
// ========================================

export function toggleSidebar() {
  const sidebar = document.querySelector('.pm-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

export function closeSidebar() {
  const sidebar = document.querySelector('.pm-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
}
