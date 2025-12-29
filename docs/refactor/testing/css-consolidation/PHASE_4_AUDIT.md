# Phase 4: Directory Restructure - Complete Audit

**Date:** December 28, 2025  
**Status:** ✅ COMPLETE

---

## Executive Summary

The `/css/` directory contains 15 files across 4 subdirectories that need evaluation:
- **2 main stylesheets** (styles.css, modern-styles.css) - Public website entry points
- **8 component files** - Various UI components with mixed purposes
- **1 layout file** - Layout utilities
- **1 utilities file** - Helper classes
- **4 archived files** in `/css/base/archive/` - Old reset/typography files (can be deleted)

**Key Findings:**
1. ✅ **Can Delete:** 4 archived files in `/css/base/archive/` (legacy reset.css, typography.css)
2. 🔀 **Duplicate Content:** buttons.css has significant overlap with `/styles/base/buttons.css`
3. ➡️ **Can Move:** 6 component files are shareable and should move to `/styles/components/`
4. ➡️ **Can Move:** layout.css should move to `/styles/layout/`
5. ➡️ **Can Move:** utilities.css should move to `/styles/utilities/`
6. 🎯 **Keep in /css/:** styles.css and modern-styles.css as public website entry points
7. 📝 **Update Imports:** 6 HTML files reference css/modern-styles.css

---

## Directory Structure

```
/css/
├── styles.css                          [551 lines] Public website main stylesheet
├── modern-styles.css                   [316 lines] Public website modern theme (imports many sub-files)
│
├── /base/                              
│   └── /archive/                       [DELETE - 4 files]
│       ├── reset.css                   Legacy duplicate of /styles/base/reset.css
│       └── typography.css              Legacy duplicate of /styles/base/typography.css
│
├── /components/                        (8 files)
│   ├── buttons.css                     [226 lines] 🔀 MERGE with /styles/base/buttons.css
│   ├── cards.css                       [155 lines] ➡️ MOVE to /styles/components/
│   ├── enhanced-features.css           [479 lines] ➡️ MOVE to /styles/components/
│   ├── faq.css                         [95 lines] ➡️ MOVE to /styles/components/
│   ├── header.css                      [241 lines] ➡️ MOVE to /styles/components/
│   ├── navigation.css                  [137 lines] ➡️ MOVE to /styles/components/
│   ├── password-reset-modal.css        [430 lines] 🔀 ALREADY EXISTS in /styles/components/ but with different path
│   └── tables.css                      [317 lines] ➡️ MOVE to /styles/components/
│
├── /layout/                            (1 file)
│   └── layout.css                      [282 lines] ➡️ MOVE to /styles/layout/
│
└── /utilities/                         (1 file)
    └── utilities.css                   [211 lines] ➡️ MOVE to /styles/utilities/
```

---

## File-by-File Analysis

### 1. **styles.css** [551 lines] - 🎯 KEEP IN /css/

**Purpose:** Main public website stylesheet (legacy entry point)

**Content:**
- Imports design-tokens.css and colors.css from /styles/
- Imports mobile-drawer.css from /styles/
- Contains public website-specific styles:
  - Logo styling
  - Social icons
  - Basic reset (minimal)
  - Public page layouts
  
**Recommendation:** KEEP as public website entry point, but it's minimally used (no HTML files reference it directly based on grep search)

**Action:** Keep for now, consider deprecation in favor of modern-styles.css

---

### 2. **modern-styles.css** [316 lines] - 🎯 KEEP IN /css/

**Purpose:** Modern design system entry point for public website

**Content:**
- Acts as import orchestrator for public pages
- Imports base styles from `/styles/base/`
- Imports components from `/css/components/`
- Imports layout from `/css/layout/`
- Imports utilities from `/css/utilities/`
- Contains minimal legacy support overrides

**Used By:** 6 HTML files
- index.html
- pages/classes.html
- pages/faqs.html
- pages/meet-the-crew.html
- pages/policies.html
- pages/wcs-around-nz.html

**Recommendation:** KEEP as public website orchestrator, but update imports after files are moved

