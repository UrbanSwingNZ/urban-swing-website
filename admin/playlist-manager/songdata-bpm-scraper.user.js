// ==UserScript==
// @name         SongData.io BPM Scraper for Urban Swing
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Extract BPM data from songdata.io playlists and save to Firestore
// @author       Urban Swing
// @match        https://songdata.io/playlist/*
// @grant        none
// @require      https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js
// @require      https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js
// @require      https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js
// ==/UserScript==

(function() {
    'use strict';

    // Firebase Configuration
    const firebaseConfig = {
        apiKey: "AIzaSyBxcbYQWNbrEqCYY_g8GMxwoZ7prSh7B0Y",
        authDomain: "directed-curve-447204-j4.firebaseapp.com",
        projectId: "directed-curve-447204-j4",
        storageBucket: "directed-curve-447204-j4.firebasestorage.app",
        messagingSenderId: "575294080266",
        appId: "1:575294080266:web:51b1fe5c94ea9dfbe666f3"
    };

    // Initialize Firebase
    let app, auth, db;
    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        console.log('✅ Firebase initialized in userscript');
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
    }

    // Extract playlist ID from URL
    function getPlaylistId() {
        const match = window.location.pathname.match(/\/playlist\/([^\/]+)/);
        return match ? match[1] : null;
    }

    // Add extraction button to page
    function addExtractButton() {
        const button = document.createElement('button');
        button.id = 'bpm-extract-button';
        button.innerHTML = '🎵 Extract BPMs to Firestore';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 12px 24px;
            background: #1DB954;
            color: white;
            border: none;
            border-radius: 24px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        });

        button.addEventListener('click', handleExtraction);
        document.body.appendChild(button);
        console.log('✅ Extract button added to page');
    }

    // Show status message
    function showMessage(text, type = 'info') {
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800'
        };

        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10001;
            padding: 16px 24px;
            background: ${colors[type]};
            color: white;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;

        message.textContent = text;
        document.body.appendChild(message);

        setTimeout(() => {
            message.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => message.remove(), 300);
        }, 5000);
    }

    // Extract track data from page
    function extractTrackData() {
        console.log('🔍 Starting track extraction...');

        const tracks = [];
        const trackRows = document.querySelectorAll('table tbody tr');

        if (trackRows.length === 0) {
            console.warn('⚠️ No track rows found.');
            return null;
        }

        console.log(`Found ${trackRows.length} track rows`);

        trackRows.forEach((row, index) => {
            try {
                // Extract all td cells
                const cells = row.querySelectorAll('td');
                
                // SongData.io structure (based on inspection):
                // Cell 0: Rank number
                // Cell 1: Album artwork (image)
                // Cell 2: Track name
                // Cell 3: Artist name
                // Cell 4: Key
                // Cell 5: BPM
                // Cell 6: Amazon link
                
                const trackName = cells[2] ? cells[2].textContent.trim() : 'Unknown Track';
                const artistName = cells[3] ? cells[3].textContent.trim() : 'Unknown Artist';
                const key = cells[4] ? cells[4].textContent.trim() : null;
                const bpmText = cells[5] ? cells[5].textContent.trim() : null;
                const bpm = bpmText ? parseInt(bpmText) : null;
                
                // Duration doesn't appear to be on this page
                const duration = null;

                // Extract Spotify track ID from any track link in the row
                const trackLink = row.querySelector('a[href*="/track/"]');
                const spotifyTrackId = trackLink ? trackLink.href.match(/\/track\/([^\/]+)/)?.[1] : null;

                tracks.push({
                    trackName,
                    artistName,
                    bpm,
                    key,
                    duration,
                    spotifyTrackId,
                    position: index + 1
                });
            } catch (error) {
                console.error(`Error extracting track at position ${index + 1}:`, error);
            }
        });

        console.log(`✅ Extracted ${tracks.length} tracks`);
        return tracks;
    }

    // Handle extraction process
    async function handleExtraction() {
        console.log('🚀 Starting BPM extraction process...');

        // Authenticate anonymously if needed
        let user = auth.currentUser;
        if (!user) {
            console.log('No user authenticated, signing in anonymously...');
            try {
                const result = await auth.signInAnonymously();
                user = result.user;
                console.log('✅ Signed in anonymously:', user.uid);
            } catch (error) {
                console.error('❌ Anonymous auth failed:', error);
                showMessage('❌ Authentication failed. Please try again.', 'error');
                return;
            }
        }

        console.log('✅ User authenticated:', user.email || user.uid);

        // Get playlist ID
        const playlistId = getPlaylistId();
        if (!playlistId) {
            showMessage('❌ Could not extract playlist ID from URL', 'error');
            return;
        }

        console.log('📋 Playlist ID:', playlistId);

        // Disable button during extraction
        const button = document.getElementById('bpm-extract-button');
        const originalText = button.innerHTML;
        button.disabled = true;
        button.style.opacity = '0.6';
        button.style.cursor = 'not-allowed';
        button.innerHTML = '⏳ Extracting...';

        try {
            // Extract track data
            showMessage('🔍 Extracting track data from page...', 'info');
            const tracks = extractTrackData();

            if (!tracks || tracks.length === 0) {
                throw new Error('No tracks found on page. Make sure the page is fully loaded.');
            }

            // Get playlist name from page
            const playlistNameEl = document.querySelector('h1, [data-testid="playlist-name"]');
            const playlistName = playlistNameEl ? playlistNameEl.textContent.trim() : 'Unknown Playlist';

            // Prepare document data
            const documentData = {
                playlistId,
                playlistName,
                totalTracks: tracks.length,
                scrapedAt: firebase.firestore.FieldValue.serverTimestamp(),
                scrapedBy: user.email || user.uid,
                tracks
            };

            // Save to Firestore
            showMessage(`💾 Saving ${tracks.length} tracks to Firestore...`, 'info');
            await db.collection('songData').doc(playlistId).set(documentData);

            // Calculate BPM stats
            const bpms = tracks.filter(t => t.bpm).map(t => t.bpm);
            const minBpm = bpms.length > 0 ? Math.min(...bpms) : 'N/A';
            const maxBpm = bpms.length > 0 ? Math.max(...bpms) : 'N/A';
            const avgBpm = bpms.length > 0 ? Math.round(bpms.reduce((a,b) => a+b, 0) / bpms.length) : 'N/A';

            console.log('✅ Success! Data saved to Firestore');
            console.log('📊 Stats:', {
                totalTracks: tracks.length,
                tracksWithBPM: bpms.length,
                bpmRange: `${minBpm} - ${maxBpm}`,
                avgBpm
            });

            showMessage(`✅ Success! Saved ${tracks.length} tracks to Firestore\n\nBPM Range: ${minBpm} - ${maxBpm} (avg: ${avgBpm})`, 'success');

        } catch (error) {
            console.error('❌ Extraction error:', error);
            showMessage(`❌ Error: ${error.message}`, 'error');
        } finally {
            // Re-enable button
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.innerHTML = originalText;
        }
    }

    // Initialize when page loads
    function initialize() {
        console.log('🎵 SongData BPM Scraper initialized');

        // Wait for page to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addExtractButton);
        } else {
            addExtractButton();
        }

        // Monitor auth state
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('✅ Firebase Auth: User logged in -', user.email || user.uid);
            } else {
                console.log('⚠️ Firebase Auth: No user logged in. Please log in to Urban Swing Playlist Manager first.');
            }
        });
    }

    // Start the script
    initialize();
})();
