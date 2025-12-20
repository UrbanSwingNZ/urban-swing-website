// Playlist Manager - UI Utilities Module
// Handles UI helpers, loading states, snackbars, and mobile sidebar

import { loadUserInfo } from './playlist-auth.js';
import { loadPlaylists } from './playlist-operations.js';
import { showSnackbar as centralizedSnackbar } from '/js/utils/index.js';

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
  // Use centralized snackbar implementation
  centralizedSnackbar(message, type);
}

// ========================================
// AUTHENTICATION UI STATES
// ========================================

export function showConnectPrompt() {
  console.log('Showing connect prompt');
  document.getElementById('connect-prompt').style.display = 'flex';
  document.getElementById('main-content').style.display = 'none';
  
  // Hide disconnect button when not connected
  const disconnectBtn = document.getElementById('spotify-disconnect-btn');
  if (disconnectBtn) disconnectBtn.style.setProperty('display', 'none', 'important');
}

export async function showAuthenticatedState() {
  document.getElementById('connect-prompt').style.display = 'none';
  document.getElementById('main-content').style.display = 'flex';
  
  // Show disconnect button when authenticated
  const disconnectBtn = document.getElementById('spotify-disconnect-btn');
  if (disconnectBtn) disconnectBtn.style.setProperty('display', 'flex', 'important');
  
  // Initialize Spotify Web Playback SDK
  try {
    const accessToken = spotifyAPI.accessToken;
    if (accessToken) {
      // Import player module and initialize
      const { initializePlayer } = await import('./spotify-player.js');
      await initializePlayer(accessToken);
    }
  } catch (error) {
    console.warn('⚠️ Could not initialize Spotify Player:', error.message);
    if (error.message.includes('premium')) {
      console.warn('💡 Full track playback requires Spotify Premium. Falling back to preview mode.');
    }
  }
  
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
  overlay.classList.toggle('show');
}

export function closeSidebar() {
  const sidebar = document.querySelector('.pm-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
}
