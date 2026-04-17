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
        const stopBtn = trackRow.querySelector('.track-stop-btn');
        if (playBtn) {
          playBtn.innerHTML = '<i class="fas fa-pause"></i>';
          playBtn.classList.add('playing');
          currentPlayingButton = playBtn;
          currentPlayingTrackUri = trackUri;
          // Restore playing animation
          colNumber?.classList.add('playing');
          // Show stop button
          if (stopBtn) {
            stopBtn.classList.add('visible');
          }
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
    
    // Determine the actual button element FIRST (in case button is actually a row on mobile)
    const row = button.closest('tr') || (button.tagName === 'TR' ? button : null);
    const actualButton = button.classList?.contains('track-play-btn') || button.classList?.contains('search-play-btn') 
      ? button 
      : (row ? row.querySelector('.track-play-btn') : button);
    
    // Check if this is the currently playing track
    const state = await getCurrentState();
    const isCurrentTrack = state && state.track_window?.current_track?.uri === trackUri;
    
    if (isCurrentTrack) {
      // Toggle play/pause for current track
      await togglePlayback();
      
      // Update button icon based on current state
      const wasPaused = state.paused;
      if (wasPaused) {
        // Was paused, now playing
        actualButton.innerHTML = '<i class="fas fa-pause"></i>';
        actualButton.classList.add('playing');
        savePlaybackState(trackUri, true);
      } else {
        // Was playing, now paused
        actualButton.innerHTML = '<i class="fas fa-play"></i>';
        actualButton.classList.remove('playing');
        savePlaybackState(trackUri, false);
      }
      
      // Ensure stop button is visible (for desktop)
      if (row) {
        const stopBtn = row.querySelector('.track-stop-btn');
        if (stopBtn) {
          stopBtn.classList.add('visible');
        }
      }
      
      return;
    }
    
    // Check if player is ready
    if (!isReady()) {
      throw new Error('Player not ready. Please try again in a moment.');
    }
    
    // Play new track
    const accessToken = spotifyAPI.accessToken;
    await playTrack(trackUri, accessToken);
    
    // Update UI - remove playing state from previous track
    if (currentPlayingButton && currentPlayingButton !== actualButton) {
      if (currentPlayingButton.classList?.contains('track-play-btn') || currentPlayingButton.classList?.contains('search-play-btn')) {
        currentPlayingButton.innerHTML = '<i class="fas fa-play"></i>';
        currentPlayingButton.classList.remove('playing');
      }
      // Remove playing animation from previous track (only in main table view)
      const prevRow = currentPlayingButton.closest('tr');
      if (prevRow) {
        const prevColNumber = prevRow.querySelector('.col-number');
        prevColNumber?.classList.remove('playing');
        // Hide stop button on previous track
        const prevStopBtn = prevRow.querySelector('.track-stop-btn');
        if (prevStopBtn) {
          prevStopBtn.classList.remove('visible');
        }
      }
    }
    
    // Update UI - add playing state to current track
    if (actualButton) {
      actualButton.innerHTML = '<i class="fas fa-pause"></i>';
      actualButton.classList.add('playing');
    }
    currentPlayingButton = actualButton;
    currentPlayingTrackUri = trackUri;
    
    // Add playing animation to current track (only in main table view)
    if (row) {
      const colNumber = row.querySelector('.col-number');
      colNumber?.classList.add('playing');
      // Show stop button on current track (for desktop)
      const stopBtn = row.querySelector('.track-stop-btn');
      if (stopBtn) {
        stopBtn.classList.add('visible');
      }
    }
    
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

// Stop playback completely (mobile double-tap action)
export async function stopPlayback() {
  // Remove playing state from UI
  if (currentPlayingButton) {
    const row = currentPlayingButton.closest('tr');
    if (row) {
      const colNumber = row.querySelector('.col-number');
      colNumber?.classList.remove('playing');
      // Hide stop button (for desktop)
      const stopBtn = row.querySelector('.track-stop-btn');
      if (stopBtn) {
        stopBtn.classList.remove('visible');
      }
    }
    currentPlayingButton.innerHTML = '<i class="fas fa-play"></i>';
    currentPlayingButton.classList.remove('playing');
    currentPlayingButton = null;
    currentPlayingTrackUri = null;
  }
  
  // Stop preview audio if it's playing
  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }
  
  // Stop Spotify Web Player (seek to beginning then pause)
  try {
    const { pausePlayback, seekToPosition, isReady, getCurrentState } = await import('../spotify-player.js');
    if (isReady()) {
      const state = await getCurrentState();
      // Only proceed if there's an active track
      if (state) {
        // Seek to beginning first (while track may still be playing)
        await seekToPosition(0);
        // Wait a moment for seek to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        // Then pause
        await pausePlayback();
      }
    }
  } catch (error) {
    console.warn('Could not stop Spotify player:', error);
  }
  
  // Clear playback state from localStorage
  clearPlaybackState();
}

// Stop any playing audio when loading new tracks
export async function stopCurrentAudio() {
  if (currentPlayingButton) {
    const row = currentPlayingButton.closest('tr');
    if (row) {
      // Hide stop button
      const stopBtn = row.querySelector('.track-stop-btn');
      if (stopBtn) {
        stopBtn.classList.remove('visible');
      }
    }
    currentPlayingButton.innerHTML = '<i class="fas fa-play"></i>';
    currentPlayingButton.classList.remove('playing');
    currentPlayingButton = null;
    currentPlayingTrackUri = null;
  }
  
  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }
  
  // Pause Spotify Web Player if it's playing
  try {
    const { pausePlayback, isReady } = await import('../spotify-player.js');
    if (isReady()) {
      await pausePlayback();
    }
  } catch (error) {
    console.warn('Could not pause Spotify player:', error);
  }
  
  // Clear playback state from localStorage
  clearPlaybackState();
}

// Get currently playing track URI
export function getCurrentPlayingTrackUri() {
  return currentPlayingTrackUri;
}

// Expose to window for import compatibility
window.restorePlaybackState = restorePlaybackState;
window.handleTrackPlayPause = handleTrackPlayPause;
window.stopCurrentAudio = stopCurrentAudio;
window.stopPlayback = stopPlayback;
