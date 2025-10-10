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

// Exchange authorization code for access token
export async function exchangeCodeForTokens(code) {
  const codeVerifier = localStorage.getItem('spotify_code_verifier');
  
  if (!codeVerifier) {
    throw new Error('Code verifier not found. Please try authenticating again.');
  }
  
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: spotifyConfig.clientId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: spotifyConfig.redirectUri,
        code_verifier: codeVerifier,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Token exchange failed');
    }
    
    const tokens = await response.json();
    
    // Store tokens
    spotifyAPI.setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
    
    // Clean up
    localStorage.removeItem('spotify_code_verifier');
    
    console.log('Successfully exchanged authorization code for tokens');
    
  } catch (error) {
    localStorage.removeItem('spotify_code_verifier');
    throw error;
  }
}

export async function handleSpotifyDisconnect() {
  // Clear tokens
  spotifyAPI.accessToken = null;
  spotifyAPI.refreshToken = null;
  spotifyAPI.tokenExpiry = null;
  
  // Clear from localStorage
  try {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_token_expiry');
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
  // Ensure only one Spotify button is visible at a time
  // Default to Connect state, auth logic will override if needed
  const connectBtn = document.getElementById('spotify-connect-btn');
  const disconnectBtn = document.getElementById('spotify-disconnect-btn');
  
  if (connectBtn && disconnectBtn) {
    // Always start with Connect visible, Disconnect hidden
    // The auth logic will switch these if user is authenticated
    connectBtn.style.setProperty('display', 'flex', 'important');
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
