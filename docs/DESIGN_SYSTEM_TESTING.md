# Design System Standardization - Test Plan

**Date:** December 28, 2025  
**Changes Implemented:** Option 3 Quick Wins
- Centralized icon, secondary, and link button styles
- Removed duplicate button CSS from 7 files
- Documented badge component system

**Total Files Modified:** 8 files
- **Added:** Button styles to `/styles/base/buttons.css`
- **Updated:** 7 CSS files (removed duplicates, added comments)

---

## Testing Overview

### What Changed

1. **Icon Buttons (`.btn-icon`)** - Now centralized with all variants
2. **Secondary Buttons (`.btn-secondary`)** - Now in base styles
3. **Link Buttons (`.btn-link`)** - Now in base styles
4. **Badge Documentation** - Complete catalog added to design system

### What to Test

Since we **moved CSS** from local files to base styles, you need to verify that:
- ✅ Buttons still display correctly
- ✅ Hover states work
- ✅ Icon spacing is correct
- ✅ Colors match previous appearance
- ✅ No visual regressions

---

## Test Cases by Section

### 🔹 Admin Portal - Student Database

**URL:** `/admin/student-database/index.html`

**Icon Buttons to Check:**
- [ ] **Action column** - Each student row has 5 icon buttons
  - Edit (pencil icon)
  - View notes (note icon, purple if has notes)
  - View transactions (receipt icon)
  - Delete (trash icon, turns red on hover)
  - Restore (for deleted students, green)
- [ ] **Hover states** - Icons turn purple on hover (except delete = red)
- [ ] **Visual consistency** - All buttons same size, proper spacing
- [ ] **Notes indicator** - Students with notes show purple filled button

**What to Look For:**
- Button spacing in action column (gap between buttons)
- Purple hover effect on edit/notes/transactions buttons
- Red hover effect on delete button
- Green styling on restore button (if viewing deleted students)
- Proper icon sizing (0.9rem)

---

### 🔹 Admin Portal - Transactions

**URL:** `/admin/admin-tools/transactions/index.html`

**Icon Buttons to Check:**
- [ ] **Action column** - Each transaction has 2-3 icon buttons
  - Invoice toggle (document icon)
  - Edit (pencil icon)
  - Delete (trash icon, super admin only)
- [ ] **Invoice button** - Changes color when invoiced (purple background)
- [ ] **Hover states** - Purple hover for invoice/edit, error color for delete
- [ ] **Button spacing** - 0.5rem gap between buttons

**Additional Elements:**
- [ ] **Type badges** - Transaction types display with correct colors (concession, casual, gift, etc.)
- [ ] **Payment badges** - Payment methods show with icons and colors (cash, eftpos, online, etc.)

**What to Look For:**
- Icon button alignment in action column
- Invoice button state changes correctly
- Badge colors match documented system
- No layout shifts or spacing issues

---

### 🔹 Admin Portal - Gift Concessions

**URL:** `/admin/admin-tools/gift-concessions/index.html`

**Icon Buttons to Check:**
- [ ] **Recent gifts section** - Delete button (trash icon) on each gift
- [ ] **Hover state** - Red background on delete hover
- [ ] **Button size** - Slightly smaller padding (0.4rem 0.5rem)
- [ ] **Border styling** - Light border, purple hover

**What to Look For:**
- Delete button responds to hover correctly
- Icon is centered in button
- No visual changes from previous appearance

---

### 🔹 Admin Portal - Check-In

**URL:** `/admin/check-in/index.html`

**Elements to Check:**
- [ ] **Payment badges** - Each check-in shows payment method badge
- [ ] **Type badges** - Check-in type displays correctly (concession, casual, gift, etc.)
- [ ] **Badge colors** - Match documented color system
- [ ] **Icon spacing** - Icons in badges have proper gap (0.4rem)

**What to Look For:**
- Badges display in correct colors
- Icons and text properly aligned
- No badge styling regressions

---

### 🔹 Admin Portal - Merch Orders

**URL:** `/admin/admin-tools/merch-orders/index.html`

**Icon Buttons to Check:**
- [ ] **Action column** - Each order has 3-4 icon buttons
  - View details (eye icon)
  - Invoice toggle (document icon)
  - Complete toggle (checkmark icon)
  - Delete (trash icon)
