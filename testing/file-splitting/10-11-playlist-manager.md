# Testing Document: Files #10-11 - Playlist Manager
**Files:** track-operations.js → 9 modules | playlist-operations.js → 5 modules  
**Original Size:** 1,343 lines + 752 lines = 2,095 lines  
**Coordinator Size:** 81 lines + 60 lines = 141 lines  
**Reduction:** 93% overall  
**Test Date:** _Pending_  
**Tester:** _Pending_

---

## File Breakdown

### File #10: track-operations.js (1,343 → 81 lines)
**Modules Created (9):**
1. `tracks/track-loader.js` (184 lines) - Load tracks, audio features, BPM data
2. `tracks/track-renderer.js` (267 lines) - Progressive rendering, display
3. `tracks/track-search.js` (32 lines) - Filter tracks by search
4. `tracks/track-utils.js` (20 lines) - Duration formatting
5. `tracks/track-drag-drop.js` (135 lines) - Sortable.js reordering
6. `tracks/track-mobile.js` (217 lines) - Swipe and long-press gestures
7. `tracks/track-actions.js` (213 lines) - Menu, copy/move/delete
8. `tracks/track-add-modal.js` (260 lines) - Search and add tracks
9. `tracks/track-audio.js` (188 lines) - Playback and preview

### File #11: playlist-operations.js (752 → 60 lines)
**Modules Created (5):**
1. `playlists/playlist-display.js` (240 lines) - Load, display, drag-drop
2. `playlists/playlist-search.js` (24 lines) - Filter playlists
3. `playlists/playlist-selection.js` (68 lines) - Select, load tracks
4. `playlists/playlist-crud.js` (320 lines) - Create, delete, rename, remove
5. `playlists/playlist-ui-handlers.js` (158 lines) - Menus and actions

---

## Test Scenarios

### 1. Initial Load & Authentication
**Flow:** User opens playlist manager for the first time

- [✅] **1.1** Page loads without errors
- [✅] **1.2** Spotify connect prompt displays
- [✅] **1.3** Click "Connect to Spotify" opens OAuth flow
- [✅] **1.4** After authentication, user is redirected back
- [✅] **1.5** Playlists load automatically after connection
- [✅] **1.6** Empty state shows "Select a playlist" message
- [✅] **1.7** Loading spinner displays during playlist load
- [✅] **1.8** No console errors during load

**Modules Tested:** playlist-display.js, playlist-auth.js

---

### 2. Browse & Search Playlists
**Flow:** User browses their playlist library

- [✅] **2.1** All playlists display in sidebar with album art
- [✅] **2.2** Track counts show correctly for each playlist
- [✅] **2.3** Playlists display default image if no album art
- [✅] **2.4** Search playlists by typing in search box
- [✅] **2.5** Filtered results update in real-time
- [✅] **2.6** Clear search shows all playlists again
- [✅] **2.7** Empty search results show appropriate message
- [✅] **2.8** Drag handle displays for each playlist

**Modules Tested:** playlist-display.js, playlist-search.js

---

### 3. Select Playlist
**Flow:** User clicks a playlist to view its tracks

- [✅] **3.1** Click playlist in sidebar selects it
- [✅] **3.2** Selected playlist highlights with active state
- [✅] **3.3** Playlist name displays in header
- [✅] **3.4** Playlist description displays (or "No description")
- [✅] **3.5** Playlist image displays in header
- [✅] **3.6** Track count displays correctly
- [✅] **3.7** Tracks load automatically after selection
- [✅] **3.8** Empty state hides, playlist view shows
- [✅] **3.9** Selection persists after page refresh
- [✅] **3.10** Mobile: Sidebar closes after selection

**Modules Tested:** playlist-selection.js, track-loader.js

---

### 4. View & Search Tracks
**Flow:** User views and searches within playlist tracks

