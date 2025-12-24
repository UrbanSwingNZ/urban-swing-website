// Track Audio Module
// Handles Spotify Web Playback and preview playback

import { showError } from '../playlist-ui.js';

// ========================================
// SPOTIFY WEB PLAYBACK
// ========================================

let currentPlayingButton = null;
let currentPlayingTrackUri = null;

// Save playback state to localStorage
function savePlaybackState(trackUri, isPlaying) {
  try {
    localStorage.setItem('currently_playing_track', trackUri);
    localStorage.setItem('currently_playing_state', isPlaying ? 'playing' : 'paused');
  } catch (error) {
    console.warn('Could not save playback state:', error);
  }
}

// Clear playback state from localStorage
function clearPlaybackState() {
  try {
    localStorage.removeItem('currently_playing_track');
    localStorage.removeItem('currently_playing_state');
  } catch (error) {
    console.warn('Could not clear playback state:', error);
  }
}

// Restore playback state UI after page load
export function restorePlaybackState() {
  try {
    const trackUri = localStorage.getItem('currently_playing_track');
    const state = localStorage.getItem('currently_playing_state');
    
    if (trackUri && state === 'playing') {
      // Find the button for this track
      const trackRow = document.querySelector(`tr[data-track-uri="${trackUri}"]`);
      if (trackRow) {
        const playBtn = trackRow.querySelector('.track-play-btn');
        const colNumber = trackRow.querySelector('.col-number');
        if (playBtn) {
          playBtn.innerHTML = '<i class="fas fa-pause"></i>';
          playBtn.classList.add('playing');
          currentPlayingButton = playBtn;
          currentPlayingTrackUri = trackUri;
          // Restore playing animation
          colNumber?.classList.add('playing');
        }
      }
    }
  } catch (error) {
    console.warn('Could not restore playback state:', error);
  }
}

export async function handleTrackPlayPause(button, trackUri, trackId) {
  try {
    // Import player module
    const { playTrack, togglePlayback, getCurrentState, isReady } = await import('../spotify-player.js');
    
    // Check if this is the currently playing track
    const state = await getCurrentState();
    const isCurrentTrack = state && state.track_window?.current_track?.uri === trackUri;
    
    if (isCurrentTrack) {
      // Toggle play/pause for current track
      await togglePlayback();
      
      // Update state in localStorage
      const isPaused = state.paused;
      savePlaybackState(trackUri, !isPaused);
      
      return;
    }
    
    // Check if player is ready
    if (!isReady()) {
      throw new Error('Player not ready. Please try again in a moment.');
    }
    
    // Play new track
    const accessToken = spotifyAPI.accessToken;
    await playTrack(trackUri, accessToken);
    
    // Determine if button is actually a button or the row element (mobile)
    const row = button.closest('tr') || button;
    const actualButton = button.classList?.contains('track-play-btn') ? button : row.querySelector('.track-play-btn');
    
    // Update UI - remove playing state from previous track
    if (currentPlayingButton && currentPlayingButton !== actualButton) {
      if (currentPlayingButton.classList?.contains('track-play-btn')) {
        currentPlayingButton.innerHTML = '<i class="fas fa-play"></i>';
        currentPlayingButton.classList.remove('playing');
      }
      // Remove playing animation from previous track
      const prevRow = currentPlayingButton.closest('tr') || currentPlayingButton;
      const prevColNumber = prevRow.querySelector('.col-number');
      prevColNumber?.classList.remove('playing');
    }
    
    // Update UI - add playing state to current track
    if (actualButton) {
      actualButton.innerHTML = '<i class="fas fa-pause"></i>';
      actualButton.classList.add('playing');
    }
    currentPlayingButton = actualButton || row;
    currentPlayingTrackUri = trackUri;
    
    // Add playing animation to current track
    const colNumber = row.querySelector('.col-number');
    colNumber?.classList.add('playing');
    
    // Save state to localStorage
    savePlaybackState(trackUri, true);
    
  } catch (error) {
    console.error('Error playing track:', error);
    
    // Show error message to user
    if (error.message.includes('premium')) {
      showError('Spotify Premium is required for full playback. Using 30-second preview instead.');
      // Fall back to preview if available
      const previewUrl = button.dataset.previewUrl;
      if (previewUrl) {
        playPreviewFallback(button, previewUrl);
      }
    } else {
      showError('Error playing track: ' + error.message);
    }
    
    // Reset button
    button.innerHTML = '<i class="fas fa-play"></i>';
    button.classList.remove('playing');
  }
}

// Fallback to preview playback for non-Premium users
let previewAudio = null;

function playPreviewFallback(button, previewUrl) {
  // Stop any existing preview
  if (previewAudio) {
    previewAudio.pause();
  }
  
  // Play preview
  previewAudio = new Audio(previewUrl);
  button.innerHTML = '<i class="fas fa-pause"></i>';
  
  previewAudio.addEventListener('ended', () => {
    button.innerHTML = '<i class="fas fa-play"></i>';
    previewAudio = null;
  });
  
  previewAudio.play().catch(error => {
    console.error('Preview playback error:', error);
    button.innerHTML = '<i class="fas fa-play"></i>';
  });
}

// Stop any playing audio when loading new tracks
export function stopCurrentAudio() {
  if (currentPlayingButton) {
    currentPlayingButton.innerHTML = '<i class="fas fa-play"></i>';
    currentPlayingButton.classList.remove('playing');
    currentPlayingButton = null;
    currentPlayingTrackUri = null;
  }
  
  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }
  
  // Clear playback state from localStorage
  clearPlaybackState();
}

// Expose to window for import compatibility
window.restorePlaybackState = restorePlaybackState;
window.handleTrackPlayPause = handleTrackPlayPause;
window.stopCurrentAudio = stopCurrentAudio;
