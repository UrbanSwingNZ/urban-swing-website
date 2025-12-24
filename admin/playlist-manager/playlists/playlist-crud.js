// Playlist CRUD Module
// Handles create, delete, and rename playlist operations

import * as State from '../playlist-state.js';
import { ConfirmationModal } from '/components/modals/confirmation-modal.js';
import { showError, showSnackbar, showLoading } from '../playlist-ui.js';
import { loadPlaylists, displayPlaylists } from './playlist-display.js';
import { updateSaveOrderButton } from '../track-operations.js';

// ========================================
// CREATE PLAYLIST
// ========================================

/**
 * Open the create playlist modal
 */
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

/**
 * Close the create playlist modal
 */
export function closeCreatePlaylistModal() {
  const modal = document.getElementById('create-playlist-modal');
  modal.style.display = 'none';
}

/**
 * Create a new playlist with provided details
 */
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

/**
 * Show delete confirmation and handle deletion
 */
export async function handleDeletePlaylist() {
  const currentPlaylist = State.getCurrentPlaylist();
  if (!currentPlaylist) {
    showError('No playlist selected');
    return;
  }
  
  const playlistName = currentPlaylist.name;
  
  // Create and show delete confirmation modal
  const deleteModal = new ConfirmationModal({
    title: 'Delete Playlist',
    message: `
      <p>Are you sure you want to delete this playlist?</p>
      <div class="student-info-delete">
        <strong>${playlistName}</strong>
      </div>
      <p class="text-muted" style="margin-top: 15px;">This action cannot be undone.</p>
    `,
    icon: 'fas fa-trash',
    variant: 'danger',
    confirmText: 'Delete Playlist',
    confirmClass: 'btn-delete',
    cancelText: 'Cancel',
    cancelClass: 'btn-cancel',
    onConfirm: async () => {
      await confirmDeletePlaylist();
    }
  });
  
  deleteModal.show();
}

/**
 * Execute playlist deletion after confirmation
 */
async function confirmDeletePlaylist() {
  const currentPlaylist = State.getCurrentPlaylist();
  if (!currentPlaylist) return;
  
  const playlistName = currentPlaylist.name;
  
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

/**
 * Open the rename playlist modal
 */
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

/**
 * Close the rename playlist modal
 */
export function closeRenamePlaylistModal() {
  document.getElementById('rename-playlist-modal').style.display = 'none';
  State.setRenamePlaylistTarget(null);
}

/**
 * Rename the playlist with new name
 */
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
// REMOVE PLAYLIST FROM LIBRARY
// ========================================

/**
 * Remove playlist from user's library (unfollow)
 */
export async function handleRemovePlaylistFromLibrary() {
  const playlist = State.getCurrentPlaylist();
  if (!playlist) {
    showError('No playlist selected');
    return;
  }
  
  const playlistName = playlist.name;
  
  // Confirm the action
  if (!confirm(`Remove "${playlistName}" from your library?\n\nThis won't delete the playlist, but it will be removed from your library.`)) {
    return;
  }
  
  showLoading(true);
  
  try {
    // Use the deletePlaylist method which actually unfollows the playlist
    await spotifyAPI.deletePlaylist(playlist.id);
    
    // If this was the currently selected playlist, clear it
    if (State.getCurrentPlaylistId() === playlist.id) {
      State.setCurrentPlaylist(null);
      State.setCurrentPlaylistId(null);
      State.setCurrentTracks([]);
      State.setFilteredTracks([]);
      document.getElementById('playlist-tracks').innerHTML = '';
      document.getElementById('playlist-name').textContent = 'Select a playlist';
      document.getElementById('track-search').value = '';
      updateSaveOrderButton();
    }
    
    // Remove from all playlists array
    const allPlaylists = State.getAllPlaylists().filter(p => p.id !== playlist.id);
    State.setAllPlaylists(allPlaylists);
    
    // Refresh the playlists list
    displayPlaylists(allPlaylists);
    
    showSnackbar(`Removed "${playlistName}" from your library`);
  } catch (error) {
    console.error('Error removing playlist from library:', error);
    showError('Failed to remove playlist from library: ' + error.message);
  } finally {
    showLoading(false);
  }
}

// Expose functions to window for onclick handlers
window.openCreatePlaylistModal = openCreatePlaylistModal;
window.closeCreatePlaylistModal = closeCreatePlaylistModal;
window.handleCreatePlaylist = handleCreatePlaylist;
window.handleDeletePlaylist = handleDeletePlaylist;
window.openRenamePlaylistModal = openRenamePlaylistModal;
window.closeRenamePlaylistModal = closeRenamePlaylistModal;
window.handleRenamePlaylist = handleRenamePlaylist;
