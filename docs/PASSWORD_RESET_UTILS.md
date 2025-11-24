# Password Reset Utilities Documentation

## Overview

The password reset utilities provide a reusable, consistent way to implement password reset functionality across the Urban Swing website. The utilities are designed to work in multiple contexts:

- Student portal login page
- Admin portal login page
- User profile pages
- Any other area where password reset is needed

## Files

### JavaScript
- **`/js/password-reset-utils.js`** - Core utility functions

### CSS
- **`/css/components/password-reset-modal.css`** - Modal styling

## Features

✅ **Reusable** - Use the same code in multiple places  
✅ **Flexible** - Supports modal dialogs and inline forms  
✅ **User-friendly** - Clear error messages and loading states  
✅ **Accessible** - Proper ARIA labels and keyboard support  
✅ **Responsive** - Works on mobile and desktop  
✅ **Consistent** - Matches your existing UI patterns

## Usage Examples

### Method 1: Modal Dialog (Recommended)

The easiest way to add password reset functionality. Shows a professional modal dialog.

#### Basic Implementation

```html
<!-- Include the scripts and styles -->
<link rel="stylesheet" href="/css/components/password-reset-modal.css">
<script src="/js/password-reset-utils.js"></script>

<!-- Add a button to trigger the modal -->
<button id="forgot-password-btn">Forgot Password?</button>

<script>
    // Show modal when button is clicked
    document.getElementById('forgot-password-btn').addEventListener('click', () => {
        showPasswordResetModal();
    });
</script>
```

#### With Email Pre-filled

```javascript
// Prefill with the email from the login form
const emailInput = document.getElementById('email');
document.getElementById('forgot-password-btn').addEventListener('click', () => {
    showPasswordResetModal(emailInput.value);
});
```

#### With Callback

```javascript
// Do something after password reset is sent
document.getElementById('forgot-password-btn').addEventListener('click', () => {
    showPasswordResetModal('', (email) => {
        console.log('Password reset sent to:', email);
        // Show a notification, redirect, etc.
    });
});
```

#### Advanced Modal Configuration

```javascript
createPasswordResetModal({
    title: 'Reset Your Password',
    description: 'We\'ll send you an email with instructions to reset your password.',
    emailPlaceholder: 'your.email@example.com',
    prefillEmail: 'student@example.com',
    onComplete: (email) => {
        console.log('Password reset email sent to:', email);
        // Redirect or show confirmation
    }
});
```

---

### Method 2: Inline Form Handler

For existing forms where you want to add password reset without a modal.

```html
<!-- Your existing form -->
<form>
    <input type="email" id="email" placeholder="Email">
    <button type="submit">Login</button>
    <button type="button" id="reset-btn">Reset Password</button>
    <div id="reset-message"></div>
</form>

<script>
    // Attach handler to the button
    attachPasswordResetHandler({
        button: document.getElementById('reset-btn'),
        emailInput: document.getElementById('email'),
        messageElement: document.getElementById('reset-message'),
        onSuccess: (message, email) => {
            console.log('Success:', message);
        },
        onError: (message, error) => {
            console.error('Error:', message);
        }
    });
</script>
```

#### With Dynamic Email Source

```javascript
// Get email from a function instead of an input element
attachPasswordResetHandler({
    button: document.getElementById('reset-btn'),
    emailInput: () => {
        // Your custom logic to get the email
        return getCurrentUserEmail();
    },
    messageElement: document.getElementById('reset-message')
});
```

---

### Method 3: Direct API Call

For complete control, use the core function directly.

```javascript
const result = await sendPasswordReset('user@example.com', {
    onSuccess: (message, email) => {
        alert(message);
        console.log('Email sent to:', email);
    },
    onError: (message, error) => {
        alert(message);
        console.error('Error:', error);
    },
    onValidationError: (message) => {
        alert(message);
    }
});

// Or use the return value
if (result.success) {
    console.log('Success:', result.message);
} else {
    console.log('Failed:', result.message);
}
```

---

## API Reference

### `showPasswordResetModal(prefillEmail, onComplete)`

Quick function to show a password reset modal.

**Parameters:**
- `prefillEmail` (string, optional) - Email to prefill in the modal
- `onComplete` (function, optional) - Callback when reset email is sent successfully

**Returns:** HTMLElement (the modal element)

---

### `createPasswordResetModal(options)`

Create a customized password reset modal.

**Options:**
- `title` (string) - Modal title (default: "Reset Password")
- `description` (string) - Description text
- `emailPlaceholder` (string) - Placeholder for email input
- `prefillEmail` (string) - Email to prefill
- `onComplete` (function) - Callback when modal completes successfully

**Returns:** HTMLElement (the modal element)

---

### `attachPasswordResetHandler(options)`

