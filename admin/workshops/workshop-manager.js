/**
 * Workshop Manager - Core Business Logic
 * Handles Firestore CRUD operations, state management, and event listeners
 */

import { LoadingSpinner } from '/components/loading-spinner/loading-spinner.js';
import { showSnackbar } from '/components/snackbar/snackbar.js';

// ============================================
// STATE MANAGEMENT
// ============================================

let currentUser = null;
let workshops = [];
let filteredWorkshops = [];
let selectedWorkshop = null;

// ============================================
// INITIALIZATION
// ============================================

async function initWorkshopManager() {
    try {
        // Show loading state
        const loadingState = document.getElementById('loading-state');
        if (loadingState) {
            loadingState.style.display = 'block';
        }
        
        // Check authentication
        currentUser = await checkAuth();
        if (!currentUser) {
            console.error('No user authenticated');
            window.location.href = '/admin/';
            return;
        }
        
        // Check if user is admin or front-desk
        if (!isAdminOrFrontDesk()) {
            console.error('User not authorized');
            showSnackbar('You do not have permission to access this page', 'error');
            window.location.href = '/admin/';
            return;
        }
        
        // Subscribe to real-time workshop updates
        loadWorkshops();
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showSnackbar('Failed to initialize workshop manager', 'error');
        
        // Show error state
        const loadingState = document.getElementById('loading-state');
        if (loadingState) {
            loadingState.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed to load workshops';
        }
    }
}

// ============================================
// AUTHENTICATION & AUTHORIZATION
// ============================================

async function checkAuth() {
    return new Promise((resolve) => {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) {
                resolve(null);
                return;
            }
            
            try {
                // Get user role from Firestore
                const userDoc = await db.collection('users').doc(user.uid).get();
                const userData = userDoc.data();
                
                resolve({
                    uid: user.uid,
                    email: user.email,
                    role: userData?.role || 'student',
                    studentId: userData?.studentId || null
                });
            } catch (error) {
                console.error('Error fetching user data:', error);
                resolve({
                    uid: user.uid,
                    email: user.email,
                    role: 'student',
                    studentId: null
                });
            }
        });
    });
}

function isAdminOrFrontDesk() {
    return currentUser && (currentUser.role === 'admin' || currentUser.role === 'front-desk');
}

// ============================================
// WORKSHOP CRUD OPERATIONS
// ============================================

// Active Firestore listener — unsubscribe before re-subscribing
let workshopsUnsubscribe = null;

/**
 * Subscribe to real-time workshop updates via onSnapshot
 */
function loadWorkshops() {
    if (workshopsUnsubscribe) workshopsUnsubscribe();

    const loadingState = document.getElementById('loading-state');
    if (loadingState) loadingState.style.display = 'block';

    workshopsUnsubscribe = db.collection('workshops')
        .orderBy('date', 'desc')
        .onSnapshot((snapshot) => {
            workshops = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            filteredWorkshops = [...workshops];

            if (window.renderWorkshops) {
                window.renderWorkshops();
            }
        }, (error) => {
            console.error('Error loading workshops:', error);
            showSnackbar('Failed to load workshops', 'error');
        });
}

/**
 * Create a new workshop
 */
async function createWorkshop(workshopData) {
    try {
        LoadingSpinner.showGlobal('Creating workshop...');
        
        // Validate required fields
        if (!workshopData.name || !workshopData.date || !workshopData.topic || workshopData.cost === undefined) {
            throw new Error('Missing required fields');
        }
        
        // Convert date to Firestore Timestamp if needed
        let workshopDate = workshopData.date;
        if (workshopDate instanceof Date) {
            workshopDate = firebase.firestore.Timestamp.fromDate(workshopDate);
        }
        
        const docRef = await db.collection('workshops').add({
            name: workshopData.name,
            date: workshopDate,
            description: workshopData.description || '',
            topic: workshopData.topic,
            cost: parseFloat(workshopData.cost),
            status: 'draft',
            openToAll: workshopData.openToAll || false,
            invitedStudents: [],
            registeredStudents: [],
            checkedInStudents: [],
            videos: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid
        });
        
        showSnackbar('Workshop created successfully', 'success');
        LoadingSpinner.hideGlobal();
        
        return docRef.id;
    } catch (error) {
        console.error('Create workshop error:', error);
        showSnackbar('Failed to create workshop: ' + error.message, 'error');
        LoadingSpinner.hideGlobal();
        throw error;
    }
}

/**
 * Update an existing workshop
 */
async function updateWorkshop(workshopId, updates) {
    try {
        LoadingSpinner.showGlobal('Updating workshop...');
        
        // Convert date to Firestore Timestamp if needed
        if (updates.date && updates.date instanceof Date) {
            updates.date = firebase.firestore.Timestamp.fromDate(updates.date);
        }
        
        // Convert cost to number if present
        if (updates.cost !== undefined) {
            updates.cost = parseFloat(updates.cost);
        }
        
        await db.collection('workshops').doc(workshopId).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showSnackbar('Workshop updated successfully', 'success');
        LoadingSpinner.hideGlobal();
        
    } catch (error) {
        console.error('Update workshop error:', error);
        showSnackbar('Failed to update workshop: ' + error.message, 'error');
        LoadingSpinner.hideGlobal();
        throw error;
    }
}

/**
 * Delete a workshop
 */
