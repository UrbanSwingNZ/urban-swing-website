// Playlist Manager Main Logic
// Handles UI, authentication, playlist/track management, and drag-drop

// Global state
let currentPlaylist = null;
let allPlaylists = [];
let currentTracks = [];
let filteredTracks = [];
let sortableInstance = null;
let pendingAction = null;

// Wait for Firebase and page to load
window.addEventListener('load', async () => {
  // Check if user is authenticated with Firebase
  if (!auth || !auth.currentUser) {
    window.location.href = '../admin.html';
    return;
  }

  initializeApp();
});

// ========================================
// INITIALIZATION
// ========================================

async function initializeApp() {
  setupEventListeners();
  
  // Try to load existing Spotify tokens
  const hasTokens = await spotifyAPI.loadTokensFromFirestore();
  
  if (hasTokens && spotifyAPI.isAuthenticated()) {
    await showAuthenticatedState();
  } else {
    // Check if we have an auth code in the URL
    const authCode = getAuthCodeFromUrl();
    if (authCode) {
      await handleAuthCallback(authCode);
    } else {
      showConnectPrompt();
    }
  }
}

function setupEventListeners() {
  // Connect Spotify buttons
  document.getElementById('spotify-connect-btn')?.addEventListener('click', handleSpotifyConnect);
  document.getElementById('connect-spotify-prompt-btn')?.addEventListener('click', handleSpotifyConnect);
  document.getElementById('spotify-disconnect-btn')?.addEventListener('click', handleSpotifyDisconnect);
  
  // Playlist actions
  document.getElementById('refresh-playlists-btn')?.addEventListener('click', loadPlaylists);
  document.getElementById('playlist-search')?.addEventListener('input', handlePlaylistSearch);
  
  // Track actions
  document.getElementById('track-search')?.addEventListener('input', handleTrackSearch);
  document.getElementById('toggle-explicit-btn')?.addEventListener('click', handleToggleExplicit);
  document.getElementById('save-order-btn')?.addEventListener('click', handleSaveOrder);
  
  // Modal actions
  document.getElementById('close-modal')?.addEventListener('click', closeModal);
  document.getElementById('cancel-action-btn')?.addEventListener('click', closeModal);
  document.getElementById('confirm-action-btn')?.addEventListener('click', handleConfirmAction);
  
  // Close modal on background click
  document.getElementById('track-action-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'track-action-modal') {
      closeModal();
    }
  });
}

// ========================================
// SPOTIFY AUTHENTICATION
// ========================================

function handleSpotifyConnect() {
  showLoading(true);
  window.location.href = getSpotifyAuthUrl();
}

