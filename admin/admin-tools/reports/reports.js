/**
 * Reports Tool - Firestore Queries and Display Logic
 * Generates various reports on students and concessions
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';

let studentsData = [];
let concessionsData = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase to be ready
    await waitForFirebase();
    
    // Check authentication
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '/admin/';
            return;
        }
        
        // Check if user is admin
        const userDoc = await window.db.collection('users').doc(user.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = '/admin/';
            return;
        }
    });
});

function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = setInterval(() => {
            if (window.firebase && window.firebase.firestore && window.db) {
                clearInterval(checkFirebase);
                resolve();
            }
        }, 100);
    });
}

/**
 * Report 1: Expired Concessions
 */
async function generateExpiredConcessionsReport() {
    const resultsDiv = document.getElementById('expired-concessions-results');
    const tableDiv = document.getElementById('expired-concessions-table');
    const countSpan = document.getElementById('expired-count');
    
    // Show loading state
    resultsDiv.style.display = 'block';
    tableDiv.innerHTML = '<div class="loading-state"><i class="fas fa-spinner"></i><p>Loading data...</p></div>';
    
    try {
        // Fetch all students
        const studentsSnapshot = await window.db.collection('students').get();
        const students = {};
        studentsSnapshot.forEach(doc => {
            students[doc.id] = { id: doc.id, ...doc.data() };
        });
        
        // Fetch all concessions
        const concessionsSnapshot = await window.db.collection('concessionBlocks').get();
        const now = new Date();
        const expiredConcessions = [];
        
        concessionsSnapshot.forEach(doc => {
            const concession = { id: doc.id, ...doc.data() };
            const expiryDate = concession.expiryDate?.toDate();
            
            // Only include expired concessions with remaining balance
            if (concession.status === 'expired' && concession.remainingQuantity > 0) {
                const student = students[concession.studentId];
                if (student) {
                    expiredConcessions.push({
                        concessionId: concession.id,
                        studentName: `${student.firstName} ${student.lastName}`,
                        studentEmail: student.email,
                        packageType: concession.packageName || 'Unknown',
                        balance: concession.remainingQuantity || 0,
                        expiryDate: expiryDate,
                        purchaseDate: concession.purchaseDate?.toDate(),
                        isLocked: concession.isLocked || false
                    });
                }
            }
        });
        
        // Sort by expiry date (most recently expired first)
        expiredConcessions.sort((a, b) => b.expiryDate - a.expiryDate);
        
        // Update count
        countSpan.textContent = expiredConcessions.length;
        
        // Display results
        if (expiredConcessions.length === 0) {
            tableDiv.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>No expired concessions found</p></div>';
        } else {
            let tableHTML = `
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Email</th>
                            <th>Package Type</th>
                            <th>Balance</th>
                            <th>Expiry Date</th>
                            <th>Purchase Date</th>
                            <th>Locked</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            expiredConcessions.forEach(item => {
                const lockedCell = item.isLocked 
                    ? `<span class="badge badge-locked clickable" data-id="${item.concessionId}" title="Click to unlock">Locked</span>`
                    : `<button class="btn-lock btn-lock-concession" data-id="${item.concessionId}"><i class="fas fa-lock"></i> Lock</button>`;
                tableHTML += `
                    <tr>
                        <td>${item.studentName}</td>
                        <td>${item.studentEmail}</td>
                        <td>${item.packageType}</td>
                        <td>${item.balance}</td>
                        <td><span class="badge badge-no">${formatDate(item.expiryDate)}</span></td>
                        <td>${item.purchaseDate ? formatDate(item.purchaseDate) : 'N/A'}</td>
                        <td>${lockedCell}</td>
                    </tr>
                `;
            });
            
            tableHTML += '</tbody></table>';
            
            // Add mobile cards
            expiredConcessions.forEach(item => {
                const lockedCell = item.isLocked 
                    ? `<span class="badge badge-locked clickable" data-id="${item.concessionId}" title="Click to unlock">Locked</span>`
                    : `<button class="btn-lock btn-lock-concession" data-id="${item.concessionId}"><i class="fas fa-lock"></i> Lock</button>`;
                    
                tableHTML += `
                    <div class="report-card">
                        <div class="report-card-row">
                            <span class="report-card-label">Student:</span>
                            <span class="report-card-value">${item.studentName}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Email:</span>
                            <span class="report-card-value">${item.studentEmail}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Package Type:</span>
                            <span class="report-card-value">${item.packageType}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Balance:</span>
                            <span class="report-card-value">${item.balance}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Expiry Date:</span>
                            <span class="report-card-value"><span class="badge badge-no">${formatDate(item.expiryDate)}</span></span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Purchase Date:</span>
                            <span class="report-card-value">${item.purchaseDate ? formatDate(item.purchaseDate) : 'N/A'}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Locked:</span>
                            <span class="report-card-value">${lockedCell}</span>
                        </div>
                    </div>
                `;
            });
            
            tableDiv.innerHTML = tableHTML;
            
            // Add click handlers for lock/unlock
            attachLockUnlockHandlers();
        }
        
    } catch (error) {
        console.error('Error generating report:', error);
        tableDiv.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading data: ${error.message}</p></div>`;
    }
}

/**
 * Report 2: Concessions Expiring Soon
 */
async function generateExpiringSoonReport() {
    const resultsDiv = document.getElementById('expiring-soon-results');
    const tableDiv = document.getElementById('expiring-soon-table');
    const countSpan = document.getElementById('expiring-count');
    const weeksInput = document.getElementById('weeks-input');
    const weeks = parseInt(weeksInput.value) || 4;
    
    // Show loading state
    resultsDiv.style.display = 'block';
    tableDiv.innerHTML = '<div class="loading-state"><i class="fas fa-spinner"></i><p>Loading data...</p></div>';
    
    try {
        // Fetch all students
        const studentsSnapshot = await window.db.collection('students').get();
        const students = {};
        studentsSnapshot.forEach(doc => {
            students[doc.id] = { id: doc.id, ...doc.data() };
        });
        
        // Fetch all concessions
        const concessionsSnapshot = await window.db.collection('concessionBlocks').get();
        const now = new Date();
        const futureDate = new Date(now);
        futureDate.setDate(futureDate.getDate() + (weeks * 7));
        
        const expiringSoonConcessions = [];
        
        concessionsSnapshot.forEach(doc => {
            const concession = { id: doc.id, ...doc.data() };
            const expiryDate = concession.expiryDate?.toDate();
            
            if (expiryDate && expiryDate > now && expiryDate <= futureDate && concession.remainingQuantity > 0) {
                const student = students[concession.studentId];
                if (student) {
                    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                    expiringSoonConcessions.push({
                        concessionId: concession.id,
                        studentName: `${student.firstName} ${student.lastName}`,
                        studentEmail: student.email,
                        packageType: concession.packageName || 'Unknown',
                        balance: concession.remainingQuantity || 0,
                        expiryDate: expiryDate,
                        daysUntilExpiry: daysUntilExpiry
                    });
                }
            }
        });
        
        // Sort by days until expiry (soonest first)
        expiringSoonConcessions.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
        
        // Update count
        countSpan.textContent = expiringSoonConcessions.length;
        
        // Display results
        if (expiringSoonConcessions.length === 0) {
            tableDiv.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>No concessions expiring in the next ${weeks} weeks</p></div>`;
        } else {
            let tableHTML = `
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Email</th>
                            <th>Package Type</th>
                            <th>Balance</th>
                            <th>Expiry Date</th>
                            <th>Days Until Expiry</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            expiringSoonConcessions.forEach(item => {
                tableHTML += `
                    <tr>
                        <td>${item.studentName}</td>
                        <td>${item.studentEmail}</td>
                        <td>${item.packageType}</td>
                        <td>${item.balance}</td>
                        <td><span class="badge badge-warning">${formatDate(item.expiryDate)}</span></td>
                        <td><strong>${item.daysUntilExpiry} days</strong></td>
                    </tr>
                `;
            });
            
            tableHTML += '</tbody></table>';
            
            // Add mobile cards
            expiringSoonConcessions.forEach(item => {
                tableHTML += `
                    <div class="report-card">
                        <div class="report-card-row">
                            <span class="report-card-label">Student:</span>
                            <span class="report-card-value">${item.studentName}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Email:</span>
                            <span class="report-card-value">${item.studentEmail}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Package Type:</span>
                            <span class="report-card-value">${item.packageType}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Balance:</span>
                            <span class="report-card-value">${item.balance}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Expiry Date:</span>
                            <span class="report-card-value"><span class="badge badge-warning">${formatDate(item.expiryDate)}</span></span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Days Until Expiry:</span>
                            <span class="report-card-value"><strong>${item.daysUntilExpiry} days</strong></span>
                        </div>
                    </div>
                `;
            });
            
            tableDiv.innerHTML = tableHTML;
        }
        
    } catch (error) {
        console.error('Error generating report:', error);
        tableDiv.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading data: ${error.message}</p></div>`;
    }
}

/**
 * Report 3: Active Concessions
 */
async function generateActiveConcessionsReport() {
    const resultsDiv = document.getElementById('active-concessions-results');
    const tableDiv = document.getElementById('active-concessions-table');
    const countSpan = document.getElementById('active-count');
    
    // Show loading state
    resultsDiv.style.display = 'block';
    tableDiv.innerHTML = '<div class="loading-state"><i class="fas fa-spinner"></i><p>Loading data...</p></div>';
    
    try {
        // Fetch all students
        const studentsSnapshot = await window.db.collection('students').get();
        const students = {};
        studentsSnapshot.forEach(doc => {
            students[doc.id] = { id: doc.id, ...doc.data() };
        });
        
        // Fetch all concessions
        const concessionsSnapshot = await window.db.collection('concessionBlocks').get();
        const now = new Date();
        const activeConcessions = [];
        
        concessionsSnapshot.forEach(doc => {
            const concession = { id: doc.id, ...doc.data() };
            const expiryDate = concession.expiryDate?.toDate();
            
            // Active = has balance > 0 AND not expired
            if (concession.remainingQuantity > 0 && expiryDate && expiryDate > now) {
                const student = students[concession.studentId];
                if (student) {
                    activeConcessions.push({
                        concessionId: concession.id,
                        studentName: `${student.firstName} ${student.lastName}`,
                        studentEmail: student.email,
                        packageType: concession.packageName || 'Unknown',
                        balance: concession.remainingQuantity || 0,
                        expiryDate: expiryDate
                    });
                }
            }
        });
        
        // Sort by student name
        activeConcessions.sort((a, b) => a.studentName.localeCompare(b.studentName));
        
        // Update count
        countSpan.textContent = activeConcessions.length;
        
        // Display results
        if (activeConcessions.length === 0) {
            tableDiv.innerHTML = '<div class="empty-state"><i class="fas fa-info-circle"></i><p>No active concessions found</p></div>';
        } else {
            let tableHTML = `
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Email</th>
                            <th>Package Type</th>
                            <th>Balance</th>
                            <th>Expiry Date</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            activeConcessions.forEach(item => {
                tableHTML += `
                    <tr>
                        <td>${item.studentName}</td>
                        <td>${item.studentEmail}</td>
                        <td>${item.packageType}</td>
                        <td><strong>${item.balance}</strong></td>
                        <td><span class="badge badge-yes">${formatDate(item.expiryDate)}</span></td>
                    </tr>
                `;
            });
            
            tableHTML += '</tbody></table>';
            
            // Add mobile cards
            activeConcessions.forEach(item => {
                tableHTML += `
                    <div class="report-card">
                        <div class="report-card-row">
                            <span class="report-card-label">Student:</span>
                            <span class="report-card-value">${item.studentName}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Email:</span>
                            <span class="report-card-value">${item.studentEmail}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Package Type:</span>
                            <span class="report-card-value">${item.packageType}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Balance:</span>
                            <span class="report-card-value"><strong>${item.balance}</strong></span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Expiry Date:</span>
                            <span class="report-card-value"><span class="badge badge-yes">${formatDate(item.expiryDate)}</span></span>
                        </div>
                    </div>
                `;
            });
            
            tableDiv.innerHTML = tableHTML;
        }
        
    } catch (error) {
        console.error('Error generating report:', error);
        tableDiv.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading data: ${error.message}</p></div>`;
    }
}

/**
 * Report 4: Email Addresses (Consent Given)
 */
let emailAddresses = [];

async function generateEmailConsentReport() {
    const resultsDiv = document.getElementById('email-consent-results');
    const displayDiv = document.getElementById('email-consent-display');
    const countSpan = document.getElementById('email-count');
    
    // Show loading state
    resultsDiv.style.display = 'block';
    displayDiv.innerHTML = '<div class="loading-state"><i class="fas fa-spinner"></i><p>Loading data...</p></div>';
    
    try {
        // Fetch all students with emailConsent: true
        const studentsSnapshot = await window.db.collection('students')
            .where('emailConsent', '==', true)
            .get();
        
        emailAddresses = [];
        studentsSnapshot.forEach(doc => {
            const student = doc.data();
            if (student.email) {
                emailAddresses.push(student.email);
            }
        });
        
        // Sort alphabetically
        emailAddresses.sort();
        
        // Update count
        countSpan.textContent = emailAddresses.length;
        
        // Display results
        if (emailAddresses.length === 0) {
            displayDiv.innerHTML = '<div class="empty-state"><i class="fas fa-info-circle"></i><p>No students with email consent found</p></div>';
        } else {
            const emailListHTML = `<div class="email-list">${emailAddresses.join(', ')}</div>`;
            displayDiv.innerHTML = emailListHTML;
        }
        
    } catch (error) {
        console.error('Error generating report:', error);
        displayDiv.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading data: ${error.message}</p></div>`;
    }
}

