// Playlist Manager - Main Coordinator
// Coordinates all modules and initializes the application

import * as Auth from './playlist-auth.js';
import * as PlaylistOps from './playlist-operations.js';
import * as TrackOps from './track-operations.js';
import * as UI from './playlist-ui.js';
import * as Player from './spotify-player.js';
import * as State from './playlist-state.js';
import { initMobilePlaylistSelector } from './mobile-playlist-selector.js';
import { BaseModal } from '/components/modals/modal-base.js';

// ========================================
// INITIALIZATION
// ========================================

// Token expiry warning modal instance
let tokenExpiryModal = null;

// Wait for page to load
window.addEventListener('load', async () => {
  // Show admin user email from Firebase Auth
  try {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged((user) => {
        if (user && user.email) {
          const adminEmailElement = document.getElementById('user-email');
          if (adminEmailElement) {
            adminEmailElement.textContent = user.email;
          }
        }
      });
    }
  } catch (error) {
    console.log('Firebase auth not available:', error);
  }
  
  await initializeApp();
});

async function initializeApp() {
  setupEventListeners();
  
  // Initialize mobile playlist selector
  initMobilePlaylistSelector();
  
  // Initialize button states to prevent both from showing
  Auth.initializeButtonStates();
  
  // Initialize token expiry monitoring
  initializeTokenExpiryMonitoring();
  
  // Check if we have an authorization code in the URL (authorization code flow)
  const authCode = Auth.getAuthCodeFromUrl();
  if (authCode) {
    try {
      UI.showLoading(true);
      // Exchange code for tokens
      await Auth.exchangeCodeForTokens(authCode);
      window.history.replaceState({}, document.title, window.location.pathname);
      await UI.showAuthenticatedState();
      return;
    } catch (error) {
      console.error('Token exchange error:', error);
      UI.showError('Failed to authenticate with Spotify: ' + error.message);
      UI.showConnectPrompt();
      return;
    } finally {
      UI.showLoading(false);
    }
  }
  
  // Try to load existing Spotify tokens from localStorage
  if (spotifyAPI.loadTokensFromStorage() && spotifyAPI.isAuthenticated()) {
    await UI.showAuthenticatedState();
  } else {
    UI.showConnectPrompt();
  }
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
  // Connect Spotify buttons
  document.getElementById('connect-spotify-prompt-btn')?.addEventListener('click', Auth.handleSpotifyConnect);
  document.getElementById('spotify-disconnect-btn')?.addEventListener('click', Auth.handleSpotifyDisconnect);
  
  // Mobile sidebar toggle
  document.getElementById('admin-sidebar-toggle')?.addEventListener('click', UI.toggleSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', UI.closeSidebar);
  
  // Playlist actions
  document.getElementById('create-playlist-btn')?.addEventListener('click', PlaylistOps.openCreatePlaylistModal);
  document.getElementById('refresh-playlists-btn')?.addEventListener('click', PlaylistOps.loadPlaylists);
  document.getElementById('playlist-search')?.addEventListener('input', PlaylistOps.handlePlaylistSearch);
  
  // Create playlist modal
  document.getElementById('close-create-modal')?.addEventListener('click', PlaylistOps.closeCreatePlaylistModal);
  document.getElementById('cancel-create-playlist-btn')?.addEventListener('click', PlaylistOps.closeCreatePlaylistModal);
  document.getElementById('confirm-create-playlist-btn')?.addEventListener('click', PlaylistOps.handleCreatePlaylist);
  
  // Add tracks modal
  document.getElementById('add-tracks-btn')?.addEventListener('click', TrackOps.openAddTracksModal);
  document.getElementById('close-add-tracks-modal')?.addEventListener('click', TrackOps.closeAddTracksModal);
  document.getElementById('cancel-add-tracks-btn')?.addEventListener('click', TrackOps.closeAddTracksModal);
  document.getElementById('add-selected-tracks-btn')?.addEventListener('click', TrackOps.handleAddSelectedTracks);
  document.getElementById('search-tracks-input')?.addEventListener('input', TrackOps.handleTracksSearch);
  
  // Copy playlist link button
  document.getElementById('copy-playlist-link-btn')?.addEventListener('click', handleCopyPlaylistLink);
  
  // Delete functionality
  document.getElementById('delete-playlist-btn')?.addEventListener('click', PlaylistOps.handleDeletePlaylist);
  
  // Rename playlist modal
  document.getElementById('close-rename-modal')?.addEventListener('click', PlaylistOps.closeRenamePlaylistModal);
  document.getElementById('cancel-rename-btn')?.addEventListener('click', PlaylistOps.closeRenamePlaylistModal);
  document.getElementById('confirm-rename-btn')?.addEventListener('click', PlaylistOps.handleRenamePlaylist);
  
  // Track actions
  document.getElementById('track-search')?.addEventListener('input', TrackOps.handleTrackSearch);
  document.getElementById('save-order-btn')?.addEventListener('click', TrackOps.handleSaveOrder);
  
  // Modal actions
  document.getElementById('close-modal')?.addEventListener('click', TrackOps.closeModal);
  document.getElementById('cancel-action-btn')?.addEventListener('click', TrackOps.closeModal);
  document.getElementById('confirm-action-btn')?.addEventListener('click', TrackOps.handleConfirmAction);
  
  // Close modal on background click
  document.getElementById('track-action-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'track-action-modal') {
      TrackOps.closeModal();
    }
  });
  
  document.getElementById('create-playlist-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'create-playlist-modal') {
      PlaylistOps.closeCreatePlaylistModal();
    }
  });
  
  document.getElementById('rename-playlist-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'rename-playlist-modal') {
      PlaylistOps.closeRenamePlaylistModal();
    }
  });
  
  document.getElementById('add-tracks-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'add-tracks-modal') {
      TrackOps.closeAddTracksModal();
    }
  });
  
  // Escape key handling
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Check which modal is open
      const trackModal = document.getElementById('track-action-modal');
      const createModal = document.getElementById('create-playlist-modal');
      const addTracksModal = document.getElementById('add-tracks-modal');
      
      if (trackModal && trackModal.style.display === 'block') {
        TrackOps.closeModal();
      } else if (createModal && createModal.style.display === 'block') {
        PlaylistOps.closeCreatePlaylistModal();
      } else if (addTracksModal && addTracksModal.style.display === 'block') {
        TrackOps.closeAddTracksModal();
      }
    }
  });
  
  // Mobile playlist selection
  document.addEventListener('mobile-playlist-selected', async (e) => {
    const { playlistId } = e.detail;
    const playlists = State.getAllPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      await PlaylistOps.selectPlaylist(playlist);
    }
  });
}