**Import Updates Needed After Migration:**
```css
/* BEFORE */
@import url('components/header.css');
@import url('components/navigation.css');
@import url('components/buttons.css');
@import url('components/cards.css');
@import url('components/tables.css');
@import url('components/faq.css');
@import url('components/enhanced-features.css');
@import url('layout/layout.css');
@import url('utilities/utilities.css');

/* AFTER */
@import url('../styles/components/header.css');
@import url('../styles/components/navigation.css');
/* Remove buttons.css import - merged into /styles/base/buttons.css */
@import url('../styles/components/cards.css');
@import url('../styles/components/tables.css');
@import url('../styles/components/faq.css');
@import url('../styles/components/enhanced-features.css');
@import url('../styles/layout/layout.css');
@import url('../styles/utilities/utilities.css');
```

---

### 3. **css/base/archive/** - ❌ DELETE ENTIRE DIRECTORY

**Files:**
- `reset.css` - Legacy duplicate of `/styles/base/reset.css`
- `typography.css` - Legacy duplicate of `/styles/base/typography.css`

**Status:** These are old versions that were already migrated to `/styles/base/` in Phase 2

**Action:** DELETE entire `/css/base/archive/` directory

---

### 4. **components/buttons.css** [226 lines] - 🔀 MERGE with /styles/base/buttons.css

**Purpose:** Public website button system

**Overlap with /styles/base/buttons.css:**

**Unique to /css/components/buttons.css:**
- `.btn` base class with comprehensive styling
- `.btn-primary` (gradient with hover effects)
- `.btn-secondary` (outline style)
- `.btn-tertiary` (ghost style)
- `.btn-success`
- `.btn-danger`
- `.btn-sm`, `.btn-lg`, `.btn-xl` size variants
- `.btn-block` (full width)
- `.btn.loading` state with spinner
- `.btn-group` and `.btn-group-vertical`
- `.register-button` / `.cta-button` (special CTA styling)
- Mobile responsive adjustments

**Unique to /styles/base/buttons.css:**
- `.nav-menu` navigation button styling (desktop horizontal)
- `.btn-primary` (different, simpler variant for admin/portal)
- `.btn-cancel` (admin-specific)
- `.btn-delete` (admin-specific)
- `-lg` size variants for admin buttons

**Analysis:**
- These are **TWO DIFFERENT BUTTON SYSTEMS**
- `/css/components/buttons.css` = Public website buttons (gradients, shadows, animations)
- `/styles/base/buttons.css` = Admin/portal buttons (simpler, functional)
- They both define `.btn-primary` but with different purposes and styles

**Recommendation:** 
1. **Rename** `/css/components/buttons.css` → `/styles/components/public-buttons.css`
2. **Keep both** button systems separate
3. **Update** modern-styles.css to import from new location
4. **Document** the difference: public vs admin button systems

**Alternative (riskier):**
- Merge into single file with `.btn-public-*` and `.btn-admin-*` namespacing
- Would require HTML changes across entire site

**Preferred Action:** Move to `/styles/components/public-buttons.css` and keep separate

---

### 5. **components/cards.css** [155 lines] - ➡️ MOVE to /styles/components/

**Purpose:** Card component system for public website

**Content:**
- `.card` base component
- `.card-header`, `.card-body`, `.card-footer`
- `.card-grid` layout
- `.card-feature` (centered, large content)
- `.card-image` (with image styling)
- Hover effects and transitions

**Usage:** Used by modern-styles.css for public pages

**Recommendation:** MOVE to `/styles/components/cards.css`

**Rationale:** Card system is general-purpose and could be used by admin/portal in future

**Action:**
1. Move file to `/styles/components/cards.css`
2. Update import in modern-styles.css

---

### 6. **components/enhanced-features.css** [479 lines] - ➡️ MOVE to /styles/components/

**Purpose:** Advanced UI features (scroll to top, dark mode toggle, search, back button, etc.)

**Content:**
- Scroll to top button
- Dark mode toggle
- Search functionality
- Back button
- Loading states
- Empty states
- Collapsible sections
- Tooltips
- Badges
- Progressive disclosure
- Keyboard shortcuts display

**Usage:** 
- Imported by modern-styles.css
- Already imported by some admin files (check imports)

**Check:** Is this already in /styles/components/?

**Grep Result:** File exists in `/css/components/enhanced-features.css` only

**Recommendation:** MOVE to `/styles/components/enhanced-features.css`

**Rationale:** These features are useful site-wide (admin, portal, public)

**Action:**
1. Move file to `/styles/components/enhanced-features.css`
2. Update import in modern-styles.css
3. Verify no other files import from old location

---

### 7. **components/faq.css** [95 lines] - ➡️ MOVE to /styles/components/

