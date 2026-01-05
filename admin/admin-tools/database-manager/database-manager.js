/**
 * Database Manager
 * View, edit, and manage Firestore collections and documents
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';

// Global state
let currentCollection = null;
let currentPage = 1;
let documentsPerPage = 20;
let allDocuments = [];
let filteredDocuments = [];
let authUsers = [];
let filteredAuthUsers = [];

// Field ordering configuration
const fieldOrders = {
    students: ['firstName', 'lastName', 'email', 'phoneNumber', 'pronouns', 'emailConsent', 'over16Confirmed', 'termsAccepted', 'referral', 'adminNotes'],
    checkins: ['studentId', 'studentName', 'checkinDate', 'entryType', 'paymentMethod', 'amountPaid'],
    concessionBlocks: ['studentId', 'studentName', 'packageId', 'packageName', 'purchaseDate', 'price', 'paymentMethod', 'originalQuantity', 'remainingQuantity', 'status', 'expiryDate'],
    transactions: ['studentId', 'transactionDate', 'type', 'amountPaid', 'paymentMethod', 'createdAt', 'invoiced'],
    users: ['studentId', 'firstName', 'lastName', 'email', 'role']
};

/**
 * Sort document fields by priority order, then alphabetically
 */
function sortFields(collectionName, fields) {
    const priorityFields = fieldOrders[collectionName] || [];
    const fieldEntries = Object.entries(fields);
    
    // Separate priority fields and other fields
    const priority = [];
    const other = [];
    
    fieldEntries.forEach(([key, value]) => {
        const priorityIndex = priorityFields.indexOf(key);
        if (priorityIndex !== -1) {
            priority.push({ key, value, index: priorityIndex });
        } else {
            other.push([key, value]);
        }
    });
    
    // Sort priority fields by their defined order
    priority.sort((a, b) => a.index - b.index);
    
    // Sort other fields alphabetically
    other.sort(([a], [b]) => a.localeCompare(b));
    
    // Combine and return
    return [
        ...priority.map(({ key, value }) => [key, value]),
        ...other
    ];
}

/**
 * Initialize the Database Manager
 */
async function init() {
    // Wait for Firebase to be ready
    await waitForFirebase();
    
    // Load auth users and collections
    await Promise.all([
        loadAuthUsers(),
        loadCollections()
    ]);
    
    // Set up event listeners
    setupEventListeners();
}

/**
 * Wait for Firebase to be initialized
 */
