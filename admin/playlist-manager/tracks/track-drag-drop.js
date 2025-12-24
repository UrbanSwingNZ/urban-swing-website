// Track Drag & Drop Module
// Handles track reordering via drag and drop

import * as State from '../playlist-state.js';
import { showLoading, showError } from '../playlist-ui.js';

// ========================================
// DRAG AND DROP
// ========================================

export function initializeDragDrop() {
  const sortableInstance = State.getSortableInstance();
  if (sortableInstance) {
    sortableInstance.destroy();
  }
  
  const tbody = document.getElementById('tracks-list');
  
  const newInstance = new Sortable(tbody, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    forceFallback: false,
    fallbackTolerance: 3,
    touchStartThreshold: 5,
    delay: 0,
    delayOnTouchOnly: false,
    onEnd: handleDragEnd
  });
  
  State.setSortableInstance(newInstance);
}

function handleDragEnd(evt) {
  const oldIndex = evt.oldIndex;
  const newIndex = evt.newIndex;
  
  if (oldIndex === newIndex) return;
  
  // Update filtered tracks array
  const filteredTracks = State.getFilteredTracks();
  const [movedTrack] = filteredTracks.splice(oldIndex, 1);
  filteredTracks.splice(newIndex, 0, movedTrack);
  State.setFilteredTracks(filteredTracks);
  
  // Update track numbers
  updateTrackNumbers();
  
  // Auto-save the new order to Spotify
  handleSaveOrder();
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

// ========================================
// SAVE ORDER
// ========================================

export function updateSaveOrderButton() {
  const btn = document.getElementById('save-order-btn');
  if (!btn) return;
  const shouldShow = State.getHasUnsavedChanges();
  if (shouldShow) {
    btn.classList.add('show');
  } else {
    btn.classList.remove('show');
  }
}

export async function handleSaveOrder() {
  const currentPlaylist = State.getCurrentPlaylist();
  if (!currentPlaylist) return;
  
  showLoading(true);
  
  try {
    console.log('Saving track order for playlist:', currentPlaylist.id);
    
    const filteredTracks = State.getFilteredTracks();
    // Get track URIs in the new order
    const newOrderUris = filteredTracks
      .filter(item => item.track && item.track.uri)
      .map(item => item.track.uri);
    
    if (newOrderUris.length === 0) {
      showError('No tracks to reorder');
      return;
    }
    
    // Step 1: Remove all tracks from the playlist
    await spotifyAPI.removeTracksFromPlaylist(currentPlaylist.id, newOrderUris);
    
    // Step 2: Add tracks back in the new order
    // Spotify has a limit of 100 tracks per request, so we need to chunk
    const chunkSize = 100;
    for (let i = 0; i < newOrderUris.length; i += chunkSize) {
      const chunk = newOrderUris.slice(i, i + chunkSize);
      await spotifyAPI.addTracksToPlaylist(currentPlaylist.id, chunk, i);
    }
    
    // Update the current tracks array to reflect the new order
    State.setCurrentTracks([...filteredTracks]);
    
    // Clear unsaved changes flag
    State.setHasUnsavedChanges(false);
    updateSaveOrderButton();
    
  } catch (error) {
    console.error('Error saving order:', error);
    showError('Failed to save track order: ' + error.message);
  } finally {
    showLoading(false);
  }
}

// Expose to window for import compatibility
window.initializeDragDrop = initializeDragDrop;
window.updateSaveOrderButton = updateSaveOrderButton;
window.handleSaveOrder = handleSaveOrder;