function copyEmailsToBCC() {
    if (emailAddresses.length === 0) {
        alert('No email addresses to copy');
        return;
    }
    
    const emailString = emailAddresses.join(', ');
    
    // Copy to clipboard
    navigator.clipboard.writeText(emailString).then(() => {
        // Show success feedback
        const btn = event.target.closest('button');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.style.background = 'var(--success)';
        btn.style.color = 'var(--white)';
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            btn.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard. Please select and copy manually.');
    });
}

/**
 * Report 5: Student Portal Account Status
 */
async function generatePortalAccountReport() {
    const resultsDiv = document.getElementById('portal-account-results');
    const tableDiv = document.getElementById('portal-account-table');
    const countSpan = document.getElementById('portal-count');
    const filterSelect = document.getElementById('account-filter');
    const filter = filterSelect.value;
    
    // Show loading state
    resultsDiv.style.display = 'block';
    tableDiv.innerHTML = '<div class="loading-state"><i class="fas fa-spinner"></i><p>Loading data...</p></div>';
    
    try {
        // Fetch all students
        const studentsSnapshot = await window.db.collection('students').get();
        const students = [];
        
        studentsSnapshot.forEach(doc => {
            const student = { id: doc.id, ...doc.data() };
            students.push(student);
        });
        
        // Get all users (portal accounts)
        const usersSnapshot = await window.db.collection('users').get();
        const studentIdsWithAccounts = new Set();
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.studentId) {
                studentIdsWithAccounts.add(userData.studentId);
            }
        });
        
        // Filter students based on account status
        const filteredStudents = students.filter(student => {
            const hasAccount = studentIdsWithAccounts.has(student.id);
            
            if (filter === 'with') {
                return hasAccount;
            } else if (filter === 'without') {
                return !hasAccount;
            } else {
                return true; // 'all'
            }
        }).map(student => ({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            studentEmail: student.email,
            hasAccount: studentIdsWithAccounts.has(student.id)
        }));
        
        // Sort by student name
        filteredStudents.sort((a, b) => a.studentName.localeCompare(b.studentName));
        
        // Update count
        countSpan.textContent = filteredStudents.length;
        
        // Display results
        if (filteredStudents.length === 0) {
            tableDiv.innerHTML = '<div class="empty-state"><i class="fas fa-info-circle"></i><p>No students found matching the selected filter</p></div>';
        } else {
            let tableHTML = `
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Email</th>
                            <th>Has Portal Account</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            filteredStudents.forEach(item => {
                const accountStatus = item.hasAccount ? 
                    '<span class="badge badge-yes">Yes</span>' : 
                    '<span class="badge badge-no">No</span>';
                
                const inviteButton = !item.hasAccount ? 
                    `<button class="btn btn-primary" onclick="inviteToPortal('${item.studentId}', '${item.studentName.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${item.studentEmail}')" title="Send Portal Invitation">
                        <i class="fas fa-envelope"></i> Send Invitation
                    </button>` : 
                    '';
                
                tableHTML += `
                    <tr>
                        <td>${item.studentName}</td>
                        <td>${item.studentEmail}</td>
                        <td>${accountStatus}</td>
                        <td>${inviteButton}</td>
                    </tr>
                `;
            });
            
            tableHTML += '</tbody></table>';
            
            // Add mobile cards
            filteredStudents.forEach(item => {
                const accountStatus = item.hasAccount ? 
                    '<span class="badge badge-yes">Yes</span>' : 
                    '<span class="badge badge-no">No</span>';
                
                const inviteButton = !item.hasAccount ? 
                    `<div class="report-card-row">
                        <button class="btn btn-primary" onclick="inviteToPortal('${item.studentId}', '${item.studentName.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${item.studentEmail}')" style="width: 100%;">
                            <i class="fas fa-envelope"></i> Send Portal Invitation
                        </button>
                    </div>` : 
                    '';
                    
                tableHTML += `
                    <div class="report-card">
                        <div class="report-card-row">
                            <span class="report-card-label">Student:</span>
                            <span class="report-card-value">${item.studentName}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Email:</span>
                            <span class="report-card-value">${item.studentEmail}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Has Portal Account:</span>
                            <span class="report-card-value">${accountStatus}</span>
                        </div>
                        ${inviteButton}
                    </div>
                `;
            });
            
            tableDiv.innerHTML = tableHTML;
        }
        
    } catch (error) {
        console.error('Error generating report:', error);
        tableDiv.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading data: ${error.message}</p></div>`;
    }
}