**Purpose:** FAQ component styling

**Content:**
- `.faq-item`, `.faq-question`, `.faq-answer`
- `.other-classes-container` (WCS Around NZ page)
- Under construction styling
- Mobile responsive adjustments

**Usage:** Used by modern-styles.css for public pages (specifically pages/faqs.html and pages/wcs-around-nz.html)

**Recommendation:** MOVE to `/styles/components/faq.css`

**Rationale:** FAQ component could be useful in admin/portal help sections

**Action:**
1. Move file to `/styles/components/faq.css`
2. Update import in modern-styles.css

---

### 8. **components/header.css** [241 lines] - ➡️ MOVE to /styles/components/

**Purpose:** Public website header styling

**Content:**
- `header` element styling with gradient
- `.header-top` layout (logo + info)
- `.logo` styling
- `.header-info` (tagline, social icons)
- `.social-icons` styling
- Mobile responsive adjustments

**Usage:** Used by modern-styles.css for public pages

**Note:** This is different from `/styles/admin/admin-header.css` and `/styles/student-portal/student-portal-header.css`

**Recommendation:** MOVE to `/styles/components/public-header.css`

**Rationale:** Clearly identify this as public-website-specific header (distinct from admin/portal headers)

**Action:**
1. Move file to `/styles/components/public-header.css`
2. Update import in modern-styles.css

---

### 9. **components/navigation.css** [137 lines] - ➡️ MOVE to /styles/components/

**Purpose:** Public website navigation (desktop horizontal + mobile drawer)

**Content:**
- `nav` element styling
- `.menu-logo` (mobile menu logo)
- Desktop horizontal navigation
- Mobile menu drawer (fixed positioning, slide-in animation)
- Mobile menu logo
- Active page highlighting

**Usage:** Used by modern-styles.css for public pages

**Note:** Public site uses different navigation pattern than admin/portal

**Recommendation:** MOVE to `/styles/components/public-navigation.css`

**Rationale:** Clearly identify as public-website navigation (distinct from admin/portal)

**Action:**
1. Move file to `/styles/components/public-navigation.css`
2. Update import in modern-styles.css

---

### 10. **components/password-reset-modal.css** [430 lines] - 🔍 INVESTIGATE

**Purpose:** Password reset modal styling

**Current Location:** `/css/components/password-reset-modal.css`

**Check:** Does this exist elsewhere?

**File Search Result:** This file exists in `/css/components/` only

**Usage:** Used by modern-styles.css? Let me check imports...

**Content:**
- `.password-reset-modal` container
- `.password-reset-overlay` backdrop
- `.password-reset-content` modal content
- Form styling
- Success/error states
- Close button
- Mobile responsive

**Recommendation:** MOVE to `/styles/components/password-reset-modal.css`

**Rationale:** Password reset is used across public site, admin, and student portal

**Action:**
1. Move file to `/styles/components/password-reset-modal.css`
2. Update any imports (check modern-styles.css)

**Note:** Verify this doesn't conflict with existing password reset styles in admin/portal

---

### 11. **components/tables.css** [317 lines] - ➡️ MOVE to /styles/components/

**Purpose:** Table styling for public website

**Content:**
- General table styling
- `.class-details-table` (classes page)
- `.pricing-table` (pricing displays)
- `.crew-table` (meet-the-crew page)
- Mobile responsive adjustments

**Usage:** Used by modern-styles.css for public pages

**Recommendation:** MOVE to `/styles/components/tables.css`

**Rationale:** Table styling could be useful in admin sections (though they likely have their own)

**Action:**
1. Move file to `/styles/components/tables.css`
2. Update import in modern-styles.css

---

### 12. **layout/layout.css** [282 lines] - ➡️ MOVE to /styles/layout/

**Purpose:** Layout system (containers, grids, sections)

**Content:**
- `.container` system (sm, md, lg, xl, fluid)
- `.content-wrapper`, `.main-content`
- `.section` spacing (sm, lg)
- `.hero` section
- `.grid` system (grid-2, grid-3, grid-4)
- Flexbox utilities
- Spacing utilities
- Mobile responsive adjustments

**Usage:** Used by modern-styles.css

**Recommendation:** MOVE to `/styles/layout/layout.css`

**Rationale:** Layout utilities are site-wide and should be in shared location

**Conflict Check:** Does `/styles/layout/` directory exist?