- [ ] **Hover states** - Purple hover for view/invoice/complete
- [ ] **Completed state** - Complete button shows green when order completed
- [ ] **Invoiced state** - Invoice button shows when invoiced

**Additional Elements:**
- [ ] **Status badges** - Order status displays (pending, invoiced, complete, deleted)

**What to Look For:**
- Icon buttons properly styled
- State indicators work correctly
- Badge colors match status appropriately

---

### 🔹 Student Portal - Registration

**URL:** `/student-portal/register.html`

**Link Button to Check:**
- [ ] **Generate password button** - Shows as underlined link
- [ ] **Hover state** - Changes to blue, removes underline
- [ ] **Focus state** - Purple outline appears on keyboard focus
- [ ] **Button functionality** - Still generates password when clicked

**What to Look For:**
- Link button styled correctly (no background, underlined)
- Hover interaction smooth
- Purple focus ring visible on keyboard navigation
- No visual regression from previous appearance

**Note:** Page also has a `.btn-secondary` button for showing generated password - verify it displays correctly with purple border/text.

---

### 🔹 Student Portal - Transactions

**URL:** `/student-portal/transactions/index.html`

**Elements to Check:**
- [ ] **Type badges** - Each transaction shows type badges
  - Concession (purple)
  - Casual (blue)
  - Gift (green)
  - Reversed (red)
- [ ] **Payment badges** - Payment method badges with icons
  - Cash (orange/yellow)
  - EFTPOS (blue)
  - Online (teal)
  - Bank (purple)
- [ ] **Badge styling** - Rounded, proper padding, readable text
- [ ] **Mobile view** - Badges stack properly in card layout (< 768px)

**What to Look For:**
- All badge colors match documentation
- Icons display correctly in payment badges
- Text is readable and properly weighted (600)
- No layout issues in table or card views

---

### 🔹 Student Portal - Concessions

**URL:** `/student-portal/concessions/index.html`

**Elements to Check:**
- [ ] **Badge-locked** - Unavailable concessions show gray locked badge with icon
- [ ] **Badge-gifted** - Gifted concessions show green badge with gift icon
- [ ] **Badge styling** - Inline-flex with icon gap (0.4rem)
- [ ] **Icon size** - Icons at 0.75rem within badges

**What to Look For:**
- Locked badge appears gray/muted
- Gifted badge appears green with success styling
- Icons properly aligned with text
- Badge sizing appropriate for concession cards

---

### 🔹 Student Portal - Check-Ins

**URL:** `/student-portal/check-ins/index.html`

**Elements to Check:**
- [ ] **Type badges** - Check-in types display with colors
  - Concession (purple)
  - Casual (blue)
  - Free (gray or neutral)
  - Gift (green)
- [ ] **Badge layout** - Proper spacing in table/card views
- [ ] **Font sizing** - 0.85rem, weight 600

**What to Look For:**
- Type badges consistent with transactions page
- No color mismatches
- Proper white space around badges

---

### 🔹 Student Portal - Profile/Purchase/Prepay Modals

**URLs:**
- `/student-portal/profile/index.html` (password change modal)
- `/student-portal/purchase/index.html` (confirmation modal)
- `/student-portal/prepay/index.html` (date change modal)

**Secondary Button to Check:**
- [ ] **Modal footer** - "Cancel" or "Go Back" buttons
- [ ] **Button style** - White background, purple border, purple text
- [ ] **Hover state** - Purple background, white text, lift effect
- [ ] **Button alignment** - Properly spaced from other modal buttons

**What to Look For:**
- Modal `.btn-secondary` is different from base (uses specific modal styling)
- Comment added noting these are "modal-specific variants"
- Secondary buttons work in all three pages
- No regression in modal button behavior

**⚠️ Important Note:** The modal-specific `.btn-secondary` styles were intentionally kept local because they have different styling than the base secondary button (outline style vs solid style). They should still work correctly.

---

## Visual Regression Checklist

### Global Checks (All Pages)

- [ ] **Button sizing** - All buttons maintain proper height (36px default, 42-48px for large)
- [ ] **Font consistency** - All buttons use system font stack
- [ ] **Hover transitions** - Smooth 0.15s-0.2s transitions
- [ ] **Purple color** - Consistent purple (`--purple-primary`) across all components
- [ ] **Border radius** - Consistent rounding (`--radius-sm` for buttons, `--radius-md` for badges)
- [ ] **Icon sizing** - Icons properly sized within buttons and badges
- [ ] **Spacing** - Consistent gaps between elements

