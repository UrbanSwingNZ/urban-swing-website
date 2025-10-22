// Run this in the browser console to completely reset authentication
(function resetSpotifyAuth() {
  console.log('🔄 Resetting Spotify authentication...');
  
  // Clear all Spotify-related localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('spotify')) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    console.log('Removing:', key);
    localStorage.removeItem(key);
  });
  
  // Clear the spotifyAPI instance
  if (window.spotifyAPI) {
    spotifyAPI.accessToken = null;
    spotifyAPI.refreshToken = null;
    spotifyAPI.tokenExpiry = null;
  }
  
  console.log('✅ Authentication cleared!');
  console.log('🔄 Reloading page...');
  
  // Reload the page
  setTimeout(() => {
    window.location.reload();
  }, 1000);
})();
