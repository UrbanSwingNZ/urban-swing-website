// Playlist Manager - Authentication Module
// Handles Spotify authentication and authorization

import { showLoading, showError, showConnectPrompt, showAuthenticatedState } from './playlist-ui.js';
import { spotifyConfig, getSpotifyAuthUrl } from './spotify-config.js';

// ========================================
// SPOTIFY AUTHENTICATION
// ========================================

export async function handleSpotifyConnect() {
  showLoading(true);
  const authUrl = await getSpotifyAuthUrl();
  window.location.href = authUrl;
}

// Parse authorization code from URL (authorization code flow)
export function getAuthCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

// Exchange authorization code for access token via Cloudflare Worker
export async function exchangeCodeForTokens(code) {
  try {
    console.log('Exchanging authorization code via Cloudflare Worker...');
    
    // Call Cloudflare Worker (no Firebase Auth required)
    const response = await fetch('https://urban-swing-spotify.urban-swing.workers.dev/exchange-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
        redirectUri: spotifyConfig.redirectUri,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Token exchange failed');
    }
    
    const tokens = await response.json();
    
    // Store Spotify user ID for refresh token lookups
    localStorage.setItem('spotify_user_id', tokens.userId);
    
    // Store tokens (refresh token is stored server-side in Firestore)
    spotifyAPI.setTokens(tokens.accessToken, null, tokens.expiresIn);
    
    console.log('Successfully exchanged authorization code for tokens');
    
  } catch (error) {
    console.error('Token exchange error:', error);
    throw new Error(error.message || 'Failed to exchange authorization code');
  }
}

export async function handleSpotifyDisconnect() {
  // Disconnect Spotify Player
  try {
    const { disconnectPlayer } = await import('./spotify-player.js');
    disconnectPlayer();
  } catch (error) {
    // Player might not be loaded yet
  }
  
  // Clear tokens
  spotifyAPI.accessToken = null;
  spotifyAPI.refreshToken = null;
  spotifyAPI.tokenExpiry = null;
  
  // Clear from localStorage
  try {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_token_expiry');
    localStorage.removeItem('last_viewed_playlist'); // Clear saved playlist
  } catch (error) {
    console.error('Error clearing tokens from storage:', error);
  }
  
  showConnectPrompt();
}

// ========================================
// USER INFO
// ========================================

export async function loadUserInfo() {
  try {
    const user = await spotifyAPI.getCurrentUser();
    document.getElementById('spotify-user-name').textContent = user.display_name || user.id;
  } catch (error) {
    console.error('Error loading user info:', error);
  }
}

export function initializeButtonStates() {
  // Ensure disconnect button starts hidden
  // The auth logic will show it if user is authenticated
  const disconnectBtn = document.getElementById('spotify-disconnect-btn');
  if (disconnectBtn) {
    disconnectBtn.style.setProperty('display', 'none', 'important');
  }
  
  // Ensure Save Order button starts hidden
  updateSaveOrderButton();
  
  // Debug: Check hamburger menu
  const hamburger = document.getElementById('sidebar-toggle');
  if (hamburger) {
    const computedStyle = window.getComputedStyle(hamburger);
    console.log('Hamburger menu computed display:', computedStyle.display);
    console.log('Window width:', window.innerWidth);
  }
}

// Import updateSaveOrderButton from track-operations
import { updateSaveOrderButton } from './track-operations.js';
