// Firebase Configuration
// TODO: Replace these values with your actual Firebase project credentials
// Get these from: Firebase Console > Project Settings > General > Your apps > Web app

const firebaseConfig = {
  apiKey: "AIzaSyBxcbYQWNbrEqCYY_g8GMxwoZ7prSh7B0Y",
  authDomain: "directed-curve-447204-j4.firebaseapp.com",
  projectId: "directed-curve-447204-j4",
  storageBucket: "directed-curve-447204-j4.firebasestorage.app",
  messagingSenderId: "575294080266",
  appId: "1:575294080266:web:51b1fe5c94ea9dfbe666f3"
};

// Initialize Firebase (this will be used by admin.js)
// Don't modify below unless you know what you're doing
let app, auth, db, functions;

try {
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  
  // Set persistence to LOCAL (persists even when browser is closed) - MUST complete before any auth operations
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
      console.error('Error setting auth persistence:', error);
    });
  
  db = firebase.firestore();
  
  // Initialize Cloud Functions
  functions = firebase.functions();
  
  // Expose to window for global access
  window.db = db;
  window.auth = auth;
  window.functions = functions;
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
}
