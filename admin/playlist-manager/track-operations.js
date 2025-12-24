// Playlist Manager - Track Operations Coordinator
// Main entry point for all track-related operations

// Import all track modules
import { loadTracks } from './tracks/track-loader.js';
import { displayTracks, resetRenderedCount } from './tracks/track-renderer.js';
import { handleTrackSearch } from './tracks/track-search.js';
import { formatTotalDuration } from './tracks/track-utils.js';
import { initializeDragDrop, updateSaveOrderButton, handleSaveOrder } from './tracks/track-drag-drop.js';
import { addSwipeToDelete, addLongPressMenu } from './tracks/track-mobile.js';
import { 
  showTrackMenu, 
  handleConfirmAction, 
  closeModal, 
  handleDeleteTrack
} from './tracks/track-actions.js';
import {
  openAddTracksModal,
  closeAddTracksModal,
  handleTracksSearch,
  handleAddSelectedTracks
} from './tracks/track-add-modal.js';
import { 
  restorePlaybackState, 
  handleTrackPlayPause, 
  stopCurrentAudio 
} from './tracks/track-audio.js';

// ========================================
// WINDOW EXPOSURE
// Re-export all functions for onclick handlers
// ========================================

window.loadTracks = loadTracks;
window.displayTracks = displayTracks;
window.resetRenderedCount = resetRenderedCount;
window.handleTrackSearch = handleTrackSearch;
window.formatTotalDuration = formatTotalDuration;
window.initializeDragDrop = initializeDragDrop;
window.updateSaveOrderButton = updateSaveOrderButton;
window.handleSaveOrder = handleSaveOrder;
window.addSwipeToDelete = addSwipeToDelete;
window.addLongPressMenu = addLongPressMenu;
window.showTrackMenu = showTrackMenu;
window.handleConfirmAction = handleConfirmAction;
window.closeModal = closeModal;
window.handleDeleteTrack = handleDeleteTrack;
window.openAddTracksModal = openAddTracksModal;
window.closeAddTracksModal = closeAddTracksModal;
window.handleTracksSearch = handleTracksSearch;
window.handleAddSelectedTracks = handleAddSelectedTracks;
window.restorePlaybackState = restorePlaybackState;
window.handleTrackPlayPause = handleTrackPlayPause;
window.stopCurrentAudio = stopCurrentAudio;

// ========================================
// EXPORTS
// For module imports
// ========================================

export {
  loadTracks,
  displayTracks,
  resetRenderedCount,
  handleTrackSearch,
  formatTotalDuration,
  initializeDragDrop,
  updateSaveOrderButton,
  handleSaveOrder,
  addSwipeToDelete,
  addLongPressMenu,
  showTrackMenu,
  handleConfirmAction,
  closeModal,
  handleDeleteTrack,
  openAddTracksModal,
  closeAddTracksModal,
  handleTracksSearch,
  handleAddSelectedTracks,
  restorePlaybackState,
  handleTrackPlayPause,
  stopCurrentAudio
};
