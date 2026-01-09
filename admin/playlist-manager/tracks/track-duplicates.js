// Track Duplicates Module
// Detects and highlights tracks that appear in multiple playlists

import * as State from '../playlist-state.js';

/**
 * Find which other playlists contain this track
 * @param {string} trackId - Spotify track ID
 * @param {string} currentPlaylistId - Current playlist ID to exclude
 * @returns {Array<{id: string, name: string}>} Array of playlists containing this track
 */
export function findTrackInOtherPlaylists(trackId, currentPlaylistId) {
  const allPlaylists = State.getAllPlaylists();
  const matchingPlaylists = [];
  
  for (const playlist of allPlaylists) {
    // Skip the current playlist
    if (playlist.id === currentPlaylistId) continue;
    
    // Check if this playlist has been loaded (has tracks data cached)
    // We'll need to check against State.getCurrentTracks() when viewing each playlist
    // For now, we'll cache playlist track IDs in a Map when playlists are loaded
    
    // Check if track exists in this playlist's cached tracks
    const cachedTracks = window._playlistTracksCache?.[playlist.id];
    if (cachedTracks && cachedTracks.includes(trackId)) {
      matchingPlaylists.push({
        id: playlist.id,
        name: playlist.name
      });
    }
  }
  
  return matchingPlaylists;
}

/**
 * Build cache of track IDs for all loaded playlists
 * This should be called when a playlist is loaded
 */
export function cachePlaylistTracks(playlistId, tracks) {
  if (!window._playlistTracksCache) {
    window._playlistTracksCache = {};
  }
  
  window._playlistTracksCache[playlistId] = tracks
    .map(item => item.track?.id)
    .filter(Boolean);
}

/**
 * Check if a track exists in other playlists (using cache)
 * @param {string} trackId - Spotify track ID
 * @param {string} currentPlaylistId - Current playlist ID to exclude
 * @returns {boolean} True if track exists in at least one other playlist
 */
export function isTrackDuplicate(trackId, currentPlaylistId) {
  const playlists = findTrackInOtherPlaylists(trackId, currentPlaylistId);
  return playlists.length > 0;
}

/**
 * Get tooltip text for duplicate track
 * @param {string} trackId - Spotify track ID
 * @param {string} currentPlaylistId - Current playlist ID to exclude
 * @returns {string} Tooltip text listing other playlists
 */
export function getDuplicateTooltip(trackId, currentPlaylistId) {
  const playlists = findTrackInOtherPlaylists(trackId, currentPlaylistId);
  
  if (playlists.length === 0) return '';
  
  const playlistNames = playlists.map(p => p.name).join(', ');
  return `Also in: ${playlistNames}`;
}
