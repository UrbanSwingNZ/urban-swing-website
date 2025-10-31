/**
 * firebase-init.js - Firebase Initialization
 * Initializes Firebase and provides db reference
 */

// Global Firestore reference
window.db = null;

// Initialize Firestore once DOM is ready and Firebase is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        window.db = firebase.firestore();
        console.log('Firestore initialized successfully');
    } else {
        console.error('Firebase not loaded properly');
    }
});
