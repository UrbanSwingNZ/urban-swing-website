/**
 * Check-In History Page
 * Displays student check-in history with dates and types
 */

let currentStudent = null;
let currentStudentId = null;
let isViewingAsAdmin = false;

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
            console.log('Loading student from session:', currentStudentId);
            await loadStudentById(currentStudentId);
        } else {
            // No student selected - show empty state
            console.log('Admin view - waiting for student selection');
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
            alert('Error: Your student record could not be found.');
            return;
        }
        
        const studentDoc = studentSnapshot.docs[0];
        currentStudentId = studentDoc.id;
        currentStudent = studentDoc.data();
        
        console.log('Loaded student:', currentStudent);
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
        
        console.log('Loaded student by ID:', student);
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
    
    console.log('Loading check-ins for selected student:', student);
    await loadCheckIns(student.id, student);
}

/**
 * Load and display check-ins for student
 */
async function loadCheckIns(studentId, student) {
    try {
        // Show loading spinner
        document.getElementById('loading-spinner').style.display = 'flex';
        
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
        
        console.log(`Loaded ${checkins.length} check-ins`);
        
        // Update count
        document.getElementById('total-count').textContent = checkins.length;
        
        // Display check-ins
        if (checkins.length === 0) {
            document.getElementById('checkins-list').style.display = 'none';
            document.getElementById('no-checkins').style.display = 'block';
        } else {
            document.getElementById('checkins-list').style.display = 'block';
            document.getElementById('no-checkins').style.display = 'none';
            displayCheckIns(checkins);
        }
        
        // Hide loading spinner
        document.getElementById('loading-spinner').style.display = 'none';
        
    } catch (error) {
        console.error('Error loading check-ins:', error);
        document.getElementById('loading-spinner').style.display = 'none';
        alert('Error loading check-in history. Please try again.');
    }
}

/**
 * Display check-ins in the list
 */
function displayCheckIns(checkins) {
    const listElement = document.getElementById('checkins-list');
    listElement.innerHTML = '';
    
    checkins.forEach(checkin => {
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for auth check to complete
    setTimeout(() => {
        initializeCheckIns();
    }, 1000);
});
