// Student Registration Form Logic
// Handles form submission, duplicate detection, and Firestore integration

let currentUser = null;
let isAdmin = false;
let formData = null;
let duplicateStudents = [];

// Wait for Firebase to initialize
window.addEventListener('load', () => {
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded');
        showError('Firebase SDK failed to load. Please check your internet connection.');
        return;
    }

    if (!auth || !db) {
        console.error('Firebase not properly initialized');
        showError('Firebase configuration error. Please contact the administrator.');
        return;
    }

    initializeAuth();
});

// ========================================
// Authentication Check
// ========================================

function initializeAuth() {
    // Check if user is authenticated (admin)
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is authenticated (admin)
            currentUser = user;
            isAdmin = true;
            showAdminElements();
            console.log('Admin user detected:', user.email);
        } else {
            // Public user (not logged in)
            isAdmin = false;
            console.log('Public user (not authenticated)');
        }

        setupFormHandlers();
    });
}

// ========================================
// Show Admin-Only Elements
// ========================================

function showAdminElements() {
    // Show admin notes field
    const adminNotesGroup = document.getElementById('admin-notes-group');
    if (adminNotesGroup) {
        adminNotesGroup.style.display = 'block';
    }

    // Show back to admin link
    const backToAdmin = document.getElementById('back-to-admin');
    if (backToAdmin) {
        backToAdmin.style.display = 'flex';
    }
}

// ========================================
// Form Setup
// ========================================

function setupFormHandlers() {
    const form = document.getElementById('registration-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleFormSubmit();
    });

    // Modal buttons - Duplicate Modal
    const cancelBtn = document.getElementById('cancel-btn');
    const proceedBtn = document.getElementById('proceed-btn');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideDuplicateModal);
    }

    if (proceedBtn) {
        proceedBtn.addEventListener('click', async () => {
            hideDuplicateModal();
            await saveStudent(formData);
        });
    }

    // Terms and Conditions Modal
    const termsLink = document.getElementById('terms-link');
    const termsCloseBtn = document.getElementById('terms-close-btn');
    const termsAcceptBtn = document.getElementById('terms-accept-btn');

    if (termsLink) {
        termsLink.addEventListener('click', (e) => {
            e.preventDefault();
            showTermsModal();
        });
    }

    if (termsCloseBtn) {
        termsCloseBtn.addEventListener('click', hideTermsModal);
    }

    if (termsAcceptBtn) {
        termsAcceptBtn.addEventListener('click', () => {
            // Check the terms checkbox
            const termsCheckbox = document.getElementById('termsAccepted');
            if (termsCheckbox) {
                termsCheckbox.checked = true;
            }
            hideTermsModal();
        });
    }
}

// ========================================
// Handle Form Submission
// ========================================

async function handleFormSubmit() {
    try {
        // Clear previous messages
        hideError();
        hideSuccess();

        // Get form data
        formData = getFormData();

        // Validate form data
        if (!validateFormData(formData)) {
            return;
        }

        // Check for duplicates (only for admins)
        if (isAdmin) {
            const hasDuplicates = await checkForDuplicates(formData.firstName, formData.lastName);
            
            if (hasDuplicates) {
                // Show duplicate warning modal
                showDuplicateModal(duplicateStudents);
                return; // Wait for admin to confirm
            }
        }

        // No duplicates or user confirmed - save the student
        await saveStudent(formData);

    } catch (error) {
        console.error('Form submission error:', error);
        showError('An error occurred. Please try again.');
    }
}

// ========================================
// Get Form Data
// ========================================

