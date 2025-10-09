// Spotify API Handler
// Manages all Spotify API calls with error handling and token refresh

class SpotifyAPI {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  // ========================================
  // Authentication & Token Management
  // ========================================

  setTokens(accessToken, refreshToken, expiresIn) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiry = Date.now() + (expiresIn * 1000);
    
    // Store tokens in localStorage only
    this.saveTokensToStorage();
  }

  saveTokensToStorage() {
    try {
      localStorage.setItem('spotify_access_token', this.accessToken || '');
      localStorage.setItem('spotify_token_expiry', this.tokenExpiry || '');
    } catch (error) {
      console.error('Error saving tokens to storage:', error);
    }
  }

  loadTokensFromStorage() {
    try {
      this.accessToken = localStorage.getItem('spotify_access_token');
      const expiry = localStorage.getItem('spotify_token_expiry');
      this.tokenExpiry = expiry ? parseInt(expiry) : null;
      
      return !!(this.accessToken && this.tokenExpiry);
    } catch (error) {
      console.error('Error loading tokens from storage:', error);
      return false;
    }
  }

  // Note: Firestore methods removed - using localStorage only for implicit flow

  isTokenExpired() {
    return !this.tokenExpiry || Date.now() >= this.tokenExpiry - 60000; // Refresh 1 min early
  }

  async refreshAccessToken() {
    if (!this.refreshToken) return false;
    
    // Note: Token refresh requires server-side implementation
    // For now, we'll redirect to re-authenticate
    console.warn('Token expired, need to re-authenticate');
    return false;
  }

  isAuthenticated() {
    return this.accessToken && !this.isTokenExpired();
  }

  // ========================================
  // API Request Helper
  // ========================================

  async makeRequest(endpoint, options = {}) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Spotify');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${spotifyConfig.apiEndpoint}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (response.status === 401) {
      // Token expired - for implicit flow, user needs to re-authenticate
      this.accessToken = null;
      this.tokenExpiry = null;
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_token_expiry');
      throw new Error('Spotify session expired. Please reconnect your account.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Spotify API Error:', {
        status: response.status,
        endpoint: endpoint,
        error: error
      });
      
      if (response.status === 403) {
        throw new Error(`Access denied. This might be a private playlist you don't own, or you need additional permissions.`);
      }
      
      throw new Error(error.error?.message || error.message || `Spotify API error: ${response.status}`);
    }

    return response.json();
  }

  // ========================================
  // User & Playlists
  // ========================================

  async getCurrentUser() {
    return await this.makeRequest('/me');
  }

  async getUserPlaylists(limit = 50, offset = 0) {
    return await this.makeRequest(`/me/playlists?limit=${limit}&offset=${offset}`);
  }

  async getAllUserPlaylists() {
    const allPlaylists = [];
    let offset = 0;
    const limit = 50;

    while (true) {
      const response = await this.getUserPlaylists(limit, offset);
      allPlaylists.push(...response.items);
      
      if (!response.next) break;
      offset += limit;
    }

    return allPlaylists;
  }

  async getPlaylist(playlistId) {
    return await this.makeRequest(`/playlists/${playlistId}`);
  }

  // ========================================
  // Tracks
  // ========================================

  async getPlaylistTracks(playlistId, limit = 100, offset = 0) {
    return await this.makeRequest(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`);
  }

  async getAllPlaylistTracks(playlistId) {
    const allTracks = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await this.getPlaylistTracks(playlistId, limit, offset);
      allTracks.push(...response.items);
      
      if (!response.next) break;
      offset += limit;
    }

    return allTracks;
  }

  // ========================================
  // Audio Features (BPM, etc.)
  // ========================================

  async getAudioFeatures(trackIds) {
    // Spotify allows up to 100 track IDs per request
    if (trackIds.length > 100) {
      const chunks = [];
      for (let i = 0; i < trackIds.length; i += 100) {
        chunks.push(trackIds.slice(i, i + 100));
      }
      
      const results = await Promise.all(
        chunks.map(chunk => this.getAudioFeatures(chunk))
      );
      
      return results.flat();
    }

    const ids = trackIds.join(',');
    const response = await this.makeRequest(`/audio-features?ids=${ids}`);
    return response.audio_features;
  }

  // ========================================
  // Playlist Modification
  // ========================================

  async reorderPlaylistTracks(playlistId, rangeStart, insertBefore, rangeLength = 1) {
    return await this.makeRequest(`/playlists/${playlistId}/tracks`, {
      method: 'PUT',
      body: JSON.stringify({
        range_start: rangeStart,
        insert_before: insertBefore,
        range_length: rangeLength
      })
    });
  }

  async addTracksToPlaylist(playlistId, trackUris, position = null) {
    const body = { uris: trackUris };
    if (position !== null) {
      body.position = position;
    }

    return await this.makeRequest(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async removeTracksFromPlaylist(playlistId, trackUris) {
    const tracks = trackUris.map(uri => ({ uri }));
    
    return await this.makeRequest(`/playlists/${playlistId}/tracks`, {
      method: 'DELETE',
      body: JSON.stringify({ tracks })
    });
  }

  // ========================================
  // Helper Methods
  // ========================================

  async copyTrackToPlaylist(trackUri, fromPlaylistId, toPlaylistId) {
    await this.addTracksToPlaylist(toPlaylistId, [trackUri]);
    return { success: true, action: 'copied' };
  }

  async moveTrackToPlaylist(trackUri, fromPlaylistId, toPlaylistId) {
    // Add to destination first
    await this.addTracksToPlaylist(toPlaylistId, [trackUri]);
    
    // Then remove from source
    await this.removeTracksFromPlaylist(fromPlaylistId, [trackUri]);
    
    return { success: true, action: 'moved' };
  }

  // Format duration from milliseconds to mm:ss
  formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  }

  // Format BPM
  formatBPM(tempo) {
    return tempo ? Math.round(tempo) : 'N/A';
  }
}

// Create singleton instance
const spotifyAPI = new SpotifyAPI();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SpotifyAPI, spotifyAPI };
}
