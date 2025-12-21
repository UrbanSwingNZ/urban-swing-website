/**
 * Check-In History Page
 * Displays student check-in history with dates and types
 */

let currentStudent = null;
let currentStudentId = null;
let isViewingAsAdmin = false;

// Pagination
let allCheckIns = [];
let currentPage = 1;
const itemsPerPage = 12;

/**
 * Initialize check-ins page
 */
async function initializeCheckIns() {
    // Check if viewing as admin or as student
    isViewingAsAdmin = isAuthorized;
    
    if (isViewingAsAdmin) {
        // Admin view - check if there's a selected student from persistence
        const currentStudentId = sessionStorage.getItem('currentStudentId');
        
        if (currentStudentId) {
            await loadStudentById(currentStudentId);
        }
    } else {
        // Student view - load current user's check-ins
        loadCurrentStudentCheckIns();
    }
}

/**
 * Load current logged-in student's check-ins
 */
async function loadCurrentStudentCheckIns() {
    try {
        // Use the centralized getCurrentUser function from auth-utils
        const user = await getCurrentUser();
        
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
            alert('Error: Your student record could not be found.');
            return;
        }
        
        const studentDoc = studentSnapshot.docs[0];
        currentStudentId = studentDoc.id;
        currentStudent = studentDoc.data();
        
        await loadCheckIns(currentStudentId, currentStudent);
        
    } catch (error) {
        console.error('Error loading student check-ins:', error);
        alert('Error loading your check-in history. Please try again.');
    }
}

/**
 * Load student by ID (used when navigating from another page)
 */
async function loadStudentById(studentId) {
    try {
        const studentDoc = await window.db.collection('students').doc(studentId).get();
        
        if (!studentDoc.exists) {
            console.error('Student not found:', studentId);
            alert('Error: Student not found.');
            return;
        }
        
        const student = {
            id: studentDoc.id,
            ...studentDoc.data()
        };
        
        currentStudent = student;
        currentStudentId = student.id;
        await loadCheckIns(student.id, student);
        
    } catch (error) {
        console.error('Error loading student by ID:', error);
        alert('Error loading check-in history. Please try again.');
    }
}

/**
 * Load check-ins when student is selected (admin view)
 * This is called from student-loader.js
 */
async function loadStudentCheckIns(student) {
    currentStudent = student;
    currentStudentId = student.id;
    isViewingAsAdmin = isAuthorized;
    
    await loadCheckIns(student.id, student);
}

/**
 * Load and display check-ins for student
 */
async function loadCheckIns(studentId, student) {
    try {
        // Show loading spinner
        if (window.LoadingSpinner) {
            window.LoadingSpinner.showGlobal('Loading check-ins...');
        }
        
        // Show content
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('checkins-content').style.display = 'block';
        
        // Update header
        document.getElementById('student-name').textContent = 
            `${student.firstName} ${student.lastName}'s Check-Ins`;
        
        // Load check-ins from Firestore
        const checkinsSnapshot = await window.db.collection('checkins')
            .where('studentId', '==', studentId)
            .get();
        
        const checkins = [];
        checkinsSnapshot.forEach(doc => {
            const data = doc.data();
            checkins.push({
                id: doc.id,
                checkinDate: data.checkinDate?.toDate() || new Date(),
                entryType: data.entryType,
                reversed: data.reversed || false
            });
        });
        
        // Sort by checkinDate (most recent first)
        checkins.sort((a, b) => b.checkinDate - a.checkinDate);
        
        // Store all check-ins for pagination
        allCheckIns = checkins;
        currentPage = 1;
        
        // Update count
        document.getElementById('total-count').textContent = checkins.length;
        
        // Display check-ins
        if (checkins.length === 0) {
            document.getElementById('checkins-list').style.display = 'none';
            document.getElementById('no-checkins').style.display = 'block';
            document.getElementById('pagination-controls').style.display = 'none';
        } else {
            document.getElementById('checkins-list').style.display = 'block';
            document.getElementById('no-checkins').style.display = 'none';
            displayCheckInsPage();
            setupPagination();
        }
        
        // Hide loading spinner
        if (window.LoadingSpinner) {
            window.LoadingSpinner.hideGlobal();
        }
        
    } catch (error) {
        console.error('Error loading check-ins:', error);
        if (window.LoadingSpinner) {
            window.LoadingSpinner.hideGlobal();
        }
        alert('Error loading check-in history. Please try again.');
    }
}