async function handleAuthCallback(authCode) {
  showLoading(true);
  
  try {
    // Exchange auth code for access token
    // Note: This requires a backend endpoint or use of Firebase Functions
    // For now, we'll show an error message with instructions
    
    alert('To complete Spotify authentication, you need to set up a token exchange endpoint. See SPOTIFY_SETUP.md for instructions.');
    
    // Placeholder for token exchange
    // const tokens = await exchangeCodeForTokens(authCode);
    // spotifyAPI.setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
    // await showAuthenticatedState();
    
  } catch (error) {
    console.error('Auth callback error:', error);
    showError('Failed to authenticate with Spotify. Please try again.');
    showConnectPrompt();
  } finally {
    showLoading(false);
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

async function handleSpotifyDisconnect() {
  if (!confirm('Are you sure you want to disconnect Spotify?')) {
    return;
  }
  
  // Clear tokens
  spotifyAPI.accessToken = null;
  spotifyAPI.refreshToken = null;
  spotifyAPI.tokenExpiry = null;
  
  // Clear from Firestore
  try {
    await db.collection('admin_tokens').doc(auth.currentUser.uid).delete();
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
  
  showConnectPrompt();
}

function showConnectPrompt() {
  document.getElementById('connect-prompt').style.display = 'flex';
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('spotify-connect-btn').style.display = 'flex';
  document.getElementById('spotify-disconnect-btn').style.display = 'none';
}

async function showAuthenticatedState() {
  document.getElementById('connect-prompt').style.display = 'none';
  document.getElementById('main-content').style.display = 'flex';
  document.getElementById('spotify-connect-btn').style.display = 'none';
  document.getElementById('spotify-disconnect-btn').style.display = 'flex';
  
  // Load user info and playlists
  await loadUserInfo();
  await loadPlaylists();
}

// ========================================
// USER INFO
// ========================================

async function loadUserInfo() {
  try {
    const user = await spotifyAPI.getCurrentUser();
    document.getElementById('spotify-user-name').textContent = user.display_name || user.id;
  } catch (error) {
    console.error('Error loading user info:', error);
  }
}

// ========================================
// PLAYLISTS
// ========================================

async function loadPlaylists() {
  showLoading(true);
  
  try {
    allPlaylists = await spotifyAPI.getAllUserPlaylists();
    displayPlaylists(allPlaylists);
  } catch (error) {
    console.error('Error loading playlists:', error);
    showError('Failed to load playlists. ' + error.message);
  } finally {
    showLoading(false);
  }
}

function displayPlaylists(playlists) {
  const listEl = document.getElementById('playlists-list');
  listEl.innerHTML = '';
  
  if (playlists.length === 0) {
    listEl.innerHTML = '<li style="padding: 20px; text-align: center; color: #888;">No playlists found</li>';
    return;
  }
  
  playlists.forEach(playlist => {
    const li = document.createElement('li');
    li.dataset.playlistId = playlist.id;
    
    if (currentPlaylist && currentPlaylist.id === playlist.id) {
      li.classList.add('active');
    }
    
    const imageUrl = playlist.images && playlist.images.length > 0 
      ? playlist.images[playlist.images.length - 1].url 
      : '../images/urban-swing-logo.png';
    
    li.innerHTML = `
      <div class="playlist-item">
        <img src="${imageUrl}" alt="${playlist.name}">
        <div class="playlist-item-info">
          <div class="playlist-item-name">${playlist.name}</div>
          <div class="playlist-item-count">${playlist.tracks.total} tracks</div>
        </div>
      </div>
    `;
    
    li.addEventListener('click', () => selectPlaylist(playlist));
    listEl.appendChild(li);
  });
}

function handlePlaylistSearch(e) {
  const query = e.target.value.toLowerCase();
  
  if (!query) {
    displayPlaylists(allPlaylists);
    return;
  }
  
  const filtered = allPlaylists.filter(playlist => 
    playlist.name.toLowerCase().includes(query)
  );
  
  displayPlaylists(filtered);
}

// ========================================
// TRACKS
// ========================================

async function selectPlaylist(playlist) {
  currentPlaylist = playlist;
  
  // Update active state
  document.querySelectorAll('.playlists-list li').forEach(li => {
    li.classList.remove('active');
    if (li.dataset.playlistId === playlist.id) {
      li.classList.add('active');
    }
  });
  
  // Show playlist view
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('playlist-view').style.display = 'flex';
  
  // Update playlist header
  const imageUrl = playlist.images && playlist.images.length > 0 
    ? playlist.images[0].url 
    : '../images/urban-swing-logo.png';
  
  document.getElementById('playlist-image').src = imageUrl;
  document.getElementById('playlist-name').textContent = playlist.name;
  document.getElementById('playlist-description').textContent = playlist.description || 'No description';
  document.getElementById('playlist-track-count').textContent = playlist.tracks.total;
  
  // Load tracks
  await loadTracks(playlist.id);
}

async function loadTracks(playlistId) {
  showLoading(true);
  
  try {
    // Get all tracks
    const trackItems = await spotifyAPI.getAllPlaylistTracks(playlistId);
    
    // Extract track IDs for audio features
    const trackIds = trackItems
      .filter(item => item.track && item.track.id)
      .map(item => item.track.id);
    
    // Get audio features (BPM, etc.)
    let audioFeatures = [];
    if (trackIds.length > 0) {
      audioFeatures = await spotifyAPI.getAudioFeatures(trackIds);
    }
    
    // Combine tracks with audio features
    currentTracks = trackItems.map((item, index) => {
      const features = audioFeatures[index] || {};
      return {
        ...item,
        audioFeatures: features
      };
    });
    
    filteredTracks = [...currentTracks];
    
    // Calculate total duration
    const totalMs = currentTracks.reduce((sum, item) => {
      return sum + (item.track?.duration_ms || 0);
    }, 0);
    document.getElementById('playlist-duration').textContent = formatTotalDuration(totalMs);
    
    displayTracks(filteredTracks);
    initializeDragDrop();
    
  } catch (error) {
    console.error('Error loading tracks:', error);
    showError('Failed to load tracks. ' + error.message);
  } finally {
    showLoading(false);
  }
}

function displayTracks(tracks) {
  const tbody = document.getElementById('tracks-list');
  tbody.innerHTML = '';
  
  if (tracks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #888;">
          No tracks found
        </td>
      </tr>
    `;
    return;
  }
  
  tracks.forEach((item, index) => {
    if (!item.track) return;
    
    const track = item.track;
    const features = item.audioFeatures || {};
    const tr = document.createElement('tr');
    tr.dataset.trackUri = track.uri;
    tr.dataset.trackId = track.id;
    tr.dataset.trackIndex = index;
    
    const albumArt = track.album.images && track.album.images.length > 0
      ? track.album.images[track.album.images.length - 1].url
      : '';
    
    const artistNames = track.artists.map(a => a.name).join(', ');
    const duration = spotifyAPI.formatDuration(track.duration_ms);
    const bpm = features.tempo ? spotifyAPI.formatBPM(features.tempo) : 'N/A';
    const explicit = track.explicit;
    
    tr.innerHTML = `
      <td class="col-drag">
        <i class="fas fa-grip-vertical drag-handle"></i>
      </td>
      <td class="col-number">
        <span class="track-number">${index + 1}</span>
      </td>
      <td class="col-title">
        <div class="track-info">
          ${albumArt ? `<img src="${albumArt}" alt="${track.name}" class="track-album-art">` : ''}
          <div class="track-details">
            <div class="track-name">${track.name}</div>
          </div>
        </div>
      </td>
      <td class="col-artist">
        <div class="track-artist">${artistNames}</div>
      </td>
      <td class="col-duration">${duration}</td>
      <td class="col-bpm">
        <span class="bpm-badge">${bpm}</span>
      </td>
      <td class="col-explicit">
        ${explicit ? '<span class="explicit-badge">E</span>' : ''}
      </td>
      <td class="col-actions">
        <div class="track-actions">
          <button class="track-menu-btn" data-track-uri="${track.uri}">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </td>
    `;
    
    // Add track menu click handler
    const menuBtn = tr.querySelector('.track-menu-btn');
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showTrackMenu(e.currentTarget, track);
    });
    
    tbody.appendChild(tr);
  });
}

function handleTrackSearch(e) {
  const query = e.target.value.toLowerCase();
  
  if (!query) {
    filteredTracks = [...currentTracks];
  } else {
    filteredTracks = currentTracks.filter(item => {
      if (!item.track) return false;
      const track = item.track;
      const trackName = track.name.toLowerCase();
      const artistNames = track.artists.map(a => a.name.toLowerCase()).join(' ');
      return trackName.includes(query) || artistNames.includes(query);
    });
  }
  
  displayTracks(filteredTracks);
  initializeDragDrop();
}

function handleToggleExplicit(e) {
  const btn = e.currentTarget;
  btn.classList.toggle('active');
  
  const hideExplicit = btn.classList.contains('active');
  
  if (hideExplicit) {
    filteredTracks = currentTracks.filter(item => !item.track?.explicit);
  } else {
    // Restore from current search if any
    const searchQuery = document.getElementById('track-search').value;
    if (searchQuery) {
      handleTrackSearch({ target: { value: searchQuery } });
      return;
    }
    filteredTracks = [...currentTracks];
  }
  
  displayTracks(filteredTracks);
  initializeDragDrop();
}

// ========================================
// DRAG AND DROP
// ========================================

function initializeDragDrop() {
  if (sortableInstance) {
    sortableInstance.destroy();
  }
  
  const tbody = document.getElementById('tracks-list');
  
  sortableInstance = new Sortable(tbody, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onEnd: handleDragEnd
  });
}

function handleDragEnd(evt) {
  const oldIndex = evt.oldIndex;
  const newIndex = evt.newIndex;
  
  if (oldIndex === newIndex) return;
  
  // Update filtered tracks array
  const [movedTrack] = filteredTracks.splice(oldIndex, 1);
  filteredTracks.splice(newIndex, 0, movedTrack);
  
  // Show save button
  document.getElementById('save-order-btn').style.display = 'inline-flex';
  
  // Update track numbers
  updateTrackNumbers();
}

function updateTrackNumbers() {
  const rows = document.querySelectorAll('#tracks-list tr');
  rows.forEach((row, index) => {
    const numberCell = row.querySelector('.track-number');
    if (numberCell) {
      numberCell.textContent = index + 1;
    }
    row.dataset.trackIndex = index;
  });
}

async function handleSaveOrder() {
  if (!currentPlaylist) return;
  
  const confirmed = confirm('Save the new track order to Spotify?');
  if (!confirmed) return;
  
  showLoading(true);
  
  try {
    // Get the current order on Spotify
    const originalOrder = await spotifyAPI.getAllPlaylistTracks(currentPlaylist.id);
    
    // Calculate the moves needed
    // For simplicity, we'll remove all tracks and re-add them in the new order
    // This is not the most efficient method, but it's reliable
    
    const trackUris = filteredTracks
      .filter(item => item.track)
      .map(item => item.track.uri);
    
    // Note: Spotify has a limit of 100 tracks per request
    // This is a simplified implementation
    alert('Track reordering will be implemented once Spotify authentication is complete.');
    
    // Hide save button
    document.getElementById('save-order-btn').style.display = 'none';
    
  } catch (error) {
    console.error('Error saving order:', error);
    showError('Failed to save track order. ' + error.message);
  } finally {
    showLoading(false);
  }
}

// ========================================
// TRACK ACTIONS MENU
// ========================================

function showTrackMenu(button, track) {
  // Close any existing menus
  document.querySelectorAll('.track-menu').forEach(menu => menu.remove());
  
  // Create menu
  const menu = document.createElement('div');
  menu.className = 'track-menu show';
  menu.innerHTML = `
    <button data-action="copy">
      <i class="fas fa-copy"></i> Copy to Playlist
    </button>
    <button data-action="move">
      <i class="fas fa-arrow-right"></i> Move to Playlist
    </button>
  `;
  
  // Position menu
  const actions = button.closest('.track-actions');
  actions.appendChild(menu);
  
  // Add click handlers
  menu.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      handleTrackAction(action, track);
      menu.remove();
    });
  });
  
  // Close menu on outside click
  setTimeout(() => {
    const closeMenu = (e) => {
      if (!menu.contains(e.target) && e.target !== button) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    document.addEventListener('click', closeMenu);
  }, 0);
}

function handleTrackAction(action, track) {
  pendingAction = { action, track, fromPlaylistId: currentPlaylist.id };
  
  // Update modal title
  const title = action === 'copy' ? 'Copy Track' : 'Move Track';
  document.getElementById('modal-title').textContent = title;
  
  // Update track info
  const artistNames = track.artists.map(a => a.name).join(', ');
  document.getElementById('modal-track-info').textContent = 
    `"${track.name}" by ${artistNames}`;
  
  // Populate destination playlists (exclude current playlist)
  const select = document.getElementById('destination-playlist');
  select.innerHTML = '<option value="">-- Select a playlist --</option>';
  
  allPlaylists
    .filter(p => p.id !== currentPlaylist.id)
    .forEach(playlist => {
      const option = document.createElement('option');
      option.value = playlist.id;
      option.textContent = playlist.name;
      select.appendChild(option);
    });
  
  // Show modal
  document.getElementById('track-action-modal').style.display = 'flex';
}

async function handleConfirmAction() {
  if (!pendingAction) return;
  
  const destinationId = document.getElementById('destination-playlist').value;
  if (!destinationId) {
    alert('Please select a destination playlist');
    return;
  }
  
  closeModal();
  showLoading(true);
  
  try {
    const { action, track, fromPlaylistId } = pendingAction;
    
    if (action === 'copy') {
      await spotifyAPI.copyTrackToPlaylist(track.uri, fromPlaylistId, destinationId);
      showSuccess(`Track copied successfully!`);
    } else if (action === 'move') {
      await spotifyAPI.moveTrackToPlaylist(track.uri, fromPlaylistId, destinationId);
      showSuccess(`Track moved successfully!`);
      // Reload current playlist
      await loadTracks(currentPlaylist.id);
    }
    
  } catch (error) {
    console.error('Error performing action:', error);
    showError('Failed to ' + pendingAction.action + ' track. ' + error.message);
  } finally {
    showLoading(false);
    pendingAction = null;
  }
}

function closeModal() {
  document.getElementById('track-action-modal').style.display = 'none';
  pendingAction = null;
}

// ========================================
// UI HELPERS
// ========================================

function showLoading(show) {
  document.getElementById('loading-spinner').style.display = show ? 'flex' : 'none';
}

function showError(message) {
  alert('Error: ' + message);
}

function showSuccess(message) {
  alert(message);
}

function formatTotalDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}