- [✅] **4.1** First 50 tracks render immediately (progressive rendering)
- [✅] **4.2** Scroll down loads more tracks (lazy loading)
- [✅] **4.3** Loading indicator shows while loading batches
- [✅] **4.4** All track info displays: number, name, artist, album, duration
- [✅] **4.5** Album art thumbnails display correctly
- [✅] **4.6** Explicit badges show for explicit tracks
- [✅] **4.7** BPM column shows "Loading..." initially (if enabled)
- [✅] **4.8** Search tracks by name updates results
- [✅] **4.9** Search tracks by artist updates results
- [✅] **4.10** Clear search restores all tracks
- [✅] **4.11** Search resets progressive rendering to first 50
- [✅] **4.12** Empty search results show appropriate message
- [✅] **4.13** Large playlists (500+ tracks) load without freezing

**Modules Tested:** track-loader.js, track-renderer.js, track-search.js

---

### 5. Reorder Tracks (Drag & Drop)
**Flow:** User reorders tracks within a playlist

- [✅] **5.1** Drag handle appears on hover (desktop)
- [✅] **5.2** Click and drag track to new position
- [✅] **5.3** Track moves visually during drag
- [✅] **5.4** Drop track updates position
- [✅] **5.5** Track numbers update after reorder
- [🟡] **5.6** "Save Order" button appears after changes
- [🟡] **5.7** Click "Save Order" saves to Spotify
- [🟡] **5.8** Success message shows after save
- [✅] **5.9** Button shows loading state during save
- [✅] **5.10** Saved order persists after page refresh
- [🟡] **5.11** Drag works with touch on tablet
- [✅] **5.12** Multiple reorders work correctly
- [🟡] **5.13** Large playlists chunk saves (100 tracks per request)

**Modules Tested:** track-drag-drop.js

---

### 6. Track Menu & Actions (Desktop)
**Flow:** User performs actions on tracks using menu

- [✅] **6.1** Click menu button (⋮) opens dropdown menu
- [✅] **6.2** Click outside menu closes it
- [✅] **6.3** Menu shows "Copy to Playlist" option
- [✅] **6.4** Menu shows "Move to Playlist" (if owned)
- [✅] **6.5** Menu shows "Delete from Playlist" option
- [✅] **6.6** Click "Copy" opens destination modal
- [✅] **6.7** Destination modal lists all playlists except current
- [✅] **6.8** Select destination and confirm copies track
- [✅] **6.9** Success message shows after copy
- [✅] **6.10** Click "Move" opens destination modal
- [✅] **6.11** Move transfers track and removes from current
- [✅] **6.12** Track count updates after move
- [✅] **6.13** Click "Delete" removes track from playlist
- [🟡] **6.14** Confirmation required for delete
- [✅] **6.15** Track disappears immediately after delete
- [✅] **6.16** Track count decreases after delete
- [🔴] **6.17** Duplicate track error shows helpful message
- [✅] **6.18** Close destination modal without action cancels

**Modules Tested:** track-actions.js, playlist-display.js (track count update)

---

### 7. Mobile Track Interactions
**Flow:** User interacts with tracks on mobile/tablet

- [ ] **7.1** Tap track row to play/pause (if applicable)
- [ ] **7.2** Swipe left on track shows delete icon
- [ ] **7.3** Swipe left >100px triggers delete
- [ ] **7.4** Visual feedback during swipe (transform, background)
- [ ] **7.5** Swipe right returns track to original position
- [ ] **7.6** Vertical scrolling doesn't trigger swipe
- [ ] **7.7** Long-press track (500ms) opens mobile menu
- [ ] **7.8** Mobile menu shows as bottom sheet overlay
- [ ] **7.9** Menu shows track name at top
- [ ] **7.10** Menu shows "Copy to Playlist"
- [ ] **7.11** Menu shows "Move to Playlist" (if owned)
- [ ] **7.12** Menu shows "Delete from Playlist"
- [ ] **7.13** Menu shows "Cancel" button
- [ ] **7.14** Tap overlay closes menu
- [ ] **7.15** Cancel button closes menu
- [ ] **7.16** Menu actions work same as desktop
- [ ] **7.17** Touch gestures don't conflict with scrolling

