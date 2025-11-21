# Password Reset Implementation - Quick Start Guide

## 📋 What's Been Created

A complete, reusable password reset system that can be used across your entire website without code duplication.

### Files Created:
1. **`/js/password-reset-utils.js`** - Core JavaScript functionality
2. **`/css/components/password-reset-modal.css`** - Modal styling
3. **`/docs/PASSWORD_RESET_UTILS.md`** - Complete documentation
4. **`/examples/password-reset-examples.html`** - Live examples and demos

---

## 🚀 Quick Implementation (3 Steps)

### Step 1: Include the Files

Add these to your HTML `<head>`:

```html
<!-- CSS -->
<link rel="stylesheet" href="/css/components/password-reset-modal.css">

<!-- JavaScript (after Firebase is loaded) -->
<script src="/js/password-reset-utils.js"></script>
```

### Step 2: Add a Button

```html
<button id="forgot-password-btn">Forgot Password?</button>
```

### Step 3: Show the Modal

```javascript
document.getElementById('forgot-password-btn').addEventListener('click', () => {
    showPasswordResetModal();
});
```

**That's it!** You now have a fully functional password reset modal.

---

## 💡 Common Use Cases

### Use Case #1: Login Page with "Forgot Password" Link

```javascript
// Get email from login form
const emailInput = document.getElementById('email');

document.getElementById('forgot-password-link').addEventListener('click', (e) => {
    e.preventDefault();
    showPasswordResetModal(emailInput.value);
});
```

### Use Case #2: Inline Reset Button (No Modal)

```javascript
attachPasswordResetHandler({
    button: document.getElementById('reset-btn'),
    emailInput: document.getElementById('email'),
    messageElement: document.getElementById('message')
});
```

### Use Case #3: User Profile "Change Password" Button

```javascript
document.getElementById('change-password-btn').addEventListener('click', () => {
    const currentUserEmail = firebase.auth().currentUser?.email || '';
    showPasswordResetModal(currentUserEmail, () => {
        alert('Check your email to reset your password!');
    });
});
```

---

## 🎯 Where to Implement (Your Request)

You mentioned 3 places to wire this up. Here are the most likely candidates:

### 1. **Student Portal Login** (`/student-portal/index.html`)
   - Already has a reset button
   - Can be upgraded to use the new modal

### 2. **Admin Portal Login** (`/admin/index.html`)
   - No reset functionality currently
   - Easy to add

### 3. **Student Profile Page** (`/student-portal/profile/`)
   - Users can change their password
   - Or other places like check-in, etc.

**When you're ready, just tell me which 3 specific locations and I'll wire them up!**

---

## 📚 Available Functions

### Simple (Recommended)
```javascript
showPasswordResetModal(emailToPreFill, onCompleteCallback)
```

### Advanced
```javascript
createPasswordResetModal(options)
attachPasswordResetHandler(options)
sendPasswordReset(email, callbacks)
```

---

## 🎨 Customization

The modal automatically:
- ✅ Matches your site's design
- ✅ Works on mobile and desktop
- ✅ Handles all error cases
- ✅ Provides user feedback
- ✅ Validates email format
- ✅ Shows loading states

You can customize it further by overriding CSS classes in your own stylesheet.

---

## ✅ Next Steps

1. **Review the examples**: Open `/examples/password-reset-examples.html` in your browser
2. **Read the docs**: Check `/docs/PASSWORD_RESET_UTILS.md` for complete API reference
3. **Test it out**: The utilities are ready to use right now
4. **Tell me where to wire it up**: Let me know the 3 locations you want this implemented

---

## 🔧 Troubleshooting

**Modal doesn't show?**
- Check that CSS file is loaded
- Verify Firebase is initialized
- Check browser console for errors

**Email not sending?**
- Verify the email exists in Firebase Auth
- Check Firebase Console for email template settings
- Look in spam folder

**Need help?**
- See `/docs/PASSWORD_RESET_UTILS.md`
- Check `/examples/password-reset-examples.html`
- Review browser console for error messages

---

## 📖 Documentation

- **Full Documentation**: `/docs/PASSWORD_RESET_UTILS.md`
- **Live Examples**: `/examples/password-reset-examples.html`
- **Core Code**: `/js/password-reset-utils.js`
- **Styles**: `/css/components/password-reset-modal.css`

---

**Ready to integrate! Just let me know the 3 specific places you want this wired up and I'll implement it for you. 🎉**
