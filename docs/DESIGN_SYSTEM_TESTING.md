# Design System Standardization - Test Plan

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

## Testing Summary

**Key Areas to Test:**
- Icon button styling and variants (delete, invoice, complete, restore)
- Button size changes (Register New Student, Purchase buttons)
- Confirmation modal cancel buttons (now use btn-cancel)
- Lock/unlock buttons in concessions (now use btn-cancel)
- Add Package button styling (now btn-primary-sm)
- Invoice button colors (changed from blue to purple)
- Generate password link (simplified styling)

**Pages Requiring Testing:**
- Admin Portal: Student Database, Transactions, Gift Concessions, Check-In, Merch Orders, Email Templates, Backup Database
- Student Portal: Registration, Transactions, Concessions, Check-Ins, Purchase/Profile/Prepay modals

---

## Test Cases by Section

### 🔹 Admin Portal - Student Database

**URL:** `/admin/student-database/index.html`

**Icon Buttons to Check:**
- [x] **Action column** - Each student row has 5 icon buttons
  - Edit (pencil icon)
  - View notes (note icon, purple if has notes)
  - View transactions (receipt icon)
  - Delete (trash icon, turns red on hover) ✅ Fixed - now has red background
  - Restore (for deleted students, green)
- [x] **Hover states** - Icons turn purple on hover (except delete = red)
- [x] **Visual consistency** - All buttons same size, proper spacing
- [x] **Notes indicator** - Students with notes show purple filled button

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
- [x] **Action column** - Each transaction has 2-3 icon buttons
  - Invoice toggle (document icon) ✅ Changed from blue to purple
  - Edit (pencil icon)
  - Delete (trash icon, super admin only)
- [x] **Invoice button** - Changes color when invoiced (purple background) ✅ Fixed - now purple instead of green
- [x] **Hover states** - Purple hover for invoice/edit, error color for delete
- [x] **Button spacing** - 0.5rem gap between buttons

**Additional Elements:**
- [ ] **Type badges** - Transaction types display with correct colors (concession, casual, gift, etc.)
- [ ] **Payment badges** - Payment methods show with icons and colors (cash, eftpos, online, etc.)
- [x] **Pagination controls** - Page number buttons display in a horizontal row, centered

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
- [ ] **Payment badges** - Each check-in shows payment method badge ✅ User confirmed looks fine
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
- [x] **Action column** - Each order has 3-4 icon buttons
  - View details (eye icon)
  - Invoice toggle (document icon)
  - Complete toggle (checkmark icon)
  - Delete (trash icon)
- [x] **Hover states** - Purple hover for view/invoice/complete
- [x] **Completed state** - Complete button shows green when order completed
- [x] **Invoiced state** - Invoice button shows when invoiced

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
- [x] **Generate password button** - Shows as underlined link ✅ Now purple with simpler styling
- [x] **Hover state** - No hover effect (simplified)
- [x] **Focus state** - Basic focus state maintained
- [x] **Button functionality** - Still generates password when clicked

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
- [x] **Pagination controls** - Page number buttons centered, horizontal layout

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
- [x] **Pagination controls** - Page number buttons centered, horizontal layout

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
- [x] **Modal footer** - "Cancel" or "Go Back" buttons ✅ User confirmed via Purchase Concessions modal
- [x] **Button style** - Now use btn-cancel (red styling) per confirmation modal defaults
- [x] **Hover state** - Red hover effect, lift maintained
- [x] **Button alignment** - Properly spaced from other modal buttons

**What to Look For:**
- Modal `.btn-secondary` is different from base (uses specific modal styling)
- Comment added noting these are "modal-specific variants"
- Secondary buttons work in all three pages
- No regression in modal button behavior

**⚠️ Important Note:** The modal-specific `.btn-secondary` styles were intentionally kept local because they have different styling than the base secondary button (outline style vs solid style). They should still work correctly.

---

## Visual Regression Checklist

### Global Checks (All Pages)

- [x] **Button sizing** - All buttons maintain proper height (36px default, 42-48px for large)
- [x] **Font consistency** - All buttons use system font stack
- [x] **Hover transitions** - Smooth 0.15s-0.2s transitions
- [x] **Purple color** - Consistent purple (`--purple-primary`) across all components
- [x] **Border radius** - Consistent rounding (`--radius-sm` for buttons, `--radius-md` for badges)
- [x] **Icon sizing** - Icons properly sized within buttons and badges
- [x] **Spacing** - Consistent gaps between elements

### Badge Verification

For all pages with badges:
- [ ] **Color accuracy** - Compare badge colors to documented color mappings
- [ ] **Text readability** - Sufficient contrast between background and text
- [ ] **Size consistency** - All badges same height within same context
- [ ] **Uppercase text** - Status badges properly uppercased
- [ ] **Icon alignment** - Icons centered vertically with text

### Button Verification

For all pages with icon/secondary/link buttons:
- [x] **Icon centering** - Icons perfectly centered in icon buttons
- [x] **Hover lift** - Buttons translateY(-2px) on hover
- [x] **Active states** - Distinct visual feedback on click
- [x] **Disabled states** - Grayed out, no hover effects
- [x] **Focus states** - Visible focus ring for keyboard navigation

### Pagination Verification

For all pages with pagination (Student Database, Transactions, Check-Ins):
- [x] **Horizontal layout** - All buttons display in a single row
- [x] **Centered alignment** - Pagination controls centered in container
- [x] **Page numbers** - Individual page buttons show numbers, not "Page X of Y" text
- [x] **Active state** - Current page highlighted with gradient background
- [x] **Disabled state** - Disabled buttons have white background, reduced opacity (not purple)
- [x] **Ellipsis display** - "..." separator shows for large page ranges
- [x] **Hover effects** - Page number buttons turn purple on hover

---

## Browser Testing

Test in multiple browsers to ensure consistency:

- [x] **Chrome/Edge** (Chromium) - Primary testing browser
- [x] **Firefox** - Verify button and badge rendering
- [x] **Safari** (if available) - Check iOS/macOS compatibility

---

## Responsive Testing

Test button and badge behavior at different screen sizes:

### Desktop (> 1024px)
- [x] All buttons display inline with proper spacing
- [ ] Badges wrap gracefully when multiple
- [x] Table layouts show all icon buttons
- [x] Pagination controls display properly

### Tablet (768px - 1024px)
- [x] Button sizes appropriate
- [ ] Badge spacing maintains readability
- [x] Icon buttons still accessible
- [x] Pagination remains centered and readable

### Mobile (< 768px)
- [ ] Transaction cards show badges properly stacked
- [x] Icon buttons remain touchable (minimum 44px touch target)
- [x] Link buttons maintain readability
- [x] Modal buttons stack vertically (`.btn-group` becomes column)
- [x] Pagination buttons remain accessible with proper touch targets

---

## Functional Testing

### Button Interactions
- [x] **Icon buttons** - Click functionality unchanged
  - Edit modal opens
  - Delete confirmation appears
  - View actions navigate correctly
- [x] **Link buttons** - Generate/toggle functions work
- [x] **Secondary buttons** - Modal cancel/close actions work
- [x] **Pagination buttons** - Navigate between pages correctly
  - Previous/Next buttons work
  - Page number buttons jump to correct page
  - Disabled state prevents navigation

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
