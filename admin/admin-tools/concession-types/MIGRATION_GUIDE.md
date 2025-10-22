# Migration Guide - Reverting to Monolithic Version

If you need to revert to the original single-file version, follow these steps:

## To Revert (Use Original File)

1. **Update concession-types.html**
   
   Replace these lines:
   ```html
   <!-- Refactored Modular Scripts -->
   <script src="concession-types/utils.js"></script>
   <script src="concession-types/drag-drop.js"></script>
   <script src="concession-types/status-toggle.js"></script>
   <script src="concession-types/package-display.js"></script>
   <script src="concession-types/modal-handlers.js"></script>
   <script src="concession-types/auth.js"></script>
   ```
   
   With this:
   ```html
   <script src="concession-types.js"></script>
   ```

2. **Done!** The original file still exists and will work exactly as before.

## To Use Modular Version (Current)

The HTML is already configured. No changes needed.

## Troubleshooting

### Scripts Not Loading
- Check browser console for 404 errors
- Verify all 6 module files exist in `concession-types/` folder
- Ensure load order is correct (utils → drag-drop → status-toggle → package-display → modal-handlers → auth)

### Function Not Defined Errors
- Ensure `utils.js` loads first (contains shared functions)
- Check that all modules are loading before auth.js runs

### Features Not Working
- Verify `concessions-admin.js` is loaded before modular scripts
- Check Firebase config is loaded first
- Look for JavaScript errors in browser console

## File Locations

```
admin-tools/
├── concession-types.html           ← HTML file
├── concession-types.js            ← Original (deprecated but functional)
└── concession-types/              ← New modular files
    ├── auth.js
    ├── drag-drop.js
    ├── modal-handlers.js
    ├── package-display.js
    ├── status-toggle.js
    └── utils.js
```

## What Changed

- **HTML**: Script tags updated to load 6 modules instead of 1 file
- **Functionality**: None - everything works identically
- **Database**: No changes
- **CSS**: No changes
- **Dependencies**: No new dependencies added

## Benefits of Modular Version

✅ Smaller, more focused files
✅ Easier to debug specific features
✅ Better separation of concerns
✅ More maintainable long-term
✅ Easier for multiple developers to work on
✅ Clearer code organization

## Drawbacks of Modular Version

⚠️ More files to manage
⚠️ Load order matters
⚠️ Slightly more HTTP requests (negligible with HTTP/2)

## Recommendation

**Keep the modular version** for better long-term maintainability, especially if:
- Multiple developers work on this code
- You expect to add more features
- You want to add automated testing
- You value code organization and clarity

**Revert to monolithic** only if:
- You need to quickly debug and the modular structure is unfamiliar
- You want to minimize file count
- You're more comfortable with a single file

## Testing After Changes

After switching versions, test these features:
1. ✓ Login and authentication
2. ✓ Load and display packages
3. ✓ Add new package
4. ✓ Edit existing package  
5. ✓ Delete package
6. ✓ Drag and drop to reorder
7. ✓ Toggle active/inactive status
8. ✓ Auto-logout after 30 min inactivity
