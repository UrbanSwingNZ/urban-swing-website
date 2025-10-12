// Spotify Configuration
// TODO: Replace these values with your Spotify Developer App credentials
// Get these from: https://developer.spotify.com/dashboard

// Detect environment and set redirect URI accordingly
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname === '';

const getRedirectUri = () => {
  if (isLocalhost) {
    // Local development
    return 'http://127.0.0.1:5500/playlist-manager/index.html';
  } else {
    // Production - use current domain
    return `${window.location.origin}/playlist-manager/index.html`;
  }
};

const spotifyConfig = {
  clientId: '6c90506e3e9340ddbe364a4bc6476086',
  redirectUri: getRedirectUri(),
  
  // Required scopes for playlist management and audio features
  scopes: [
    'playlist-read-private',
    'playlist-read-collaborative', 
    'playlist-modify-public',
    'playlist-modify-private',
    'user-library-read',
    'user-library-modify',
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'user-read-recently-played',
    'user-top-read',
    'streaming'
  ].join(' '),
  
  // Spotify API endpoints
  authEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
  apiEndpoint: 'https://api.spotify.com/v1'
};

// Generate Spotify authorization URL (standard Authorization Code flow)
// Backend (Cloudflare Worker) will handle the token exchange securely
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

// Make available globally for both module and non-module scripts
window.spotifyConfig = spotifyConfig;
window.getSpotifyAuthUrl = getSpotifyAuthUrl;
window.getAuthCodeFromUrl = getAuthCodeFromUrl;
window.generateRandomString = generateRandomString;

// Also export as ES6 module for module scripts
export { spotifyConfig, getSpotifyAuthUrl, getAuthCodeFromUrl, generateRandomString };
