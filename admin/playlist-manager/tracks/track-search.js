// Track Search Module
// Handles track filtering and search

import * as State from '../playlist-state.js';
import { displayTracks, resetRenderedCount } from './track-renderer.js';
import { initializeDragDrop } from './track-drag-drop.js';

// ========================================
// TRACK SEARCH & FILTER
// ========================================

export function handleTrackSearch(e) {
  const query = e.target.value.toLowerCase();
  const currentTracks = State.getCurrentTracks();
  
  let filteredTracks;
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
  
  State.setFilteredTracks(filteredTracks);
  resetRenderedCount(); // Reset progressive rendering
  displayTracks(filteredTracks);
  initializeDragDrop();
}

// Expose to window for import compatibility
window.handleTrackSearch = handleTrackSearch;
