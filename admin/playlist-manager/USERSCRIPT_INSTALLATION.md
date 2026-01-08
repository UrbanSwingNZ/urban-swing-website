# SongData BPM Scraper - Installation & Usage

## Installation (One-Time Setup)

1. **Install Tampermonkey** (already done ✓)
   - You already have this installed

2. **Install the Userscript**
   - Open `songdata-bpm-scraper.user.js` in a text editor
   - Copy ALL the code (Ctrl+A, Ctrl+C)
   - Click the Tampermonkey icon in your browser
   - Click "Create a new script"
   - Delete the template code
   - Paste the copied code
   - Click File > Save (or Ctrl+S)
   - Done!

## Usage

### Every Time You Want to Extract BPM Data:

1. **Log in to Urban Swing**
   - Open: `https://urban-swing.com/admin/playlist-manager/` (or your local dev URL)
   - Log in with your admin credentials
   - Leave this tab open

2. **Visit SongData Playlist**
   - Open a new tab
   - Navigate to: `https://songdata.io/playlist/5ZBC1D2Z62OGSJacTison8`
   - Wait for the page to fully load (all tracks visible)

3. **Extract the Data**
   - Look for a green button in the top-right: "🎵 Extract BPMs to Firestore"
   - Click the button
   - Wait for extraction (shows progress messages)
   - You'll see a success message with track count and BPM range

4. **Verify in Firestore**
   - Go to Firebase Console > Firestore Database
   - Look in `songData` collection
   - You should see a document with your playlist ID
   - Click it to see all 500 tracks with BPM data

## Troubleshooting

**Button doesn't appear:**
- Make sure you're on a songdata.io playlist URL
- Refresh the page
- Check browser console for errors (F12)

**"Please log in to Urban Swing" message:**
- You need to be logged in to your admin panel first
- Open the playlist manager in another tab and log in
- Then try again on the songdata page

**No tracks extracted:**
- Make sure the page is fully loaded before clicking
- Scroll down to ensure all tracks are visible
- The page might have changed structure - check console for errors

**Firestore permission errors:**
- You'll need to update your Firestore security rules
- See the next section

## Firestore Security Rules

Add this rule to allow authenticated admin users to write to songData:

```javascript
match /songData/{playlistId} {
  allow read, write: if request.auth != null;
}
```

Full rules file location: `config/firestore.rules`