### Badge Verification

For all pages with badges:
- [ ] **Color accuracy** - Compare badge colors to documented color mappings
- [ ] **Text readability** - Sufficient contrast between background and text
- [ ] **Size consistency** - All badges same height within same context
- [ ] **Uppercase text** - Status badges properly uppercased
- [ ] **Icon alignment** - Icons centered vertically with text

### Button Verification

For all pages with icon/secondary/link buttons:
- [ ] **Icon centering** - Icons perfectly centered in icon buttons
- [ ] **Hover lift** - Buttons translateY(-2px) on hover
- [ ] **Active states** - Distinct visual feedback on click
- [ ] **Disabled states** - Grayed out, no hover effects
- [ ] **Focus states** - Visible focus ring for keyboard navigation

---

## Browser Testing

Test in multiple browsers to ensure consistency:

- [ ] **Chrome/Edge** (Chromium) - Primary testing browser
- [ ] **Firefox** - Verify button and badge rendering
- [ ] **Safari** (if available) - Check iOS/macOS compatibility

---

## Responsive Testing

Test button and badge behavior at different screen sizes:

### Desktop (> 1024px)
- [ ] All buttons display inline with proper spacing
- [ ] Badges wrap gracefully when multiple
- [ ] Table layouts show all icon buttons

### Tablet (768px - 1024px)
- [ ] Button sizes appropriate
- [ ] Badge spacing maintains readability
- [ ] Icon buttons still accessible

### Mobile (< 768px)
- [ ] Transaction cards show badges properly stacked
- [ ] Icon buttons remain touchable (minimum 44px touch target)
- [ ] Link buttons maintain readability
- [ ] Modal buttons stack vertically (`.btn-group` becomes column)

---

## Functional Testing

### Button Interactions
- [ ] **Icon buttons** - Click functionality unchanged
  - Edit modal opens
  - Delete confirmation appears
  - View actions navigate correctly
- [ ] **Link buttons** - Generate/toggle functions work
- [ ] **Secondary buttons** - Modal cancel/close actions work

### Badge Behavior
- [ ] **Static badges** - Display only, no interaction
- [ ] **Interactive badges** (`.concession-badge`) - Hover effects work
- [ ] **Badge updates** - Status changes reflect immediately

---

## Known Differences (Expected)

These changes are **intentional** and not bugs:

1. **Modal `.btn-secondary`** - Kept local styling (different from base)
2. **Comment additions** - Files now have "styles now in /styles/base/buttons.css" comments
3. **Icon button variants** - More variants available (`.btn-invoice`, `.btn-complete`, etc.)

---

## Reporting Issues

If you find any visual regressions or functional issues:

### Visual Issues
Document with:
- Page URL
- Screenshot (before/after if possible)
- Browser and version
- Screen size
- Description of expected vs actual appearance

### Functional Issues
Document with:
- Page URL
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser console errors (if any)

---

## Success Criteria

Testing is complete when:

✅ All icon buttons display correctly across all admin pages  
✅ Secondary and link buttons work in student portal  
✅ All badges show correct colors and styling  
✅ No visual regressions found  
✅ All hover and focus states work  
✅ Responsive behavior correct on mobile  
✅ Button functionality unchanged  

---

## Quick Visual Comparison

### Before vs After

**Should Look Identical:**
- All button colors, sizes, and spacing
- All badge colors and text styling
- Hover and focus effects
- Icon sizing and alignment

**Only Difference:**
- CSS is now centralized (no visual change, just cleaner code)
- ~150 lines of duplicate CSS removed
- Comments added to updated files

---

## Test Execution Notes

**Recommended Testing Order:**
1. Start with Admin Student Database (most icon buttons)
2. Test Admin Transactions (badges + icon buttons)
3. Test Student Portal Registration (link button)
4. Test Student Portal Transactions (badges)
5. Spot-check remaining pages

**Time Estimate:** 30-45 minutes for comprehensive testing

**Priority Areas:**
- Icon buttons in admin tables (highest usage)
- Badges in transaction views (most visible)
- Modal secondary buttons (different styling)

---

**Document Version:** 1.0  
**Last Updated:** December 28, 2025