**Modules Tested:** track-mobile.js, track-actions.js

---

### 8. Add Tracks Modal
**Flow:** User searches and adds tracks to playlist

- [ ] **8.1** Click "Add Tracks" button opens modal
- [ ] **8.2** Modal displays with search box focused
- [ ] **8.3** Type search query (debounced 300ms)
- [ ] **8.4** Search results display with album art
- [ ] **8.5** Results show track name, artist, duration
- [ ] **8.6** Each result has checkbox for selection
- [ ] **8.7** Each result has play button
- [ ] **8.8** Click row toggles checkbox
- [ ] **8.9** Click checkbox toggles selection
- [ ] **8.10** Selected tracks move to top of results
- [ ] **8.11** "Add Tracks" button updates with count (e.g., "Add 3 Tracks")
- [ ] **8.12** Play button previews track (30-second sample)
- [ ] **8.13** Stop current audio before playing new
- [ ] **8.14** Click "Add Tracks" adds selected tracks
- [ ] **8.15** Success message shows after adding
- [ ] **8.16** Track list refreshes with new tracks
- [ ] **8.17** Track count increases by number added
- [ ] **8.18** Modal closes after adding
- [ ] **8.19** Close modal (X) cancels without adding
- [ ] **8.20** Modal resets when reopened

**Modules Tested:** track-add-modal.js, track-loader.js (reload), playlist-display.js (track count)

---

### 9. Track Playback (Spotify Web Player)
**Flow:** User plays tracks through Spotify integration

- [ ] **9.1** Click play button on track starts playback
- [ ] **9.2** Play icon changes to pause during playback
- [ ] **9.3** Track number shows playing animation
- [ ] **9.4** Click pause button stops playback
- [ ] **9.5** Playback state persists in localStorage
- [ ] **9.6** Page refresh restores playing state
- [ ] **9.7** Play new track stops previous track
- [ ] **9.8** Only one track plays at a time
- [ ] **9.9** Non-Premium users see 30-second preview
- [ ] **9.10** Preview falls back gracefully if no Web Player
- [ ] **9.11** Error messages for playback issues
- [ ] **9.12** Playback works in add tracks modal
- [ ] **9.13** Stop audio when closing add tracks modal

**Modules Tested:** track-audio.js

---

### 10. Create Playlist
**Flow:** User creates a new playlist

- [ ] **10.1** Click "New Playlist" button opens modal
- [ ] **10.2** Name field is focused automatically
- [ ] **10.3** Description field is optional
- [ ] **10.4** Public checkbox defaults to checked
- [ ] **10.5** Collaborative checkbox is available
- [ ] **10.6** Form validation requires name
- [ ] **10.7** Empty name shows error message
- [ ] **10.8** Click "Create" creates playlist
- [ ] **10.9** Button shows "Creating..." during save
- [ ] **10.10** Success message appears
- [ ] **10.11** Modal closes after creation
- [ ] **10.12** Playlist list refreshes with new playlist
- [ ] **10.13** New playlist appears in sidebar
- [ ] **10.14** New playlist is auto-selected
- [ ] **10.15** Cancel button closes without creating
- [ ] **10.16** Form resets when reopened

**Modules Tested:** playlist-crud.js, playlist-display.js (reload)

---

### 11. Rename Playlist
**Flow:** User renames an existing playlist

- [ ] **11.1** Open playlist menu (⋮ button)
- [ ] **11.2** Menu shows "Rename" option (if owned)
- [ ] **11.3** Click "Rename" opens rename modal
- [ ] **11.4** Current name pre-fills in input
- [ ] **11.5** Text is selected for easy editing
- [ ] **11.6** Input is focused automatically
- [ ] **11.7** Empty name shows error
- [ ] **11.8** Same name closes modal without API call
- [ ] **11.9** Click "Rename" saves new name
- [ ] **11.10** Button shows "Renaming..." during save
- [ ] **11.11** Success message shows new name
- [ ] **11.12** Modal closes after rename
- [ ] **11.13** Playlist list refreshes with new name
- [ ] **11.14** Sidebar shows updated name
- [ ] **11.15** Header shows updated name (if selected)
- [ ] **11.16** Cancel button closes without renaming

