// Spotify Configuration
// TODO: Replace these values with your Spotify Developer App credentials
// Get these from: https://developer.spotify.com/dashboard

const spotifyConfig = {
  clientId: '6c90506e3e9340ddbe364a4bc6476086',
  redirectUri: window.location.origin + '/playlist-manager/index.html',
  
  // Required scopes for playlist management
  scopes: [
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-library-read'
  ].join(' '),
  
  // Spotify API endpoints
  authEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
  apiEndpoint: 'https://api.spotify.com/v1'
};

// Generate Spotify authorization URL
function getSpotifyAuthUrl() {
  const params = new URLSearchParams({
    client_id: spotifyConfig.clientId,
    response_type: 'code',
    redirect_uri: spotifyConfig.redirectUri,
    scope: spotifyConfig.scopes,
    show_dialog: true
  });
  
  return `${spotifyConfig.authEndpoint}?${params.toString()}`;
}

// Parse authorization code from URL
function getAuthCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

// Generate code verifier for PKCE (not used in this implementation, but good for future)
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { spotifyConfig, getSpotifyAuthUrl, getAuthCodeFromUrl, generateRandomString };
}
