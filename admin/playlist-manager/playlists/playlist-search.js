// Playlist Search Module
// Handles filtering playlists by name

import * as State from '../playlist-state.js';
import { displayPlaylists } from './playlist-display.js';

/**
 * Filter playlists by search query
 */
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

// Expose to window for onclick handlers
window.handlePlaylistSearch = handlePlaylistSearch;
