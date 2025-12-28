# Urban Swing Design System

**Phase 1 Audit Complete:** December 28, 2025  
**Status:** Component Inventory & Pattern Documentation

This document catalogs all UI patterns, components, and design standards currently in use across the Urban Swing website (admin portal, student portal, and public site).

---

## Table of Contents

1. [Button System](#button-system)
2. [Badge System](#badge-system)
3. [Card & Tile Components](#card--tile-components)
4. [Form Components](#form-components)
5. [Modal System](#modal-system)
6. [Color System](#color-system)
7. [Typography](#typography)
8. [Spacing & Layout](#spacing--layout)
9. [Component Usage Guidelines](#component-usage-guidelines)
10. [Inconsistencies & Recommendations](#inconsistencies--recommendations)

---

## Button System

### Current Implementation

**Primary Location:** `/styles/base/buttons.css`

### Button Variants

#### 1. Primary Button (`.btn-primary`) ✅
- **Purpose:** Main call-to-action buttons
- **Style:** Gradient background (blue-purple), white text
- **Usage:** Register, Submit, Save, Create actions
- **States:** Normal, hover (purple-pink gradient with lift), disabled (opacity 0.6)
- **Code:**
```html
<button class="btn-primary">Submit</button>
<button class="btn-primary btn-primary-lg">Register Now</button>
```

#### 2. Cancel Button (`.btn-cancel`) ✅
- **Purpose:** Cancel, close, or dismiss actions
- **Style:** Light error background with error border, error text
- **Usage:** Cancel forms, close dialogs (non-destructive)
- **States:** Normal, hover (solid error background, white text), disabled
- **Code:**
```html
<button class="btn-cancel">Cancel</button>
<button class="btn-cancel btn-cancel-lg">Close</button>
```

#### 3. Delete/Danger Button (`.btn-delete`, `.btn-danger`) ✅
- **Purpose:** Destructive actions
- **Style:** Solid error background, white text
- **Usage:** Delete records, remove items
- **States:** Normal, hover (darker error with lift), disabled
- **Code:**
```html
<button class="btn-delete">Delete</button>
<button class="btn-danger">Remove</button>
```

#### 4. Success Button (`.btn-success`) ✅
- **Purpose:** Confirm positive actions
- **Style:** Success green background, white text
- **Usage:** Confirm, Approve, Complete actions
- **States:** Normal, hover (lighter success with lift), disabled
- **Code:**
```html
<button class="btn-success">Confirm</button>
```

#### 5. Tertiary/Ghost Button (`.btn-tertiary`) ✅
- **Purpose:** Low-priority actions
- **Style:** Subtle background, primary text color
- **Usage:** View details, show more
- **States:** Normal, hover (border background with lift)
- **Code:**
```html
<button class="btn-tertiary">View Details</button>
```

#### 6. Icon Buttons (`.btn-icon`) ✅
- **Purpose:** Action buttons with just icons
- **Style:** Subtle background, hover effects
- **Locations:**
  - `/admin/student-database/student-database.css` (lines 300-360)
  - `/admin/admin-tools/transactions/transactions.css` (lines 525-564)
  - `/admin/admin-tools/gift-concessions/gift-concessions.css` (lines 514-531)
- **Variants:** `.btn-icon.has-notes`, `.btn-icon.btn-delete`, `.btn-icon.btn-restore`, `.btn-icon.btn-disabled`
- **⚠️ NOTE:** Not in base buttons.css - defined locally in 3+ admin files
- **Code:**
```html
<button class="btn-icon" title="Edit"><i class="fas fa-edit"></i></button>
<button class="btn-icon btn-delete" title="Delete"><i class="fas fa-trash"></i></button>
```

#### 7. Logout Button (`.btn-logout`) ✅
- **Purpose:** User logout
- **Style:** Specialized header button
- **Locations:**
  - `/styles/admin/admin-header.css` (lines 165-177)
  - `/styles/student-portal/student-portal-header.css` (lines 90-129)
- **Code:**
```html
<button class="btn-logout" title="Logout"><i class="fas fa-sign-out-alt"></i></button>
```

#### 8. Pagination Buttons ✅
- **Purpose:** Table pagination navigation
- **Location:** `/styles/base/buttons.css`
- **Classes:**
  - `.pagination-btn` - Previous/Next navigation buttons
  - `.pagination-number` - Individual page number buttons
  - `.pagination-pages` - Container for page numbers
  - `.pagination-ellipsis` - "..." separator for skipped pages
- **Style:** Transparent background, bordered, purple hover, gradient active state
- **Usage:** Student Database, Transactions, Check-Ins pagination
- **Features:**
  - Disabled state with reduced opacity (no purple background)
  - Active page highlighted with gradient background
  - Ellipsis for large page ranges
  - Smart page number display (current ±2 pages)
- **Code:**
```html
<div class="pagination">
  <button class="pagination-btn" disabled>
    <i class="fas fa-chevron-left"></i> <span>Previous</span>
  </button>
  <div class="pagination-pages">
    <button class="pagination-number active">1</button>
    <button class="pagination-number">2</button>
    <button class="pagination-number">3</button>
    <span class="pagination-ellipsis">...</span>
    <button class="pagination-number">10</button>
  </div>
  <button class="pagination-btn">
    <span>Next</span> <i class="fas fa-chevron-right"></i>
  </button>
</div>
```
- **⚠️ Consolidation:** Previously duplicated in 4 separate files (~240 lines total), now centralized in buttons.css

### Button Sizes

- **Small:** `.btn-sm`, `.btn-primary-sm`, etc. (height: 28px, 0.75rem font)
- **Default:** No modifier (height: 36px, 0.85rem font)
- **Large:** `.btn-lg`, `.btn-primary-lg`, etc. (padding: 1rem 1.5rem, 1.125rem font)
- **Extra Large:** `.btn-xl`, `.btn-primary-xl`, etc. (height: 48px, 1.125rem font)

### Button Utilities

- **Full Width:** `.btn-block` - spans container width
- **Button Group:** `.btn-group` - horizontal flex with gap
- **Button Group Vertical:** `.btn-group-vertical` - vertical flex with gap
- **Loading State:** `.loading` class - shows spinner, hides text
- **Mobile Full Width:** `.full-width-mobile` - full width on mobile only

### Specialized Buttons (Local Implementations)

#### Filter Button (`.btn-filter`)
- **Location:** `/admin/playlist-manager/css/buttons.css`
- **Purpose:** Filter toggles in playlist manager
- **Style:** Pill-shaped, purple border, active state with purple background

#### Mini Purchase Button (`.btn-purchase-mini`)
- **Location:** `/admin/student-database/student-database.css` (lines 280-294)
- **Purpose:** Inline purchase action in student table
- **Style:** Small outline button with purple border

#### Change Date Button (`.btn-change-date`)
- **Location:** `/student-portal/prepay/prepay.css` (lines 187-210)
- **Purpose:** Modify pre-paid class dates
- **Style:** Standard primary button style

#### Quantity Buttons (`.qty-btn`)
- **Location:** `/pages/merchandise.html`
- **Purpose:** Increment/decrement product quantities
- **Style:** Small buttons with +/- symbols

#### Tab Buttons (`.tab-btn`)
- **Location:** `/admin/admin-tools/email-templates/index.html`
- **Purpose:** Switch between content tabs
- **Style:** Underline style with active state

#### Navigation Buttons (`.nav-menu a`)
- **Location:** `/styles/base/buttons.css` (lines 18-61)
- **Purpose:** Top navigation menu links
- **Style:** Translucent background with gradient hover, bottom border indicator

---

## Badge System ✅

### Current Implementation

**Status:** ✅ Centralized in `/styles/components/badges.css`

**Consolidation Complete:** December 29, 2025

Badges are small labeled status indicators used throughout the application to display categories, status, payment methods, and other metadata.

### Badge Types

#### 1. Base Badge (`.badge`)
- **Purpose:** General-purpose status indicator
- **Style:** Small, rounded, uppercase text
- **Locations:** 
  - `/admin/student-database/student-database.css` (email consent)
  - `/admin/check-in/check-in.css` (email consent)
  - `/student-portal/concessions/concessions.css` (concession status)
  - `/admin/admin-tools/merch-orders/merch-orders.css` (order status)
- **Base Styles:**
```css
.badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: var(--radius-md);
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
}
```
- **Code:**
```html
<span class="badge badge-yes">Yes</span>
<span class="badge badge-no">No</span>
```

#### 2. Type Badge (`.type-badge`)
- **Purpose:** Transaction and check-in type indicators
- **Style:** Colored badges for different transaction types
- **Locations:**
  - `/admin/admin-tools/transactions/transactions.css`
  - `/admin/check-in/check-in.css`
  - `/student-portal/transactions/transactions.css`
  - `/student-portal/check-ins/check-ins.css`
- **Variants:**
  - `.concession` - Purple background (package purchases)
  - `.casual`, `.casual-entry` - Blue background (casual class entries)
  - `.casual-student` - Teal background (student rate casual entries)
  - `.gift` - Green background (gifted concessions)
  - `.online` - Teal background (online transactions)
  - `.reversed` - Red background (reversed/cancelled transactions)
  - `.cash`, `.eftpos`, `.bank-transfer`, `.other` - Payment method types
- **Code:**
```html
<span class="type-badge concession">Package</span>
<span class="type-badge casual">Casual</span>
<span class="type-badge gift">Gift</span>
<span class="type-badge reversed">Reversed</span>
```

#### 3. Payment Badge (`.payment-badge`)
- **Purpose:** Payment method indicators with icons
- **Style:** Badge with icon + text, colored by payment type
- **Locations:**
  - `/admin/admin-tools/transactions/transactions.css`
  - `/admin/check-in/check-in.css`
  - `/student-portal/transactions/transactions.css`
- **Variants:**
  - `.cash` - Orange/yellow background (💵 Cash)
  - `.eftpos` - Blue background (💳 EFTPOS)
  - `.online` - Teal background (🌐 Online/Stripe)
  - `.bank` - Purple background (🏦 Bank Transfer)
  - `.na` - Gray background (N/A)
  - `.unknown` - Gray background (Unknown)
- **Code:**
```html
<span class="payment-badge cash">
    <i class="fas fa-money-bill-wave"></i> Cash
</span>
<span class="payment-badge online">
    <i class="fas fa-credit-card"></i> Online
</span>
```

#### 4. Status Badges (Yes/No/Warning)
- **Purpose:** Binary or ternary status indicators
- **Variants:**
  - `.badge-yes` - Green background (success/affirmative)
  - `.badge-no` - Red background (error/negative)
  - `.badge-warning` - Orange background (warning/caution)
- **Usage:** Email consent, permissions, status flags
- **Code:**
```html
<span class="badge badge-yes">Yes</span>
<span class="badge badge-no">No</span>
<span class="badge badge-warning">Pending</span>
```

#### 5. Order Status Badges
- **Purpose:** Merchandise order status
- **Location:** `/styles/components/badges.css`
- **Variants:**
  - `.badge-pending` - Yellow background (pending orders)
  - `.badge-invoiced` - Purple background (invoiced)
  - `.badge-complete` - Green background (completed)
  - `.badge-deleted` - Red background (deleted/cancelled)
- **Code:**
```html
<span class="badge badge-pending">Pending</span>
<span class="badge badge-complete">Complete</span>
```

#### 6. Concession Status Badges
- **Purpose:** Concession-specific status indicators
- **Locations:**
  - `/student-portal/concessions/concessions.css`
  - `/admin/student-database/js/transaction-history/transaction-history.css`
  - `/admin/student-database/student-database.css`
  - `/admin/check-in/check-in.css`
- **Variants:**
  - `.badge-locked` - Gray background (locked/unavailable concessions)
  - `.badge-gifted` - Green background with success border (gifted concessions)
  - `.concession-badge` - Interactive badge with hover effect
- **Code:**
```html
<span class="badge badge-locked">
    <i class="fas fa-lock"></i> Locked
</span>
<span class="badge badge-gifted">
    <i class="fas fa-gift"></i> Gifted
</span>
```

#### 7. Display Status Badges (Closedown Nights)
- **Purpose:** Closedown night display status
- **Location:** `/admin/admin-tools/closedown-nights/closedown-nights.css`
- **Variants:**
  - `.badge-display` - Badge indicating visible status
  - `.badge-no-display` - Badge indicating hidden status

### Badge Color Mappings

#### By Semantic Purpose

| Purpose | Badge Class | Background Variable | Text Color Variable |
|---------|-------------|---------------------|---------------------|
| Success/Positive | `.badge-yes`, `.badge-gifted` | `--bg-success-light` | `--success` |
| Error/Negative | `.badge-no`, `.badge-deleted` | `--bg-error-light` | `--error` |
| Warning/Caution | `.badge-warning`, `.badge-pending` | `--bg-orange-light` | `#ff8800` |
| Info/Neutral | `.badge-locked`, `.na` | Gray background | `--text-muted` |
| Package/Concession | `.concession` | `--badge-package-bg` | `--purple-primary` |
| Casual Entry | `.casual`, `.casual-entry` | `--badge-casual-bg` | `--blue-primary` |
| Student Rate | `.casual-student` | `--badge-info-bg` | `--badge-info-text` |
| Gift | `.gift` | `--badge-success-bg` | `--badge-success-text` |
| Cash Payment | `.cash` | `--badge-warning-bg` | `--badge-warning-text` |
| EFTPOS Payment | `.eftpos` | `--badge-blue-bg` | `--badge-blue-text` |
| Bank Transfer | `.bank`, `.bank-transfer` | `--badge-purple-bg` | `--badge-purple-text` |
| Online Payment | `.online` | `--badge-teal-bg` | `--badge-teal-text` |
| Reversed/Cancelled | `.reversed` | `--badge-error-bg` | `--badge-error-text` |

### Badge Sizing

- **Default:** 0.8-0.85rem font size, 4-10px vertical padding, 10-12px horizontal padding
- **Compact:** Used in tables and tight spaces
- **Icon Badges:** Include icon with 0.4rem gap, icon at 0.75-0.9rem

### Badge Usage Guidelines

#### When to Use Badges

✅ **Use badges for:**
- Status indicators (yes/no, active/inactive, locked/unlocked)
- Category tags (transaction types, payment methods)
- Small counts or labels (new, updated, required)
- Visual distinction in tables and lists

❌ **Don't use badges for:**
- Long text content (use labels or spans instead)
- Primary information (badges are supplementary)
- Interactive elements (use buttons instead)
- Error messages (use error-message component)

#### Badge Placement

- **In tables:** Right-align or center in dedicated columns
- **With text:** Place after the associated text with small margin
- **Multiple badges:** Use flexbox with gap, allow wrapping
- **Icons:** Place icon before text within the badge

### Consolidation Complete ✅

**Completed:** December 29, 2025

**Previously identified problems (NOW RESOLVED):**
1. ~~No centralized badge CSS~~ - ✅ Now in `/styles/components/badges.css`
2. ~~Inconsistent styling~~ - ✅ All badges use consistent padding, border-radius, font-size
3. ~~Color variable naming inconsistent~~ - ✅ Unified color variable usage
4. ~~Duplicate definitions~~ - ✅ ~250 lines of duplicate CSS removed
5. ~~Missing base badge component~~ - ✅ Single source of truth established
6. ~~Concession badge purple override~~ - ✅ Removed so status colors (green/red/orange) work correctly
7. ~~Muted expired concession buttons~~ - ✅ Removed opacity so buttons are visible

**Files Updated (8 total):**
- Student Portal: transactions.css, check-ins.css, concessions.css
- Admin: student-database.css, transactions.css, merch-orders.css, check-in.css, transaction-history.css

**Result:** ~300 lines saved, single source of truth, consistent styling across entire application, all badge types working correctly

---

## Card & Tile Components

### Card System

**Primary Locations:** 
- `/styles/components/public-cards.css` (base card system)
- `/styles/components/tiles.css` (tile variants)

### Card Variants

#### 1. Base Card (`.card`)
- **Purpose:** General content container
- **Style:** White background, rounded corners, shadow, hover lift
- **Usage:** Content sections on public pages
- **Code:**
```html
<div class="card">
  <div class="card-header">
    <h3>Card Title</h3>
  </div>
  <div class="card-body">
    <p>Card content goes here.</p>
  </div>
  <div class="card-footer">
    <button class="btn-primary">Action</button>
  </div>
</div>
```

#### 2. Tile with Gradient (`.tile-gradient`)
- **Purpose:** Navigation cards with gradient top border
- **Style:** 4px gradient top border, hover effects
- **Usage:** Dashboard navigation tiles, feature highlights
- **Locations:**
  - `/student-portal/dashboard/index.html` (navigation cards)
  - `/index.html` (public homepage feature cards)
- **Code:**
```html
<div class="card tile-gradient">
  <div class="tile-icon">
    <div class="tile-icon-image">
      <i class="fas fa-ticket-alt"></i>
    </div>
    <div class="tile-icon-content">
      <h3>Concessions</h3>
      <p>View your class passes</p>
    </div>
  </div>
</div>
```

#### 3. Tile Icon Layouts
- **Horizontal (`.tile-icon`):** Icon on left, content on right
- **Centered (`.tile-icon-centered`):** Icon above content, centered alignment
- **Large Icon (`.tile-icon-large`):** 80x80px icon size (default: 70x70px)
- **Circle Icon (`.tile-icon-circle`):** Circular icon background

#### 4. Card Modifiers

##### Size Modifiers
- **Compact:** `.card-compact` - Reduced padding
- **Feature:** `.card-feature` - Centered content, larger padding

##### Style Modifiers
- **Elevated:** `.card-elevated` - Enhanced shadow with hover effect
- **Primary:** `.card-primary` - Purple accent border
- **Success:** `.card-success` - Green accent border
- **Warning:** `.card-warning` - Orange accent border
- **Info:** `.card-info` - Blue accent border

#### 5. Card Grid Layout (`.card-grid`)
- **Purpose:** Responsive grid of cards
- **Style:** Auto-fit grid with 300px minimum column width
- **Usage:** Feature displays, product listings
- **Code:**
```html
<div class="card-grid">
  <div class="card">...</div>
  <div class="card">...</div>
  <div class="card">...</div>
</div>
```

### Specialized Card Implementations

#### Transaction Card (Mobile View)
- **Location:** `/student-portal/transactions/transactions.css` (lines 315-360)
- **Classes:** `.card-header`, `.card-date`, `.card-amount`, `.card-body`, `.card-row`, `.card-label`, `.card-value`
- **Purpose:** Mobile-friendly transaction display
- **Style:** Compact stacked layout with label-value pairs

#### Registration Card (`.register-card`)
- **Location:** `/student-portal/register.html`
- **Purpose:** Student registration form container
- **Style:** Large centered card with form sections

#### Purchase/Prepay Cards
- **Locations:**
  - `/student-portal/purchase/index.html` (`.purchase-card`)
  - `/student-portal/prepay/index.html` (`.prepay-card`, `.prepaid-classes-card`)
- **Purpose:** Payment form containers
- **Style:** Form-specific styling with payment information sections

#### Option Cards (`.option-card`)
- **Location:** `/student-portal/index.html`
- **Purpose:** Login type selection cards
- **Style:** Interactive cards with icon headers, hover states
- **Variants:** `.new-student`, `.existing-student`, `.login`

#### Tool Cards (`.tool-card`)
- **Location:** `/admin/admin-tools/admin-tools.css`
- **Purpose:** Admin tool navigation
- **Style:** Similar to tile-gradient, admin-specific styling

### Hover Effects

- **Base Hover:** `.hover-lift` - Translates Y by -4px with enhanced shadow
- **Card Hover:** Default card hover includes transform and shadow transition

---

## Form Components

### Current Implementation

**Primary Location:** `/styles/components/forms.css`

### Form Structure

#### Form Group (`.form-group`)
- **Purpose:** Standard form field container
- **Structure:** Label + input/textarea/select
- **Spacing:** Bottom margin for field separation
- **Code:**
```html
<div class="form-group">
  <label for="name"><i class="fas fa-user"></i> Full Name</label>
  <input type="text" id="name" placeholder="Enter your name">
</div>
```

#### Form Row (`.form-row`)
- **Purpose:** Side-by-side form fields
- **Style:** 2-column grid with gap
- **Usage:** Related fields (first name/last name, etc.)
- **Code:**
```html
<div class="form-row">
  <div class="form-group">
    <label>First Name</label>
    <input type="text">
  </div>
  <div class="form-group">
    <label>Last Name</label>
    <input type="text">
  </div>
</div>
```

### Input Types

#### Text Inputs
- **Types:** `text`, `email`, `tel`, `password`, `number`
- **Style:** 
  - Light border, rounded corners
  - Purple border on focus with shadow ring
  - Full width with responsive padding
- **Readonly State:** Light purple background, disabled cursor
- **Code:**
```html
<input type="text" placeholder="Enter text">
<input type="email" placeholder="email@example.com">
<input type="password" placeholder="Password">
```

#### Textarea
- **Style:** Minimum height 80px, vertical resize
- **Usage:** Comments, notes, message fields
- **Code:**
```html
<textarea placeholder="Enter your message" rows="4"></textarea>
```

#### Select Dropdown
- **Style:** Custom arrow icon, purple hover/focus states
- **Usage:** Dropdown selections
- **Code:**
```html
<select>
  <option>Select option</option>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>
```

### Checkbox & Radio Buttons

#### Checkbox Label (`.checkbox-label`)
- **Style:** Flex layout, icon gap, cursor pointer
- **Variants:**
  - Standard checkbox with text
  - Checkbox row (`.checkbox-row`) - 3-column grid
  - Checkbox group (`.checkbox-group`)
- **Code:**
```html
<div class="checkbox-label">
  <input type="checkbox" id="consent">
  <span>I agree to the terms and conditions</span>
</div>
```

#### Radio Button Patterns

##### Standard Radio (`.radio-label`)
- **Location:** `/styles/pages/merchandise.css`
- **Style:** Inline radio with custom styling
- **Usage:** Single selections (e.g., delivery method)

##### Rate Option Radio (`.rate-option`)
- **Location:** `/student-portal/css/registration-form.css`
- **Style:** Full-width card-like radio buttons
- **Features:** Hover state, checked state with border highlight
- **Usage:** Rate selection during registration

##### Size Radio (`.size-radio`)
- **Location:** `/styles/pages/merchandise.css`
- **Style:** Button-like radio options
- **Usage:** Product size selection

### Specialized Form Components

#### Password Input with Toggle (`.password-input-wrapper`)
- **Location:** `/student-portal/css/registration-form.css` (lines 650+)
- **Features:** Show/hide password toggle button
- **Usage:** Registration, password change forms

#### Password Generator
- **Location:** Registration form
- **Components:** Generate button, copy button, strength indicator
- **Usage:** New user registration

#### Stripe Card Element (`.stripe-card-element`)
- **Location:** Multiple payment pages
- **Style:** Matches form input styling
- **States:** Focus, invalid, complete
- **Usage:** Credit card input for Stripe payments

#### Student Search/Filter (`.student-filter-wrapper`)
- **Location:** `/admin/admin-tools/transactions/transactions.css` (lines 120+)
- **Features:** Autocomplete dropdown, clear button
- **Usage:** Admin student search in transactions

#### Date Input with Picker (`.date-input-wrapper`)
- **Location:** `/styles/date-picker/date-picker.css`
- **Features:** Calendar icon, date picker modal
- **Usage:** Class date selection, transaction filters

### Form Validation

#### Error Message (`.error-message`)
- **Style:** Red background, border, and text
- **Display:** Initially hidden, shown on validation failure
- **Code:**
```html
<div class="error-message">
  <i class="fas fa-exclamation-circle"></i>
  Please fill out this field.
</div>
```

#### Success Message (`.success-message`)
- **Style:** Green background, border, and text
- **Usage:** Form submission confirmation
- **Code:**
```html
<div class="success-message">
  <i class="fas fa-check-circle"></i>
  Form submitted successfully!
</div>
```

#### Field-Level Validation
- **Focus States:** Purple border + shadow ring
- **Invalid States:** Red border (Stripe elements)
- **Complete States:** Green border (Stripe elements)
- **Required Indicators:** Red asterisk or `<span class="required">*</span>`

### Form Sections

#### Payment Section (`.payment-section`)
- **Style:** Light background, border, rounded
- **Usage:** Payment information grouping
- **Components:** Rate options, card element, payment info

#### Portal Info Section (`.portal-info`)
- **Style:** Light background, purple left border
- **Usage:** Informational callouts in forms
- **Features:** Icon list, highlighted heading

#### Radio Notice (`.radio-notice`)
- **Style:** Warning-colored callout with animation
- **Usage:** Context-sensitive help text (e.g., student ID requirement)
- **Animation:** Fade in and slide up when shown

---

## Modal System

### Current Implementation

**Primary Location:** `/styles/modals/modal-base.css`

### Modal Structure

#### Base Modal (`.modal`)
- **Structure:** Full-screen overlay + centered content card
- **Components:**
  - `.modal` - Overlay container (z-index: var(--z-modal))
  - `.modal-content` - Content card (max-width: 600px default)
  - `.modal-header` - Title area with close button
  - `.modal-body` - Main content area
  - `.modal-footer` - Action buttons area
- **Code:**
```html
<div class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3><i class="fas fa-info-circle"></i> Modal Title</h3>
      <button class="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <p>Modal content goes here.</p>
    </div>
    <div class="modal-footer">
      <button class="btn-cancel">Cancel</button>
      <button class="btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

### Modal Sizes

- **Default:** 600px max-width
- **Small:** `.modal-small` - 400px max-width
- **Large:** `.modal-large` - 800px max-width

### Modal Variants

#### Confirmation Modal
- **Location:** `/styles/modals/confirmation-modal.css`
- **Purpose:** Confirm destructive actions
- **Variant:** `.modal-danger` - Red header for delete confirmations
- **Features:** `.text-muted` for secondary information
- **Usage:** Delete confirmations, irreversible actions

#### JavaScript Modal Classes

##### BaseModal
- **Location:** `/components/modals/modal-base.js`
- **Purpose:** Reusable modal component
- **Features:** Dynamic content, button handlers, accessibility (Esc key, focus trap)
- **Usage:**
```javascript
import { BaseModal } from '/components/modals/modal-base.js';

const modal = new BaseModal({
  title: 'Confirm Action',
  content: '<p>Are you sure?</p>',
  buttons: [
    { text: 'Cancel', classes: 'btn-cancel' },
    { text: 'Confirm', classes: 'btn-primary' }
  ]
});
modal.show();
```

##### ConfirmationModal
- **Location:** `/components/modals/confirmation-modal.js`
- **Purpose:** Pre-configured confirmation dialogs
- **Features:** Promise-based API, danger mode
- **Usage:**
```javascript
import { ConfirmationModal } from '/components/modals/confirmation-modal.js';

const result = await ConfirmationModal.confirm({
  title: 'Delete Student?',
  message: 'This action cannot be undone.',
  danger: true
});
```

### Specialized Modals

#### Password Reset Modal
- **Location:** `/styles/components/password-reset-modal.css`
- **Features:** Multi-step form, security question selection
- **Components:** Form fields, security question dropdown, action buttons

#### Terms Modal
- **Location:** Registration page
- **Purpose:** Display terms and conditions
- **Features:** Scrollable content, structured terms layout

#### Date Picker Modal
- **Location:** `/functions/date-picker/date-picker.js`
- **Purpose:** Calendar-based date selection
- **Features:** Month navigation, date grid, today indicator

#### Success Modal (Gift Concessions)
- **Location:** `/admin/admin-tools/gift-concessions/index.html`
- **Purpose:** Display success message with details
- **Features:** Gift summary, action buttons (new gift / close)

#### Preview Modal (Email Templates)
- **Location:** `/admin/admin-tools/email-templates/index.html`
- **Purpose:** Email preview with HTML/Text tabs
- **Features:** Tab switching, variable substitution preview

### Modal Behavior

- **Opening:** Display property changes from `none` to `flex`
- **Closing Methods:**
  - Close button (×)
  - Cancel button
  - Escape key (BaseModal)
  - Click outside (optional, BaseModal)
- **Accessibility:**
  - Focus trap within modal
  - Escape key support
  - ARIA attributes
  - Return focus to trigger element on close

---

## Table System ✅

### Current Implementation

**Status:** ✅ Centralized in `/styles/components/tables.css`

**Consolidation Complete:** December 29, 2025

All data tables across the application now use a centralized design system with consistent styling, rainbow gradient headers, and proper responsive behavior.

### Table Structure

#### Base Components

**Table Container (`.table-container`)**
- **Purpose:** Wrapper for tables with scroll behavior
- **Variants:**
  - `.no-scroll` - No horizontal scrolling (student portal)
  - `.bordered` - Border around entire table container (admin)
- **Code:**
```html
<div class="table-container bordered">
  <table class="data-table">
    <!-- table content -->
  </table>
</div>
```

**Data Table (`.data-table`)**
- **Purpose:** Base table styling
- **Style:** Full width, border-collapse, consistent padding and alignment
- **Features:**
  - Left-aligned text columns
  - Right-aligned numeric columns (`.amount-cell`)
  - Hover effects on rows
  - Zebra striping (subtle)
- **Code:**
```html
<table class="data-table">
  <thead class="table-header-gradient">
    <tr>
      <th>Student Name</th>
      <th class="amount-cell">Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>John Doe</td>
      <td class="amount-cell">$50.00</td>
    </tr>
  </tbody>
</table>
```

### Table Header Variants

#### Rainbow Gradient Header (`.table-header-gradient`)
- **Purpose:** Standard table header with rainbow gradient
- **Style:** Full rainbow gradient (var(--gradient-full)), white text, 10px padding
- **Usage:** All tables across admin and student portal
- **Code:**
```html
<thead class="table-header-gradient">
  <tr>
    <th>Column 1</th>
    <th>Column 2</th>
  </tr>
</thead>
```

#### Sticky Header (`.sticky-header`)
- **Purpose:** Header stays visible while scrolling table body
- **Style:** position: sticky, top: 0, z-index for layering
- **Usage:** Admin tables with many rows (student database, transactions, merch orders)
- **Code:**
```html
<thead class="table-header-gradient sticky-header">
  <tr>
    <th>Column 1</th>
    <th>Column 2</th>
  </tr>
</thead>
```

### Table Features

#### Sortable Columns (`.sortable`)
- **Purpose:** Indicates column can be sorted
- **Style:** Cursor pointer, sort icon, hover effects
- **Features:**
  - Sort icon positioned right with flex
  - Icon rotates when sorted descending
  - Purple highlight on hover
- **Code:**
```html
<th class="sortable" data-sort="name">
  Student Name
  <i class="fas fa-sort"></i>
</th>
```

#### Special Row States

**Reversed Transaction (`.reversed`, `.reversed-transaction`)**
- **Purpose:** Visually distinguish reversed/cancelled transactions
- **Style:** Diagonal stripe pattern overlay, muted text
- **Code:**
```html
<tr class="reversed">
  <td>Transaction details</td>
</tr>
```

**Disabled Row (`.disabled`)**
- **Purpose:** Inactive or deleted records
- **Style:** Reduced opacity, muted appearance

**Selected Row (`.selected`)**
- **Purpose:** Currently selected record
- **Style:** Purple background highlight

#### Special Cell Types

**Amount Cell (`.amount-cell`)**
- **Purpose:** Monetary values
- **Style:** Right-aligned, bold font
- **Code:**
```html
<td class="amount-cell">$50.00</td>
```

**Date Cell (`.date-cell`)**
- **Purpose:** Date/time values
- **Style:** Specific formatting, appropriate alignment

**Action Buttons (`.action-buttons`)**
- **Purpose:** Container for action buttons in table rows
- **Style:** Flex layout with gap, centered alignment
- **Code:**
```html
<td class="action-buttons">
  <button class="btn-icon" title="Edit">
    <i class="fas fa-edit"></i>
  </button>
  <button class="btn-icon btn-delete" title="Delete">
    <i class="fas fa-trash"></i>
  </button>
</td>
```

### Responsive Behavior

**Mobile Tables (< 768px)**
- Tables hide on mobile, replaced with card layout (defined in individual page CSS)
- Card layout shows same data in vertical format
- Cards defined in individual table CSS files (transactions.css, check-ins.css, etc.)

### Padding Customization

**Default Padding:** `var(--space-sm)` (typically 8px)

**Custom Padding Overrides:**
- **Student Portal Tables:** 1rem (16px) for spacious layout
- **Admin Tables:** 12px for comfortable viewing

**Implementation:**
```css
/* In individual table CSS file */
.data-table th,
.data-table td {
    padding: 12px; /* Override default */
}
```

### Table Implementations

**Files Using Centralized Tables:**
1. `/student-portal/transactions/index.html` - Transaction history with rainbow gradient
2. `/admin/student-database/index.html` - Student list with sortable columns, sticky header
3. `/admin/check-in/index.html` - Check-in records with bordered container
4. `/admin/admin-tools/transactions/index.html` - Transaction management with sticky header
5. `/admin/admin-tools/merch-orders/index.html` - Merchandise orders with sticky header

### Consolidation Results ✅

**Completed:** December 29, 2025

**Files Updated:**
- Created: `/styles/components/tables.css` (~303 lines)
- Updated: 5 CSS files (imports + removed duplicates)
- Updated: 5 HTML files (proper class names)

**Lines Saved:** ~260 lines of duplicate CSS removed

**Key Achievements:**
- Single source of truth for table styling
- Consistent rainbow gradient across all tables
- Proper responsive behavior
- Maintainable and scalable design system
- Used !important intentionally for design system enforcement

**Design Principle:** Centralized styles with !important declarations ensure design system consistency over local ID selectors and inline styles.

---

## Color System

### Current Implementation

**Primary Location:** `/styles/base/colors.css`

### Brand Colors

#### Primary Palette
- **Purple Primary:** `--purple-primary` (#9a16f5) - Main brand color
- **Purple Dark:** `--purple-dark` (#7a0fcc) - Hover states
- **Purple Darker:** `--purple-darker` (#5a0b99) - Deep accents
- **Blue Primary:** `--blue-primary` (#1e90ff) - Secondary brand
- **Blue Accent:** `--blue-accent` (#00bcd4) - Teal accent
- **Pink Primary:** `--pink-primary` (#ff1493) - Accent highlights

#### Gradients
- **Blue-Purple:** `--gradient-blue-purple` - Primary CTA gradient
- **Purple-Pink:** `--gradient-purple-pink` - Hover state gradient
- **Full Gradient:** `--gradient-full` - Complete rainbow gradient (tile borders)

### Functional Colors

#### Status Colors
- **Success:** `--success` (#4caf50) - Positive actions, confirmations
- **Error:** `--error` (#f44336) - Errors, destructive actions
- **Warning:** `--warning` (#ff9800) - Warnings, cautions
- **Info:** `--info` (#2196f3) - Informational messages

#### Text Colors
- **Text Primary:** `--text-primary` (#333333) - Main text
- **Text Secondary:** `--text-secondary` (#666666) - Supporting text
- **Text Muted:** `--text-muted` (#999999) - Disabled/subtle text
- **Text White:** `--text-white` (#ffffff) - Light text

### Background Colors

#### Surface Colors
- **White:** `--white` (#ffffff)
- **Card Background:** `--card-bg` (#ffffff)
- **Card Light:** `--card-light` (#fafafa)
- **Card Dark:** `--card-dark` (#2a2a2a) - Dark mode

#### Purple Backgrounds
- **Purple Light:** `--bg-purple-light` (rgba(154, 22, 245, 0.05))
- **Purple Medium:** `--bg-purple-medium` (rgba(154, 22, 245, 0.1))
- **Purple Strong:** `--bg-purple-strong` (rgba(154, 22, 245, 0.3))
- **Purple Alt:** `--bg-purple-alt` (rgba(154, 22, 245, 0.08))
- **Purple Alt Medium:** `--bg-purple-alt-medium` (rgba(154, 22, 245, 0.15))

#### Status Backgrounds
- **Success Light:** `--bg-success-light` (rgba(76, 175, 80, 0.1))
- **Error Light:** `--bg-error-light` (rgba(244, 67, 54, 0.1))
- **Warning Light:** `--warning-lighter` (#fff3e0)
- **Info Light:** `--info-light` (#e3f2fd)

### Border Colors

- **Border Light:** `--border-light` (#e0e0e0) - Subtle borders
- **Border Color:** `--border-color` (#d0d0d0) - Standard borders
- **Border Purple:** `--border-purple` (#9a16f5) - Focus/active states
- **Border Overlay Strong:** `--border-overlay-strong` (rgba(255, 255, 255, 0.3))

### Shadow Colors

- **Shadow Light:** `--shadow-light` (rgba(0, 0, 0, 0.05))
- **Shadow Medium:** `--shadow-medium` (rgba(0, 0, 0, 0.1))
- **Shadow Dark:** `--shadow-dark` (rgba(0, 0, 0, 0.2))
- **Shadow Text:** `--shadow-text` (rgba(0, 0, 0, 0.5))

### Shadow Definitions

- **Shadow Small:** `--shadow-sm` - 0 1px 2px
- **Shadow Medium:** `--shadow-md` - 0 4px 6px
- **Shadow Large:** `--shadow-lg` - 0 10px 15px
- **Shadow Extra Large:** `--shadow-xl` - 0 20px 25px

### Overlay Colors

- **Overlay Dark:** `--bg-overlay-dark` (rgba(0, 0, 0, 0.6)) - Modal overlays
- **Overlay Spinner:** `--bg-overlay-spinner` (rgba(0, 0, 0, 0.6)) - Loading spinner overlay

### Usage Guidelines

- **Always use CSS variables** - Never hardcode hex values
- **Purple for primary actions** - Buttons, links, active states
- **Blue for informational** - Secondary actions, info badges
- **Status colors for feedback** - Success, error, warning messages
- **Gradients for emphasis** - Primary CTAs, hero sections, tile accents

---

## Typography

### Current Implementation

**Primary Location:** `/styles/base/typography.css` (formerly `/css/base/typography.css`)

### Font Family

**Primary:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`
- System font stack for optimal performance and native appearance

### Font Sizes

#### CSS Variables (Design Tokens)
- `--font-size-xs` - 0.75rem (12px) - Small labels
- `--font-size-sm` - 0.875rem (14px) - Form labels, secondary text
- `--font-size-base` - 1rem (16px) - Body text
- `--font-size-lg` - 1.125rem (18px) - Large body text
- `--font-size-xl` - 1.25rem (20px) - Subheadings
- `--font-size-2xl` - 1.5rem (24px) - Section titles
- `--font-size-3xl` - 2rem (32px) - Page titles
- `--font-size-4xl` - 2.5rem (40px) - Hero headings
- `--font-size-5xl` - 3rem (48px) - Large hero headings

### Headings

- **H1:** 2.5rem (40px), bold, purple gradient text
- **H2:** 2rem (32px), bold, primary color
- **H3:** 1.5rem (24px), semibold
- **H4:** 1.25rem (20px), semibold
- **H5:** 1.125rem (18px), semibold
- **H6:** 1rem (16px), semibold

### Font Weights

- **Normal:** 400 - Body text
- **Medium:** 500 - Form labels, emphasis
- **Semibold:** 600 - Buttons, headings
- **Bold:** 700 - Strong emphasis, amounts

### Line Heights

- `--line-height-tight` - 1.25 - Headings
- `--line-height-normal` - 1.5 - Body text
- `--line-height-relaxed` - 1.75 - Readable paragraphs
- `--line-height-loose` - 2 - Spacious layouts

### Text Utilities

#### Text Colors
- `.text-primary` - Main text color
- `.text-secondary` - Secondary text
- `.text-muted` - Subtle text
- `.text-white` - White text (on dark backgrounds)
- `.text-warning` - Warning color
- `.text-success` - Success color
- `.text-error` - Error color

#### Text Alignment
- Standard: left, center, right, justify

#### Text Transform
- `.text-uppercase` - Uppercase text (badges, labels)
- `.text-capitalize` - Capitalize first letter
- `.text-lowercase` - Lowercase text

---

## Spacing & Layout

### Current Implementation

**Primary Location:** `/styles/base/design-tokens.css`

### Spacing Scale

#### CSS Variables
- `--space-xs` - 0.25rem (4px) - Minimal spacing
- `--space-sm` - 0.5rem (8px) - Small spacing
- `--space-md` - 1rem (16px) - Standard spacing
- `--space-lg` - 1.5rem (24px) - Large spacing
- `--space-xl` - 2rem (32px) - Extra large spacing
- `--space-2xl` - 3rem (48px) - Section spacing
- `--space-3xl` - 4rem (64px) - Major section spacing

### Border Radius

- `--radius-xs` - 0.125rem (2px) - Minimal rounding
- `--radius-sm` - 0.25rem (4px) - Small rounding (buttons)
- `--radius-md` - 0.5rem (8px) - Medium rounding (cards)
- `--radius-lg` - 0.75rem (12px) - Large rounding
- `--radius-xl` - 1rem (16px) - Extra large rounding (feature cards)
- `--radius-2xl` - 1.5rem (24px) - Major rounding
- `--radius-full` - 9999px - Full rounding (pills, circles)

### Transitions

- `--transition-fast` - 0.15s ease - Quick interactions (buttons)
- `--transition-base` - 0.2s ease - Standard transitions (cards)
- `--transition-slow` - 0.3s ease - Deliberate animations (modals)

### Z-Index Layers

- `--z-base` - 1 - Base layer
- `--z-dropdown` - 1000 - Dropdowns
- `--z-sticky` - 1100 - Sticky headers
- `--z-fixed` - 1200 - Fixed elements
- `--z-modal-backdrop` - 1300 - Modal overlays
- `--z-modal` - 1400 - Modals
- `--z-popover` - 1500 - Popovers
- `--z-tooltip` - 1600 - Tooltips

### Container Widths

- `--max-width-sm` - 640px - Narrow content
- `--max-width-md` - 768px - Standard forms
- `--max-width-lg` - 1024px - Wide content
- `--max-width-xl` - 1280px - Extra wide layouts
- `--max-width-2xl` - 1536px - Full-width sections

### Layout Utilities

#### Containers
- `.container` - Centered container with max-width
- `.portal-container` - Student/admin portal main content area
- `.table-container` - Scrollable table wrapper

#### Flex Utilities
- `.btn-group` - Horizontal button group
- `.btn-group-vertical` - Vertical button group
- `.form-row` - Side-by-side form fields (2-column grid)

#### Grid Utilities
- `.card-grid` - Responsive card grid
- `.checkbox-row` - 3-column checkbox grid

---

## Component Usage Guidelines

### When to Use Each Button Type

| Button Type | Use Cases | Avoid Using For |
|------------|-----------|----------------|
| `.btn-primary` | Main actions, form submission, CTAs | Cancel, delete, low-priority |
| `.btn-cancel` | Cancel forms, close dialogs (non-destructive) | Confirm actions, delete |
| `.btn-delete` / `.btn-danger` | Delete records, irreversible destructive actions | Cancel, close |
| `.btn-success` | Confirm positive actions, approve | Delete, cancel |
| `.btn-tertiary` | View details, show more, low-priority | Primary actions |
| `.btn-icon` | Icon-only actions in tables, space-constrained UI | Text buttons needed |

### When to Use Each Card Type

| Card Type | Use Cases | Avoid Using For |
|-----------|-----------|----------------|
| `.card` | General content containers, info sections | Navigation (use tiles) |
| `.tile-gradient` | Navigation cards, clickable features | Static content |
| `.card-elevated` | Important highlighted content | Every card (overuse) |
| `.card-feature` | Hero features, centered content blocks | Form containers |
| `.card-grid` | Multiple similar items | Single item display |

### Form Field Guidelines

- **Always wrap fields in `.form-group`** for consistent spacing
- **Use `.form-row` for related fields** (e.g., first/last name)
- **Include icons in labels** for visual interest and clarity
- **Show validation immediately** after user interaction (blur event)
- **Use placeholder text** for format examples, not instructions
- **Required fields:** Mark with asterisk (*) or `.required` span
- **Readonly fields:** Use light purple background to indicate non-editable state

### Modal Best Practices

- **Keep modals focused** - One primary action per modal
- **Provide clear exit options** - Close button (×) + Cancel button + Escape key
- **Use danger variant** for destructive actions
- **Confirmation messages** should clearly state what will happen
- **Avoid modal inception** - Don't open modals from modals

### Accessibility Considerations

#### Buttons
- **Always include text or aria-label** for icon buttons
- **Use semantic `<button>` elements** not `<div>` with click handlers
- **Maintain focus states** - Don't remove outline without alternative
- **Loading states** should announce to screen readers

#### Forms
- **Every input needs a label** - Use `<label>` elements, not just placeholders
- **Associate labels with inputs** using `for` attribute
- **Error messages** should be announced to screen readers
- **Required fields** should be programmatically marked (not just visually)

#### Modals
- **Focus trap** - Keep focus within modal while open
- **Return focus** to trigger element when closed
- **Escape key** should always close modal
- **ARIA attributes** - role="dialog", aria-labelledby, aria-describedby

#### Colors
- **Ensure sufficient contrast** - Minimum 4.5:1 for normal text
- **Don't rely on color alone** - Use icons, text, or patterns too
- **Test in color-blind simulators** - Especially for status colors

---

## Inconsistencies & Recommendations

### ✅ Completed (Dec 28-29, 2025)

#### 1. ✅ Icon Button Styles Centralized
- **Was:** `.btn-icon` defined locally in 3+ admin files
- **Fixed:** Moved to `/styles/base/buttons.css` with all variants
- **Result:** ~70 lines of duplicate CSS removed
- **Files Updated:** student-database.css, transactions.css, gift-concessions.css

#### 2. ✅ Pagination Buttons Centralized
- **Was:** Pagination button styles duplicated in 4 separate files
- **Fixed:** Moved to `/styles/base/buttons.css`
- **Result:** ~240 lines of duplicate CSS removed
- **Files Updated:** student-database.css, admin/transactions.css, student-portal/transactions.css, student-portal/check-ins.css
- **Improvements:** Student portal pagination now matches admin style with page number buttons

#### 3. ✅ Badge System Centralized
- **Was:** Badge styles scattered across 10+ files (~250 lines duplicate)
- **Fixed:** Created `/styles/components/badges.css` with all badge types
- **Result:** Single source of truth, consistent styling, ~250 lines saved
- **Color Update:** `.badge-invoiced` changed from blue to purple
- **Files Updated:** All admin/student portal pages using badges

#### 4. ✅ Table System Centralized
- **Was:** Table styles duplicated across 5 separate files (~260 lines duplicate)
- **Fixed:** Created `/styles/components/tables.css` with centralized table styling
- **Result:** Single source of truth, consistent rainbow gradient headers, ~260 lines saved
- **Gradient Update:** All tables standardized to rainbow gradient (var(--gradient-full))
- **Files Updated:** student-portal/transactions, admin/student-database, admin/check-in, admin/transactions, admin/merch-orders
- **Design Principle:** Used !important for design system enforcement over local styles

### 🟡 Medium Priority Issues

#### 3. Card vs Tile Naming Confusion ✅
- **Status:** RESOLVED - Documentation complete
- **Outcome:** Clear usage guidelines documented in Card & Tile Components section
- **Decision:** Cards for static content containers, tiles for clickable navigation/features
- **Note:** No code consolidation needed - both already centralized in `/styles/components/`

#### 4. Modal System Analysis ✅
- **Status:** ALREADY OPTIMIZED - No action needed
- **Current Implementation:**
  - **BaseModal & ConfirmationModal:** Core modal system in `/components/modals/` used by 20+ files
  - **Centralized Styles:** `/styles/modals/modal-base.css` & `confirmation-modal.css` provide base styling
  - **Complex Modals:** Standalone modals with custom HTML for specialized UI:
    - Student Database modals (notes, concessions, transaction history) - complex forms/tables
    - Playlist Manager modals (track management, filters) - custom interactive UI
    - Email Templates modals (preview, history) - specialized layouts
    - Closedown Nights, Merch Orders, Gift Concessions - feature-specific modals
  - **Duplicate Modal Styles:** Found in 8 CSS files (student-portal pages, admin tools)
- **Analysis:**
  - ✅ Simple confirmations use ConfirmationModal (delete, cancel, warnings) - GOOD
  - ✅ Dynamic content uses BaseModal (password change, terms, email exists) - GOOD
  - ✅ Complex UI uses inline HTML modals with shared base styles - APPROPRIATE
  - ⚠️ Modal base styles duplicated in profile.css, purchase.css, prepay.css, registration-form.css (~150-200 lines each)
- **Recommendation:** Accept current architecture as intentional design
  - Complex modals require inline HTML for maintainability
  - Duplicate styles are overrides/extensions of base modal styles (not true duplicates)
  - Refactoring would reduce flexibility without significant benefit
- **Effort if pursued:** 6-8 hours (not recommended)
- **Decision:** ✅ LEAVE AS-IS - Current implementation is appropriate for use cases

#### 5. Form Validation Patterns Inconsistent
- **Current:** Multiple validation approaches (inline, modal, snackbar)
- **Impact:** Confusing UX
- **Recommendation:** Standardize on inline errors + success snackbar pattern
- **Effort:** 2 hours (update forms)

### 🟢 Nice-to-Have Improvements

#### 6. Table Styles - Mixed Pattern (Analysis Complete) ✅
- **Status:** ANALYZED - Partial consolidation recommended
- **Current Implementation:**
  - **Table Container:** `.table-container` duplicated in 5 files (student-portal/transactions, admin student-database, admin check-in, admin transactions, admin merch-orders)
  - **Table Headers:** Gradient header styles (`var(--gradient-blue-purple)` or `var(--gradient-full)`) duplicated across all tables
  - **Common Patterns:** Sticky headers (admin tables), sortable columns with icons, hover states, alignment classes
  - **Unique Features:**
    - Student Database: Expandable rows (mobile), complex column hiding
    - Check-Ins (student portal): Card-based layout (not table-based)
    - Playlist Manager: Drag-and-drop tracks, specialized track controls
    - Check-In (admin): Transaction list with concession badges
- **Duplicate Code Found:**
  - `.table-container` base styles: ~10 lines × 5 files = ~50 lines
  - `thead` gradient styling: ~15 lines × 6 files = ~90 lines
  - Sortable header styles: ~20 lines × 3 files = ~60 lines
  - `tbody tr` hover/border styles: ~10 lines × 6 files = ~60 lines
  - **Total estimated duplication: ~260 lines**
- **Recommendation:** Create `/styles/components/tables.css` with:
  - Base `.table-container` styles
  - Base table styles (`.data-table` or similar)
  - Gradient header utilities (`.table-header-gradient`)
  - Sortable column styles (`.sortable-header`)
  - Common row states (hover, reversed, etc.)
  - Allow page-specific extensions for unique features
- **Effort:** 4-5 hours (extract common patterns, update 6 files, test all tables)
- **Impact:** Medium - Reduces duplication but tables have legitimate differences
- **Note:** Student portal check-ins uses card layout, not table - exclude from consolidation

#### 7. Loading States Vary
- **Current:** Custom table styles in each admin section
- **Recommendation:** Create base table component in `/styles/components/`
- **Effort:** 4 hours

#### 8. Loading States Vary
- **Current:** `.loading` class on buttons, but also custom spinners
- **Recommendation:** Document all loading patterns clearly
- **Effort:** 1 hour (documentation only)

#### 9. Mobile Responsive Patterns Unclear
- **Current:** Ad-hoc media queries throughout
- **Recommendation:** Document mobile breakpoints and responsive utilities
- **Effort:** 2 hours (audit + documentation)

---

## Next Steps for Phase 2

### Immediate Actions (Week 1)

1. ~~Document badge component system~~ ✅ **COMPLETE** - Badge consolidation finished Dec 29
2. ~~Clarify card vs tile usage~~ ✅ **COMPLETE** - Already centralized, documentation clear
3. ~~Analyze modal implementations~~ ✅ **COMPLETE** - Current architecture appropriate

### Short-term Goals (Weeks 2-3)

4. ~~Standardize modal implementations~~ ✅ **NOT NEEDED** - Already optimized for use cases
5. **Unify form validation approach** (inline errors + success feedback)
6. **Create table component system** (extract common patterns)

### Long-term Vision (Month 2+)

7. **Build component demo page** (living style guide with live examples)
8. **Create design system website** (searchable, interactive component library)
9. **Implement design tokens** (further consolidate CSS variables)

---

## Resources

### Key Files

- **Buttons:** `/styles/base/buttons.css`
- **Colors:** `/styles/base/colors.css`
- **Typography:** `/styles/base/typography.css`
- **Design Tokens:** `/styles/base/design-tokens.css`
- **Forms:** `/styles/components/forms.css`
- **Cards:** `/styles/components/public-cards.css`
- **Tiles:** `/styles/components/tiles.css`
- **Modals:** `/styles/modals/modal-base.css`, `/styles/modals/confirmation-modal.css`

### Related Documentation

- **Color System:** `CSS_COLORS_AND_ICONS_REFACTORING.md`
- **Icon Constants:** `ICON_CONSOLIDATION_ANALYSIS.md`
- **Utility Functions:** `CENTRALIZED_UTILS_SUMMARY.md`
- **CSS Consolidation:** `CSS_CONSOLIDATION_AUDIT.md`

---

**Document Version:** 1.0 (Phase 1 Complete)  
**Last Updated:** December 28, 2025  
**Next Review:** After Phase 2 standardization work
