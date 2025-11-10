/**
 * auth.js
 * Authentication initialization
 */

import { setCurrentUser } from '../core/state.js';
import { initializeApp } from '../core/app.js';

/* global firebase */

/**
 * Initialize authentication
 */
export function initializeAuth() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            setCurrentUser(user);
            document.getElementById('user-email').textContent = user.email;
            
            // Restrict access to dance@urbanswing.co.nz only
            if (user.email !== 'dance@urbanswing.co.nz') {
                alert('Access Denied: Email template management is restricted to dance@urbanswing.co.nz');
                window.location.href = '../index.html';
                return;
            }
            
            // Initialize the app
            await initializeApp();
        } else {
            window.location.href = '../../index.html';
        }
    });
}
