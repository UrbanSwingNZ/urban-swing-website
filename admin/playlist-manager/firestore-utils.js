// Firestore Utilities Module
// Handles saving and loading playlist preferences to Firestore

/**
 * Save playlist order to Firestore
 * @param {string} spotifyUserId - The Spotify user ID
 * @param {Array<string>} playlistIds - Array of playlist IDs in order
 * @returns {Promise<void>}
 */
export async function savePlaylistOrderToFirestore(spotifyUserId, playlistIds) {
  if (!spotifyUserId || !playlistIds || playlistIds.length === 0) {
    console.error('Invalid parameters for savePlaylistOrderToFirestore');
    return;
  }
  
  if (typeof window.db === 'undefined') {
    console.error('Firestore not initialized');
    return;
  }
  
  try {
    const db = window.db;
    
    // Save to Firestore under collection 'playlistPreferences', document = spotifyUserId
    await db.collection('playlistPreferences').doc(spotifyUserId).set({
      playlistOrder: playlistIds,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('Playlist order saved to Firestore for user:', spotifyUserId);
  } catch (error) {
    console.error('Error saving playlist order to Firestore:', error);
    // Fallback to localStorage if Firestore fails
    localStorage.setItem('playlist_order', JSON.stringify(playlistIds));
    console.log('Fell back to localStorage');
  }
}

/**
 * Load playlist order from Firestore
 * @param {string} spotifyUserId - The Spotify user ID
 * @returns {Promise<Array<string>|null>} Array of playlist IDs in saved order, or null if not found
 */
export async function loadPlaylistOrderFromFirestore(spotifyUserId) {
  if (!spotifyUserId) {
    console.error('No Spotify user ID provided');
    return null;
  }
  
  if (typeof window.db === 'undefined') {
    console.error('Firestore not initialized');
    // Fallback to localStorage
    const localOrder = localStorage.getItem('playlist_order');
    return localOrder ? JSON.parse(localOrder) : null;
  }
  
  try {
    const db = window.db;
    
    // Load from Firestore
    const docRef = db.collection('playlistPreferences').doc(spotifyUserId);
    const doc = await docRef.get();
    
    if (doc.exists) {
      const data = doc.data();
      console.log('Playlist order loaded from Firestore for user:', spotifyUserId);
      return data.playlistOrder || null;
    } else {
      console.log('No saved playlist order found in Firestore');
      // Check localStorage as fallback for migration
      const localOrder = localStorage.getItem('playlist_order');
      if (localOrder) {
        const playlistIds = JSON.parse(localOrder);
        console.log('Found order in localStorage, migrating to Firestore');
        // Migrate to Firestore
        await savePlaylistOrderToFirestore(spotifyUserId, playlistIds);
        return playlistIds;
      }
      return null;
    }
  } catch (error) {
    console.error('Error loading playlist order from Firestore:', error);
    // Fallback to localStorage
    const localOrder = localStorage.getItem('playlist_order');
    return localOrder ? JSON.parse(localOrder) : null;
  }
}
