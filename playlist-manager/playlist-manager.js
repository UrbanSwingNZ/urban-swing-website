// Playlist Manager Main Logic
// Handles UI, authentication, playlist/track management, and drag-drop

// Global state
let currentPlaylist = null;
let allPlaylists = [];
let currentTracks = [];
let filteredTracks = [];
let sortableInstance = null;
let pendingAction = null;
let hasUnsavedChanges = false;
let pendingPlaylistSelection = null;

// Wait for page to load
window.addEventListener('load', async () => {
  console.log('Playlist manager page loaded');
  
  // TEMPORARY: Skip Firebase auth check for testing
  // TODO: Re-enable after Spotify auth is working
  
  initializeApp();
});

// ========================================
// INITIALIZATION
// ========================================

async function initializeApp() {
  setupEventListeners();
  
  // Check if we have an authorization code in the URL (authorization code flow)
  const authCode = getAuthCodeFromUrl();
  if (authCode) {
    try {
      showLoading(true);
      // Exchange code for tokens
      await exchangeCodeForTokens(authCode);
      window.history.replaceState({}, document.title, window.location.pathname);
      await showAuthenticatedState();
      return;
    } catch (error) {
      console.error('Token exchange error:', error);
      showError('Failed to authenticate with Spotify: ' + error.message);
      showConnectPrompt();
      return;
    } finally {
      showLoading(false);
    }
  }
  
  // Try to load existing Spotify tokens from localStorage
  if (spotifyAPI.loadTokensFromStorage() && spotifyAPI.isAuthenticated()) {
    await showAuthenticatedState();
  } else {
    showConnectPrompt();
  }
}

function setupEventListeners() {
  // Connect Spotify buttons
  document.getElementById('spotify-connect-btn')?.addEventListener('click', handleSpotifyConnect);
  document.getElementById('connect-spotify-prompt-btn')?.addEventListener('click', handleSpotifyConnect);
  document.getElementById('spotify-disconnect-btn')?.addEventListener('click', handleSpotifyDisconnect);
  
  // Mobile sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);
  
  // Playlist actions
  document.getElementById('create-playlist-btn')?.addEventListener('click', openCreatePlaylistModal);
  
  document.getElementById('refresh-playlists-btn')?.addEventListener('click', loadPlaylists);
  document.getElementById('playlist-search')?.addEventListener('input', handlePlaylistSearch);
  
  // Create playlist modal
  document.getElementById('close-create-modal')?.addEventListener('click', closeCreatePlaylistModal);
  document.getElementById('cancel-create-playlist-btn')?.addEventListener('click', closeCreatePlaylistModal);
  document.getElementById('confirm-create-playlist-btn')?.addEventListener('click', handleCreatePlaylist);
  
  // Add tracks modal
  document.getElementById('add-tracks-btn')?.addEventListener('click', openAddTracksModal);
  document.getElementById('close-add-tracks-modal')?.addEventListener('click', closeAddTracksModal);
  document.getElementById('cancel-add-tracks-btn')?.addEventListener('click', closeAddTracksModal);
  document.getElementById('add-selected-tracks-btn')?.addEventListener('click', handleAddSelectedTracks);
  document.getElementById('search-tracks-input')?.addEventListener('input', handleTrackSearch);
  
  // Delete functionality
  document.getElementById('delete-playlist-btn')?.addEventListener('click', handleDeletePlaylist);
  
  // Unsaved changes modal
  document.getElementById('save-and-continue-btn')?.addEventListener('click', handleSaveAndContinue);
  document.getElementById('discard-changes-btn')?.addEventListener('click', handleDiscardChanges);
  
  // Delete playlist modal
  document.getElementById('cancel-delete-playlist-btn')?.addEventListener('click', closeDeletePlaylistModal);
  document.getElementById('confirm-delete-playlist-btn')?.addEventListener('click', confirmDeletePlaylist);
  
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
  
  document.getElementById('create-playlist-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'create-playlist-modal') {
      closeCreatePlaylistModal();
    }
  });
  
  document.getElementById('add-tracks-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'add-tracks-modal') {
      closeAddTracksModal();
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
        closeModal();
      } else if (createModal && createModal.style.display === 'block') {
        closeCreatePlaylistModal();
      } else if (addTracksModal && addTracksModal.style.display === 'block') {
        closeAddTracksModal();
      }
    }
  });
}

// ========================================
// SPOTIFY AUTHENTICATION
// ========================================

