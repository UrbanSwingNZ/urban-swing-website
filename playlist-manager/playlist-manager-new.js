// Playlist Manager - Main Coordinator
// Coordinates all modules and initializes the application

import * as Auth from './playlist-auth.js';
import * as PlaylistOps from './playlist-operations.js';
import * as TrackOps from './track-operations.js';
import * as UI from './playlist-ui.js';
import * as Player from './spotify-player.js';

// ========================================
// INITIALIZATION
// ========================================

// Wait for page to load
window.addEventListener('load', async () => {
  console.log('Playlist manager page loaded');
  
  // TEMPORARY: Skip Firebase auth check for testing
  // TODO: Re-enable after Spotify auth is working
  
  await initializeApp();
});

async function initializeApp() {
  setupEventListeners();
  
  // Initialize button states to prevent both from showing
  Auth.initializeButtonStates();
  
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
  document.getElementById('spotify-connect-btn')?.addEventListener('click', Auth.handleSpotifyConnect);
  document.getElementById('connect-spotify-prompt-btn')?.addEventListener('click', Auth.handleSpotifyConnect);
  document.getElementById('spotify-disconnect-btn')?.addEventListener('click', Auth.handleSpotifyDisconnect);
  
  // Mobile sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', UI.toggleSidebar);
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
  
  // Delete functionality
  document.getElementById('delete-playlist-btn')?.addEventListener('click', PlaylistOps.handleDeletePlaylist);
  
  // Unsaved changes modal
  document.getElementById('save-and-continue-btn')?.addEventListener('click', TrackOps.handleSaveAndContinue);
  document.getElementById('discard-changes-btn')?.addEventListener('click', TrackOps.handleDiscardChanges);
  
  // Delete playlist modal
  document.getElementById('cancel-delete-playlist-btn')?.addEventListener('click', PlaylistOps.closeDeletePlaylistModal);
  document.getElementById('confirm-delete-playlist-btn')?.addEventListener('click', PlaylistOps.confirmDeletePlaylist);
  
  // Rename playlist modal
  document.getElementById('close-rename-modal')?.addEventListener('click', PlaylistOps.closeRenamePlaylistModal);
  document.getElementById('cancel-rename-btn')?.addEventListener('click', PlaylistOps.closeRenamePlaylistModal);
  document.getElementById('confirm-rename-btn')?.addEventListener('click', PlaylistOps.handleRenamePlaylist);
  
  // Track actions
  document.getElementById('track-search')?.addEventListener('input', TrackOps.handleTrackSearch);
  document.getElementById('toggle-explicit-btn')?.addEventListener('click', TrackOps.handleToggleExplicit);
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
}
