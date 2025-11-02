/**
 * Profile & Settings Page
 * Handles loading and updating student profile information
 */

let currentStudent = null;
let currentStudentId = null;
let isViewingAsAdmin = false;
let originalData = {};

/**
 * Initialize profile page
 */
async function initializeProfile() {
    // Check if viewing as admin or as student
    isViewingAsAdmin = isAuthorized;
    
    if (isViewingAsAdmin) {
        // Admin view - check if there's a selected student from persistence
        const currentStudentId = sessionStorage.getItem('currentStudentId');
        
        if (currentStudentId) {
            console.log('Loading student from session:', currentStudentId);
            await loadStudentById(currentStudentId);
            // Don't clear the session storage - keep it for navigation between pages
        } else {
            // No student selected - show empty state
            console.log('Admin view - waiting for student selection');
        }
    } else {
        // Student view - load current user's profile
        loadCurrentStudentProfile();
    }
    
    // Setup form handlers
    setupFormHandlers();
}

/**
 * Load current logged-in student's profile
 */
async function loadCurrentStudentProfile() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('No user logged in');
            window.location.href = '../index.html';
            return;
        }
        
        const email = user.email.toLowerCase();
        
        // Find student by email
        const studentSnapshot = await window.db.collection('students')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        if (studentSnapshot.empty) {
            console.error('Student not found');
            showSnackbar('Error: Your student record could not be found.', 'error');
            return;
        }
        
        const studentDoc = studentSnapshot.docs[0];
        currentStudentId = studentDoc.id;
        currentStudent = studentDoc.data();
        
        console.log('Loaded student profile:', currentStudent);
        loadProfileData(currentStudent, currentStudentId);
        
    } catch (error) {
        console.error('Error loading student profile:', error);
        showSnackbar('Error loading your profile. Please try again.', 'error');
    }
}

/**
 * Load student by ID (used when navigating from another page)
 */
async function loadStudentById(studentId) {
    try {
        const studentDoc = await window.db.collection('students').doc(studentId).get();
        
        if (!studentDoc.exists) {
            console.error('Student not found');
            showSnackbar('Error: Student not found.', 'error');
            return;
        }
        
        const student = {
            id: studentDoc.id,
            ...studentDoc.data()
        };
        
        console.log('Loaded student by ID:', student);
        loadStudentProfile(student);
        
    } catch (error) {
        console.error('Error loading student profile:', error);
        showSnackbar('Error loading student profile. Please try again.', 'error');
    }
}

/**
 * Load profile when student is selected (admin view)
 * This is called from student-loader.js
 */
async function loadStudentProfile(student) {
    currentStudent = student;
    currentStudentId = student.id;
    
    // Ensure we're tracking admin status correctly
    isViewingAsAdmin = isAuthorized;
    
    console.log('Loading profile for selected student:', student);
    loadProfileData(student, student.id);
}

/**
 * Load profile data into form
 */
function loadProfileData(student, studentId) {
    // Show profile content
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('profile-content').style.display = 'block';
    
    // Update header
    document.getElementById('profile-name').textContent = `${student.firstName} ${student.lastName}`;
    
    // Show student ID only for admin users
    const profileIdElement = document.getElementById('profile-id');
    if (isViewingAsAdmin) {
        profileIdElement.textContent = `Student ID: ${studentId}`;
        profileIdElement.style.display = 'block';
    } else {
        profileIdElement.style.display = 'none';
    }
    
    // Load form fields
    document.getElementById('firstName').value = student.firstName || '';
    document.getElementById('lastName').value = student.lastName || '';
    document.getElementById('email').value = student.email || '';
    document.getElementById('phoneNumber').value = student.phoneNumber || '';
    document.getElementById('pronouns').value = student.pronouns || '';
    document.getElementById('emailConsent').checked = student.emailConsent || false;
    
    // Show/hide admin notes based on authorization
    const adminNotesSection = document.getElementById('admin-notes-section');
    if (isViewingAsAdmin) {
        adminNotesSection.style.display = 'block';
        document.getElementById('adminNotes').value = student.adminNotes || '';
    } else {
        adminNotesSection.style.display = 'none';
    }
    
    // Store original data for comparison
    originalData = { ...student };
    
    // Disable buttons initially (no changes yet)
    updateButtonStates(false);
}

/**
 * Setup form event handlers
 */
function setupFormHandlers() {
    // Form submit
    document.getElementById('profile-form').addEventListener('submit', handleFormSubmit);
    
    // Cancel button
    document.getElementById('cancel-btn').addEventListener('click', handleCancel);
    
    // Add change listeners to all form fields
    const formFields = [
        'firstName', 'lastName', 'email', 'phoneNumber', 
        'pronouns', 'emailConsent'
    ];
    
    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', handleFormChange);
            field.addEventListener('change', handleFormChange);
        }
    });
    
    // Add listener for admin notes if visible
    const adminNotesField = document.getElementById('adminNotes');
    if (adminNotesField) {
        adminNotesField.addEventListener('input', handleFormChange);
    }
}

/**
 * Handle form field changes
 */
function handleFormChange() {
    const hasChanges = checkForChanges();
    updateButtonStates(hasChanges);
}

/**
 * Update button states based on whether there are changes
 */
