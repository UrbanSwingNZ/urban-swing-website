/**
 * firebase-init.js - Firebase Initialization
 * Sets up global references to Firebase services initialized in firebase-config.js
 */

// Global references
window.db = null;
window.functions = null;

// Wait for Firebase to be initialized by firebase-config.js
document.addEventListener('DOMContentLoaded', () => {
    // Check if Firebase was initialized in firebase-config.js
    if (typeof db !== 'undefined' && db) {
        window.db = db;
        console.log('Firestore reference set');
    } else {
        console.error('Firestore not initialized');
    }
    
    if (typeof functions !== 'undefined' && functions) {
        window.functions = functions;
        console.log('Functions reference set');
    } else {
        console.error('Firebase Functions not initialized');
    }
});