async function deleteWorkshop(workshopId) {
    try {
        LoadingSpinner.showGlobal('Deleting workshop...');
        
        await db.collection('workshops').doc(workshopId).delete();
        
        showSnackbar('Workshop deleted successfully', 'success');
        LoadingSpinner.hideGlobal();
        
    } catch (error) {
        console.error('Delete workshop error:', error);
        showSnackbar('Failed to delete workshop: ' + error.message, 'error');
        LoadingSpinner.hideGlobal();
        throw error;
    }
}

/**
 * Update workshop status
 */
async function updateWorkshopStatus(workshopId, newStatus) {
    await updateWorkshop(workshopId, { status: newStatus });
}

// ============================================
// INVITED STUDENTS MANAGEMENT
// ============================================

/**
 * Add a student to the invited students list
 */
async function addInvitedStudent(workshopId, studentId) {
    try {
        await db.collection('workshops').doc(workshopId).update({
            invitedStudents: firebase.firestore.FieldValue.arrayUnion(studentId)
        });
        
        showSnackbar('Student added to invited list', 'success');
        
    } catch (error) {
        console.error('Error adding invited student:', error);
        showSnackbar('Failed to add student: ' + error.message, 'error');
        throw error;
    }
}

/**
 * Remove a student from the invited students list
 */
async function removeInvitedStudent(workshopId, studentId) {
    try {
        await db.collection('workshops').doc(workshopId).update({
            invitedStudents: firebase.firestore.FieldValue.arrayRemove(studentId)
        });
        
        showSnackbar('Student removed from invited list', 'success');
        
    } catch (error) {
        console.error('Error removing invited student:', error);
        showSnackbar('Failed to remove student: ' + error.message, 'error');
        throw error;
    }
}

// ============================================
// VIDEO MANAGEMENT
// ============================================

/**
 * Add a video to a workshop
 */
async function addVideo(workshopId, videoData) {
    try {
        if (!videoData.title || !videoData.url) {
            throw new Error('Video title and URL are required');
        }
        
        const video = {
            title: videoData.title,
            url: videoData.url,
            addedAt: firebase.firestore.Timestamp.now()
        };
        
        await db.collection('workshops').doc(workshopId).update({
            videos: firebase.firestore.FieldValue.arrayUnion(video)
        });
        
        showSnackbar('Video added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding video:', error);
        showSnackbar('Failed to add video: ' + error.message, 'error');
        throw error;
    }
}

/**
 * Remove a video from a workshop
 */
async function removeVideo(workshopId, videoUrl) {
    try {
        const workshop = workshops.find(w => w.id === workshopId);
        if (!workshop) {
            throw new Error('Workshop not found');
        }
        
        const updatedVideos = workshop.videos.filter(v => v.url !== videoUrl);
        
        await db.collection('workshops').doc(workshopId).update({
            videos: updatedVideos
        });
        
        showSnackbar('Video removed successfully', 'success');
        
    } catch (error) {
        console.error('Error removing video:', error);
        showSnackbar('Failed to remove video: ' + error.message, 'error');
        throw error;
    }
}

// ============================================
// STUDENT SEARCH
// ============================================

/**
 * Search for students (for invite modal and check-in)
 */
async function searchStudents(query) {
    try {
        const snapshot = await db.collection('students')
            .orderBy('firstName')
            .get();
        
        const students = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Client-side filtering (Firestore doesn't support LIKE queries)
        return students.filter(student => {
            const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
            return fullName.includes(query.toLowerCase());
        });
        
    } catch (error) {
        console.error('Error searching students:', error);
        showSnackbar('Failed to search students', 'error');
        return [];
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('workshop-search');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Create workshop button
    const createBtn = document.getElementById('create-workshop-btn');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            if (window.openCreateWorkshopModal) {
                window.openCreateWorkshopModal();
            }
        });
    }
}

/**
 * Handle search input
 */
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (query === '') {
        filteredWorkshops = [...workshops];
    } else {
        filteredWorkshops = workshops.filter(workshop => 
            workshop.name.toLowerCase().includes(query) ||
            workshop.topic.toLowerCase().includes(query) ||
            (workshop.description && workshop.description.toLowerCase().includes(query))
        );
    }
    
    // Render workshops (Phase 6 - workshop-display.js)
    if (window.renderWorkshops) {
        window.renderWorkshops();
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get workshop by ID
 */
function getWorkshopById(workshopId) {
    return workshops.find(w => w.id === workshopId);
}

/**
 * Format Firestore Timestamp to readable date
 */
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        return 'Invalid Date';
    }
    
    // Format as DD/MM/YYYY HH:MMam/pm
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12; // Convert to 12-hour format
    
    return `${day}/${month}/${year} ${hours}:${minutes}${ampm}`;
}

/**
 * Format cost to currency
 */
function formatCost(cost) {
    return `$${parseFloat(cost).toFixed(2)}`;
}

// ============================================
// INITIALIZE ON DOM LOAD
// ============================================

document.addEventListener('DOMContentLoaded', initWorkshopManager);

// ============================================
// EXPORTS
// ============================================

export {
    // State
    workshops,
    filteredWorkshops,
    currentUser,
    
    // CRUD Operations
    createWorkshop,
    updateWorkshop,
    deleteWorkshop,
    updateWorkshopStatus,
    loadWorkshops,
    
    // Invited Students
    addInvitedStudent,
    removeInvitedStudent,
    
    // Videos
    addVideo,
    removeVideo,
    
    // Search
    searchStudents,
    
    // Helpers
    getWorkshopById,
    formatDate,
    formatCost
};