/**
 * Lock/Unlock Concession Block Functions
 */
async function lockConcessionBlock(blockId) {
    try {
        console.log('Attempting to lock block:', blockId);
        await window.db.collection('concessionBlocks').doc(blockId).update({
            isLocked: true,
            lockedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lockedBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown',
            unlockedAt: null,
            unlockedBy: null
        });
        console.log('Successfully locked block:', blockId);
        return true;
    } catch (error) {
        console.error('Error locking concession block:', blockId, error);
        return false;
    }
}

async function unlockConcessionBlock(blockId) {
    try {
        console.log('Attempting to unlock block:', blockId);
        await window.db.collection('concessionBlocks').doc(blockId).update({
            isLocked: false,
            unlockedAt: firebase.firestore.FieldValue.serverTimestamp(),
            unlockedBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown',
            lockedAt: null,
            lockedBy: null
        });
        console.log('Successfully unlocked block:', blockId);
        return true;
    } catch (error) {
        console.error('Error unlocking concession block:', blockId, error);
        return false;
    }
}

function attachLockUnlockHandlers() {
    // Lock button handlers
    document.querySelectorAll('.btn-lock-concession').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const blockId = e.currentTarget.dataset.id;
            const button = e.currentTarget;
            const parent = button.parentElement;
            const originalHTML = button.innerHTML;
            
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locking...';
            
            try {
                const success = await lockConcessionBlock(blockId);
                
                if (success) {
                    // Replace button with locked badge
                    const badge = document.createElement('span');
                    badge.className = 'badge badge-locked clickable';
                    badge.dataset.id = blockId;
                    badge.title = 'Click to unlock';
                    badge.textContent = 'Locked';
                    
                    // Check parent still exists before replacing
                    if (parent && parent.contains(button)) {
                        parent.replaceChild(badge, button);
                        // Attach unlock handler to new badge
                        badge.addEventListener('click', handleUnlock);
                    }
                } else {
                    alert('Failed to lock concession block. Please try again.');
                    button.disabled = false;
                    button.innerHTML = originalHTML;
                }
            } catch (error) {
                console.error('Error in lock handler:', error);
                alert('An error occurred while locking. Please try again.');
                if (button && button.parentElement) {
                    button.disabled = false;
                    button.innerHTML = originalHTML;
                }
            }
        });
    });
    
    // Unlock badge handlers
    document.querySelectorAll('.badge-locked.clickable').forEach(badge => {
        badge.addEventListener('click', handleUnlock);
    });
}

