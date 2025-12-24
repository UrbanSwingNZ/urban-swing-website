// Spotify Web Playback SDK Module
// Handles full track playback using Spotify's Web Playback SDK
// Requires Spotify Premium

let player = null;
let deviceId = null;
let isPlayerReady = false;

// Initialize the Spotify Web Playback SDK
export async function initializePlayer(accessToken) {
  return new Promise((resolve, reject) => {
    // Wait for Spotify SDK to load
    window.onSpotifyWebPlaybackSDKReady = () => {
      player = new window.Spotify.Player({
        name: 'Urban Swing Playlist Manager',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.8
      });

      // Error handling
      player.addListener('initialization_error', ({ message }) => {
        console.error('Initialization Error:', message);
        reject(new Error(message));
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Authentication Error:', message);
        reject(new Error(message));
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Account Error:', message);
        if (message.includes('premium')) {
          reject(new Error('Spotify Premium is required for full playback'));
        } else {
          reject(new Error(message));
        }
      });

      player.addListener('playback_error', ({ message }) => {
        console.error('Playback Error:', message);
      });

      // Playback status updates
      player.addListener('player_state_changed', state => {
        if (!state) return;
        
        // Update UI based on playback state
        updatePlaybackUI(state);
      });

      // Ready
      player.addListener('ready', ({ device_id }) => {
        deviceId = device_id;
        isPlayerReady = true;
        resolve(device_id);
      });

      // Not Ready
      player.addListener('not_ready', ({ device_id }) => {
        console.log('Device has gone offline:', device_id);
        isPlayerReady = false;
      });

      // Connect to the player
      player.connect();
    };

    // If SDK is already loaded, call the ready function
    if (window.Spotify && typeof window.onSpotifyWebPlaybackSDKReady === 'function') {
      window.onSpotifyWebPlaybackSDKReady();
    }
  });
}

// Play a track
export async function playTrack(trackUri, accessToken) {
  if (!isPlayerReady || !deviceId) {
    throw new Error('Player not ready. Initializing...');
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify({ uris: [trackUri] }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to play track');
    }

    return true;
  } catch (error) {
    console.error('Error playing track:', error);
    throw error;
  }
}

// Pause playback
export async function pausePlayback() {
  if (!player) return;
  await player.pause();
}

// Resume playback
export async function resumePlayback() {
  if (!player) return;
  await player.resume();
}

// Toggle play/pause
export async function togglePlayback() {
  if (!player) return;
  await player.togglePlay();
}

// Get current playback state
export async function getCurrentState() {
  if (!player) return null;
  return await player.getCurrentState();
}

// Update UI based on playback state
function updatePlaybackUI(state) {
  const currentTrack = state.track_window.current_track;
  const isPaused = state.paused;

  // Update all play buttons to reflect current playback state
  document.querySelectorAll('.track-play-btn, .search-play-btn').forEach(btn => {
    // Get track URI from either table row or button dataset
    const row = btn.closest('tr');
    const trackUri = row?.dataset.trackUri || btn.dataset.trackUri;
    const colNumber = row?.querySelector('.col-number');
    
    // For modal buttons, get the animation container
    const searchResultItem = btn.closest('.search-result-item');
    const modalAnimation = searchResultItem?.querySelector('.now-playing-animation');
    
    if (trackUri === currentTrack.uri) {
      // This is the currently playing/paused track
      if (isPaused) {
        btn.innerHTML = '<i class="fas fa-play"></i>';
        btn.classList.remove('playing');
        colNumber?.classList.remove('playing');
        if (modalAnimation) modalAnimation.style.display = 'none';
      } else {
        btn.innerHTML = '<i class="fas fa-pause"></i>';
        btn.classList.add('playing');
        colNumber?.classList.add('playing');
        if (modalAnimation) modalAnimation.style.display = 'flex';
      }
    } else {
      // Other tracks should show play icon
      btn.innerHTML = '<i class="fas fa-play"></i>';
      btn.classList.remove('playing');
      colNumber?.classList.remove('playing');
      if (modalAnimation) modalAnimation.style.display = 'none';
    }
  });

  // Emit custom event for other components to listen to
  window.dispatchEvent(new CustomEvent('spotify-playback-state', {
    detail: { state, isPaused, currentTrack }
  }));
}

// Disconnect the player
export function disconnectPlayer() {
  if (player) {
    player.disconnect();
    player = null;
    deviceId = null;
    isPlayerReady = false;
  }
}

// Check if player is ready
export function isReady() {
  return isPlayerReady;
}

// Get device ID
export function getDeviceId() {
  return deviceId;
}

// Export for use in other modules
export { player, deviceId, isPlayerReady };