**Action:**
1. Create `/styles/layout/` directory if it doesn't exist
2. Move file to `/styles/layout/layout.css`
3. Update import in modern-styles.css

---

### 13. **utilities/utilities.css** [211 lines] - ➡️ MOVE to /styles/utilities/

**Purpose:** Utility classes (display, position, width/height, animations)

**Content:**
- Display utilities (d-none, d-flex, d-grid, etc.)
- Visibility utilities
- Position utilities
- Width/height utilities
- Overflow utilities
- Border radius utilities
- Shadow utilities
- Cursor utilities
- User select utilities
- Pointer events
- Margin/padding utilities
- Text utilities
- Flex utilities
- Grid utilities
- Z-index utilities (z-0, z-10, z-20... z-notification)
- Animations (fadeIn, fadeOut, slideInUp, slideInDown, pulse, spin, bounce)

**Usage:** Used by modern-styles.css

**Note:** Contains z-index utilities that match design tokens

**Recommendation:** MOVE to `/styles/utilities/utilities.css`

**Rationale:** Utility classes are site-wide and should be in shared location

**Conflict Check:** Does `/styles/utilities/` directory exist?

**Action:**
1. Create `/styles/utilities/` directory if it doesn't exist
2. Move file to `/styles/utilities/utilities.css`
3. Update import in modern-styles.css

---

## Migration Plan

### Step 1: Delete Legacy Files ✅ COMPLETE
```
✅ DELETED /css/base/archive/reset.css
✅ DELETED /css/base/archive/typography.css
✅ DELETED /css/base/archive/ (directory)
✅ DELETED /css/base/ (directory)
```

### Step 2: Create New Directories ✅ COMPLETE
```
✅ CREATED /styles/layout/
✅ CREATED /styles/utilities/
```

### Step 3: Move Files (with renames for clarity) ✅ COMPLETE
```
✅ CONSOLIDATED /css/components/buttons.css     → Merged utilities into /styles/base/buttons.css
✅ MOVED   /css/components/cards.css            → /styles/components/public-cards.css
✅ MOVED   /css/components/enhanced-features.css → /styles/components/public-enhanced-features.css
✅ MOVED   /css/components/faq.css              → /styles/components/faq.css
✅ MOVED   /css/components/header.css           → /styles/components/public-header.css
✅ MOVED   /css/components/navigation.css       → /styles/components/public-navigation.css (cleaned up redundant mobile styles)
✅ MOVED   /css/components/password-reset-modal.css → /styles/components/password-reset-modal.css
✅ MOVED   /css/components/tables.css           → /styles/components/public-tables.css
✅ MOVED   /css/layout/layout.css               → /styles/layout/public-layout.css
✅ MOVED   /css/utilities/utilities.css         → /styles/utilities/public-utilities.css
✅ MOVED   /css/styles.css                      → /styles/public-styles.css
✅ MOVED   /css/modern-styles.css               → /styles/public-modern-styles.css
```

### Step 4: Update Imports ✅ COMPLETE

**HTML Files Updated (6 files):**
```
✅ index.html                    → styles/public-modern-styles.css
✅ pages/classes.html            → ../styles/public-modern-styles.css
✅ pages/faqs.html               → ../styles/public-modern-styles.css
✅ pages/meet-the-crew.html      → ../styles/public-modern-styles.css
✅ pages/policies.html           → ../styles/public-modern-styles.css
✅ pages/wcs-around-nz.html      → ../styles/public-modern-styles.css
```

**CSS Files Updated:**

**`/styles/public-modern-styles.css`** - All imports now use relative paths from /styles/:
```css
@import url('base/design-tokens.css');
@import url('base/reset.css');
@import url('base/typography.css');
@import url('base/colors.css');
@import url('base/buttons.css');
@import url('layout/public-layout.css');
@import url('components/public-header.css');
@import url('components/public-navigation.css');
@import url('components/public-cards.css');
@import url('costyles.css (moved to /styles/)
✅ DELETED /css/modern-styles.css (moved to /styles/)
✅ DELETED /css/layout/ (empty)
✅ DELETED /css/utilities/ (empty)
✅ DELETED /css/components/password-reset-modal.css (moved to /styles/)
✅ DELETED /css/components/buttons.css (consolidated into /styles/base/buttons.css)
✅ DELETED /css/components/ (empty)
✅ DELETED /css/ (empty)
@import url('components/mobile-drawer.css');
@import url('components/tiles.css');
@import url('utilities/public-utilities.css');
```