/**
 * Display check-ins for current page
 */
function displayCheckInsPage() {
    const listElement = document.getElementById('checkins-list');
    listElement.innerHTML = '';
    
    // Calculate pagination
    const totalPages = Math.ceil(allCheckIns.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, allCheckIns.length);
    const pageCheckIns = allCheckIns.slice(startIndex, endIndex);
    
    // Display check-ins for current page
    pageCheckIns.forEach(checkin => {
        const checkinDate = checkin.checkinDate;
        const typeBadgeClass = getTypeBadgeClass(checkin.entryType);
        const typeDisplayName = getTypeDisplayName(checkin.entryType);
        
        const checkinItem = document.createElement('div');
        checkinItem.className = `checkin-item ${checkin.reversed ? 'reversed' : ''}`;
        
        checkinItem.innerHTML = `
            <div class="checkin-date">
                <div class="date-icon">
                    <div class="day">${checkinDate.getDate()}</div>
                    <div class="month">${checkinDate.toLocaleDateString('en-NZ', { month: 'short' })}</div>
                </div>
                <div class="date-details">
                    <div class="full-date">${checkinDate.toLocaleDateString('en-NZ', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</div>
                </div>
            </div>
            <div class="checkin-type">
                ${checkin.reversed ? '<span class="type-badge reversed">REVERSED</span>' : ''}
                <span class="type-badge ${typeBadgeClass}">${typeDisplayName}</span>
            </div>
        `;
        
        listElement.appendChild(checkinItem);
    });
    
    // Update pagination controls
    updatePaginationControls(totalPages);
}

/**
 * Update pagination controls state
 */
function updatePaginationControls(totalPages) {
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const paginationControls = document.getElementById('pagination-controls');
    
    // Show/hide pagination controls
    if (totalPages <= 1) {
        paginationControls.style.display = 'none';
        return;
    } else {
        paginationControls.style.display = 'flex';
    }
    
    // Update page info
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Enable/disable buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

/**
 * Setup pagination button handlers
 */
function setupPagination() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    // Remove existing listeners by cloning
    const newPrevBtn = prevBtn.cloneNode(true);
    const newNextBtn = nextBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    
    // Add new listeners
    newPrevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayCheckInsPage();
        }
    });
    
    newNextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(allCheckIns.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayCheckInsPage();
        }
    });
}

/**
 * Get badge class based on entry type
 */
function getTypeBadgeClass(entryType) {
    if (!entryType) return 'other';
    
    switch (entryType) {
        case 'concession':
            return 'concession';
        case 'gift':
            return 'gift';
        case 'casual':
            return 'casual';
        case 'casualStudent':
            return 'casual-student';
        case 'free':
            return 'free';
        default:
            return 'other';
    }
}

/**
 * Get display name for entry type
 */
function getTypeDisplayName(entryType) {
    if (!entryType) return 'Unknown';
    
    switch (entryType) {
        case 'concession':
            return 'Concession';
        case 'gift':
            return 'Gift';
        case 'casual':
            return 'Casual Entry';
        case 'casualStudent':
            return 'Casual Entry (Student)';
        case 'free':
            return 'Free Entry';
        default:
            return entryType;
    }
}

/**
 * Override loadStudentDashboard from student-loader.js to load check-ins instead
 */
function loadStudentDashboard(student) {
    loadStudentCheckIns(student);
}

/**
 * Listen for student selection changes (from admin dropdown)
 */
window.addEventListener('studentSelected', async (event) => {
    const student = event.detail.student;
    
    if (student) {
        loadStudentCheckIns(student);
    }
});

// Initialize when DOM is ready
// Wait for auth check to complete before initializing
window.addEventListener('authCheckComplete', () => {
    initializeCheckIns();
});

// Fallback for if auth check has already completed
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // Only init if not already initialized by authCheckComplete
        if (!currentStudent && !currentStudentId) {
            initializeCheckIns();
        }
    }, 2000);
});
