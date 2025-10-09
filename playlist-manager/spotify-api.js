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
    
    // Store tokens in Firestore for persistence
    this.saveTokensToFirestore();
  }

  async saveTokensToFirestore() {
    if (!auth.currentUser) return;
    
    try {
      await db.collection('admin_tokens').doc(auth.currentUser.uid).set({
        spotifyAccessToken: this.accessToken,
        spotifyRefreshToken: this.refreshToken,
        spotifyTokenExpiry: this.tokenExpiry,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving tokens to Firestore:', error);
    }
  }

  async loadTokensFromFirestore() {
    if (!auth.currentUser) return false;
    
    try {
      const doc = await db.collection('admin_tokens').doc(auth.currentUser.uid).get();
      
      if (doc.exists) {
        const data = doc.data();
        this.accessToken = data.spotifyAccessToken;
        this.refreshToken = data.spotifyRefreshToken;
        this.tokenExpiry = data.spotifyTokenExpiry;
        
        // Check if token needs refresh
        if (this.isTokenExpired()) {
          return await this.refreshAccessToken();
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error loading tokens from Firestore:', error);
    }
    
    return false;
  }

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
      // Token expired, try to refresh
      await this.refreshAccessToken();
      throw new Error('Token expired, please re-authenticate');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Spotify API error: ${response.status}`);
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