**Modules Tested:** playlist-crud.js, playlist-display.js (reload), playlist-ui-handlers.js

---

### 12. Delete Playlist
**Flow:** User deletes a playlist they own

- [ ] **12.1** Open playlist menu (⋮ button)
- [ ] **12.2** Menu shows "Delete" option (if owned)
- [ ] **12.3** Click "Delete" opens confirmation modal
- [ ] **12.4** Confirmation shows playlist name
- [ ] **12.5** Warning states action cannot be undone
- [ ] **12.6** Cancel button closes without deleting
- [ ] **12.7** Click "Delete Playlist" proceeds
- [ ] **12.8** Delete button shows loading state
- [ ] **12.9** Success message shows after deletion
- [ ] **12.10** Deleted playlist removes from sidebar
- [ ] **12.11** If selected, view clears to empty state
- [ ] **12.12** Track list clears
- [ ] **12.13** Playlist list refreshes
- [ ] **12.14** Can't delete playlists not owned

**Modules Tested:** playlist-crud.js, playlist-display.js (reload), playlist-ui-handlers.js

---

### 13. Remove Playlist from Library
**Flow:** User unfollows a playlist they don't own

- [ ] **13.1** Open menu on non-owned playlist
- [ ] **13.2** Menu shows "Remove from Library" (not "Delete")
- [ ] **13.3** Click shows browser confirmation
- [ ] **13.4** Confirmation explains difference from delete
- [ ] **13.5** Cancel closes without removing
- [ ] **13.6** Confirm removes playlist
- [ ] **13.7** Success message shows
- [ ] **13.8** Playlist removes from sidebar
- [ ] **13.9** If selected, view clears
- [ ] **13.10** Playlist list updates

**Modules Tested:** playlist-crud.js, playlist-display.js, playlist-ui-handlers.js

---

### 14. Playlist Menu (Desktop)
**Flow:** Desktop user opens and uses playlist menu

- [ ] **14.1** Click menu button (⋮) on playlist
- [ ] **14.2** Dropdown menu appears below button
- [ ] **14.3** Click menu again toggles it closed
- [ ] **14.4** Click outside menu closes it
- [ ] **14.5** Owned playlist shows: Rename, Delete
- [ ] **14.6** Non-owned playlist shows: Remove from Library
- [ ] **14.7** Menu positioned correctly on screen
- [ ] **14.8** Only one menu open at a time
- [ ] **14.9** Menu actions work correctly

**Modules Tested:** playlist-ui-handlers.js

---

### 15. Playlist Menu (Mobile)
**Flow:** Mobile user opens and uses playlist menu

- [ ] **15.1** Long-press playlist (500ms) opens menu
- [ ] **15.2** Menu appears as bottom sheet overlay
- [ ] **15.3** Playlist name shows at top of menu
- [ ] **15.4** Owned playlist shows: Rename, Delete, Cancel
- [ ] **15.5** Non-owned shows: Remove from Library, Cancel
- [ ] **15.6** Tap overlay closes menu
- [ ] **15.7** Cancel button closes menu
- [ ] **15.8** Touch move cancels long-press
- [ ] **15.9** Menu button (⋮) still works on mobile
- [ ] **15.10** Actions work same as desktop

**Modules Tested:** playlist-ui-handlers.js, playlist-display.js (touch handlers)

---

### 16. Playlist Drag & Drop
**Flow:** User reorders playlists in sidebar

- [ ] **16.1** Drag handle visible on each playlist
- [ ] **16.2** Click and drag playlist to new position
- [ ] **16.3** Visual feedback during drag
- [ ] **16.4** Playlist moves to new position on drop
- [ ] **16.5** Order updates in sidebar
- [ ] **16.6** Note: Spotify doesn't support saving playlist order (visual only)
- [ ] **16.7** Touch drag works on mobile/tablet

**Modules Tested:** playlist-display.js

---