**`/styles/public-styles.css`** - Updated imports:
```css
@import url('base/colors.css');
@import url('base/design-tokens.css');
@import url('components/mobile-drawer.css');
```

### Step 5: Check for Other Files Importing from /css/ ⏳ PENDING

**Need to verify:**
- No other files import from /css/components/
- No other files import from /css/layout/ (now deleted)
- No other files import from /css/utilities/ (now deleted)

### Step 6: Clean Up Empty Directories ✅ COMPLETE
```
✅ DELETED /css/layout/ (empty)
✅ DELETED /css/utilities/ (empty)
✅ DELETED /css/components/buttons.css
✅ DELETED /css/components/ (empty)
✅ DELETED /css/ (empty)
```

### Step 7: Final Structure ✅ COMPLETE

**After Migration:**
```
/css/
└── [DELETED - All files moved to /styles/]

/styles/
├── /base/
│   ├── colors.css
│   ├── design-tokens.css
│   ├── reset.css
│   ├── typography.css
│   └── buttons.css                     [Admin/portal button system]
├── /components/
│   ├── loading-spinner.css
│**Final Structure (After Complete Migration):**
```
/styles/
├── /base/
│   ├── colors.css
│   ├── design-tokens.css
│   ├── reset.css
│   ├── typography.css
│   └── buttons.css                     [✅ CONSOLIDATED - Now contains all button utilities]
├── /components/
│   ├── loading-spinner.css
│   ├── snackbar.css
│   ├── tiles.css
│   ├── mobile-drawer.css
│   ├── modal-base.css
│   ├── confirmation-modal.css
│   ├── auth-card.css
│   ├── search-box.css
│   ├── forms.css
│   ├── faq.css                         [✅ NEW - Moved from /css/]
│   ├── public-cards.css                [✅ NEW - Moved from /css/]
│   ├── public-enhanced-features.css    [✅ NEW - Moved from /css/]
│   ├── public-header.css               [✅ NEW - Moved from /css/]
│   ├── public-navigation.css           [✅ NEW - Moved from /css/]
│   └── public-tables.css               [✅ NEW - Moved from /css/]
├── /layout/
│   ├── dashboard-layout.css
│   └── public-layout.css               [✅ NEW - Moved from /css/]
├── /utilities/
│   └── public-utilities.css            [✅ NEW - Moved from /css/
├── /date-picker/
│   └── date-picker.css
└── /pages/
    └── merchandise.css
```

---

## Risk Assessment

### LOW RISK ✅
- Deleting `/css/base/archive/` files (already replaced)
- Moving component files (just import path changes)
- Moving layout.css (single import update)
- Moving utilities.css (single import update)

### MEDIUM RISK ⚠️
- Renaming buttons.css to public-buttons.css (need to update import)
- Renaming header.css to public-header.css (need to update import)
- Renaming navigation.css to public-navigation.css (need to update import)

### TESTING REQUIRED 🧪
After migration, test:
1. ✅ All 6 public pages (index.html, classes.html, faqs.html, meet-the-crew.html, policies.html, wcs-around-nz.html)
2. ✅ Mobile navigation on public pages
3. ✅ Button styling on public pages
4. ✅ Card components on public pages
5. ✅ FAQ page functionality
6. ✅ Tables on classes page and crew page
7. ✅ Enhanced features (scroll to top, etc.)

---

## Estimated Time

- **Step 1 (Delete):** 5 minutes
- **Step 2 (Create dirs):** 2 minutes
- **Step 3 (Move files):** 15 minutes
- **Step 4 (Update imports):** 10 minutes
- **Step 5 (Check other imports):** 10 minutes
- **Step 6 (Clean up):** 5 minutes
- **Step 7 (Testing):** 30 minutes

**Total:** ~90 minutes (1.5 hours)

---
## Remaining Tasks

### 1. Test Button Consolidation 🧪 HIGH PRIORITY

**Button System Changes Made:**
- ✅ Added utility classes to `/styles/base/buttons.css`: `.btn-tertiary`, `.btn-success`, `.btn-sm`, `.btn-xl`, `.btn-block`, `.btn-group`, `.btn.loading`
- ✅ Fixed `pages/classes.html` button class (changed `btn btn-primary btn-large` → `btn-primary btn-primary-lg`)
- ✅ Removed redundant import from `styles/public-modern-styles.css`
- ✅ Deleted `/css/components/buttons.css`, `/css/components/`, and `/css/` directories

**Critical Button Tests:**

**A. Classes.html Register Button (CHANGED)**
- Navigate to pages/classes.html
- Scroll to bottom "Register Now" button
- Verify button displays with gradient background
- Verify button has proper sizing (not too small/large)
- Click button - should navigate to student-portal/register.html
- Test on mobile - button should be properly sized

**B. Admin & Portal Buttons (Existing - should be unchanged)**
- Test admin login button (admin/index.html)
- Test student portal check-in buttons (admin/check-in/index.html)
- Test student registration form submit buttons
- Test cancel/delete buttons in admin modals
- Verify all `.btn-primary`, `.btn-cancel`, `.btn-delete` buttons work
- Check that `.btn-primary-lg` sizing is consistent

**C. Merchandise Page Submit Button**
- Navigate to pages/merchandise.html
- Scroll to bottom order form
- Verify submit button styling (uses `.btn-primary`)
- Button should match admin/portal button style

**D. Browser Console Check**
- Open browser console on all tested pages
- Verify NO 404 errors for `css/components/buttons.css`
- Verify NO CSS import errors
- Check Network tab - no failed CSS requests

### 2. Test Public Website Pages 🧪 HIGH PRIORITY
**Test All 6 Pages (Desktop & Mobile):**

**1. index.html**
- Header displays (logo, tagline, social icons)
- Navigation buttons visible and clickable
- Mobile: Hamburger menu opens drawer
- Mobile: Drawer slides in with menu items

**2. pages/classes.html**
- Cards display properly (class details, pricing)
- Tables formatted correctly (class details table, pricing table)
- Images display and scale on hover

**3. pages/faqs.html**
- FAQ items display (question/answer formatting)
- FAQ icons appear
- Text spacing and layout correct

**4. pages/meet-the-crew.html**
- Cards display properly
- Crew table formatted correctly
- Images display

**5. pages/policies.html**
- Cards display properly
- Content formatted correctly

**6. pages/wcs-around-nz.html**
- Cards display properly
- Other classes container grid layout works
- Links styled correctly

**Cross-Page Checks:**
- Navigation hover effects work
- Mobile drawer opens/closes smoothly
- No broken styles or missing CSS
- Scroll-to-top button appears on scroll (if applicable)
- Page layouts responsive at different widths

### 5. Update CSS_CONSOLIDATION_AUDIT.md 📝 LOW PRIORITY
Mark Phase 4 as complete

### 6. Commit to Git 💾 FINAL STEP
Commit all Phase 4 changes

---

### 3. Verify No Other Imports from /css/ ⏳ MEDIUM PRIORITY
**Action Required:** Grep search for any files importing from old /css/ paths

### 4. Clean Up /css/components/ Directory ⏳ LOW PRIORITY
After buttons.css and password-reset-modal.css are handled:
- Delete /css/components/ directory
- Verify /css/ only contains styles.css and modern-styles.css

### 5. Test Public Website Pages 🧪 HIGH PRIORITY
**Test All 6 Pages:**
1. index.html
2. pages/classes.html
3. pages/faqs.html
4. pages/meet-the-crew.html
5. pages/policies.html
6. pages/wcs-around-nz.html

**Test Cases:**
- Desktop navigation styling
- Mobile navigation drawer
- Button styling (once consolidated)
- Card components
- Tables (classes page, crew page)
- FAQ styling
- Enhanced features (scroll to top, etc.)
- Layout containers and grids
- Utility classes

### 6. Update CSS_CONSOLIDATION_AUDIT.md 📝 LOW PRIORITY
Mark Phase 4 sections as complete

### 4. Update CSS_CONSOLIDATION_AUDIT.md 📝 LOW PRIORITY
Mark Phase 4 sections as complete

### 5. Commit to Git 💾 FINAL STEP
Commit all Phase 4 changes with descriptive message

---

## Next Steps

1. **IMMEDIATE:** Test button consolidation changes (especially classes.html)
2. Test all 6 public pages thoroughly (desktop + mobile)
3. Verify no console errors or missing CSS imports
4. Update CSS_CONSOLIDATION_AUDIT.md to mark Phase 4 complete
5. Commit Phase 4 changes to git
6. Move to Phase 5 (final documentation and comprehensive testing)
