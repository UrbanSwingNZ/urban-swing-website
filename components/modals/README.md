# Modal Components

Reusable modal dialog system for Urban Swing website.

## Overview

This folder contains the base modal system that provides consistent modal functionality across the entire application. All modals share common behavior and styling, reducing code duplication and ensuring a consistent user experience.

## Files

### JavaScript Components

- **`modal-base.js`** - Foundation class for all modals
  - Handles modal lifecycle (show, hide, destroy)
  - Manages keyboard interactions (ESC to close)
  - Handles overlay clicks
  - Provides focus management and accessibility
  - Locks body scroll when modal is open

- **`confirmation-modal.js`** - Specialized confirmation dialogs
  - Extends `BaseModal`
  - Provides confirm/cancel button pattern
  - Supports variants: warning, danger, info
  - Used for: unsaved changes, delete confirmations, etc.

### Stylesheets (in `/styles/modals/`)

- **`modal-base.css`** - Base modal styles
- **`confirmation-modal.css`** - Confirmation modal specific styles
- **`modal-buttons.css`** - Standardized button styles

## Usage

### 1. Include Required Files

```html
<!-- In your HTML -->
<link rel="stylesheet" href="/styles/base/colors.css">
<link rel="stylesheet" href="/styles/modals/modal-base.css">
<link rel="stylesheet" href="/styles/modals/modal-buttons.css">

<script src="/components/modals/modal-base.js"></script>
<script src="/components/modals/confirmation-modal.js"></script>
```

### 2. Basic Modal Example

```javascript
// Create a simple modal
const modal = new BaseModal({
    id: 'my-modal',
    title: 'Information',
    content: '<p>This is a modal dialog.</p>',
    buttons: [
        {
            text: 'Close',
            class: 'btn-primary',
            onClick: (modal) => modal.hide()
        }
    ]
});

// Show the modal
modal.show();
```

### 3. Confirmation Modal Example

```javascript
// Create a confirmation dialog
const confirmModal = new ConfirmationModal({
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. Are you sure you want to leave this page?',
    icon: 'fas fa-exclamation-triangle',
    variant: 'warning',
    confirmText: 'Leave Page',
    confirmClass: 'btn-danger',
    cancelText: 'Stay',
    onConfirm: () => {
        window.location.href = '/dashboard';
    },
    onCancel: () => {
        console.log('User chose to stay');
    }
});

// Show when user tries to navigate away
document.getElementById('cancel-btn').addEventListener('click', () => {
    confirmModal.show();
});
```

### 4. Delete Confirmation Example

```javascript
const deleteModal = new ConfirmationModal({
    title: 'Delete Student',
    message: `
        <p>Are you sure you want to delete this student?</p>
        <div class="student-info-delete">
            <strong>John Doe</strong>
            <span>john@example.com</span>
        </div>
        <p class="text-muted">This action cannot be undone.</p>
    `,
    icon: 'fas fa-trash',
    variant: 'danger',
    confirmText: 'Delete',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
        await deleteStudent(studentId);
        showSnackbar('Student deleted successfully', 'success');
    }
});

deleteButton.addEventListener('click', () => deleteModal.show());
```

### 5. Using with Existing HTML Modal

```javascript
// Attach to an existing modal element in your HTML
const existingModal = new BaseModal({
    element: document.getElementById('existing-modal'),
    closeOnEscape: true,
    closeOnOverlay: true
});

// The modal will now have ESC key and overlay click functionality
existingModal.show();
```

## Configuration Options

### BaseModal Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | string | Auto-generated | Unique ID for modal element |
| `element` | HTMLElement | null | Existing modal element to use |
| `title` | string | '' | Modal title |
| `content` | string | '' | Modal body content (HTML) |
| `buttons` | Array | [] | Array of button configs |
| `size` | string | 'medium' | Modal size: 'small', 'medium', 'large' |
| `closeOnEscape` | boolean | true | Close on ESC key |
| `closeOnOverlay` | boolean | true | Close on overlay click |
| `showCloseButton` | boolean | true | Show X close button |
| `onOpen` | Function | null | Callback when modal opens |
| `onClose` | Function | null | Callback when modal closes |
| `onBeforeClose` | Function | null | Callback before close (can prevent) |

