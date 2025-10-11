// Playlist Manager - Playlist Operations Module
// Handles playlist CRUD operations, display, and menu actions

import * as State from './playlist-state.js';
import { showLoading, showError, showSnackbar, showConnectPrompt } from './playlist-ui.js';
import { updateSaveOrderButton, loadTracks } from './track-operations.js';

// ========================================
// PLAYLISTS - LOAD & DISPLAY
// ========================================

export async function loadPlaylists() {
  showLoading(true);
  
  try {
    const playlists = await spotifyAPI.getAllUserPlaylists();
    State.setAllPlaylists(playlists);
    displayPlaylists(playlists);
    
    // After loading playlists, check if there's a saved playlist to restore
    // Only restore if coming from a page refresh (not navigation/disconnect)
    const savedPlaylistId = localStorage.getItem('last_viewed_playlist');
    if (savedPlaylistId && performance && performance.navigation && performance.navigation.type === 1) { // 1 = reload
      const savedPlaylist = playlists.find(p => p.id === savedPlaylistId);
      if (savedPlaylist) {
        // Restore the last viewed playlist
        await performPlaylistSelection(savedPlaylist);
      }
    }
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

export function displayPlaylists(playlists) {
  const listEl = document.getElementById('playlists-list');
  listEl.innerHTML = '';
  
  if (playlists.length === 0) {
    listEl.innerHTML = '<li style="padding: 20px; text-align: center; color: #888;">No playlists found</li>';
    return;
  }
  
  const currentPlaylist = State.getCurrentPlaylist();
  
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
    
    // Add click handler for playlist selection (but not on menu button or drag handle)
    const handlePlaylistClick = (e) => {
      // Don't select if clicking on menu button or drag handle
      if (e.target.closest('.playlist-menu-btn') || e.target.closest('.playlist-drag-handle')) {
        return;
      }
      
      console.log('Playlist clicked:', playlist.name);
      e.stopPropagation();
      selectPlaylist(playlist);
    };
    
    // Use click event for both desktop and mobile
    li.addEventListener('click', handlePlaylistClick, { passive: false });
    
    // Add menu button handler
    const menuBtn = li.querySelector('.playlist-menu-btn');
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showPlaylistMenu(e.currentTarget, playlist);
    });
    listEl.appendChild(li);
  });
  
  // Initialize drag and drop for playlists
  initializePlaylistDragDrop();
}

function initializePlaylistDragDrop() {
  const listEl = document.getElementById('playlists-list');
  if (!listEl) return;
  
  // Destroy existing instance if present
  if (window.playlistSortable) {
    window.playlistSortable.destroy();
  }
  
  window.playlistSortable = new Sortable(listEl, {
    handle: '.playlist-drag-handle',
    animation: 150,
    ghostClass: 'playlist-sortable-ghost',
    dragClass: 'playlist-sortable-drag',
    chosenClass: 'playlist-sortable-chosen',
    fallbackClass: 'playlist-sortable-fallback',
    delay: 100,
    delayOnTouchOnly: true,
    preventOnFilter: false,
    touchStartThreshold: 5,
    onStart: function(evt) {
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
    },
    onEnd: function(evt) {
      // Re-enable text selection after drag
      document.body.style.userSelect = '';
      
      // Playlist reordering would require Spotify API support
      // For now, we'll just keep the visual order
      if (evt.oldIndex !== evt.newIndex) {
        console.log('Playlist moved from', evt.oldIndex, 'to', evt.newIndex);
      }
    }
  });
}