function waitForFirebase() {
    return new Promise((resolve) => {
        if (window.firebase && window.db && window.functions) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.firebase && window.db && window.functions) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Auth Users
    document.getElementById('refresh-auth-users-btn').addEventListener('click', loadAuthUsers);
    document.getElementById('auth-user-search').addEventListener('input', handleAuthUserSearch);
    
    // Collections
    document.getElementById('refresh-collections-btn').addEventListener('click', loadCollections);
    
    // Documents
    document.getElementById('add-document-btn').addEventListener('click', () => showDocumentEditor(null));
    document.getElementById('refresh-documents-btn').addEventListener('click', () => loadDocuments(currentCollection));
    document.getElementById('document-search').addEventListener('input', handleSearch);
    
    // Pagination
    document.getElementById('prev-page-btn').addEventListener('click', () => changePage(-1));
    document.getElementById('next-page-btn').addEventListener('click', () => changePage(1));
    
    // Editor
    document.getElementById('save-document-btn').addEventListener('click', saveDocument);
    document.getElementById('cancel-edit-btn').addEventListener('click', hideDocumentEditor);
    document.getElementById('add-field-btn').addEventListener('click', addFieldRow);
}

// ========================================
// AUTH USERS MANAGEMENT
// ========================================

/**
 * Load authentication users from Firebase Auth
 */
async function loadAuthUsers() {
    const container = document.getElementById('auth-users-container');
    container.innerHTML = '<loading-spinner></loading-spinner>';
    
    try {
        const manageAuthUsers = window.functions.httpsCallable('manageAuthUsers');
        const result = await manageAuthUsers({ operation: 'list', maxResults: 1000 });
        
        if (result.data.users && result.data.users.length > 0) {
            authUsers = result.data.users;
            filteredAuthUsers = [...authUsers];
            displayAuthUsers();
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-shield"></i>
                    <p>No authentication users found</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading auth users:', error);
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading authentication users: ${error.message}</p>
            </div>
        `;
        showSnackbar('Error loading auth users: ' + error.message, 'error');
    }
}

/**
 * Display authentication users
 */
function displayAuthUsers() {
    const container = document.getElementById('auth-users-container');
    
    if (filteredAuthUsers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No users match your search</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredAuthUsers.map(user => {
        const isActive = !user.disabled;
        const statusText = isActive ? 'Active' : 'Inactive';
        const lastSignIn = user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString() : 'Never';
        
        return `
            <div class="auth-user-card">
                <div class="auth-user-header">
                    <div class="auth-user-info">
                        <h4>${user.email || 'No email'}</h4>
                        <p class="auth-user-uid">${user.uid}</p>
                    </div>
                    <div class="auth-user-status-toggle">
                        <label class="toggle-switch" title="${isActive ? 'Click to disable' : 'Click to enable'}">
                            <input type="checkbox" ${isActive ? 'checked' : ''} data-user-uid="${user.uid}" class="status-toggle-input" onchange="toggleAuthUserStatus('${user.uid}', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="status-label ${isActive ? 'active' : 'inactive'}">${statusText}</span>
                    </div>
                </div>
                <div class="auth-user-details">
                    <div class="auth-user-detail">
                        <i class="fas fa-calendar-plus"></i>
                        <span>Created: ${new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div class="auth-user-detail">
                        <i class="fas fa-sign-in-alt"></i>
                        <span>Last Sign-In: ${lastSignIn}</span>
                    </div>
                    ${user.emailVerified ? '<div class="auth-user-detail"><i class="fas fa-check-circle" style="color: var(--success);"></i><span>Email Verified</span></div>' : ''}
                </div>
                <div class="auth-user-actions">
                    <button class="btn-danger btn-sm" onclick="deleteAuthUser('${user.uid}', '${user.email}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Handle auth user search
 */
function handleAuthUserSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    if (searchTerm) {
        filteredAuthUsers = authUsers.filter(user => {
            return (user.email && user.email.toLowerCase().includes(searchTerm)) ||
                   user.uid.toLowerCase().includes(searchTerm);
        });
    } else {
        filteredAuthUsers = [...authUsers];
    }
    
    displayAuthUsers();
}

/**
 * Toggle authentication user status (enable/disable)
 */
window.toggleAuthUserStatus = async function(uid, isActive) {
    try {
        const manageAuthUsers = window.functions.httpsCallable('manageAuthUsers');
        const operation = isActive ? 'enable' : 'disable';
        await manageAuthUsers({ operation, uid });
        
        // Update local state
        const user = authUsers.find(u => u.uid === uid);
        if (user) {
            user.disabled = !isActive;
        }
        const filteredUser = filteredAuthUsers.find(u => u.uid === uid);
        if (filteredUser) {
            filteredUser.disabled = !isActive;
        }
        
        // Update UI - just update the status label
        const card = document.querySelector(`[data-user-uid="${uid}"]`).closest('.auth-user-card');
        if (card) {
            const statusLabel = card.querySelector('.status-label');
            if (statusLabel) {
                statusLabel.textContent = isActive ? 'Active' : 'Inactive';
                statusLabel.className = `status-label ${isActive ? 'active' : 'inactive'}`;
            }
        }
        
        showSnackbar(`User ${isActive ? 'enabled' : 'disabled'} successfully`, 'success');
    } catch (error) {
        console.error('Error toggling user status:', error);
        showSnackbar('Error updating user status: ' + error.message, 'error');
        
        // Revert the toggle
        const toggleInput = document.querySelector(`[data-user-uid="${uid}"]`);
        if (toggleInput) {
            toggleInput.checked = !isActive;
        }
    }
};

/**
 * Delete an authentication user
 */
window.deleteAuthUser = async function(uid, email) {
    // Check if a corresponding users document exists
    let hasUsersDoc = false;
    try {
        const userDoc = await window.db.collection('users').doc(uid).get();
        hasUsersDoc = userDoc.exists;
    } catch (error) {
        console.warn('Could not check for users document:', error);
    }
    
    const modal = new ConfirmationModal({
        title: 'Delete Authentication User',
        message: `
            <p>Are you sure you want to delete this authentication user?</p>
            <p style="margin-top: 1rem;"><strong>Email:</strong> ${email}</p>
            <p style="margin-top: 0.5rem;"><strong>UID:</strong> <code>${uid}</code></p>
            ${hasUsersDoc ? '<div style="margin-top: 1rem; padding: 0.75rem 0;"><label style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer;"><input type="checkbox" id="delete-users-doc-checkbox" style="cursor: pointer; margin-top: 0.5rem;"><span>Also delete the corresponding document in the <code>users</code> collection</span></label></div>' : ''}
            <p style="margin-top: 1rem; color: var(--error);"><strong>Warning:</strong> This action cannot be undone. The user will no longer be able to sign in.</p>
        `,
        icon: 'fas fa-exclamation-triangle',
        confirmText: 'Delete',
        confirmClass: 'btn-danger',
        variant: 'danger',
        onConfirm: async () => {
            try {
                // Check if user wants to delete users document
                const deleteUsersDoc = hasUsersDoc && document.getElementById('delete-users-doc-checkbox')?.checked;
                
                // Delete authentication user
                const manageAuthUsers = window.functions.httpsCallable('manageAuthUsers');
                await manageAuthUsers({ operation: 'delete', uid });
                
                // Also delete from users collection if checkbox was checked
                if (deleteUsersDoc) {
                    try {
                        await window.db.collection('users').doc(uid).delete();
                    } catch (firestoreError) {
                        console.warn('Could not delete users document:', firestoreError);
                    }
                }
                
                showSnackbar(deleteUsersDoc ? 'Authentication user and users document deleted successfully' : 'Authentication user deleted successfully', 'success');
                
                // Refresh both lists
                await loadAuthUsers();
                if (currentCollection === 'users') {
                    await loadDocuments('users');
                }
            } catch (error) {
                console.error('Error deleting auth user:', error);
                showSnackbar('Error deleting auth user: ' + error.message, 'error');
            }
        }
    });
    modal.show();
};

// ========================================
// COLLECTIONS MANAGEMENT
// ========================================

/**
 * Load collections from Firestore via Cloud Function
 */
async function loadCollections() {
    const container = document.getElementById('collections-container');
    container.innerHTML = '<loading-spinner></loading-spinner>';
    
    try {
        // Call the Cloud Function to list collections
        const listCollections = window.functions.httpsCallable('listCollections');
        const result = await listCollections();
        
        if (result.data.success && result.data.collections.length > 0) {
            displayCollections(result.data.collections);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <p>No collections found in your database</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading collections:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p style="color: var(--error);">Error loading collections: ${error.message}</p>
            </div>
        `;
    }
}

/**
 * Display collections
 */
function displayCollections(collections) {
    const container = document.getElementById('collections-container');
    container.innerHTML = collections.map(collectionName => `
        <div class="collection-card" onclick="selectCollection('${collectionName}')">
            <i class="fas fa-folder"></i>
            <div class="collection-name">${collectionName}</div>
        </div>
    `).join('');
}

/**
 * Select a collection and load its documents
 */
window.selectCollection = async function(collectionName) {
    currentCollection = collectionName;
    currentPage = 1;
    
    // Show documents section
    document.getElementById('documents-section').style.display = 'block';
    document.getElementById('document-editor-section').style.display = 'none';
    document.getElementById('current-collection-name').textContent = collectionName;
    
    // Scroll to documents section
    document.getElementById('documents-section').scrollIntoView({ behavior: 'smooth' });
    
    // Load documents
    await loadDocuments(collectionName);
};

/**
 * Load documents from a collection
 */
async function loadDocuments(collectionName) {
    const container = document.getElementById('documents-container');
    container.innerHTML = '<loading-spinner></loading-spinner>';
    
    try {
        const snapshot = await window.db.collection(collectionName).get();
        
        allDocuments = snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
        }));
        
        filteredDocuments = [...allDocuments];
        
        document.getElementById('document-count').textContent = allDocuments.length;
        
        if (allDocuments.length > 0) {
            displayDocuments();
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <p>No documents found in this collection</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p style="color: var(--error);">Error loading documents: ${error.message}</p>
            </div>
        `;
    }
}

/**
 * Display documents with pagination
 */
function displayDocuments() {
    const container = document.getElementById('documents-container');
    const startIdx = (currentPage - 1) * documentsPerPage;
    const endIdx = startIdx + documentsPerPage;
    const documentsToShow = filteredDocuments.slice(startIdx, endIdx);
    
    container.innerHTML = documentsToShow.map(doc => {
        const preview = JSON.stringify(doc.data, null, 2);
        const truncatedPreview = preview.length > 200 ? preview.substring(0, 200) + '...' : preview;
        
        return `
            <div class="document-card" onclick="event.stopPropagation(); viewDocument('${doc.id}')">
                <div class="document-header">
                    <div class="document-id">${doc.id}</div>
                    <div class="document-actions">
                        <button class="btn-icon btn-edit" onclick="event.stopPropagation(); editDocument('${doc.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="event.stopPropagation(); deleteDocument('${doc.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="document-preview">${escapeHtml(truncatedPreview)}</div>
            </div>
        `;
    }).join('');
    
    updatePagination();
}

/**
 * Update pagination controls
 */
function updatePagination() {
    const totalPages = Math.ceil(filteredDocuments.length / documentsPerPage);
    
    if (totalPages > 1) {
        document.getElementById('pagination-container').style.display = 'flex';
        document.getElementById('current-page').textContent = currentPage;
        document.getElementById('total-pages').textContent = totalPages;
        
        document.getElementById('prev-page-btn').disabled = currentPage === 1;
        document.getElementById('next-page-btn').disabled = currentPage === totalPages;
    } else {
        document.getElementById('pagination-container').style.display = 'none';
    }
}

/**
 * Change page
 */
function changePage(delta) {
    currentPage += delta;
    displayDocuments();
    document.getElementById('documents-section').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Handle search input
 */
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    if (searchTerm) {
        filteredDocuments = allDocuments.filter(doc => {
            // Search in document ID
            if (doc.id.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            // Search in field names and values
            for (const [key, value] of Object.entries(doc.data)) {
                // Search in field name
                if (key.toLowerCase().includes(searchTerm)) {
                    return true;
                }
                
                // Search in field value (convert to string for searching)
                const valueStr = String(value).toLowerCase();
                if (valueStr.includes(searchTerm)) {
                    return true;
                }
            }
            
            return false;
        });
    } else {
        filteredDocuments = [...allDocuments];
    }
    
    currentPage = 1;
    displayDocuments();
}

/**
 * View document (expand to show full data)
 */
window.viewDocument = function(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;
    
    const modal = new ConfirmationModal({
        title: 'Document Data',
        message: `
            <div style="margin-bottom: 1rem;">
                <strong>Document ID:</strong> <code>${docId}</code>
            </div>
            <div style="background: var(--background-light); padding: 1rem; border-radius: var(--radius-sm); max-height: 400px; overflow-y: auto;">
                <pre style="margin: 0; font-family: 'Courier New', monospace; white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(JSON.stringify(doc.data, null, 2))}</pre>
            </div>
        `,
        confirmText: 'Edit',
        cancelText: 'Close',
        size: 'large',
        onConfirm: () => editDocument(docId)
    });
    modal.show();
};

/**
 * Edit document
 */
window.editDocument = function(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;
    
    showDocumentEditor(doc);
};

/**
 * Delete document
 */
window.deleteDocument = async function(docId) {
    // If deleting from users collection, check if Auth user exists
    let hasAuthUser = false;
    if (currentCollection === 'users') {
        try {
            const manageAuthUsers = window.functions.httpsCallable('manageAuthUsers');
            const result = await manageAuthUsers({ operation: 'list', maxResults: 1000 });
            hasAuthUser = result.data.users.some(user => user.uid === docId);
        } catch (error) {
            console.warn('Could not check for auth user:', error);
        }
    }
    
    // If deleting from checkins collection, check for related transactions
    let relatedTransactions = [];
    let checkinDoc = null;
    let concessionBlockId = null;
    let studentId = null;
    if (currentCollection === 'checkins') {
        try {
            // Get the checkin document to check entryType and amountPaid
            const checkinSnapshot = await window.db.collection('checkins').doc(docId).get();
            if (checkinSnapshot.exists) {
                checkinDoc = checkinSnapshot.data();
                studentId = checkinDoc.studentId;
                
                // If it's a concession check-in, get the concessionBlockId
                if (checkinDoc.entryType === 'concession' && checkinDoc.concessionBlockId) {
                    concessionBlockId = checkinDoc.concessionBlockId;
                }
            }
            
            // Only query for transactions if amountPaid > 0 (casual check-ins)
            if (checkinDoc && checkinDoc.amountPaid > 0) {
                const transactionsSnapshot = await window.db.collection('transactions')
                    .where('checkinId', '==', docId)
                    .get();
                
                relatedTransactions = transactionsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }
        } catch (error) {
            console.warn('Could not check for related transactions:', error);
        }
    }
    
    const modal = new ConfirmationModal({
        title: 'Delete Document',
        message: `
            <p>Are you sure you want to delete this document?</p>
            <p style="margin-top: 1rem;"><strong>Collection:</strong> <code>${currentCollection}</code></p>
            <p style="margin-top: 0.5rem;"><strong>Document ID:</strong> <code>${docId}</code></p>
            ${currentCollection === 'users' && hasAuthUser ? '<div style="margin-top: 1rem; padding: 0.75rem 0;"><label style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer;"><input type="checkbox" id="delete-auth-user-checkbox" style="cursor: pointer; margin-top: 0.5rem;"><span>Also delete the corresponding authentication user (user will no longer be able to sign in)</span></label></div>' : ''}
            ${currentCollection === 'checkins' && relatedTransactions.length > 0 ? `
                <div style="margin-top: 1rem; background: linear-gradient(135deg, var(--warning-lighter) 0%, var(--warning-lightest) 100%); border-left: 4px solid var(--warning-dark); color: var(--warning-darkest); padding: 0.75rem 1rem; border-radius: var(--radius-md);">
                    <p style="margin: 0; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> Related Transaction${relatedTransactions.length > 1 ? 's' : ''} Found</p>
                    <p style="margin: 0.5rem 0 0 0;">${relatedTransactions.length === 1 ? `Transaction ID: <code>${relatedTransactions[0].id}</code>` : `${relatedTransactions.length} transaction${relatedTransactions.length > 1 ? 's' : ''} with this checkin ID`}</p>
                </div>
                <div style="margin-top: 1rem; padding: 0.75rem 0;">
                    <label style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="delete-transactions-checkbox" style="cursor: pointer; margin-top: 0.5rem;">
                        <span>Also delete the related transaction${relatedTransactions.length > 1 ? 's' : ''} (payment record will be removed)</span>
                    </label>
                </div>
            ` : ''}
            ${currentCollection === 'checkins' && checkinDoc?.entryType === 'concession' ? `
                <div style="margin-top: 1rem; background: linear-gradient(135deg, var(--warning-lighter) 0%, var(--warning-lightest) 100%); border-left: 4px solid var(--warning-dark); color: var(--warning-darkest); padding: 0.75rem 1rem; border-radius: var(--radius-md);">
                    <p style="margin: 0; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> Concession Check-In</p>
                    <p style="margin: 0.5rem 0 0 0;">Deleting this concession check-in requires manual updates to:</p>
                    <ul style="margin: 0.5rem 0 0 1.5rem; padding: 0;">
                        ${studentId ? `<li>Student document <code>${studentId}</code> - update <code>concessionBalance</code></li>` : '<li>Student document - update <code>concessionBalance</code></li>'}
                        ${concessionBlockId ? `<li>Concession block <code>${concessionBlockId}</code> - update <code>remainingQuantity</code></li>` : '<li>Concession block - update <code>remainingQuantity</code></li>'}
                    </ul>
                </div>
            ` : ''}
            <p style="margin-top: 1rem; color: var(--error);"><strong>Warning:</strong> This action cannot be undone.</p>
        `,
        icon: 'fas fa-exclamation-triangle',
        confirmText: 'Delete',
        confirmClass: 'btn-danger',
        variant: 'danger',
        onConfirm: async () => {
            try {
                // Check if user wants to delete auth user
                const deleteAuthUser = currentCollection === 'users' && hasAuthUser && document.getElementById('delete-auth-user-checkbox')?.checked;
                
                // Check if user wants to delete related transactions
                const deleteTransactions = currentCollection === 'checkins' && relatedTransactions.length > 0 && document.getElementById('delete-transactions-checkbox')?.checked;
                
                // Delete Firestore document
                await window.db.collection(currentCollection).doc(docId).delete();
                
                // Also delete Auth user if checkbox was checked
                if (deleteAuthUser) {
                    try {
                        const manageAuthUsers = window.functions.httpsCallable('manageAuthUsers');
                        await manageAuthUsers({ operation: 'delete', uid: docId });
                        // Refresh auth users list
                        await loadAuthUsers();
                    } catch (authError) {
                        console.warn('Auth user not found or already deleted:', authError);
                    }
                }
                
                // Also delete related transactions if checkbox was checked
                if (deleteTransactions) {
                    try {
                        const batch = window.db.batch();
                        relatedTransactions.forEach(transaction => {
                            const transactionRef = window.db.collection('transactions').doc(transaction.id);
                            batch.delete(transactionRef);
                        });
                        await batch.commit();
                    } catch (transactionError) {
                        console.warn('Error deleting related transactions:', transactionError);
                    }
                }
                
                let successMessage = 'Document deleted successfully';
                if (deleteAuthUser && deleteTransactions) {
                    successMessage = 'Document, authentication user, and related transactions deleted successfully';
                } else if (deleteAuthUser) {
                    successMessage = 'Document and authentication user deleted successfully';
                } else if (deleteTransactions) {
                    successMessage = `Document and ${relatedTransactions.length} related transaction${relatedTransactions.length > 1 ? 's' : ''} deleted successfully`;
                }
                
                showSnackbar(successMessage, 'success');
                
                // Reload documents
                await loadDocuments(currentCollection);
            } catch (error) {
                console.error('Error deleting document:', error);
                showSnackbar('Error deleting document: ' + error.message, 'error');
            }
        }
    });
    modal.show();
};

/**
 * Show document editor
 */
function showDocumentEditor(doc) {
    const editorSection = document.getElementById('document-editor-section');
    const editorMode = document.getElementById('editor-mode');
    const collectionName = document.getElementById('editor-collection-name');
    const documentId = document.getElementById('editor-document-id');
    const documentIdInputContainer = document.getElementById('document-id-input-container');
    const fieldsContainer = document.getElementById('fields-container');
    
    // Set mode
    if (doc) {
        editorMode.textContent = 'Edit';
        documentId.textContent = doc.id;
        documentIdInputContainer.style.display = 'none';
    } else {
        editorMode.textContent = 'Add';
        documentId.textContent = 'New Document';
        documentIdInputContainer.style.display = 'block';
        document.getElementById('new-document-id').value = '';
    }
    
    collectionName.textContent = currentCollection;
    
    // Clear and populate fields
    fieldsContainer.innerHTML = '';
    
    if (doc) {
        const sortedFields = sortFields(currentCollection, doc.data);
        sortedFields.forEach(([key, value]) => {
            addFieldRow(key, value);
        });
    } else {
        // Add one empty field for new documents
        addFieldRow();
    }
    
    // Show editor section
    editorSection.style.display = 'block';
    editorSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Hide document editor
 */
function hideDocumentEditor() {
    document.getElementById('document-editor-section').style.display = 'none';
    document.getElementById('documents-section').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Add a field row to the editor
 */
function addFieldRow(fieldName = '', fieldValue = '') {
    const fieldsContainer = document.getElementById('fields-container');
    const fieldRow = document.createElement('div');
    fieldRow.className = 'field-row';
    
    const fieldType = detectFieldType(fieldValue);
    const valueInput = createValueInput(fieldType, fieldValue);
    
    fieldRow.innerHTML = `
        <input type="text" class="field-input field-name" placeholder="Field name" value="${escapeHtml(fieldName)}">
        <select class="field-type-select">
            <option value="string" ${fieldType === 'string' ? 'selected' : ''}>String</option>
            <option value="number" ${fieldType === 'number' ? 'selected' : ''}>Number</option>
            <option value="boolean" ${fieldType === 'boolean' ? 'selected' : ''}>Boolean</option>
            <option value="timestamp" ${fieldType === 'timestamp' ? 'selected' : ''}>Timestamp</option>
            <option value="array" ${fieldType === 'array' ? 'selected' : ''}>Array (JSON)</option>
            <option value="object" ${fieldType === 'object' ? 'selected' : ''}>Object (JSON)</option>
        </select>
        ${valueInput}
        <button class="btn-remove-field" type="button" title="Remove field">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add event listener for type change
    const typeSelect = fieldRow.querySelector('.field-type-select');
    typeSelect.addEventListener('change', (e) => {
        const newType = e.target.value;
        const currentValueInput = fieldRow.querySelector('.field-value');
        const currentValue = currentValueInput.value;
        const newValueInput = createValueInput(newType, currentValue);
        currentValueInput.outerHTML = newValueInput;
    });
    
    // Add event listener for remove button
    const removeBtn = fieldRow.querySelector('.btn-remove-field');
    removeBtn.addEventListener('click', () => fieldRow.remove());
    
    fieldsContainer.appendChild(fieldRow);
}

/**
 * Detect field type from value
 */
function detectFieldType(value) {
    if (value === '') return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (value instanceof Date || (value && typeof value.toDate === 'function')) return 'timestamp';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    return 'string';
}

/**
 * Create value input based on type
 */
function createValueInput(type, value) {
    let inputValue = '';
    
    if (type === 'boolean') {
        inputValue = value === true || value === 'true' ? 'true' : 'false';
    } else if (type === 'timestamp') {
        let date;
        if (value && typeof value.toDate === 'function') {
            date = value.toDate();
        } else if (value instanceof Date) {
            date = value;
        } else {
            date = new Date();
        }
        // Convert to local time for datetime-local input
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        inputValue = `${year}-${month}-${day}T${hours}:${minutes}`;
    } else if (type === 'array' || type === 'object') {
        inputValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
    } else {
        inputValue = value;
    }
    
    if (type === 'boolean') {
        return `
            <select class="field-input field-value">
                <option value="true" ${inputValue === 'true' ? 'selected' : ''}>true</option>
                <option value="false" ${inputValue === 'false' ? 'selected' : ''}>false</option>
            </select>
        `;
    } else if (type === 'timestamp') {
        return `<input type="datetime-local" class="field-input field-value" value="${inputValue}">`;
    } else if (type === 'array' || type === 'object') {
        return `<textarea class="field-input field-value field-textarea" placeholder="JSON format">${escapeHtml(inputValue)}</textarea>`;
    } else {
        return `<input type="text" class="field-input field-value" placeholder="Value" value="${escapeHtml(inputValue)}">`;
    }
}

/**
 * Save document
 */
async function saveDocument() {
    const editorMode = document.getElementById('editor-mode').textContent;
    const fieldsContainer = document.getElementById('fields-container');
    const fieldRows = fieldsContainer.querySelectorAll('.field-row');
    
    // Build document data
    const documentData = {};
    let hasError = false;
    
    fieldRows.forEach(row => {
        const nameInput = row.querySelector('.field-name');
        const typeSelect = row.querySelector('.field-type-select');
        const valueInput = row.querySelector('.field-value');
        
        const fieldName = nameInput.value.trim();
        const fieldType = typeSelect.value;
        const fieldValue = valueInput.value;
        
        if (!fieldName) {
            showSnackbar('All fields must have a name', 'error');
            hasError = true;
            return;
        }
        
        try {
            documentData[fieldName] = parseFieldValue(fieldType, fieldValue);
        } catch (error) {
            showSnackbar(`Error parsing field "${fieldName}": ${error.message}`, 'error');
            hasError = true;
        }
    });
    
    if (hasError) return;
    
    try {
        if (editorMode === 'Add') {
            // Adding new document
            const customId = document.getElementById('new-document-id').value.trim();
            
            if (customId) {
                await window.db.collection(currentCollection).doc(customId).set(documentData);
            } else {
                await window.db.collection(currentCollection).add(documentData);
            }
            
            showSnackbar('Document created successfully', 'success');
        } else {
            // Updating existing document
            const docId = document.getElementById('editor-document-id').textContent;
            await window.db.collection(currentCollection).doc(docId).set(documentData);
            
            showSnackbar('Document updated successfully', 'success');
        }
        
        // Reload documents and hide editor
        await loadDocuments(currentCollection);
        hideDocumentEditor();
    } catch (error) {
        console.error('Error saving document:', error);
        showSnackbar('Error saving document: ' + error.message, 'error');
    }
}

/**
 * Parse field value based on type
 */
function parseFieldValue(type, value) {
    switch (type) {
        case 'string':
            return String(value);
        case 'number':
            const num = Number(value);
            if (isNaN(num)) throw new Error('Invalid number');
            return num;
        case 'boolean':
            return value === 'true';
        case 'timestamp':
            return firebase.firestore.Timestamp.fromDate(new Date(value));
        case 'array':
            return JSON.parse(value);
        case 'object':
            return JSON.parse(value);
        default:
            return value;
    }
}

/**
 * Show snackbar notification
 */
function showSnackbar(message, type = 'info') {
    // You can implement a snackbar component or use a simple alert for now
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create a simple notification element
    const snackbar = document.createElement('div');
    snackbar.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'error' ? 'var(--error)' : type === 'success' ? 'var(--success)' : 'var(--blue-primary)'};
        color: var(--white);
        padding: 1rem 1.5rem;
        border-radius: var(--radius-md);
        box-shadow: 0 10px 30px var(--shadow-medium);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    snackbar.textContent = message;
    
    document.body.appendChild(snackbar);
    
    setTimeout(() => {
        snackbar.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => snackbar.remove(), 300);
    }, 3000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add CSS for snackbar animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