async function handleUnlock(e) {
    const blockId = e.currentTarget.dataset.id;
    const badge = e.currentTarget;
    
    // Create and show confirmation modal
    const confirmModal = new ConfirmationModal({
        title: 'Unlock Concession Block',
        message: 'Are you sure you want to unlock this concession block? It will become available for use again.',
        icon: 'fas fa-unlock',
        confirmText: 'Unlock',
        confirmClass: 'btn-primary',
        cancelText: 'Cancel',
        onConfirm: async () => {
            const originalHTML = badge.innerHTML;
            badge.style.pointerEvents = 'none';
            badge.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Unlocking...';
            
            try {
                const success = await unlockConcessionBlock(blockId);
                
                if (success) {
                    // Replace badge with lock button
                    const button = document.createElement('button');
                    button.className = 'btn-lock btn-lock-concession';
                    button.dataset.id = blockId;
                    button.innerHTML = '<i class="fas fa-lock"></i> Lock';
                    badge.parentElement.replaceChild(button, badge);
                    
                    // Attach lock handler to new button
                    button.addEventListener('click', async (event) => {
                        const id = event.currentTarget.dataset.id;
                        const origHTML = event.currentTarget.innerHTML;
                        const btn = event.currentTarget;
                        const parent = btn.parentElement;
                        
                        if (!parent) {
                            console.error('Button has no parent element');
                            return;
                        }
                        
                        btn.disabled = true;
                        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locking...';
                        
                        try {
                            const result = await lockConcessionBlock(id);
                            
                            if (result) {
                                const bdg = document.createElement('span');
                                bdg.className = 'badge badge-locked clickable';
                                bdg.dataset.id = id;
                                bdg.title = 'Click to unlock';
                                bdg.textContent = 'Locked';
                                parent.replaceChild(bdg, btn);
                                bdg.addEventListener('click', handleUnlock);
                            } else {
                                alert('Failed to lock concession block. Please try again.');
                                btn.disabled = false;
                                btn.innerHTML = origHTML;
                            }
                        } catch (error) {
                            console.error('Error in nested lock handler:', error);
                            alert('An error occurred while locking. Please try again.');
                            if (btn.parentElement) {
                                btn.disabled = false;
                                btn.innerHTML = origHTML;
                            }
                        }
                    });
                } else {
                    alert('Failed to unlock concession block. Please try again.');
                    badge.style.pointerEvents = '';
                    badge.innerHTML = originalHTML;
                }
            } catch (error) {
                console.error('Error in unlock handler:', error);
                alert('An error occurred while unlocking. Please try again.');
                badge.style.pointerEvents = '';
                badge.innerHTML = originalHTML;
            }
        }
    });
    
    confirmModal.show();
}

