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
    // Store absolute timestamp for expiration
    this.tokenExpiry = Date.now() + (expiresIn * 1000);
    
    // Store tokens in localStorage only
    this.saveTokensToStorage();
    
    // Dispatch event for token update (for monitoring)
    window.dispatchEvent(new CustomEvent('spotify-token-updated', {
      detail: { expiresAt: this.tokenExpiry }
    }));
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
      
      // Check if tokens are actually valid (not empty strings)
      const hasValidToken = !!(this.accessToken && this.accessToken !== '' && this.tokenExpiry);
      
      return hasValidToken;
    } catch (error) {
      console.error('Error loading tokens from storage:', error);
      return false;
    }
  }

  // Note: Firestore methods removed - using localStorage only for implicit flow

  isTokenExpired() {
    return !this.tokenExpiry || Date.now() >= this.tokenExpiry - 60000; // Refresh 1 min early
  }

  getTimeUntilExpiry() {
    if (!this.tokenExpiry) return 0;
    return this.tokenExpiry - Date.now();
  }

  async refreshAccessToken() {
    try {
      console.log('Refreshing access token via Cloudflare Worker...');
      
      // Get Spotify user ID from localStorage
      const userId = localStorage.getItem('spotify_user_id');
      if (!userId) {
        console.error('No Spotify user ID found');
        return false;
      }
      
      // Call Cloudflare Worker
      const response = await fetch('https://urban-swing-spotify.urban-swing.workers.dev/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Refresh failed:', error.error);
        return false;
      }
      
      const tokens = await response.json();
      
      // Update tokens (refresh token stays server-side in Firestore)
      this.setTokens(tokens.accessToken, null, tokens.expiresIn);
      
      console.log('Successfully refreshed access token');
      return true;
      
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  isAuthenticated() {
    return this.accessToken && !this.isTokenExpired();
  }

  // ========================================
  // API Request Helper
  // ========================================

  async makeRequest(endpoint, options = {}) {
    // Check if token is expired and try to refresh
    if (this.isTokenExpired()) {
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        throw new Error('Not authenticated with Spotify');
      }
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
      // Token expired - try to refresh once
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        this.accessToken = null;
        this.tokenExpiry = null;
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_token_expiry');
        throw new Error('Spotify session expired. Please reconnect your account.');
      }
      
      // Retry the request with new token
      return this.makeRequest(endpoint, options);
    }

    if (!response.ok) {
      // Try to get the response body as text first
      const responseText = await response.text();
      
      let error = {};
      try {
        error = JSON.parse(responseText);
      } catch (e) {
        error = { message: 'Non-JSON response from Spotify', raw: responseText.substring(0, 500) };
      }
      
      if (response.status === 403) {
        const errorMsg = error.error?.message || 'Access denied';
        
        // Provide more specific error message for audio-features endpoint
        if (endpoint.includes('audio-features')) {
          throw new Error(`Access denied (403): ${errorMsg}. The Audio Features API requires Extended Quota Mode approval from Spotify. See AUDIO_FEATURES_ACCESS.md for details.`);
        }
        
        throw new Error(`Access denied (403): ${errorMsg}. This might be a private playlist you don't own, or you may need additional API permissions.`);
      }
      
      throw new Error(error.error?.message || error.message || `Spotify API error: ${response.status}`);
    }

    // Some endpoints return 200/204 with no body
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    // Return empty object for successful responses with no body
    return {};
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

  async createPlaylist(name, description = '', isPublic = false, isCollaborative = false) {
    // First get current user ID
    const user = await this.getCurrentUser();
    
    return await this.makeRequest(`/users/${user.id}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
        description: description,
        public: isPublic,
        collaborative: isCollaborative
      })
    });
  }

  async getPlaylist(playlistId) {
    return await this.makeRequest(`/playlists/${playlistId}`);
  }

  // ========================================
  // Tracks
  // ========================================

  async getPlaylistTracks(playlistId, limit = 100, offset = 0) {
    // Use the direct tracks endpoint - it's simpler and more reliable
    return await this.makeRequest(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`);
  }

  async getAllPlaylistTracks(playlistId) {
    const allTracks = [];
    let offset = 0;
    const limit = 100;

    try {
      while (true) {
        const response = await this.getPlaylistTracks(playlistId, limit, offset);
        
        allTracks.push(...response.items);
        
        if (!response.next) break;
        offset += limit;
      }
      
      return allTracks;
    } catch (error) {
      // If it's a 403 error, provide a clearer message
      if (error.message && error.message.includes('403')) {
        throw new Error(`Access denied (403) when trying to read tracks from playlist ${playlistId}. This might be a Spotify API permissions issue.`);
      }
      
      throw error;
    }
  }

  // ========================================
  // Audio Features (BPM, etc.)
  // ========================================

  async getAudioFeatures(trackIds) {
    // Filter out any invalid track IDs
    const validTrackIds = trackIds.filter(id => id && typeof id === 'string' && id.trim().length > 0);
    
    if (validTrackIds.length === 0) {
      return [];
    }
    
    // First, try the batch endpoint (even though it's supposedly deprecated, it might work)
    try {
      const idsParam = validTrackIds.join(',');
      const response = await this.makeRequest(`/audio-features?ids=${idsParam}`);
      
      if (response && response.audio_features) {
        return response.audio_features;
      }
    } catch (error) {
      // Batch endpoint failed, fall back to individual requests silently
    }
    
    // Fallback: Call each track individually
    // To avoid rate limiting, we'll process them in smaller concurrent batches
    const results = [];
    const batchSize = 20; // Process 20 at a time
    
    for (let i = 0; i < validTrackIds.length; i += batchSize) {
      const batch = validTrackIds.slice(i, i + batchSize);
      
      // Fetch all tracks in this batch concurrently
      const batchPromises = batch.map(async (trackId) => {
        try {
          const response = await this.makeRequest(`/audio-features/${trackId}`);
          return response;
        } catch (error) {
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < validTrackIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
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

  async checkTrackExistsInPlaylist(trackUri, playlistId) {
    try {
      const tracks = await this.getAllPlaylistTracks(playlistId);
      return tracks.some(item => item.track && item.track.uri === trackUri);
    } catch (error) {
      console.error('Error checking track existence:', error);
      // If we can't check, assume it doesn't exist to allow the operation
      return false;
    }
  }

  async copyTrackToPlaylist(trackUri, fromPlaylistId, toPlaylistId) {
    // Check if track already exists in destination
    const exists = await this.checkTrackExistsInPlaylist(trackUri, toPlaylistId);
    if (exists) {
      throw new Error('Track already exists in the destination playlist');
    }
    
    await this.addTracksToPlaylist(toPlaylistId, [trackUri]);
    return { success: true, action: 'copied' };
  }

  async moveTrackToPlaylist(trackUri, fromPlaylistId, toPlaylistId) {
    // Check if track already exists in destination
    const exists = await this.checkTrackExistsInPlaylist(trackUri, toPlaylistId);
    if (exists) {
      throw new Error('Track already exists in the destination playlist');
    }
    
    // Add to destination first
    await this.addTracksToPlaylist(toPlaylistId, [trackUri]);
    
    // Then remove from source
    await this.removeTracksFromPlaylist(fromPlaylistId, [trackUri]);
    
    return { success: true, action: 'moved' };
  }

  // ========================================
  // Search
  // ========================================

  async searchTracks(query, limit = 20) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const params = new URLSearchParams({
      q: query.trim(),
      type: 'track',
      limit: limit.toString()
    });

    const response = await this.makeRequest(`/search?${params}`);
    return response.tracks?.items || [];
  }

  // ========================================
  // Playlist Management
  // ========================================

  async changePlaylistDetails(playlistId, details) {
    return await this.makeRequest(`/playlists/${playlistId}`, {
      method: 'PUT',
      body: JSON.stringify(details)
    });
  }

  // ========================================
  // Playlist Deletion
  // ========================================

  async deletePlaylist(playlistId) {
    // Note: Spotify API doesn't allow deleting playlists directly
    // But we can "unfollow" a playlist, which removes it from the user's library
    return await this.makeRequest(`/playlists/${playlistId}/followers`, {
      method: 'DELETE'
    });
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
