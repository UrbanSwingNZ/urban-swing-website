// Playlist Manager - State Management
// Handles global state and state updates

// ========================================
// GLOBAL STATE
// ========================================

export let currentPlaylist = null;
export let allPlaylists = [];
export let currentTracks = [];
export let filteredTracks = [];
export let sortableInstance = null;
export let pendingAction = null;
export let hasUnsavedChanges = false;
export let pendingPlaylistSelection = null;
export let selectedTracks = [];
export let currentPlaylistId = null;
export let playlistMenuTarget = null;
export let renamePlaylistTarget = null;

// ========================================
// STATE SETTERS
// ========================================

export function setCurrentPlaylist(playlist) {
  currentPlaylist = playlist;
}

export function setAllPlaylists(playlists) {
  allPlaylists = playlists;
}

export function setCurrentTracks(tracks) {
  currentTracks = tracks;
}

export function setFilteredTracks(tracks) {
  filteredTracks = tracks;
}

export function setSortableInstance(instance) {
  sortableInstance = instance;
}

export function setPendingAction(action) {
  pendingAction = action;
}

export function setHasUnsavedChanges(value) {
  hasUnsavedChanges = value;
}

export function setPendingPlaylistSelection(playlist) {
  pendingPlaylistSelection = playlist;
}

export function setSelectedTracks(tracks) {
  selectedTracks = tracks;
}

export function setCurrentPlaylistId(id) {
  currentPlaylistId = id;
}

export function setPlaylistMenuTarget(playlist) {
  playlistMenuTarget = playlist;
}

export function setRenamePlaylistTarget(playlist) {
  renamePlaylistTarget = playlist;
}

// ========================================
// STATE GETTERS
// ========================================

export function getCurrentPlaylist() {
  return currentPlaylist;
}

export function getAllPlaylists() {
  return allPlaylists;
}

export function getCurrentTracks() {
  return currentTracks;
}

export function getFilteredTracks() {
  return filteredTracks;
}

export function getSortableInstance() {
  return sortableInstance;
}

export function getPendingAction() {
  return pendingAction;
}

export function getHasUnsavedChanges() {
  return hasUnsavedChanges;
}

export function getPendingPlaylistSelection() {
  return pendingPlaylistSelection;
}

export function getSelectedTracks() {
  return selectedTracks;
}

export function getCurrentPlaylistId() {
  return currentPlaylistId;
}

export function getPlaylistMenuTarget() {
  return playlistMenuTarget;
}

export function getRenamePlaylistTarget() {
  return renamePlaylistTarget;
}