export function handlePlaylistSearch(e) {
  const query = e.target.value.toLowerCase();
  const allPlaylists = State.getAllPlaylists();
  
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
// PLAYLIST SELECTION
// ========================================

export async function selectPlaylist(playlist) {
  console.log('selectPlaylist called for:', playlist.name);
  
  // Check for unsaved changes
  if (State.getHasUnsavedChanges()) {
    console.log('Has unsaved changes, showing modal');
    State.setPendingPlaylistSelection(playlist);
    document.getElementById('unsaved-changes-modal').style.display = 'block';
    return;
  }
  
  console.log('Performing playlist selection');
  await performPlaylistSelection(playlist);
}

export async function performPlaylistSelection(playlist) {
  console.log('performPlaylistSelection started for:', playlist.name);
  
  // Get fresh playlist info from Spotify API to ensure we have latest data
  try {
    const freshPlaylist = await spotifyAPI.getPlaylist(playlist.id);
    State.setCurrentPlaylist(freshPlaylist);
    console.log('Got fresh playlist data');
  } catch (error) {
    console.log('Error getting fresh playlist, using cached:', error);
    State.setCurrentPlaylist(playlist);
  }
  
  State.setCurrentPlaylistId(playlist.id);
  State.setHasUnsavedChanges(false);
  updateSaveOrderButton();
  
  // Save the selected playlist ID for refresh persistence
  localStorage.setItem('last_viewed_playlist', playlist.id);
  
  // Update active state
  document.querySelectorAll('.playlists-list li').forEach(li => {
    li.classList.remove('active');
    if (li.dataset.playlistId === playlist.id) {
      li.classList.add('active');
    }
  });
  console.log('Updated active state');
  
  // Show playlist view
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('playlist-view').style.display = 'flex';
  console.log('Showing playlist view');
  
  // Close sidebar on mobile after selection
  if (window.innerWidth <= 768) {
    console.log('Closing sidebar on mobile');
    const sidebar = document.querySelector('.pm-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
  }
  
  // Update playlist header
  const imageUrl = playlist.images && playlist.images.length > 0 
    ? playlist.images[0].url 
    : '../images/urban-swing-logo.png';
  
  document.getElementById('playlist-image').src = imageUrl;
  document.getElementById('playlist-name').textContent = playlist.name;
  document.getElementById('playlist-description').textContent = playlist.description || 'No description';
  document.getElementById('playlist-track-count').textContent = playlist.tracks.total;
  
  // Load tracks (will be imported from track-operations)
  await loadTracks(playlist.id);
}

// ========================================
// CREATE PLAYLIST
// ========================================

export function openCreatePlaylistModal() {
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

export function closeCreatePlaylistModal() {
  const modal = document.getElementById('create-playlist-modal');
  modal.style.display = 'none';
}

export async function handleCreatePlaylist() {
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
// DELETE PLAYLIST
// ========================================

export async function handleDeletePlaylist() {
  const currentPlaylist = State.getCurrentPlaylist();
  if (!currentPlaylist) {
    showError('No playlist selected');
    return;
  }
  
  const playlistName = currentPlaylist.name;
  document.getElementById('delete-playlist-message').textContent = 
    `Are you sure you want to delete "${playlistName}"?`;
  
  document.getElementById('delete-playlist-modal').style.display = 'block';
}

export function closeDeletePlaylistModal() {
  document.getElementById('delete-playlist-modal').style.display = 'none';
}

export async function confirmDeletePlaylist() {
  const currentPlaylist = State.getCurrentPlaylist();
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
    State.setCurrentPlaylist(null);
    State.setCurrentPlaylistId(null);
    State.setHasUnsavedChanges(false);
    
    await loadPlaylists();
    
  } catch (error) {
    console.error('Error deleting playlist:', error);
    showError('Failed to delete playlist: ' + error.message);
  } finally {
    deleteBtn.innerHTML = originalText;
    deleteBtn.disabled = false;
  }
}

// ========================================
// RENAME PLAYLIST
// ========================================

export function openRenamePlaylistModal(playlist) {
  State.setRenamePlaylistTarget(playlist);
  
  const modal = document.getElementById('rename-playlist-modal');
  const input = document.getElementById('rename-playlist-input');
  
  // Pre-fill with current name
  input.value = playlist.name;
  
  // Show modal
  modal.style.display = 'block';
  
  // Focus and select text
  setTimeout(() => {
    input.focus();
    input.select();
  }, 100);
}

export function closeRenamePlaylistModal() {
  document.getElementById('rename-playlist-modal').style.display = 'none';
  State.setRenamePlaylistTarget(null);
}

export async function handleRenamePlaylist() {
  const renamePlaylistTarget = State.getRenamePlaylistTarget();
  if (!renamePlaylistTarget) return;
  
  const input = document.getElementById('rename-playlist-input');
  const newName = input.value.trim();
  
  if (!newName) {
    showError('Please enter a playlist name');
    input.focus();
    return;
  }
  
  if (newName === renamePlaylistTarget.name) {
    closeRenamePlaylistModal();
    return;
  }
  
  const confirmBtn = document.getElementById('confirm-rename-btn');
  const originalText = confirmBtn.innerHTML;
  confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp;Renaming...';
  confirmBtn.disabled = true;
  
  try {
    await spotifyAPI.changePlaylistDetails(renamePlaylistTarget.id, {
      name: newName
    });
    
    // Close modal
    closeRenamePlaylistModal();
    
    // Show success message
    showSnackbar(`Playlist renamed to "${newName}"`, 'success');
    
    // Reload playlists to show updated name
    await loadPlaylists();
    
    // If this is the currently selected playlist, update the display
    const currentPlaylist = State.getCurrentPlaylist();
    if (currentPlaylist && currentPlaylist.id === renamePlaylistTarget.id) {
      currentPlaylist.name = newName;
      document.getElementById('playlist-name').textContent = newName;
    }
    
  } catch (error) {
    console.error('Error renaming playlist:', error);
    showError('Failed to rename playlist: ' + error.message);
  } finally {
    confirmBtn.innerHTML = originalText;
    confirmBtn.disabled = false;
  }
}

// ========================================
// PLAYLIST MENU
// ========================================

export function showPlaylistMenu(button, playlist) {
  // Check if menu is already open for this button
  const existingMenu = button.closest('.playlist-item-actions').querySelector('.playlist-menu');
  if (existingMenu) {
    existingMenu.remove();
    return; // Toggle off - don't create new menu
  }
  
  // Close any other open menus
  document.querySelectorAll('.playlist-menu').forEach(menu => menu.remove());
  
  State.setPlaylistMenuTarget(playlist);
  
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
    State.setCurrentPlaylist(playlist);
    handleDeletePlaylist();
  }
}