Attach password reset functionality to an existing button.

**Options:**
- `button` (HTMLElement, required) - Button to attach handler to
- `emailInput` (HTMLElement or function, required) - Email input element or function returning email
- `messageElement` (HTMLElement, optional) - Element to display messages
- `onSuccess` (function, optional) - Success callback
- `onError` (function, optional) - Error callback

**Returns:** void

---

### `sendPasswordReset(email, options)`

Core function to send password reset email.

**Parameters:**
- `email` (string, required) - User's email address

**Options:**
- `onSuccess` (function) - Called with (message, email) on success
- `onError` (function) - Called with (message, error) on error
- `onValidationError` (function) - Called with (message) on validation error

**Returns:** Promise<{success: boolean, message: string}>

---

## Error Handling

The utilities provide user-friendly error messages for common scenarios:

| Firebase Error Code | User-Friendly Message |
|---------------------|----------------------|
| `auth/user-not-found` | "No account found with this email address." |
| `auth/invalid-email` | "Invalid email address format." |
| `auth/too-many-requests` | "Too many reset attempts. Please try again later." |
| `auth/network-request-failed` | "Network error. Please check your connection and try again." |
| (empty email) | "Please enter your email address." |
| (invalid format) | "Please enter a valid email address." |

---

## Styling Customization

The modal is fully customizable via CSS. Override any of these classes:

```css
/* Main modal container */
.password-reset-modal { }

/* Background overlay */
.password-reset-overlay { }

/* Modal content box */
.password-reset-content { }

/* Close button */
.password-reset-close { }

/* Email input */
.password-reset-input { }

/* Message display */
.password-reset-message { }
.password-reset-message.success { }
.password-reset-message.error { }

/* Buttons */
.password-reset-buttons .btn-cancel { }
.password-reset-buttons .btn-submit { }
```

### Custom Theme Example

```css
/* Custom branding */
.password-reset-content {
    border-top: 4px solid #your-brand-color;
}

.password-reset-buttons .btn-submit {
    background: #your-brand-color;
}
```

---

## Integration Examples

### Student Portal Login Page

```javascript
// In student-portal/js/login.js
const resetBtn = document.querySelector('.reset-btn');
resetBtn.addEventListener('click', () => {
    const emailInput = document.getElementById('existingStudentEmail');
    showPasswordResetModal(emailInput.value);
});
```

### Admin Portal Login Page

```javascript
// In admin/admin.js
document.getElementById('forgot-password-link').addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    showPasswordResetModal(email, (sentEmail) => {
        console.log('Password reset sent to admin:', sentEmail);
    });
});
```

### User Profile Page

```javascript
// In profile page
document.getElementById('change-password-btn').addEventListener('click', () => {
    const currentUserEmail = firebase.auth().currentUser?.email || '';
    showPasswordResetModal(currentUserEmail, () => {
        alert('Check your email to complete the password change.');
    });
});
```

---

## Browser Compatibility

- ✅ Chrome/Edge (modern versions)
- ✅ Firefox (modern versions)
- ✅ Safari (modern versions)
- ✅ Mobile browsers (iOS Safari, Chrome Android)

Requires Firebase Auth SDK to be loaded.

---

## Best Practices

1. **Always validate email** - The utility does this automatically
2. **Provide clear feedback** - Use the onSuccess/onError callbacks
3. **Don't expose user existence** - Firebase handles this by default
4. **Rate limiting** - Firebase automatically rate limits reset attempts
5. **Test thoroughly** - Try invalid emails, network errors, etc.

---

## Troubleshooting

### "Firebase Auth not initialized" error

Make sure Firebase is loaded before using these utilities:

```html
<!-- Load Firebase first -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
<script src="/config/firebase-config.js"></script>

<!-- Then load password reset utilities -->
<script src="/js/password-reset-utils.js"></script>
```

### Modal doesn't appear

1. Check that CSS file is loaded
2. Check browser console for errors
3. Verify Firebase is initialized
4. Check z-index conflicts (modal uses z-index: 10000)

### Emails not being received

1. Check Firebase Console > Authentication > Templates
2. Verify email is correct (check spam folder)
3. Check Firebase Auth rate limits
4. Verify domain is authorized in Firebase Console

---

## Future Enhancements

Possible improvements for future versions:

- [ ] Custom email templates
- [ ] Internationalization (i18n) support
- [ ] Analytics tracking
- [ ] Custom redirect URLs after reset
- [ ] Password strength indicator
- [ ] Multi-step verification

---

## Support

For issues or questions about the password reset utilities:

1. Check this documentation
2. Review the implementation examples
3. Check browser console for errors
4. Verify Firebase configuration

---

## License

Part of the Urban Swing website codebase.