async function handleSpotifyConnect() {
  showLoading(true);
  const authUrl = await getSpotifyAuthUrl();
  window.location.href = authUrl;
}

// Parse authorization code from URL (authorization code flow)
function getAuthCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

// Exchange authorization code for access token
async function exchangeCodeForTokens(code) {
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

async function handleSpotifyDisconnect() {
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
    if (error.message.includes('expired') || error.message.includes('401')) {
      // Token expired - show connect prompt
      showConnectPrompt();
      showError('Your Spotify session has expired. Please reconnect.');
    } else {
      showError('Failed to load playlists. ' + error.message);
    }
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
        <div class="playlist-drag-handle">
          <i class="fas fa-grip-vertical"></i>
        </div>
        <img src="${imageUrl}" alt="${playlist.name}">
        <div class="playlist-item-info">
          <div class="playlist-item-name">${playlist.name}</div>
          <div class="playlist-item-count">${playlist.tracks.total} tracks</div>
        </div>
        <div class="playlist-item-actions">
          <button class="playlist-menu-btn" data-playlist-id="${playlist.id}">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </div>
    `;
    
    // Add click handler for playlist selection (but not on menu button)
    li.addEventListener('click', (e) => {
      if (!e.target.closest('.playlist-menu-btn') && !e.target.closest('.playlist-drag-handle')) {
        selectPlaylist(playlist);
      }
    });
    
    // Add menu button handler
    const menuBtn = li.querySelector('.playlist-menu-btn');
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showPlaylistMenu(e.currentTarget, playlist);
    });
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
  // Check for unsaved changes
  if (hasUnsavedChanges) {
    pendingPlaylistSelection = playlist;
    document.getElementById('unsaved-changes-modal').style.display = 'block';
    return;
  }
  
  await performPlaylistSelection(playlist);
}

async function performPlaylistSelection(playlist) {
  console.log('Selecting playlist:', playlist);
  
  // Get fresh playlist info from Spotify API to ensure we have latest data
  try {
    const freshPlaylist = await spotifyAPI.getPlaylist(playlist.id);
    console.log('Fresh playlist data:', freshPlaylist);
    currentPlaylist = freshPlaylist;
  } catch (error) {
    console.warn('Could not get fresh playlist data, using cached:', error);
    currentPlaylist = playlist;
  }
  
  currentPlaylistId = playlist.id;
  hasUnsavedChanges = false;
  
  // Hide save order button
  document.getElementById('save-order-btn').style.display = 'none';
  
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
    console.log('Loading tracks for playlist:', playlistId);
    
    // Get all tracks
    const trackItems = await spotifyAPI.getAllPlaylistTracks(playlistId);
    
    // Extract track IDs for audio features
    const trackIds = trackItems
      .filter(item => item.track && item.track.id)
      .map(item => item.track.id);
    
    // Get audio features (BPM, etc.) - this is optional
    let audioFeatures = [];
    if (trackIds.length > 0) {
      try {
        audioFeatures = await spotifyAPI.getAudioFeatures(trackIds);
        console.log('Audio features loaded successfully');
      } catch (audioError) {
        console.warn('Could not load audio features (BPM data will not be available):', audioError);
        // Create empty array with same length as tracks
        audioFeatures = new Array(trackIds.length).fill({});
      }
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
  
  // Mark as having unsaved changes
  hasUnsavedChanges = true;
  
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
  
  showLoading(true);
  
  try {
    console.log('Saving track order for playlist:', currentPlaylist.id);
    
    // Get track URIs in the new order
    const newOrderUris = filteredTracks
      .filter(item => item.track && item.track.uri)
      .map(item => item.track.uri);
    
    console.log('New track order URIs:', newOrderUris);
    
    if (newOrderUris.length === 0) {
      showError('No tracks to reorder');
      return;
    }
    
    // Step 1: Remove all tracks from the playlist
    console.log('Removing all tracks from playlist...');
    await spotifyAPI.removeTracksFromPlaylist(currentPlaylist.id, newOrderUris);
    
    // Step 2: Add tracks back in the new order
    // Spotify has a limit of 100 tracks per request, so we need to chunk
    console.log('Adding tracks back in new order...');
    
    const chunkSize = 100;
    for (let i = 0; i < newOrderUris.length; i += chunkSize) {
      const chunk = newOrderUris.slice(i, i + chunkSize);
      await spotifyAPI.addTracksToPlaylist(currentPlaylist.id, chunk, i);
      console.log(`Added chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(newOrderUris.length/chunkSize)}`);
    }
    
    // Update the current tracks array to reflect the new order
    currentTracks = [...filteredTracks];
    
    showSnackbar('Track order saved successfully!', 'success');
    
    // Clear unsaved changes flag
    hasUnsavedChanges = false;
    
    // Hide save button
    document.getElementById('save-order-btn').style.display = 'none';
    
  } catch (error) {
    console.error('Error saving order:', error);
    showError('Failed to save track order: ' + error.message);
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
    <button data-action="delete" class="menu-delete">
      <i class="fas fa-trash"></i> Remove from Playlist
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
  if (action === 'delete') {
    handleDeleteTrack(track.uri, track.name);
    return;
  }
  
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
  showSnackbar('Error: ' + message, 'error');
}

function showSuccess(message) {
  showSnackbar(message, 'success');
}

function showSnackbar(message, type = 'success') {
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

function formatTotalDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}

// ========================================
// MOBILE SIDEBAR TOGGLE
// ========================================

function toggleSidebar() {
  const sidebar = document.querySelector('.pm-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

function closeSidebar() {
  const sidebar = document.querySelector('.pm-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
}

// ========================================
// CREATE PLAYLIST MODAL
// ========================================

function openCreatePlaylistModal() {
  const modal = document.getElementById('create-playlist-modal');
  const form = document.getElementById('create-playlist-form');
  
  if (!modal) {
    console.error('Modal element not found');
    return;
  }
  
  // Reset form
  if (form) {
    form.reset();
  }
  
  // Show modal
  modal.style.display = 'block';
  
  // Focus on name field
  setTimeout(() => {
    const nameField = document.getElementById('new-playlist-name');
    if (nameField) {
      nameField.focus();
    }
  }, 100);
}

function closeCreatePlaylistModal() {
  const modal = document.getElementById('create-playlist-modal');
  modal.style.display = 'none';
}

async function handleCreatePlaylist() {
  const nameInput = document.getElementById('new-playlist-name');
  const descInput = document.getElementById('new-playlist-description');
  const publicCheckbox = document.getElementById('new-playlist-public');
  const collaborativeCheckbox = document.getElementById('new-playlist-collaborative');
  const createBtn = document.getElementById('confirm-create-playlist-btn');
  
  const name = nameInput.value.trim();
  if (!name) {
    showError('Please enter a playlist name');
    nameInput.focus();
    return;
  }
  
  // Show loading
  const originalText = createBtn.textContent;
  createBtn.textContent = 'Creating...';
  createBtn.disabled = true;
  
  try {
    const description = descInput.value.trim();
    const isPublic = publicCheckbox.checked;
    const isCollaborative = collaborativeCheckbox.checked;
    
    const newPlaylist = await spotifyAPI.createPlaylist(name, description, isPublic, isCollaborative);
    
    closeCreatePlaylistModal();
    
    // Refresh playlists to show the new one
    await loadPlaylists();
    
    // Select the new playlist if we can find it
    const playlistItems = document.querySelectorAll('.playlist-item');
    const newPlaylistItem = Array.from(playlistItems).find(item => 
      item.textContent.includes(name)
    );
    if (newPlaylistItem) {
      newPlaylistItem.click();
    }
    
  } catch (error) {
    console.error('Error creating playlist:', error);
    showError('Failed to create playlist: ' + error.message);
  } finally {
    // Reset button
    createBtn.textContent = originalText;
    createBtn.disabled = false;
  }
}

// ========================================
// ADD TRACKS MODAL
// ========================================

let selectedTracks = [];
let currentPlaylistId = null;

function openAddTracksModal() {
  if (!currentPlaylistId) {
    showError('Please select a playlist first');
    return;
  }

  const modal = document.getElementById('add-tracks-modal');
  const searchInput = document.getElementById('search-tracks-input');
  const resultsContainer = document.getElementById('search-results');
  
  // Reset state
  selectedTracks = [];
  searchInput.value = '';
  resultsContainer.innerHTML = '<p class="text-muted">Enter a search term to find tracks</p>';
  updateAddTracksButton();
  
  // Show modal
  modal.style.display = 'block';
  
  // Focus on search field
  setTimeout(() => {
    searchInput.focus();
  }, 100);
}

function closeAddTracksModal() {
  const modal = document.getElementById('add-tracks-modal');
  modal.style.display = 'none';
  selectedTracks = [];
}

let searchTimeout;

function handleTrackSearch(e) {
  const query = e.target.value.trim();
  
  // Clear previous timeout
  clearTimeout(searchTimeout);
  
  if (query.length === 0) {
    document.getElementById('search-results').innerHTML = '<p class="text-muted">Enter a search term to find tracks</p>';
    return;
  }
  
  // Debounce search
  searchTimeout = setTimeout(async () => {
    await searchAndDisplayTracks(query);
  }, 300);
}

async function searchAndDisplayTracks(query) {
  const resultsContainer = document.getElementById('search-results');
  
  try {
    resultsContainer.innerHTML = '<div class="loading-pulse" style="padding: 20px; text-align: center;">Searching...</div>';
    
    const tracks = await spotifyAPI.searchTracks(query, 20);
    console.log('Search results:', tracks);
    
    if (tracks.length === 0) {
      resultsContainer.innerHTML = '<p class="text-muted">No tracks found</p>';
      return;
    }
    
    resultsContainer.innerHTML = tracks.map(track => {
      const isSelected = selectedTracks.some(t => t.id === track.id);
      return `
        <div class="search-result-item" data-track-id="${track.id}">
          <input type="checkbox" class="search-result-checkbox" ${isSelected ? 'checked' : ''}>
          <img src="${track.album?.images?.[2]?.url || '../images/urban-swing-logo.png'}" 
               alt="${track.name}" class="search-result-image">
          <div class="search-result-info">
            <h4 class="search-result-title">${track.name}</h4>
            <p class="search-result-artist">${track.artists?.map(a => a.name).join(', ')}</p>
          </div>
          <span class="search-result-duration">${spotifyAPI.formatDuration(track.duration_ms)}</span>
        </div>
      `;
    }).join('');
    
    // Add click handlers
    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking the checkbox directly
        if (e.target.type === 'checkbox') return;
        
        const checkbox = item.querySelector('.search-result-checkbox');
        checkbox.checked = !checkbox.checked;
        handleTrackSelection(item.dataset.trackId, checkbox.checked, tracks);
      });
      
      const checkbox = item.querySelector('.search-result-checkbox');
      checkbox.addEventListener('change', (e) => {
        handleTrackSelection(item.dataset.trackId, e.target.checked, tracks);
      });
    });
    
  } catch (error) {
    console.error('Error searching tracks:', error);
    resultsContainer.innerHTML = '<p class="text-muted">Error searching tracks. Please try again.</p>';
  }
}

function handleTrackSelection(trackId, isSelected, allTracks) {
  console.log('Track selection:', trackId, isSelected);
  const track = allTracks.find(t => t.id === trackId);
  console.log('Found track:', track);
  
  if (isSelected && track) {
    // Add to selected tracks if not already there
    if (!selectedTracks.some(t => t.id === trackId)) {
      selectedTracks.push(track);
      console.log('Added track to selection:', track);
    }
  } else {
    // Remove from selected tracks
    selectedTracks = selectedTracks.filter(t => t.id !== trackId);
    console.log('Removed track from selection');
  }
  
  console.log('Selected tracks count:', selectedTracks.length);
  updateAddTracksButton();
}

function updateAddTracksButton() {
  const button = document.getElementById('add-selected-tracks-btn');
  button.disabled = selectedTracks.length === 0;
  button.innerHTML = selectedTracks.length > 0 
    ? `<i class="fas fa-plus"></i> Add ${selectedTracks.length} Track${selectedTracks.length > 1 ? 's' : ''}`
    : '<i class="fas fa-plus"></i> Add Selected Tracks';
}

async function handleAddSelectedTracks() {
  if (selectedTracks.length === 0) return;
  
  console.log('Adding tracks:', selectedTracks);
  console.log('Current playlist ID:', currentPlaylistId);
  
  const button = document.getElementById('add-selected-tracks-btn');
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
  button.disabled = true;
  
  try {
    const trackUris = selectedTracks.map(track => {
      console.log('Track URI:', track.uri);
      return track.uri;
    });
    
    console.log('Track URIs to add:', trackUris);
    
    const result = await spotifyAPI.addTracksToPlaylist(currentPlaylistId, trackUris);
    console.log('Add tracks result:', result);
    
    closeAddTracksModal();
    
    // Wait a moment for Spotify to sync, then reload the playlist
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reload the current playlist to show new tracks
    if (currentPlaylist) {
      await selectPlaylist(currentPlaylist);
    }
    
  } catch (error) {
    console.error('Error adding tracks:', error);
    showError('Failed to add tracks: ' + error.message);
  } finally {
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

// ========================================
// UNSAVED CHANGES HANDLING
// ========================================

async function handleSaveAndContinue() {
  // Save current changes
  await handleSaveOrder();
  
  // Close modal
  document.getElementById('unsaved-changes-modal').style.display = 'none';
  
  // Continue to selected playlist
  if (pendingPlaylistSelection) {
    await performPlaylistSelection(pendingPlaylistSelection);
    pendingPlaylistSelection = null;
  }
}

function handleDiscardChanges() {
  // Reset changes flag
  hasUnsavedChanges = false;
  
  // Hide save order button
  document.getElementById('save-order-btn').style.display = 'none';
  
  // Close modal
  document.getElementById('unsaved-changes-modal').style.display = 'none';
  
  // Continue to selected playlist
  if (pendingPlaylistSelection) {
    performPlaylistSelection(pendingPlaylistSelection);
    pendingPlaylistSelection = null;
  }
}

// ========================================
// PLAYLIST MENU
// ========================================

let playlistMenuTarget = null;

function showPlaylistMenu(button, playlist) {
  // Close any existing menus
  document.querySelectorAll('.playlist-menu').forEach(menu => menu.remove());
  
  playlistMenuTarget = playlist;
  
  // Create menu
  const menu = document.createElement('div');
  menu.className = 'playlist-menu show';
  menu.innerHTML = `
    <button data-action="rename">
      <i class="fas fa-edit"></i> Rename
    </button>
    <button data-action="delete" class="menu-delete">
      <i class="fas fa-trash"></i> Delete
    </button>
  `;
  
  // Position menu
  const actions = button.closest('.playlist-item-actions');
  actions.appendChild(menu);
  
  // Add click handlers
  menu.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      handlePlaylistMenuAction(action, playlist);
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
  }, 10);
}

function handlePlaylistMenuAction(action, playlist) {
  if (action === 'rename') {
    openRenamePlaylistModal(playlist);
  } else if (action === 'delete') {
    // Set as current for deletion
    currentPlaylist = playlist;
    handleDeletePlaylist();
  }
}

// ========================================
// DELETE FUNCTIONALITY
// ========================================

async function handleDeletePlaylist() {
  if (!currentPlaylist) {
    showError('No playlist selected');
    return;
  }
  
  const playlistName = currentPlaylist.name;
  document.getElementById('delete-playlist-message').textContent = 
    `Are you sure you want to delete "${playlistName}"?`;
  
  document.getElementById('delete-playlist-modal').style.display = 'block';
}

function closeDeletePlaylistModal() {
  document.getElementById('delete-playlist-modal').style.display = 'none';
}

async function confirmDeletePlaylist() {
  if (!currentPlaylist) return;
  
  const playlistName = currentPlaylist.name;
  
  // Close modal first
  closeDeletePlaylistModal();
  
  const deleteBtn = document.getElementById('delete-playlist-btn');
  const originalText = deleteBtn.innerHTML;
  deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp;Deleting...';
  deleteBtn.disabled = true;
  
  try {
    await spotifyAPI.deletePlaylist(currentPlaylist.id);
    
    // Show success message
    showSnackbar(`Playlist "${playlistName}" has been deleted.`, 'success');
    
    // Clear the current view and reload playlists
    document.getElementById('playlist-view').style.display = 'none';
    document.getElementById('empty-state').style.display = 'flex';
    currentPlaylist = null;
    currentPlaylistId = null;
    hasUnsavedChanges = false;
    
    await loadPlaylists();
    
  } catch (error) {
    console.error('Error deleting playlist:', error);
    showError('Failed to delete playlist: ' + error.message);
  } finally {
    deleteBtn.innerHTML = originalText;
    deleteBtn.disabled = false;
  }
}

function handleDeleteTrack(trackUri, trackName) {
  removeTrackFromPlaylist(trackUri, trackName);
}

async function removeTrackFromPlaylist(trackUri, trackName) {
  if (!currentPlaylistId) {
    showError('No playlist selected');
    return;
  }
  
  try {
    await spotifyAPI.removeTracksFromPlaylist(currentPlaylistId, [trackUri]);
    
    // Reload the playlist to show updated tracks
    if (currentPlaylist) {
      await selectPlaylist(currentPlaylist);
    }
    
  } catch (error) {
    console.error('Error removing track:', error);
    showError('Failed to remove track: ' + error.message);
  }
}
