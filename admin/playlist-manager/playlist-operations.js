// Playlist Manager - Playlist Operations Coordinator
// Imports and coordinates playlist operation modules

import { 
  loadPlaylists, 
  displayPlaylists, 
  updatePlaylistTrackCount 
} from './playlists/playlist-display.js';

import { handlePlaylistSearch } from './playlists/playlist-search.js';

import { 
  selectPlaylist, 
  performPlaylistSelection 
} from './playlists/playlist-selection.js';

import {
  openCreatePlaylistModal,
  closeCreatePlaylistModal,
  handleCreatePlaylist,
  handleDeletePlaylist,
  openRenamePlaylistModal,
  closeRenamePlaylistModal,
  handleRenamePlaylist,
  handleRemovePlaylistFromLibrary
} from './playlists/playlist-crud.js';

import { showPlaylistMenu } from './playlists/playlist-ui-handlers.js';

// Expose all functions to window for onclick handlers
window.loadPlaylists = loadPlaylists;
window.handlePlaylistSearch = handlePlaylistSearch;
window.selectPlaylist = selectPlaylist;
window.openCreatePlaylistModal = openCreatePlaylistModal;
window.closeCreatePlaylistModal = closeCreatePlaylistModal;
window.handleCreatePlaylist = handleCreatePlaylist;
window.handleDeletePlaylist = handleDeletePlaylist;
window.openRenamePlaylistModal = openRenamePlaylistModal;
window.closeRenamePlaylistModal = closeRenamePlaylistModal;
window.handleRenamePlaylist = handleRenamePlaylist;
window.showPlaylistMenu = showPlaylistMenu;

// Export for module imports
export {
  loadPlaylists,
  displayPlaylists,
  updatePlaylistTrackCount,
  handlePlaylistSearch,
  selectPlaylist,
  performPlaylistSelection,
  openCreatePlaylistModal,
  closeCreatePlaylistModal,
  handleCreatePlaylist,
  handleDeletePlaylist,
  openRenamePlaylistModal,
  closeRenamePlaylistModal,
  handleRenamePlaylist,
  handleRemovePlaylistFromLibrary,
  showPlaylistMenu
};
