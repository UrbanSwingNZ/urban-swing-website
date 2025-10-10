# Extended Quota Mode Application Template

Use this template when applying for Extended Quota Mode in your Spotify Developer Dashboard.

---

## Application Details

**App Name:** Urban Swing Playlist Manager  
**Client ID:** 6c90506e3e9340ddbe364a4bc6476086  
**App Type:** Web Application  
**User Base:** Personal use + small dance community (~25-50 users)

---

## Application Description

**What does your app do?**

Urban Swing Playlist Manager is a specialized tool for West Coast Swing dancers and DJs to organize and manage their music playlists. The app allows users to:

1. View and organize their Spotify playlists
2. See BPM (tempo) information for each track to match appropriate dance speeds
3. Sort and filter tracks by tempo for creating themed dance sets
4. Manage playlist metadata to optimize for dance events

West Coast Swing dancing requires specific tempo ranges (typically 90-130 BPM for various styles), making BPM data essential for proper playlist curation.

---

**Which Spotify APIs and features do you use?**

- Authorization Code Flow with PKCE (for secure user authentication)
- Playlists API (to read and modify user playlists)
- Tracks API (to retrieve track information)
- **Audio Features API (to retrieve BPM/tempo data)** ← This is what needs Extended Quota

---

**Why do you need access to Audio Features API?**

The Audio Features API (specifically the tempo/BPM field) is the core feature of our app. Dancers and DJs need accurate tempo information to:

- Select appropriate music for different dance styles
- Create smooth transitions between songs
- Organize practice playlists by speed
- Plan event setlists with proper energy flow

Without BPM data, the app loses its primary value proposition for the dance community.

---

**How many users do you expect?**

Initial deployment: 25-50 users (Urban Swing New Zealand dance community)  
Potential growth: Up to 100-200 users (other West Coast Swing communities)

This is a community-focused tool, not a commercial product.

---

**What data do you collect/store?**

We do NOT collect or store any user data or audio features on servers. All data:
- Stays in the user's browser (localStorage)
- Is only used for real-time display
- Is never transmitted to third parties
- Is deleted when the user disconnects

We only request tempo (BPM) information to display in the user interface.

---

**Commercial use?**

No. This is a free community tool with no monetization, no data collection, and no commercial purpose.

---

## Additional Notes

This app has been developed following Spotify's best practices:
- Uses PKCE for secure authentication
- Respects rate limits
- Handles errors gracefully
- Only requests necessary scopes
- Provides clear privacy information to users

The Audio Features API is used solely to enhance the user experience for music organization, aligned with Spotify's goal of helping users discover and enjoy music.

---

## Supporting Links

**App URL (when deployed):** https://urbanswing.nz/playlist-manager/  
**Developer Contact:** [Your email]  
**Community Website:** https://urbanswing.nz

---

## Tips for Your Application

1. **Be honest and specific** - Spotify wants to know the genuine use case
2. **Emphasize the music discovery/organization angle** - This aligns with their mission
3. **Mention the small user base** - Shows you're not building a data scraper
4. **Highlight that you're not storing data** - Important for privacy concerns
5. **Be patient** - Reviews can take 1-2 weeks

## What to Expect

✅ **If approved:** You'll get an email confirmation and your existing code will work immediately  
❌ **If denied:** They'll provide a reason and you can either:
   - Appeal with more information
   - Implement manual BPM entry as an alternative
   - Use a third-party BPM API service

---

Good luck! Your use case is legitimate and should qualify for approval.