function updateButtonStates(hasChanges) {
    const saveButton = document.querySelector('.btn-primary');
    const cancelButton = document.getElementById('cancel-btn');
    
    if (saveButton) {
        saveButton.disabled = !hasChanges;
    }
    
    if (cancelButton) {
        cancelButton.disabled = !hasChanges;
    }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!currentStudent) {
        showSnackbar('No student selected', 'error');
        return;
    }
    
    try {
        // Show loading spinner
        document.getElementById('loading-spinner').style.display = 'flex';
        
        // Collect form data
        const updatedData = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim().toLowerCase(),
            phoneNumber: document.getElementById('phoneNumber').value.trim(),
            pronouns: document.getElementById('pronouns').value.trim(),
            emailConsent: document.getElementById('emailConsent').checked
        };
        
        // Validate required fields
        if (!updatedData.firstName || !updatedData.lastName || !updatedData.email || !updatedData.phoneNumber) {
            showSnackbar('Please fill in all required fields (First Name, Last Name, Email, Phone Number)', 'warning');
            document.getElementById('loading-spinner').style.display = 'none';
            return;
        }
        
        // Generate audit log for changes (excluding admin notes)
        const auditEntries = generateAuditLog(originalData, updatedData, isViewingAsAdmin);
        
        // Get existing admin notes
        let adminNotes = originalData.adminNotes || '';
        
        // If admin is editing, use the admin notes field value
        if (isViewingAsAdmin) {
            adminNotes = document.getElementById('adminNotes').value.trim();
        }
        
        // Append audit entries to admin notes
        adminNotes = appendAuditLog(adminNotes, auditEntries);
        
        // Include admin notes in update
        updatedData.adminNotes = adminNotes;
        
        // Update Firestore
        await window.db.collection('students').doc(currentStudentId).update(updatedData);
        
        console.log('Profile updated successfully:', updatedData);
        
        // Update current student object
        currentStudent = { ...currentStudent, ...updatedData };
        originalData = { ...currentStudent };
        
        // Reload the form with updated data (including audit log in admin notes)
        loadProfileData(currentStudent, currentStudentId);
        
        // If student updated their own email, update Firebase Auth email
        if (!isViewingAsAdmin && updatedData.email !== originalData.email) {
            try {
                const user = firebase.auth().currentUser;
                await user.updateEmail(updatedData.email);
                console.log('Firebase Auth email updated successfully');
            } catch (authError) {
                console.error('Error updating Firebase Auth email:', authError);
                
                // If email update fails, still keep the profile updated in Firestore
                // but let the user know they need to contact support
                document.getElementById('loading-spinner').style.display = 'none';
                showSnackbar('Your profile has been updated, but there was an issue updating your login email. Please contact support to complete the email change.', 'warning', 5000);
                return;
            }
        }
        
        // Hide loading spinner
        document.getElementById('loading-spinner').style.display = 'none';
        
        // Update original data and disable buttons
        originalData = { ...updatedData, adminNotes: finalAdminNotes };
        updateButtonStates(false);
        
        // Show success message
        showSnackbar('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        document.getElementById('loading-spinner').style.display = 'none';
        showSnackbar('Error updating profile. Please try again.', 'error');
    }
}

/**
 * Handle cancel button
 */
function handleCancel() {
    // Check if there are unsaved changes
    const hasChanges = checkForChanges();
    
    if (hasChanges) {
        // Show confirmation modal
        showCancelModal();
    } else {
        // Navigate back to dashboard
        window.location.href = '../dashboard/index.html';
    }
}

/**
 * Show cancel confirmation modal
 */
function showCancelModal() {
    const modal = document.getElementById('cancel-modal');
    modal.style.display = 'flex';
    
    // Add event listeners
    document.getElementById('cancel-modal-stay').onclick = closeCancelModal;
    document.getElementById('cancel-modal-leave').onclick = () => {
        window.location.href = '../dashboard/index.html';
    };
}

/**
 * Close cancel confirmation modal
 */
function closeCancelModal() {
    const modal = document.getElementById('cancel-modal');
    modal.style.display = 'none';
}

/**
 * Check if form has unsaved changes
 */
function checkForChanges() {
    if (!currentStudent) return false;
    
    const currentFormData = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim().toLowerCase(),
        phoneNumber: document.getElementById('phoneNumber').value.trim(),
        pronouns: document.getElementById('pronouns').value.trim(),
        emailConsent: document.getElementById('emailConsent').checked
    };
    
    if (isViewingAsAdmin) {
        currentFormData.adminNotes = document.getElementById('adminNotes').value.trim();
    }
    
    // Compare with original data
    for (const key in currentFormData) {
        const originalValue = originalData[key];
        const currentValue = currentFormData[key];
        
        // Handle boolean fields (emailConsent)
        if (typeof currentValue === 'boolean') {
            if (currentValue !== (originalValue || false)) {
                return true;
            }
        } else {
            // Handle string fields
            if (currentValue !== (originalValue || '')) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Override loadStudentDashboard from student-loader.js to load profile instead
 */
function loadStudentDashboard(student) {
    loadStudentProfile(student);
}

/**
 * Show snackbar notification
 */
function showSnackbar(message, type = 'success', duration = 3000) {
    const snackbar = document.getElementById('snackbar');
    
    // Remove existing classes
    snackbar.className = 'snackbar';
    snackbar.classList.add(`snackbar-${type}`);
    
    // Add icon based on type
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    if (type === 'info') icon = 'fa-info-circle';
    
    snackbar.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    // Show snackbar
    setTimeout(() => {
        snackbar.classList.add('show');
    }, 10);
    
    // Hide after duration
    setTimeout(() => {
        snackbar.classList.remove('show');
    }, duration);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for auth check to complete
    setTimeout(() => {
        initializeProfile();
    }, 1000);
});