// ========================================
// COPY PLAYLIST LINK HANDLER
// ========================================

function handleCopyPlaylistLink() {
  const playlistId = State.getCurrentPlaylistId();
  
  if (!playlistId) {
    UI.showSnackbar('No playlist selected', 'error');
    return;
  }
  
  const songdataUrl = `https://songdata.io/playlist/${playlistId}`;
  
  // Open songdata.io in new tab
  window.open(songdataUrl, '_blank');
  
  UI.showSnackbar('Opening SongData.io - click "Extract BPMs to Firestore" when loaded', 'info');
}

// ========================================
// TOKEN EXPIRY MONITORING
// ========================================

let tokenExpiryCheckInterval = null;

function initializeTokenExpiryMonitoring() {
  // Create the token expiry modal using BaseModal
  if (!tokenExpiryModal) {
    tokenExpiryModal = new BaseModal({
      id: 'token-expiry-warning-modal',
      title: '<i class="fas fa-exclamation-triangle"></i> Spotify Token Expiring Soon',
      content: `
        <p style="margin-bottom: 20px; font-size: 15px; line-height: 1.6;">
          Your Spotify access token will expire in less than 5 minutes. Click below to get a fresh token and continue working without interruption.
        </p>
      `,
      buttons: [
        {
          text: '<i class="fas fa-sync-alt"></i> Get Fresh Token',
          class: 'btn-primary',
          onClick: () => handleRefreshToken()
        }
      ],
      size: 'small',
      closeOnEscape: false,
      closeOnOverlay: false,
      showCloseButton: false
    });
    
    // Add warning styling to the modal
    const modalElement = tokenExpiryModal.element;
    modalElement.classList.add('modal-warning');
    const header = modalElement.querySelector('.modal-header');
    if (header) {
      header.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      header.style.color = 'white';
    }
    const headerTitle = header?.querySelector('h3');
    if (headerTitle) {
      headerTitle.style.color = 'white';
    }
  }
  
  // Clear any existing interval
  if (tokenExpiryCheckInterval) {
    clearInterval(tokenExpiryCheckInterval);
  }
  
  // Check token expiry immediately if authenticated
  if (spotifyAPI.isAuthenticated()) {
    checkTokenExpiry();
  }
  
  // Check every minute
  tokenExpiryCheckInterval = setInterval(() => {
    if (spotifyAPI.accessToken) {
      checkTokenExpiry();
    }
  }, 60 * 1000);
  
  // Listen for token updates
  window.addEventListener('spotify-token-updated', () => {
    checkTokenExpiry();
  });
}

function checkTokenExpiry() {
  const timeUntilExpiry = spotifyAPI.getTimeUntilExpiry();
  const fiftyFiveMinutes = 55 * 60 * 1000; // 55 minutes in milliseconds
  
  if (!tokenExpiryModal) return;
  
  // Show warning if less than 5 minutes remaining (token expires in 60 min, show at 55 min mark)
  if (timeUntilExpiry > 0 && timeUntilExpiry <= (60 * 60 * 1000 - fiftyFiveMinutes)) {
    tokenExpiryModal.show();
  } else if (timeUntilExpiry <= 0) {
    // Token has expired, disconnect
    tokenExpiryModal.hide();
    Auth.handleSpotifyDisconnect();
    UI.showError('Your Spotify session has expired. Please reconnect.');
  } else {
    tokenExpiryModal.hide();
  }
}

async function handleRefreshToken() {
  tokenExpiryModal.hide();
  UI.showLoading(true);
  
  try {
    const success = await spotifyAPI.refreshAccessToken();
    if (success) {
      UI.showSnackbar('Token refreshed successfully!', 'success');
      // Trigger token updated event
      window.dispatchEvent(new CustomEvent('spotify-token-updated', {
        detail: { expiresAt: spotifyAPI.tokenExpiry }
      }));
    } else {
      UI.showError('Failed to refresh token. Please reconnect to Spotify.');
      Auth.handleSpotifyDisconnect();
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    UI.showError('Failed to refresh token. Please reconnect to Spotify.');
    Auth.handleSpotifyDisconnect();
  } finally {
    UI.showLoading(false);
  }
}