function getFormData() {
    return {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phoneNumber: document.getElementById('phoneNumber').value.trim(),
        pronouns: document.getElementById('pronouns').value.trim(),
        over16Confirmed: document.getElementById('over16Confirmed').checked,
        termsAccepted: document.getElementById('termsAccepted').checked,
        emailConsent: document.getElementById('emailConsent').checked,
        adminNotes: isAdmin ? document.getElementById('adminNotes').value.trim() : '',
        registeredAt: firebase.firestore.Timestamp.now(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
}

// ========================================
// Validate Form Data
// ========================================

function validateFormData(data) {
    if (!data.firstName) {
        showError('Please enter a first name.');
        return false;
    }

    if (!data.lastName) {
        showError('Please enter a last name.');
        return false;
    }

    if (!data.email) {
        showError('Please enter an email address.');
        return false;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showError('Please enter a valid email address.');
        return false;
    }

    if (!data.phoneNumber) {
        showError('Please enter a phone number.');
        return false;
    }

    if (!data.over16Confirmed) {
        showError('You must confirm that you are 16 years or older.');
        return false;
    }

    if (!data.termsAccepted) {
        showError('You must accept the Terms and Conditions to register.');
        return false;
    }

    return true;
}

// ========================================
// Check for Duplicate Names
// ========================================

async function checkForDuplicates(firstName, lastName) {
    try {
        const studentsRef = db.collection('students');
        const snapshot = await studentsRef
            .where('firstName', '==', firstName)
            .where('lastName', '==', lastName)
            .get();

        duplicateStudents = [];
        snapshot.forEach((doc) => {
            duplicateStudents.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return duplicateStudents.length > 0;

    } catch (error) {
        console.error('Error checking for duplicates:', error);
        // Don't block registration if duplicate check fails
        return false;
    }
}

// ========================================
// Show Duplicate Warning Modal
// ========================================

function showDuplicateModal(students) {
    const modal = document.getElementById('duplicate-modal');
    const list = document.getElementById('duplicate-students-list');

    if (!modal || !list) return;

    // Clear previous content
    list.innerHTML = '';

    // Add each duplicate student
    students.forEach((student) => {
        const div = document.createElement('div');
        div.className = 'duplicate-student';
        
        const registeredDate = student.registeredAt 
            ? (student.registeredAt.toDate ? student.registeredAt.toDate() : new Date(student.registeredAt)).toLocaleDateString('en-NZ')
            : 'N/A';

        div.innerHTML = `
            <strong>${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</strong>
            <p><i class="fas fa-envelope"></i> ${escapeHtml(student.email)}</p>
            <p><i class="fas fa-phone"></i> ${escapeHtml(student.phoneNumber || 'N/A')}</p>
            <p><i class="fas fa-calendar"></i> Registered: ${registeredDate}</p>
        `;
        
        list.appendChild(div);
    });

    modal.style.display = 'flex';
}

function hideDuplicateModal() {
    const modal = document.getElementById('duplicate-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ========================================
// Terms and Conditions Modal
// ========================================

function showTermsModal() {
    const modal = document.getElementById('terms-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideTermsModal() {
    const modal = document.getElementById('terms-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ========================================
// Generate Human-Readable Student ID
// ========================================

function generateStudentId(firstName, lastName) {
    // Normalize names: lowercase, remove special characters, replace spaces with hyphens
    const cleanFirst = firstName.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    const cleanLast = lastName.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    // Generate a short random suffix (6 characters)
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    return `${cleanFirst}-${cleanLast}-${randomSuffix}`;
}

// ========================================
// Save Student to Firestore
// ========================================

async function saveStudent(data) {
    try {
        showLoading(true);

        // Generate human-readable student ID
        const studentId = generateStudentId(data.firstName, data.lastName);

        // Add student to Firestore with custom ID
        await db.collection('students').doc(studentId).set(data);
        console.log('Student registered with ID:', studentId);

        // Show success message
        showSuccess();
        
        // Reset form
        document.getElementById('registration-form').reset();
        
        // Re-check the email consent box (default is checked)
        document.getElementById('emailConsent').checked = true;

        showLoading(false);

        // If admin, offer to go back to student database
        if (isAdmin) {
            setTimeout(() => {
                if (confirm('Student registered successfully! Would you like to return to the Student Database?')) {
                    window.location.href = 'admin/student-database.html';
                }
            }, 1000);
        }

    } catch (error) {
        console.error('Error saving student:', error);
        showError('Failed to register student. Please try again.');
        showLoading(false);
    }
}

// ========================================
// UI Helper Functions
// ========================================

function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    const submitBtn = document.getElementById('submit-btn');
    
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
    
    if (submitBtn) {
        submitBtn.disabled = show;
        submitBtn.innerHTML = show 
            ? '<i class="fas fa-spinner fa-spin"></i> Registering...' 
            : '<i class="fas fa-paper-plane"></i> Register';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.classList.add('show');
        
        // Scroll to error
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function hideError() {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.classList.remove('show');
    }
}

function showSuccess() {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.style.display = 'flex';
        
        // Scroll to success message
        successDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function hideSuccess() {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.style.display = 'none';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
