/**
 * password-ui.js - Password UI Management
 * Handles password visibility toggles and password generation UI
 */

/**
 * Initialize password UI handlers
 */
function initializePasswordUI() {
    // Password visibility toggles
    setupPasswordToggle('password', 'password-toggle');
    setupPasswordToggle('confirmPassword', 'confirm-password-toggle');
    
    // Generate password button
    const generateBtn = document.getElementById('generate-password-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGeneratePassword);
    }
    
    // Copy password button
    const copyBtn = document.getElementById('copy-password-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', handleCopyPassword);
    }
}

/**
 * Setup password visibility toggle for a field
 * @param {string} inputId - ID of the password input
 * @param {string} toggleId - ID of the toggle button
 */
function setupPasswordToggle(inputId, toggleId) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);
    
    if (!input || !toggle) return;
    
    toggle.addEventListener('click', () => {
        const icon = toggle.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
            toggle.setAttribute('aria-label', 'Hide password');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
            toggle.setAttribute('aria-label', 'Show password');
        }
    });
}

/**
 * Handle generate password button click
 */
function handleGeneratePassword() {
    // Generate password using the utility function
    const password = generatePassword();
    
    // Fill both password fields
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (passwordInput && confirmPasswordInput) {
        passwordInput.value = password;
        confirmPasswordInput.value = password;
        
        // Show passwords temporarily
        passwordInput.type = 'text';
        confirmPasswordInput.type = 'text';
        
        // Update toggle buttons
        updateToggleIcon('password-toggle', true);
        updateToggleIcon('confirm-password-toggle', true);
    }
    
    // Display the generated password in the display area
    const display = document.getElementById('generated-password-display');
    const valueSpan = document.getElementById('generated-password-value');
    
    if (display && valueSpan) {
        valueSpan.textContent = password;
        display.style.display = 'block';
        
        // Scroll to show the generated password
        display.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Update toggle icon state
 * @param {string} toggleId - ID of the toggle button
 * @param {boolean} isVisible - Whether password is visible
 */
function updateToggleIcon(toggleId, isVisible) {
    const toggle = document.getElementById(toggleId);
    if (!toggle) return;
    
    const icon = toggle.querySelector('i');
    if (!icon) return;
    
    if (isVisible) {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        toggle.setAttribute('aria-label', 'Hide password');
    } else {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        toggle.setAttribute('aria-label', 'Show password');
    }
}

/**
 * Handle copy password button click
 */
async function handleCopyPassword() {
    const valueSpan = document.getElementById('generated-password-value');
    const copyBtn = document.getElementById('copy-password-btn');
    
    if (!valueSpan || !copyBtn) return;
    
    const password = valueSpan.textContent;
    
    try {
        // Copy to clipboard
        await navigator.clipboard.writeText(password);
        
        // Update button to show success
        const icon = copyBtn.querySelector('i');
        const originalClass = icon.className;
        
        icon.className = 'fas fa-check';
        copyBtn.classList.add('copied');
        
        // Reset after 2 seconds
        setTimeout(() => {
            icon.className = originalClass;
            copyBtn.classList.remove('copied');
        }, 2000);
        
    } catch (error) {
        console.error('Failed to copy password:', error);
        alert('Failed to copy password. Please copy it manually.');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializePasswordUI();
});
