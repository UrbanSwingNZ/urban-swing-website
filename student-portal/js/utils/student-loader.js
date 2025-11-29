/**
 * Student Loader Utility Module
 * Shared functionality for loading and managing student selection in admin views
 */

const StudentLoader = (function() {
    'use strict';

    const AUTHORIZED_ADMINS = [
        'dance@urbanswing.co.nz',
        'urbanswingfrontdesk@gmail.com'
    ];

    let isAuthorizedAdmin = false;
    let studentsCache = [];

    /**
     * Check if current user is an authorized admin
     */
    async function checkAdminAuthorization() {
        try {
            if (typeof firebase === 'undefined') {
                await new Promise(resolve => setTimeout(resolve, 500));
                return checkAdminAuthorization();
            }

            const user = await new Promise((resolve) => {
                const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                    unsubscribe();
                    resolve(user);
                });
            });

            if (!user) {
                return false;
            }

            const userEmail = user.email.toLowerCase();
            isAuthorizedAdmin = AUTHORIZED_ADMINS.includes(userEmail);
            
            return isAuthorizedAdmin;
        } catch (error) {
            console.error('Error checking admin authorization:', error);
            return false;
        }
    }

    /**
     * Load all students from Firestore
     */
    async function loadStudents(dropdownId) {
        try {
            if (!window.db) {
                throw new Error('Firestore not initialized');
            }

            const dropdown = document.getElementById(dropdownId);
            if (!dropdown) {
                console.error(`Dropdown element not found: ${dropdownId}`);
                return;
            }

            // Show loading state
            dropdown.innerHTML = '<option value="">Loading students...</option>';
            dropdown.disabled = true;

            // Fetch students from Firestore
            const studentsSnapshot = await window.db.collection('students').get();

            // Cache students, filter out deleted ones, and sort in JavaScript
            studentsCache = studentsSnapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(student => student.deleted !== true) // Filter out deleted students
                .sort((a, b) => {
                    // Sort by firstName, then lastName
                    const firstNameCompare = (a.firstName || '').localeCompare(b.firstName || '');
                    if (firstNameCompare !== 0) return firstNameCompare;
                    return (a.lastName || '').localeCompare(b.lastName || '');
                });

            // Populate dropdown
            dropdown.innerHTML = '<option value="">-- Select a Student --</option>';
            
            studentsCache.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.firstName} ${student.lastName}`;
                
                if (student.email) {
                    option.textContent += ` (${student.email})`;
                }
                
                dropdown.appendChild(option);
            });

            dropdown.disabled = false;

            // Restore previously selected student if exists
            const currentStudentId = sessionStorage.getItem('currentStudentId');
            if (currentStudentId) {
                dropdown.value = currentStudentId;
                
                // Trigger change event to load student data
                const student = studentsCache.find(s => s.id === currentStudentId);
                if (student) {
                    window.selectedStudent = student;
                    dispatchStudentSelectedEvent(student);
                }
            }

            console.log(`✅ Loaded ${studentsCache.length} students`);
            
        } catch (error) {
            console.error('Error loading students:', error);
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                dropdown.innerHTML = '<option value="">Error loading students</option>';
            }
        }
    }

    /**
     * Handle student selection
     */
    function handleStudentSelection(dropdownId, onStudentSelect) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) {
            console.error(`Dropdown element not found: ${dropdownId}`);
            return;
        }

        dropdown.addEventListener('change', (e) => {
            const studentId = e.target.value;
            
            if (!studentId) {
                // Clear selection
                sessionStorage.removeItem('currentStudentId');
                sessionStorage.removeItem('currentStudent');
                window.selectedStudent = null;
                
                dispatchStudentSelectedEvent(null);
                
                if (onStudentSelect) {
                    onStudentSelect(null);
                }
                return;
            }

            // Find selected student
            const student = studentsCache.find(s => s.id === studentId);
            
            if (student) {
                // Store in session storage for persistence across page navigation
                sessionStorage.setItem('currentStudentId', studentId);
                sessionStorage.setItem('currentStudent', JSON.stringify(student));
                
                // Set global variable for backward compatibility
                window.selectedStudent = student;
                
                console.log('Student selected:', student.firstName, student.lastName);
                
                // Dispatch event
                dispatchStudentSelectedEvent(student);
                
                // Call callback if provided
                if (onStudentSelect) {
                    onStudentSelect(student);
                }
            }
        });
    }

    /**
     * Dispatch custom event when student is selected
     */
    function dispatchStudentSelectedEvent(student) {
        const event = new CustomEvent('studentSelected', {
            detail: { student },
            bubbles: true
        });
        window.dispatchEvent(event);
    }

    /**
     * Get currently selected student from session storage
     */
    function getCurrentStudent() {
        const studentJson = sessionStorage.getItem('currentStudent');
        if (studentJson) {
            try {
                return JSON.parse(studentJson);
            } catch (error) {
                console.error('Error parsing current student:', error);
                return null;
            }
        }
        return null;
    }

    /**
     * Get currently selected student ID
     */
    function getCurrentStudentId() {
        return sessionStorage.getItem('currentStudentId');
    }

    /**
     * Clear current student selection
     */
    function clearStudentSelection() {
        sessionStorage.removeItem('currentStudentId');
        sessionStorage.removeItem('currentStudent');
        dispatchStudentSelectedEvent(null);
    }

    // Public API
    return {
        checkAdminAuthorization,
        loadStudents,
        handleStudentSelection,
        getCurrentStudent,
        getCurrentStudentId,
        clearStudentSelection,
        isAdmin: () => isAuthorizedAdmin
    };
})();