/**
 * Utility Functions
 */
function formatDate(date) {
    if (!date) return 'N/A';
    
    // Use UTC methods to avoid timezone conversion issues
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    
    return `${day}/${month}/${year}`;
}

/**
 * Report 6: Improvers Membership Status
 */
async function generateImproversMembershipReport() {
    const resultsDiv = document.getElementById('improvers-membership-results');
    const tableDiv = document.getElementById('improvers-membership-table');
    const countSpan = document.getElementById('improvers-count');
    
    // Show loading state
    resultsDiv.style.display = 'block';
    tableDiv.innerHTML = '<div class="loading-state"><i class="fas fa-spinner"></i><p>Loading data...</p></div>';
    
    try {
        // Fetch all improver students
        const studentsSnapshot = await window.db.collection('students')
            .where('improver', '==', true)
            .get();
        
        const improvers = [];
        
        for (const doc of studentsSnapshot.docs) {
            const student = { id: doc.id, ...doc.data() };
            
            const improverData = {
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`,
                studentEmail: student.email || 'No email',
                hasActiveMembership: !!student.activeMembershipId,
                activeMembershipId: student.activeMembershipId || null,
                membershipStatus: student.membershipStatus || null,
                membershipExpiryDate: student.membershipExpiryDate?.toDate() || null,
                membershipTypeName: null,
                autoRenew: false
            };
            
            // If they have an active membership, fetch its details
            if (student.activeMembershipId) {
                try {
                    const membershipDoc = await window.db.collection('memberships')
                        .doc(student.activeMembershipId)
                        .get();
                    
                    if (membershipDoc.exists) {
                        const membership = membershipDoc.data();
                        improverData.membershipTypeName = membership.typeName || 'Unknown';
                        improverData.autoRenew = membership.autoRenew || false;
                    }
                } catch (error) {
                    console.error(`Error fetching membership for ${student.id}:`, error);
                }
            }
            
            improvers.push(improverData);
        }
        
        // Sort by membership status (active first), then by name
        improvers.sort((a, b) => {
            if (a.hasActiveMembership && !b.hasActiveMembership) return -1;
            if (!a.hasActiveMembership && b.hasActiveMembership) return 1;
            return a.studentName.localeCompare(b.studentName);
        });
        
        // Update count
        countSpan.textContent = improvers.length;
        
        // Display results
        if (improvers.length === 0) {
            tableDiv.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i><p>No improver students found</p></div>';
        } else {
            let tableHTML = `
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Email</th>
                            <th>Has Membership</th>
                            <th>Membership Type</th>
                            <th>Auto-Renew</th>
                            <th>Expiry Date</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            improvers.forEach(item => {
                const hasMembershipBadge = item.hasActiveMembership
                    ? '<span class="badge badge-yes">Yes</span>'
                    : '<span class="badge badge-no">No</span>';
                
                const membershipType = item.membershipTypeName || '—';
                
                const autoRenewBadge = item.hasActiveMembership
                    ? (item.autoRenew
                        ? '<span class="badge badge-yes">Yes</span>'
                        : '<span class="badge badge-no">No</span>')
                    : '—';
                
                // Make expiry date clickable if they have an active membership
                let expiryDateDisplay;
                if (item.membershipExpiryDate && item.hasActiveMembership) {
                    const formattedDate = formatDate(item.membershipExpiryDate);
                    if (item.autoRenew) {
                        // Auto-renewing: show info icon instead of edit icon
                        expiryDateDisplay = `<span class="expiry-date-link" onclick="showAutoRenewWarning()" title="Cannot edit auto-renewing membership">
                            <span class="badge badge-yes">${formattedDate}</span>
                            <i class="fas fa-info-circle" style="color: var(--text-muted);"></i>
                        </span>`;
                    } else {
                        // Not auto-renewing: show edit icon
                        expiryDateDisplay = `<span class="expiry-date-link" onclick="openUpdateExpiryModal('${item.studentId}', '${item.studentName}', '${item.studentEmail}', '${item.membershipExpiryDate.toISOString()}', '${item.activeMembershipId}', false)" title="Click to update expiry date">
                            <span class="badge badge-yes">${formattedDate}</span>
                            <i class="fas fa-pencil-alt"></i>
                        </span>`;
                    }
                } else if (item.membershipExpiryDate) {
                    expiryDateDisplay = formatDate(item.membershipExpiryDate);
                } else {
                    expiryDateDisplay = '—';
                }
                
                tableHTML += `
                    <tr>
                        <td>${item.studentName}</td>
                        <td>${item.studentEmail}</td>
                        <td>${hasMembershipBadge}</td>
                        <td>${membershipType}</td>
                        <td>${autoRenewBadge}</td>
                        <td>${expiryDateDisplay}</td>
                    </tr>
                `;
            });
            
            tableHTML += '</tbody></table>';
            
            // Add mobile cards
            improvers.forEach(item => {
                const hasMembershipBadge = item.hasActiveMembership
                    ? '<span class="badge badge-yes">Yes</span>'
                    : '<span class="badge badge-no">No</span>';
                
                const membershipType = item.membershipTypeName || '—';
                
                const autoRenewBadge = item.hasActiveMembership
                    ? (item.autoRenew
                        ? '<span class="badge badge-yes">Yes</span>'
                        : '<span class="badge badge-no">No</span>')
                    : '—';
                
                // Make expiry date clickable if they have an active membership
                let expiryDateDisplay;
                if (item.membershipExpiryDate && item.hasActiveMembership) {
                    const formattedDate = formatDate(item.membershipExpiryDate);
                    if (item.autoRenew) {
                        // Auto-renewing: show info icon instead of edit icon
                        expiryDateDisplay = `<span class="expiry-date-link" onclick="showAutoRenewWarning()" title="Cannot edit auto-renewing membership">
                            <span class="badge badge-yes">${formattedDate}</span>
                            <i class="fas fa-info-circle" style="color: var(--text-muted);"></i>
                        </span>`;
                    } else {
                        // Not auto-renewing: show edit icon
                        expiryDateDisplay = `<span class="expiry-date-link" onclick="openUpdateExpiryModal('${item.studentId}', '${item.studentName}', '${item.studentEmail}', '${item.membershipExpiryDate.toISOString()}', '${item.activeMembershipId}', false)" title="Click to update expiry date">
                            <span class="badge badge-yes">${formattedDate}</span>
                            <i class="fas fa-pencil-alt"></i>
                        </span>`;
                    }
                } else if (item.membershipExpiryDate) {
                    expiryDateDisplay = formatDate(item.membershipExpiryDate);
                } else {
                    expiryDateDisplay = '—';
                }
                
                tableHTML += `
                    <div class="report-card">
                        <div class="report-card-row">
                            <span class="report-card-label">Student:</span>
                            <span class="report-card-value">${item.studentName}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Email:</span>
                            <span class="report-card-value">${item.studentEmail}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Has Membership:</span>
                            <span class="report-card-value">${hasMembershipBadge}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Membership Type:</span>
                            <span class="report-card-value">${membershipType}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Auto-Renew:</span>
                            <span class="report-card-value">${autoRenewBadge}</span>
                        </div>
                        <div class="report-card-row">
                            <span class="report-card-label">Expiry Date:</span>
                            <span class="report-card-value">${expiryDateDisplay}</span>
                        </div>
                    </div>
                `;
            });
            
            tableDiv.innerHTML = tableHTML;
        }
        
    } catch (error) {
        console.error('Error generating report:', error);
        tableDiv.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading data: ${error.message}</p></div>`;
    }
}

// Make functions globally accessible for onclick handlers
window.generateExpiredConcessionsReport = generateExpiredConcessionsReport;
window.generateExpiringSoonReport = generateExpiringSoonReport;
window.generateActiveConcessionsReport = generateActiveConcessionsReport;
window.generateEmailConsentReport = generateEmailConsentReport;
window.copyEmailsToBCC = copyEmailsToBCC;
window.generatePortalAccountReport = generatePortalAccountReport;
window.generateImproversMembershipReport = generateImproversMembershipReport;

// ========================================
// UPDATE MEMBERSHIP EXPIRY MODAL
// ========================================

let updateExpiryDatePicker = null;
let currentExpiryData = null; // Store current student/membership data

/**
 * Initialize the update expiry modal and date picker
 */
function initializeUpdateExpiryModal() {
    updateExpiryDatePicker = new DatePicker('update-expiry-new-date', 'update-expiry-calendar', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
        disablePastDates: true, // Don't allow dates in the past
        ignoreClosedown: true, // Admin can select any date
        showTime: false,
        onDateSelected: () => {
            // Enable the update button when a date is selected
            document.getElementById('confirm-update-expiry-btn').disabled = false;
        }
    });
}

/**
 * Show warning modal for auto-renewing memberships
 */
function showAutoRenewWarning() {
    const warningModal = new ConfirmationModal({
        title: 'Cannot Edit Auto-Renewing Membership',
        message: `
            <div style="text-align: left;">
                <p><strong>This membership automatically renews via Stripe.</strong></p>
                <p>The expiry date is controlled by Stripe's billing schedule and cannot be changed here.</p>
                <p style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-light);">
                    <strong>Why?</strong> Changing the date here would create a mismatch between your system and Stripe's billing schedule, 
                    causing confusion when payments are processed.
                </p>
                <p style="margin-top: 1rem;">
                    If you need to extend access due to cancelled classes or modify the billing cycle, 
                    please contact support to update the subscription in Stripe.
                </p>
            </div>
        `,
        icon: 'fas fa-info-circle',
        confirmText: 'OK',
        confirmClass: 'btn-primary',
        showCancel: false
    });
    warningModal.show();
}

/**
 * Open the update expiry modal
 * @param {string} studentId - Student document ID
 * @param {string} studentName - Student name
 * @param {string} studentEmail - Student email
 * @param {string} currentExpiryISO - Current expiry date in ISO format
 * @param {string} membershipId - Membership document ID
 * @param {boolean} isAutoRenewing - Whether the membership auto-renews via Stripe (should always be false when called)
 */
function openUpdateExpiryModal(studentId, studentName, studentEmail, currentExpiryISO, membershipId, isAutoRenewing = false) {
    // Safety check: should not be called for auto-renewing memberships
    if (isAutoRenewing) {
        showAutoRenewWarning();
        return;
    }

    const modal = document.getElementById('update-expiry-modal');
    if (!modal) return;

    // Store current data
    currentExpiryData = {
        studentId: studentId,
        studentName: studentName,
        studentEmail: studentEmail,
        currentExpiry: new Date(currentExpiryISO),
        membershipId: membershipId
    };

    // Populate modal fields
    document.getElementById('update-expiry-student-name').textContent = studentName;
    document.getElementById('update-expiry-student-email').textContent = studentEmail;
    document.getElementById('update-expiry-current-date').value = formatDate(currentExpiryData.currentExpiry);
    document.getElementById('update-expiry-reason').value = '';

    // Initialize date picker if not already initialized
    if (!updateExpiryDatePicker) {
        initializeUpdateExpiryModal();
    }

    // Reset date picker and disable button
    updateExpiryDatePicker.clearDate();
    document.getElementById('confirm-update-expiry-btn').disabled = true;

    // Show modal
    modal.style.display = 'flex';
}

/**
 * Close the update expiry modal
 */
function closeUpdateExpiryModal() {
    const modal = document.getElementById('update-expiry-modal');
    if (!modal) return;

    modal.style.display = 'none';
    currentExpiryData = null;
    
    if (updateExpiryDatePicker) {
        updateExpiryDatePicker.clearDate();
    }
    
    document.getElementById('update-expiry-reason').value = '';
    document.getElementById('confirm-update-expiry-btn').disabled = true;
}

/**
 * Quick extend the expiry date by a number of days
 * @param {number} days - Number of days to extend
 */
function quickExtendExpiry(days) {
    if (!currentExpiryData) return;

    const newDate = new Date(currentExpiryData.currentExpiry);
    newDate.setDate(newDate.getDate() + days);

    if (updateExpiryDatePicker) {
        updateExpiryDatePicker.setDate(newDate);
        document.getElementById('confirm-update-expiry-btn').disabled = false;
    }
}

/**
 * Confirm and submit the expiry date update
 */
async function confirmUpdateExpiry() {
    if (!currentExpiryData || !updateExpiryDatePicker) return;

    const newDate = updateExpiryDatePicker.selectedDate;
    if (!newDate) {
        alert('Please select a new expiry date');
        return;
    }

    const reason = document.getElementById('update-expiry-reason').value.trim();
    const confirmBtn = document.getElementById('confirm-update-expiry-btn');

    // Disable button and show loading state
    confirmBtn.disabled = true;
    const originalHTML = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

    try {
        // Format date as YYYY-MM-DD to avoid timezone issues
        const year = newDate.getFullYear();
        const month = String(newDate.getMonth() + 1).padStart(2, '0');
        const day = String(newDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        // Call the Cloud Function
        const updateMembershipExpiry = firebase.functions().httpsCallable('updateMembershipExpiry');
        const result = await updateMembershipExpiry({
            membershipId: currentExpiryData.membershipId,
            newExpiryDate: dateString,
            reason: reason || undefined
        });

        console.log('Expiry date updated successfully:', result.data);

        // Format the date for display (DD/MM/YYYY)
        const [displayYear, displayMonth, displayDay] = dateString.split('-');
        const formattedDate = `${displayDay}/${displayMonth}/${displayYear}`;

        // Show success message
        const successModal = new ConfirmationModal({
            title: 'Expiry Date Updated',
            message: `<p>The membership expiry date for <strong>${currentExpiryData.studentName}</strong> has been updated to <strong>${formattedDate}</strong>.</p>`,
            icon: 'fas fa-check-circle',
            confirmText: 'OK',
            confirmClass: 'btn-primary'
        });
        successModal.show();

        // Close modal
        closeUpdateExpiryModal();

        // Refresh the report to show updated data
        await generateImproversMembershipReport();

    } catch (error) {
        console.error('Error updating expiry date:', error);
        
        // Restore button
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalHTML;

        // Show error message
        const errorModal = new ConfirmationModal({
            title: 'Update Failed',
            message: `<p>Failed to update expiry date: ${error.message}</p>`,
            icon: 'fas fa-exclamation-circle',
            confirmText: 'OK',
            confirmClass: 'btn-primary'
        });
        errorModal.show();
    }
}

// Make modal functions globally accessible
window.openUpdateExpiryModal = openUpdateExpiryModal;
window.closeUpdateExpiryModal = closeUpdateExpiryModal;
window.quickExtendExpiry = quickExtendExpiry;
window.confirmUpdateExpiry = confirmUpdateExpiry;