### ConfirmationModal Options

Inherits all BaseModal options, plus:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `message` | string | '' | Confirmation message (HTML) |
| `icon` | string | null | Icon class (e.g., 'fas fa-warning') |
| `confirmText` | string | 'Confirm' | Confirm button text |
| `confirmClass` | string | 'btn-primary' | Confirm button class |
| `cancelText` | string | 'Cancel' | Cancel button text |
| `cancelClass` | string | 'btn-secondary' | Cancel button class |
| `variant` | string | null | Modal variant: 'warning', 'danger', 'info' |
| `onConfirm` | Function | null | Callback when confirmed |
| `onCancel` | Function | null | Callback when cancelled |

## Button Classes

Available button classes (from `modal-buttons.css`):

- `btn-primary` - Primary action (gradient purple/blue)
- `btn-secondary` - Secondary action (outlined)
- `btn-danger` - Destructive action (red)
- `btn-success` - Success action (green)
- `btn-cancel` - Cancel action (alias for secondary)

## Variants

Confirmation modal variants affect the header styling:

- `warning` - Yellow/orange theme for cautionary actions
- `danger` - Red theme for destructive actions
- `info` - Blue theme for informational confirmations

## Methods

### BaseModal Methods

- `show()` - Show the modal
- `hide()` - Hide the modal
- `toggle()` - Toggle modal visibility
- `setContent(content)` - Update modal content
- `setTitle(title)` - Update modal title
- `destroy()` - Remove modal and clean up

### ConfirmationModal Methods

Inherits all BaseModal methods, plus:

- `setMessage(message)` - Update confirmation message

## Migration Guide

### Replacing Existing Modals

If you have an existing modal like this:

```html
<!-- Old way -->
<div id="cancel-modal" class="modal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Unsaved Changes</h3>
        </div>
        <div class="modal-body">
            <p>Are you sure you want to leave?</p>
        </div>
        <div class="modal-footer">
            <button onclick="closeCancelModal()">Stay</button>
            <button onclick="leavePage()">Leave</button>
        </div>
    </div>
</div>
```

```javascript
// Old JavaScript
function showCancelModal() {
    document.getElementById('cancel-modal').style.display = 'flex';
}

function closeCancelModal() {
    document.getElementById('cancel-modal').style.display = 'none';
}
```

Replace with:

```javascript
// New way - much simpler!
const cancelModal = new ConfirmationModal({
    title: 'Unsaved Changes',
    message: 'Are you sure you want to leave?',
    confirmText: 'Leave',
    confirmClass: 'btn-danger',
    cancelText: 'Stay',
    onConfirm: () => window.location.href = '/dashboard'
});

// Show it
document.getElementById('cancel-btn').onclick = () => cancelModal.show();
```

Benefits:
- ✅ Remove HTML modal markup
- ✅ Remove duplicate CSS
- ✅ Remove custom show/hide functions
- ✅ Automatic ESC key and overlay click handling
- ✅ Better accessibility
- ✅ Consistent styling

## Best Practices

1. **Always use color variables** from `/styles/base/colors.css`
2. **Keep callbacks simple** - complex logic should be in separate functions
3. **Use appropriate variants** - helps users understand the action's severity
4. **Provide clear messages** - users should understand what will happen
5. **Don't nest modals** - close one before opening another
6. **Clean up** - call `destroy()` if modal is no longer needed

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11+ (with polyfills for CSS variables)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

All modals include:

- ✅ ARIA roles and labels
- ✅ Keyboard navigation (ESC to close, Tab to navigate)
- ✅ Focus management (traps focus, restores after close)
- ✅ Screen reader support
- ✅ Color contrast compliance

## Future Enhancements

Potential additions:

- Form validation modal
- Multi-step wizard modal
- Image gallery modal
- Video player modal
- Custom animation options