### 17. Mobile Responsiveness
**Flow:** User accesses playlist manager on mobile

- [ ] **17.1** Sidebar hidden by default on mobile
- [ ] **17.2** Hamburger menu opens sidebar
- [ ] **17.3** Overlay appears behind open sidebar
- [ ] **17.4** Tap overlay closes sidebar
- [ ] **17.5** Mobile playlist selector button shows current playlist
- [ ] **17.6** Click selector opens playlist list modal
- [ ] **17.7** Select playlist from mobile modal works
- [ ] **17.8** Sidebar auto-closes after playlist selection
- [ ] **17.9** Track list scrolls smoothly on mobile
- [ ] **17.10** Touch gestures work (swipe, long-press)
- [ ] **17.11** All modals display correctly on mobile
- [ ] **17.12** No horizontal scrolling issues
- [ ] **17.13** Text is readable at mobile size
- [ ] **17.14** Buttons are touch-friendly (min 44px)

**Modules Tested:** All modules, mobile-playlist-selector.js

---

### 18. Error Handling
**Flow:** System handles errors gracefully

- [ ] **18.1** Network error shows user-friendly message
- [ ] **18.2** Expired token shows reconnect prompt
- [ ] **18.3** Failed playlist load shows error
- [ ] **18.4** Failed track load shows error
- [ ] **18.5** API rate limit handled gracefully
- [ ] **18.6** Duplicate track shows helpful message
- [ ] **18.7** Delete error doesn't remove from UI
- [ ] **18.8** Failed save shows error, keeps "Save Order" button
- [ ] **18.9** Playback errors show appropriate messages
- [ ] **18.10** Loading spinners stop on error
- [ ] **18.11** Console errors are meaningful
- [ ] **18.12** User can recover from errors without refresh

**Modules Tested:** All modules

---

### 19. State Persistence
**Flow:** User state persists across sessions

- [ ] **19.1** Selected playlist persists on refresh
- [ ] **19.2** Playback state persists on refresh
- [ ] **19.3** Playing track restores UI state
- [ ] **19.4** localStorage keys are correct
- [ ] **19.5** Invalid stored data doesn't break app
- [ ] **19.6** Logout clears relevant state
- [ ] **19.7** Reconnect restores last playlist

**Modules Tested:** playlist-selection.js, track-audio.js

---

### 20. Performance
**Flow:** System performs efficiently with large data

- [ ] **20.1** Large playlist (500+ tracks) loads quickly
- [ ] **20.2** Progressive rendering prevents UI freeze
- [ ] **20.3** Lazy loading works on scroll
- [ ] **20.4** BPM loading disabled by default (performance)
- [ ] **20.5** Drag operations are smooth
- [ ] **20.6** Search is fast and responsive
- [ ] **20.7** No memory leaks during extended use
- [ ] **20.8** Event listeners cleaned up properly
- [ ] **20.9** Sortable instances destroyed/recreated correctly
- [ ] **20.10** Audio cleanup on page unload

**Modules Tested:** All modules, especially track-loader.js, track-renderer.js

---

## Summary

**Total Test Cases:** 235+

**Critical Paths:**
1. ✅ Load playlists → Select playlist → View tracks
2. ✅ Search tracks → Reorder → Save
3. ✅ Track menu → Copy/Move/Delete
4. ✅ Add tracks → Search → Select → Add
5. ✅ Create playlist → Rename → Delete
6. ✅ Mobile gestures → Swipe → Long-press

**Test Result:** _Pending_

**Issues Found:** _None yet_

**Sign-off:** ___________________  **Date:** ___________

---

## Notes

- Test with both owned and non-owned playlists for permission differences
- Test with Spotify Premium and Free accounts (playback differences)
- Test on desktop (Chrome, Firefox, Safari) and mobile (iOS Safari, Chrome)
- Test with small playlists (10 tracks) and large (500+ tracks)
- Test with empty playlists
- Test network throttling for loading states
- Test with BPM loading both enabled and disabled
- Verify console is clean (no errors/warnings) throughout testing
