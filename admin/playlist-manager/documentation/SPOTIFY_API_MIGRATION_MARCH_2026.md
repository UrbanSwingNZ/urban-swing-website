# Spotify API Migration - March 2026 Changes

## Impact Assessment: YES, Changes Required ⚠️

The February 2026 Spotify API changes **will impact** the Urban Swing Playlist Manager starting **March 9, 2026**.

---

## Critical Changes Affecting This App

### 1. Endpoint Migrations (REQUIRED)

The following endpoints used by the Playlist Manager are being **removed** and must be replaced:

#### ❌ Deprecated → ✅ New Endpoint

| Current (Deprecated) | New Endpoint | Used In |
|---------------------|--------------|---------|
| `POST /users/{id}/playlists` | `POST /me/playlists` | [spotify-api.js](../spotify-api.js#L234) |
| `GET /playlists/{id}/tracks` | `GET /playlists/{id}/items` | [spotify-api.js](../spotify-api.js#L259) |
| `POST /playlists/{id}/tracks` | `POST /playlists/{id}/items` | [spotify-api.js](../spotify-api.js#L364) |
| `DELETE /playlists/{id}/tracks` | `DELETE /playlists/{id}/items` | [spotify-api.js](../spotify-api.js#L373) |
| `PUT /playlists/{id}/tracks` | `PUT /playlists/{id}/items` | [spotify-api.js](../spotify-api.js#L356) |
| `DELETE /playlists/{id}/followers` | `DELETE /me/library` | [spotify-api.js](../spotify-api.js#L461) |

### 2. Field Name Changes

**Playlist Object:**
- `tracks` → renamed to `items`
- `tracks.tracks` → `items.items`
- `tracks.tracks.track` → `items.items.item`

**User Object (Removed Fields):**
- `email` - No longer available
- `country` - No longer available
- `product` - No longer available (can't check if user has Premium)

### 3. Search Limit Changes

**Search endpoint (`GET /search`):**
- Old: `limit` max = 50, default = 20
- New: `limit` max = 10, default = 5

Current code uses `limit=20` in [spotify-api.js](../spotify-api.js#L429), which will need adjustment.

---

## Development Mode Restrictions

Starting **March 9, 2026**, all Development Mode apps will have these restrictions:

### New Requirements:
1. **Spotify Premium Required** - The main account holder (developer) must have Spotify Premium
2. **One Client ID per Developer** - Limited to 1 Development Mode app
3. **Max 5 Authorized Users** - Only 5 people can use the app
4. **Restricted Endpoints** - Limited to specific endpoints (but most playlist endpoints are still available)

### ✅ GOOD NEWS: Extended Quota Mode Apps Are Exempt

From the email:
> **Note:** *These changes do not affect apps already operating in Extended Quota Mode.*

**If your app is already approved for Extended Quota Mode, you're exempt from these restrictions.**

However, you **still need to update the deprecated endpoints** - those changes apply to all apps.

---

## Migration Checklist

### Before March 9, 2026:

- [ ] **Update all deprecated endpoints** to new versions
- [ ] **Update field references** from `tracks` to `items`
- [ ] **Adjust search limit** from 20 to max 10
- [ ] **Test with new endpoints** to ensure functionality
- [ ] **Verify Development Mode vs Extended Quota Mode status**

### Check Your App Status:

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Check if it says:
   - "Development Mode" → You'll need Premium + limited to 5 users
   - "Extended Quota Mode" → You're exempt from restrictions (but still need endpoint updates)

---

## Migration Priority: HIGH

**Deadline:** March 9, 2026

**Risk Level:** 🔴 **High** - App will break if not updated

**Estimated Work:** 2-3 hours for code updates + testing

---

## Code Changes Required

### Files to Update:

1. **[spotify-api.js](../spotify-api.js)** - All endpoint URLs
2. **[playlist-display.js](../playlists/playlist-display.js)** - Check for `tracks` vs `items` references
3. **[cloudflare-worker/worker.js](../../../cloudflare-worker/worker.js)** - If it stores user data

### Testing Checklist:

- [ ] Create new playlist
- [ ] Get playlist tracks/items
- [ ] Add tracks/items to playlist
- [ ] Remove tracks/items from playlist
- [ ] Reorder tracks/items in playlist
- [ ] Delete (unfollow) playlist
- [ ] Search for tracks
- [ ] Full workflow test

---

## References

- [February 2026 Changes](https://developer.spotify.com/documentation/web-api/references/changes/february-2026)
- [Migration Guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)
- [Developer Blog Announcement](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security)

---

## Next Steps

1. **Determine your app's quota mode status** (Development vs Extended)
2. **Schedule migration work** (before March 9, 2026)
3. **Update code** following this document
4. **Test thoroughly** with all playlist operations
5. **Monitor for any API errors** after March 9

---

*Last Updated: February 27, 2026*
