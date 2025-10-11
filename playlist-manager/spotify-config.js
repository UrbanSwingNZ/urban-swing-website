// Spotify Configuration
// TODO: Replace these values with your Spotify Developer App credentials
// Get these from: https://developer.spotify.com/dashboard

const spotifyConfig = {
  clientId: '6c90506e3e9340ddbe364a4bc6476086',
  // Use 127.0.0.1:5500 for local development (matches Spotify dashboard setting)
  redirectUri: 'http://127.0.0.1:5500/playlist-manager/index.html',
  
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

// Generate random string for PKCE
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Generate code challenge for PKCE
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Generate Spotify authorization URL (using Authorization Code with PKCE)
async function getSpotifyAuthUrl() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Store code verifier for later use
  localStorage.setItem('spotify_code_verifier', codeVerifier);
  
  const params = new URLSearchParams({
    client_id: spotifyConfig.clientId,
    response_type: 'code',
    redirect_uri: spotifyConfig.redirectUri,
    scope: spotifyConfig.scopes,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
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
