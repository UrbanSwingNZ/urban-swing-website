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
    
    // Load auth users and collections browser
    await Promise.all([
        loadAuthUsers(),
        loadCollectionsBrowser()
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
    
    // Collections Browser
    document.getElementById('refresh-collections-browser-btn').addEventListener('click', loadCollectionsBrowser);
    document.getElementById('add-field-filter-btn').addEventListener('click', addFieldFilter);
    document.getElementById('apply-filters-btn').addEventListener('click', applyFilters);
    document.getElementById('clear-filters-btn').addEventListener('click', clearFilters);
    document.getElementById('filter-all-collections').addEventListener('change', handleAllCollectionsToggle);
    
    // Editor
    document.getElementById('save-document-btn').addEventListener('click', saveDocument);
    document.getElementById('cancel-edit-btn').addEventListener('click', hideDocumentEditor);
    document.getElementById('add-field-btn').addEventListener('click', addFieldRow);
}

// ========================================
// COLLECTIONS BROWSER (UNIFIED VIEW)
// ========================================

let allCollectionsData = {}; // Stores all collections and their documents
let filteredCollectionsData = {}; // Stores filtered data

/**
 * Initialize global search with available collections
 */
function initializeGlobalSearch(collections) {
    availableCollections = collections;
    const container = document.getElementById('collection-checkboxes');
    
    container.innerHTML = collections.map(collectionName => `
        <label class="collection-checkbox-item">
            <input type="checkbox" value="${collectionName}" class="collection-checkbox">
            <span>${collectionName}</span>
        </label>
    `).join('');
    
    // Add one initial filter row
    addGlobalFilterRow();
}

/**
 * Add a filter row to global search
 */
function addGlobalFilterRow() {
    const container = document.getElementById('global-filters-container');
    const filterId = Date.now();
    
    const filterRow = document.createElement('div');
    filterRow.className = 'global-filter-row';
    filterRow.dataset.filterId = filterId;
    
    filterRow.innerHTML = `
        <select class="filter-field">
            <option value="">Select field...</option>
        </select>
        <select class="filter-operator">
            <option value="contains">Contains</option>
            <option value="startsWith">Starts with</option>
            <option value="equals">Equals</option>
        </select>
        <input type="text" class="filter-value" placeholder="Enter value...">
        <button class="btn-remove-filter" onclick="removeGlobalFilterRow(${filterId})" title="Remove filter">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(filterRow);
    updateGlobalSearchFields();
}

/**
 * Remove a filter row
 */
window.removeGlobalFilterRow = function(filterId) {
    const row = document.querySelector(`[data-filter-id="${filterId}"]`);
    if (row) {
        row.remove();
    }
};

/**
 * Update available fields based on selected collections
 */
function updateGlobalSearchFields() {
    const selectedCollections = Array.from(document.querySelectorAll('.collection-checkbox:checked'))
        .map(cb => cb.value);
    
    // Get all unique fields from selected collections
    const allFields = new Set();
    selectedCollections.forEach(collection => {
        if (fieldOrders[collection]) {
            fieldOrders[collection].forEach(field => allFields.add(field));
        }
        // Add common fields
        ['createdAt', 'updatedAt', 'id'].forEach(field => allFields.add(field));
    });
    
    // Update all filter field dropdowns
    document.querySelectorAll('.filter-field').forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select field...</option>' +
            Array.from(allFields).sort().map(field => 
                `<option value="${field}" ${field === currentValue ? 'selected' : ''}>${field}</option>`
            ).join('');
    });
}

/**
 * Execute global search
 */
async function executeGlobalSearch() {
    const selectedCollections = Array.from(document.querySelectorAll('.collection-checkbox:checked'))
        .map(cb => cb.value);
    
    if (selectedCollections.length === 0) {
        showSnackbar('Please select at least one collection', 'error');
        return;
    }
    
    // Get all filters
    const filters = Array.from(document.querySelectorAll('.global-filter-row')).map(row => ({
        field: row.querySelector('.filter-field').value,
        operator: row.querySelector('.filter-operator').value,
        value: row.querySelector('.filter-value').value.trim()
    })).filter(f => f.field && f.value);
    
    if (filters.length === 0) {
        showSnackbar('Please add at least one filter', 'error');
        return;
    }
    
    const logic = document.querySelector('input[name="filter-logic"]:checked').value;
    
    // Show loading
    const resultsContainer = document.getElementById('global-results-container');
    const resultsSection = document.getElementById('global-search-results');
    resultsSection.style.display = 'block';
    resultsContainer.innerHTML = '<loading-spinner></loading-spinner>';
    
    try {
        const results = await searchCollections(selectedCollections, filters, logic);
        displayGlobalSearchResults(results);
    } catch (error) {
        console.error('Error executing global search:', error);
        showSnackbar('Error executing search: ' + error.message, 'error');
        resultsContainer.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error executing search</p>
            </div>
        `;
    }
}

/**
 * Search across multiple collections
 */
async function searchCollections(collections, filters, logic) {
    const results = {};
    
    // Search each collection
    await Promise.all(collections.map(async (collectionName) => {
        try {
            const snapshot = await window.db.collection(collectionName).get();
            const matches = [];
            
            snapshot.docs.forEach(doc => {
                const data = { id: doc.id, ...doc.data() };
                const matchesFilters = logic === 'AND' 
                    ? filters.every(filter => matchesFilter(data, filter))
                    : filters.some(filter => matchesFilter(data, filter));
                
                if (matchesFilters) {
                    matches.push({ id: doc.id, data: doc.data() });
                }
            });
            
            if (matches.length > 0) {
                results[collectionName] = matches;
            }
        } catch (error) {
            console.warn(`Error searching ${collectionName}:`, error);
        }
    }));
    
    return results;
}

/**
 * Check if document matches a filter
 */
function matchesFilter(data, filter) {
    const value = String(data[filter.field] || '').toLowerCase();
    const searchValue = filter.value.toLowerCase();
    
    switch (filter.operator) {
        case 'contains':
            return value.includes(searchValue);
        case 'startsWith':
            return value.startsWith(searchValue);
        case 'equals':
            return value === searchValue;
        default:
            return false;
    }
}

/**
 * Display global search results
 */
function displayGlobalSearchResults(results) {
    const resultsContainer = document.getElementById('global-results-container');
    
    const collectionNames = Object.keys(results);
    
    if (collectionNames.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-search"></i>
                <p>No matching documents found</p>
            </div>
        `;
        return;
    }
    
    resultsContainer.innerHTML = collectionNames.map(collectionName => {
        const documents = results[collectionName];
        return `
            <div class="collection-results" data-collection="${collectionName}">
                <div class="collection-results-header" onclick="toggleCollectionResults('${collectionName}')">
                    <h4>
                        <i class="fas fa-chevron-down collection-toggle-icon"></i>
                        <i class="fas fa-folder"></i>
                        ${collectionName}
                    </h4>
                    <span class="collection-results-count">${documents.length}</span>
                </div>
                <div class="results-documents">
                    ${documents.map(doc => {
                        const jsonString = JSON.stringify(doc.data, null, 2);
                        return `
                            <div class="result-document-card collapsed" data-doc-id="${doc.id}">
                                <div class="result-document-header" onclick="toggleDocumentResult('${collectionName}', '${doc.id}')">
                                    <i class="fas fa-chevron-down result-document-toggle-icon"></i>
                                    <div class="result-document-id">${doc.id}</div>
                                </div>
                                <div class="result-document-content">
                                    <div class="result-document-json">${escapeHtml(jsonString)}</div>
                                    <div class="result-document-actions">
                                        <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); viewGlobalSearchResult('${collectionName}', '${doc.id}')">
                                            <i class="fas fa-edit"></i> Edit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Toggle collection results accordion
 */
window.toggleCollectionResults = function(collectionName) {
    const collectionElement = document.querySelector(`.collection-results[data-collection="${collectionName}"]`);
    if (collectionElement) {
        collectionElement.classList.toggle('collapsed');
    }
};

/**
 * Toggle collection results accordion
 */
window.toggleCollectionResults = function(collectionName) {
    const collectionElement = document.querySelector(`.collection-results[data-collection="${collectionName}"]`);
    if (collectionElement) {
        collectionElement.classList.toggle('collapsed');
    }
};

/**
 * Toggle document result accordion
 */
window.toggleDocumentResult = function(collectionName, docId) {
    const collectionElement = document.querySelector(`.collection-results[data-collection="${collectionName}"]`);
    if (collectionElement) {
        const documentElement = collectionElement.querySelector(`.result-document-card[data-doc-id="${docId}"]`);
        if (documentElement) {
            documentElement.classList.toggle('collapsed');
        }
    }
};

/**
 * View a document from global search results
 */
window.viewGlobalSearchResult = async function(collectionName, docId) {
    // Load the collection and scroll to it
    await selectCollection(collectionName);
    
    // Wait a bit for documents to load, then view the specific document
    setTimeout(() => {
        viewDocument(docId);
    }, 500);
};

/**
 * Clear global search
 */
function clearGlobalSearch() {
    // Uncheck all collections
    document.querySelectorAll('.collection-checkbox').forEach(cb => cb.checked = false);
    
    // Clear filters
    document.getElementById('global-filters-container').innerHTML = '';
    addGlobalFilterRow();
    
    // Hide results
    document.getElementById('global-search-results').style.display = 'none';
    document.getElementById('global-results-container').innerHTML = '';
    
    // Reset logic to AND
    document.querySelector('input[name="filter-logic"][value="AND"]').checked = true;
}

// Listen for collection checkbox changes
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('collection-checkbox')) {
        updateGlobalSearchFields();
    }
});

/**
 * Load all collections with their documents into unified browser
 */
async function loadCollectionsBrowser() {
    const container = document.getElementById('collections-browser-container');
    container.innerHTML = '<loading-spinner></loading-spinner>';
    
    try {
        // Get list of collections
        const listCollections = window.functions.httpsCallable('listCollections');
        const result = await listCollections();
        
        if (!result.data.success || result.data.collections.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <p>No collections found in your database</p>
                </div>
            `;
            return;
        }
        
        const collectionNames = result.data.collections;
        
        // Populate collection filter checkboxes
        const checkboxContainer = document.getElementById('collection-filter-checkboxes');
        const existingCheckboxes = checkboxContainer.querySelectorAll('label:not(:first-child)');
        existingCheckboxes.forEach(cb => cb.remove());
        
        collectionNames.forEach(collectionName => {
            const label = document.createElement('label');
            label.className = 'collection-checkbox-item';
            label.innerHTML = `
                <input type="checkbox" value="${collectionName}" class="collection-filter-checkbox" checked>
                <span>${collectionName}</span>
            `;
            checkboxContainer.appendChild(label);
        });
        
        // Load all documents from all collections
        allCollectionsData = {};
        
        await Promise.all(collectionNames.map(async (collectionName) => {
            try {
                const snapshot = await window.db.collection(collectionName).get();
                allCollectionsData[collectionName] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    data: doc.data()
                }));
            } catch (error) {
                console.warn(`Error loading ${collectionName}:`, error);
                allCollectionsData[collectionName] = [];
            }
        }));
        
        // Initial display (no filters)
        filteredCollectionsData = JSON.parse(JSON.stringify(allCollectionsData));
        displayCollectionsBrowser();
        
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
 * Display collections browser with current filtered data
 */
function displayCollectionsBrowser() {
    const container = document.getElementById('collections-browser-container');
    
    const collectionNames = Object.keys(filteredCollectionsData);
    
    if (collectionNames.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <p>No collections match your filters</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = collectionNames.map(collectionName => {
        const documents = filteredCollectionsData[collectionName];
        const documentCount = documents.length;
        
        return `
            <div class="browser-collection collapsed" data-collection="${collectionName}">
                <div class="browser-collection-header" onclick="toggleBrowserCollection('${collectionName}')">
                    <h3 class="browser-collection-title">
                        <i class="fas fa-chevron-down browser-collection-toggle-icon"></i>
                        <i class="fas fa-folder"></i>
                        ${collectionName}
                    </h3>
                    <span class="browser-collection-count">${documentCount}</span>
                </div>
                <div class="browser-documents-container">
                    ${documentCount === 0 ? 
                        '<div class="empty-collection-message">No documents in this collection</div>' :
                        documents.map(doc => {
                            const jsonString = JSON.stringify(doc.data, null, 2);
                            return `
                                <div class="browser-document collapsed" data-doc-id="${doc.id}">
                                    <div class="browser-document-header" onclick="event.stopPropagation(); toggleBrowserDocument('${collectionName}', '${doc.id}')">
                                        <i class="fas fa-chevron-down browser-document-toggle-icon"></i>
                                        <div class="browser-document-id">${doc.id}</div>
                                    </div>
                                    <div class="browser-document-content">
                                        <div class="browser-document-json">${escapeHtml(jsonString)}</div>
                                        <div class="browser-document-actions">
                                            <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); editBrowserDocument('${collectionName}', '${doc.id}')">
                                                <i class="fas fa-edit"></i> Edit
                                            </button>
                                            <button class="btn-danger btn-sm" onclick="event.stopPropagation(); deleteBrowserDocument('${collectionName}', '${doc.id}')">
                                                <i class="fas fa-trash"></i> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')
                    }
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Toggle collection accordion in browser
 */
window.toggleBrowserCollection = function(collectionName) {
    const collectionElement = document.querySelector(`.browser-collection[data-collection="${collectionName}"]`);
    if (collectionElement) {
        collectionElement.classList.toggle('collapsed');
    }
};

/**
 * Toggle document accordion in browser
 */
window.toggleBrowserDocument = function(collectionName, docId) {
    const collectionElement = document.querySelector(`.browser-collection[data-collection="${collectionName}"]`);
    if (collectionElement) {
        const documentElement = collectionElement.querySelector(`.browser-document[data-doc-id="${docId}"]`);
        if (documentElement) {
            documentElement.classList.toggle('collapsed');
        }
    }
};

/**
 * Edit a document from browser
 */
window.editBrowserDocument = function(collectionName, docId) {
    const doc = allCollectionsData[collectionName]?.find(d => d.id === docId);
    if (!doc) return;
    
    currentCollection = collectionName;
    showDocumentEditor(doc);
};

/**
 * Delete a document from browser
 */
window.deleteBrowserDocument = async function(collectionName, docId) {
    currentCollection = collectionName;
    await deleteDocument(docId);
    // Reload browser after deletion
    await loadCollectionsBrowser();
};

/**
 * Add a field filter row
 */
function addFieldFilter() {
    const container = document.getElementById('field-filters-container');
    const filterId = Date.now();
    
    const filterRow = document.createElement('div');
    filterRow.className = 'field-filter-row';
    filterRow.dataset.filterId = filterId;
    
    // Get all available fields from selected collections
    const selectedCollections = Array.from(document.querySelectorAll('.collection-filter-checkbox:checked:not(#filter-all-collections)'))
        .map(cb => cb.value);
    
    const allFields = new Set();
    selectedCollections.forEach(collection => {
        if (fieldOrders[collection]) {
            fieldOrders[collection].forEach(field => allFields.add(field));
        }
        // Add common fields
        ['createdAt', 'updatedAt', 'id'].forEach(field => allFields.add(field));
    });
    
    filterRow.innerHTML = `
        <select class="field-filter-field">
            <option value="">Select field...</option>
            ${Array.from(allFields).sort().map(field => 
                `<option value="${field}">${field}</option>`
            ).join('')}
        </select>
        <select class="field-filter-operator">
            <option value="contains">Contains</option>
            <option value="startsWith">Starts with</option>
            <option value="equals">Equals</option>
        </select>
        <input type="text" class="field-filter-value" placeholder="Enter value...">
        <button class="btn-remove-filter" onclick="removeFieldFilter(${filterId})" title="Remove filter">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(filterRow);
}

/**
 * Remove a field filter row
 */
window.removeFieldFilter = function(filterId) {
    const row = document.querySelector(`[data-filter-id="${filterId}"]`);
    if (row) {
        row.remove();
    }
};

/**
 * Apply filters to collections data
 */
function applyFilters() {
    // Get selected collections
    const allCollectionsChecked = document.getElementById('filter-all-collections').checked;
    let selectedCollections;
    
    if (allCollectionsChecked) {
        selectedCollections = Object.keys(allCollectionsData);
    } else {
        selectedCollections = Array.from(document.querySelectorAll('.collection-filter-checkbox:checked:not(#filter-all-collections)'))
            .map(cb => cb.value);
    }
    
    // Get field filters
    const filters = Array.from(document.querySelectorAll('.field-filter-row')).map(row => ({
        field: row.querySelector('.field-filter-field').value,
        operator: row.querySelector('.field-filter-operator').value,
        value: row.querySelector('.field-filter-value').value.trim()
    })).filter(f => f.field && f.value);
    
    const logic = document.querySelector('input[name="filter-logic"]:checked').value;
    
    // Filter collections
    filteredCollectionsData = {};
    
    selectedCollections.forEach(collectionName => {
        const documents = allCollectionsData[collectionName] || [];
        
        if (filters.length === 0) {
            // No field filters, include all documents
            filteredCollectionsData[collectionName] = documents;
        } else {
            // Apply field filters
            const filteredDocs = documents.filter(doc => {
                const data = { id: doc.id, ...doc.data };
                const matchesFilters = logic === 'AND' 
                    ? filters.every(filter => matchesFilter(data, filter))
                    : filters.some(filter => matchesFilter(data, filter));
                return matchesFilters;
            });
            
            if (filteredDocs.length > 0) {
                filteredCollectionsData[collectionName] = filteredDocs;
            }
        }
    });
    
    displayCollectionsBrowser();
    showSnackbar(`Filters applied. Showing ${Object.keys(filteredCollectionsData).length} collection(s)`, 'success');
}

/**
 * Clear all filters and show all data
 */
function clearFilters() {
    // Check all collections
    document.getElementById('filter-all-collections').checked = true;
    document.querySelectorAll('.collection-filter-checkbox:not(#filter-all-collections)').forEach(cb => {
        cb.checked = true;
    });
    
    // Clear field filters
    document.getElementById('field-filters-container').innerHTML = '';
    
    // Reset logic to AND
    document.querySelector('input[name="filter-logic"][value="AND"]').checked = true;
    
    // Reset filtered data
    filteredCollectionsData = JSON.parse(JSON.stringify(allCollectionsData));
    displayCollectionsBrowser();
    
    showSnackbar('Filters cleared', 'success');
}

/**
 * Handle "All Collections" checkbox toggle
 */
function handleAllCollectionsToggle(event) {
    const isChecked = event.target.checked;
    document.querySelectorAll('.collection-filter-checkbox:not(#filter-all-collections)').forEach(cb => {
        cb.checked = isChecked;
    });
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
            
            // Initialize global search with collections
            initializeGlobalSearch(result.data.collections);
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
    let hasUsersDoc = false;
    if (currentCollection === 'users') {
        try {
            const manageAuthUsers = window.functions.httpsCallable('manageAuthUsers');
            const result = await manageAuthUsers({ operation: 'list', maxResults: 1000 });
            hasAuthUser = result.data.users.some(user => user.uid === docId);
        } catch (error) {
            console.warn('Could not check for auth user:', error);
        }
    }
    
    // If deleting from students collection, check for all related documents
    let relatedCheckins = [];
    let relatedConcessionBlocks = [];
    let relatedTransactionsForStudent = [];
    if (currentCollection === 'students') {
        try {
            // Check for related users document
            const usersDoc = await window.db.collection('users').doc(docId).get();
            hasUsersDoc = usersDoc.exists;
            
            // If users doc exists, check for auth user
            if (hasUsersDoc) {
                try {
                    const manageAuthUsers = window.functions.httpsCallable('manageAuthUsers');
                    const result = await manageAuthUsers({ operation: 'list', maxResults: 1000 });
                    hasAuthUser = result.data.users.some(user => user.uid === docId);
                } catch (error) {
                    console.warn('Could not check for auth user:', error);
                }
            }
            
            // Check for checkins
            const checkinsSnapshot = await window.db.collection('checkins')
                .where('studentId', '==', docId)
                .get();
            relatedCheckins = checkinsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Check for concessionBlocks
            const blocksSnapshot = await window.db.collection('concessionBlocks')
                .where('studentId', '==', docId)
                .get();
            relatedConcessionBlocks = blocksSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Check for transactions
            const transactionsSnapshot = await window.db.collection('transactions')
                .where('studentId', '==', docId)
                .get();
            relatedTransactionsForStudent = transactionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
        } catch (error) {
            console.warn('Could not check for related student documents:', error);
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
    
    // If deleting from concessionBlocks collection, check for related transaction
    let concessionBlockDoc = null;
    if (currentCollection === 'concessionBlocks') {
        try {
            // Get the concessionBlock document to check for transactionId
            const blockSnapshot = await window.db.collection('concessionBlocks').doc(docId).get();
            if (blockSnapshot.exists) {
                concessionBlockDoc = blockSnapshot.data();
                studentId = concessionBlockDoc.studentId;
                
                // Get the related transaction if transactionId exists
                if (concessionBlockDoc.transactionId) {
                    const transactionDoc = await window.db.collection('transactions').doc(concessionBlockDoc.transactionId).get();
                    if (transactionDoc.exists) {
                        relatedTransactions = [{
                            id: transactionDoc.id,
                            ...transactionDoc.data()
                        }];
                    }
                }
            }
        } catch (error) {
            console.warn('Could not check for related transaction:', error);
        }
    }
    
    // If deleting from transactions collection, check for related concession block and checkin
    let transactionDoc = null;
    let relatedConcessionBlock = null;
    let relatedCheckin = null;
    if (currentCollection === 'transactions') {
        try {
            // Get the transaction document to check for concessionBlockId and checkinId
            const transactionSnapshot = await window.db.collection('transactions').doc(docId).get();
            if (transactionSnapshot.exists) {
                transactionDoc = transactionSnapshot.data();
                studentId = transactionDoc.studentId;
                
                // Get the related concession block if concessionBlockId exists
                if (transactionDoc.concessionBlockId) {
                    const blockDoc = await window.db.collection('concessionBlocks').doc(transactionDoc.concessionBlockId).get();
                    if (blockDoc.exists) {
                        relatedConcessionBlock = {
                            id: blockDoc.id,
                            ...blockDoc.data()
                        };
                    }
                }
                
                // Get the related checkin if checkinId exists
                if (transactionDoc.checkinId) {
                    const checkinDoc = await window.db.collection('checkins').doc(transactionDoc.checkinId).get();
                    if (checkinDoc.exists) {
                        relatedCheckin = {
                            id: checkinDoc.id,
                            ...checkinDoc.data()
                        };
                    }
                }
            }
        } catch (error) {
            console.warn('Could not check for related documents:', error);
        }
    }
    
    const modal = new ConfirmationModal({
        title: 'Delete Document',
        message: `
            <p>Are you sure you want to delete this document?</p>
            <p style="margin-top: 1rem;"><strong>Collection:</strong> <code>${currentCollection}</code></p>
            <p style="margin-top: 0.5rem;"><strong>Document ID:</strong> <code>${docId}</code></p>
            ${currentCollection === 'users' && hasAuthUser ? '<div style="margin-top: 1rem; padding: 0.75rem 0;"><label style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer;"><input type="checkbox" id="delete-auth-user-checkbox" style="cursor: pointer; margin-top: 0.5rem;"><span>Also delete the corresponding authentication user (user will no longer be able to sign in)</span></label></div>' : ''}
            ${currentCollection === 'students' && (hasUsersDoc || hasAuthUser || relatedCheckins.length > 0 || relatedConcessionBlocks.length > 0 || relatedTransactionsForStudent.length > 0) ? `
                <div style="margin-top: 1rem; background: linear-gradient(135deg, var(--warning-lighter) 0%, var(--warning-lightest) 100%); border-left: 4px solid var(--warning-dark); color: var(--warning-darkest); padding: 0.75rem 1rem; border-radius: var(--radius-md);">
                    <p style="margin: 0; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> Related Documents Found</p>
                    <ul style="margin: 0.5rem 0 0 1.5rem; padding: 0;">
                        ${hasUsersDoc ? '<li>1 user document</li>' : ''}
                        ${hasAuthUser ? '<li>1 authentication user</li>' : ''}
                        ${relatedCheckins.length > 0 ? `<li>${relatedCheckins.length} check-in${relatedCheckins.length > 1 ? 's' : ''}</li>` : ''}
                        ${relatedConcessionBlocks.length > 0 ? `<li>${relatedConcessionBlocks.length} concession block${relatedConcessionBlocks.length > 1 ? 's' : ''}</li>` : ''}
                        ${relatedTransactionsForStudent.length > 0 ? `<li>${relatedTransactionsForStudent.length} transaction${relatedTransactionsForStudent.length > 1 ? 's' : ''}</li>` : ''}
                    </ul>
                </div>
                <div style="margin-top: 1rem; padding: 0.75rem 0;">
                    <label style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="delete-all-student-data-checkbox" style="cursor: pointer; margin-top: 0.5rem;">
                        <span>Delete ALL related documents (user, auth user, check-ins, concession blocks, and transactions)</span>
                    </label>
                </div>
            ` : ''}
            ${(currentCollection === 'checkins' || currentCollection === 'concessionBlocks') && relatedTransactions.length > 0 ? `
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
            ${currentCollection === 'concessionBlocks' && concessionBlockDoc ? `
                <div style="margin-top: 1rem; background: linear-gradient(135deg, var(--warning-lighter) 0%, var(--warning-lightest) 100%); border-left: 4px solid var(--warning-dark); color: var(--warning-darkest); padding: 0.75rem 1rem; border-radius: var(--radius-md);">
                    <p style="margin: 0; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> Concession Balance Warning</p>
                    <p style="margin: 0.5rem 0 0 0;">Deleting this concession block may require updating the <code>concessionBalance</code> on student document ${studentId ? `<code>${studentId}</code>` : ''}.</p>
                </div>
            ` : ''}
            ${currentCollection === 'transactions' && relatedConcessionBlock ? `
                <div style="margin-top: 1rem; background: linear-gradient(135deg, var(--warning-lighter) 0%, var(--warning-lightest) 100%); border-left: 4px solid var(--warning-dark); color: var(--warning-darkest); padding: 0.75rem 1rem; border-radius: var(--radius-md);">
                    <p style="margin: 0; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> Related Concession Block Found</p>
                    <p style="margin: 0.5rem 0 0 0;">Concession block ID: <code>${relatedConcessionBlock.id}</code></p>
                </div>
                <div style="margin-top: 1rem; padding: 0.75rem 0;">
                    <label style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="delete-concession-block-checkbox" style="cursor: pointer; margin-top: 0.5rem;">
                        <span>Also delete the related concession block</span>
                    </label>
                </div>
                <div style="margin-top: 1rem; background: linear-gradient(135deg, var(--warning-lighter) 0%, var(--warning-lightest) 100%); border-left: 4px solid var(--warning-dark); color: var(--warning-darkest); padding: 0.75rem 1rem; border-radius: var(--radius-md);">
                    <p style="margin: 0; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> Concession Balance Warning</p>
                    <p style="margin: 0.5rem 0 0 0;">If you delete the concession block, you'll need to manually update the <code>concessionBalance</code> on student document ${studentId ? `<code>${studentId}</code>` : ''}.</p>
                </div>
            ` : ''}
            ${currentCollection === 'transactions' && transactionDoc?.type === 'concession-purchase' && !relatedConcessionBlock ? `
                <div style="margin-top: 1rem; background: linear-gradient(135deg, var(--warning-lighter) 0%, var(--warning-lightest) 100%); border-left: 4px solid var(--warning-dark); color: var(--warning-darkest); padding: 0.75rem 1rem; border-radius: var(--radius-md);">
                    <p style="margin: 0; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> Concession Purchase Transaction</p>
                    <p style="margin: 0.5rem 0 0 0;">This is a concession purchase transaction. You may need to manually delete the related concession block from the <code>concessionBlocks</code> collection.</p>
                </div>
            ` : ''}
            ${currentCollection === 'transactions' && relatedCheckin ? `
                <div style="margin-top: 1rem; background: linear-gradient(135deg, var(--warning-lighter) 0%, var(--warning-lightest) 100%); border-left: 4px solid var(--warning-dark); color: var(--warning-darkest); padding: 0.75rem 1rem; border-radius: var(--radius-md);">
                    <p style="margin: 0; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> Related Check-In Found</p>
                    <p style="margin: 0.5rem 0 0 0;">Check-in ID: <code>${relatedCheckin.id}</code></p>
                </div>
                <div style="margin-top: 1rem; padding: 0.75rem 0;">
                    <label style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="delete-checkin-checkbox" style="cursor: pointer; margin-top: 0.5rem;">
                        <span>Also delete the related check-in</span>
                    </label>
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
                
                // Check if user wants to delete all student-related data
                const deleteAllStudentData = currentCollection === 'students' && document.getElementById('delete-all-student-data-checkbox')?.checked;
                
                // Check if user wants to delete related transactions
                const deleteTransactions = (currentCollection === 'checkins' || currentCollection === 'concessionBlocks') && relatedTransactions.length > 0 && document.getElementById('delete-transactions-checkbox')?.checked;
                
                // Check if user wants to delete related concession block
                const deleteConcessionBlock = currentCollection === 'transactions' && relatedConcessionBlock && document.getElementById('delete-concession-block-checkbox')?.checked;
                
                // Check if user wants to delete related checkin
                const deleteCheckin = currentCollection === 'transactions' && relatedCheckin && document.getElementById('delete-checkin-checkbox')?.checked;
                
                // Handle student cascade deletion
                if (deleteAllStudentData) {
                    try {
                        // Use batch for Firestore documents
                        const batch = window.db.batch();
                        
                        // Delete checkins
                        relatedCheckins.forEach(checkin => {
                            const checkinRef = window.db.collection('checkins').doc(checkin.id);
                            batch.delete(checkinRef);
                        });
                        
                        // Delete concession blocks
                        relatedConcessionBlocks.forEach(block => {
                            const blockRef = window.db.collection('concessionBlocks').doc(block.id);
                            batch.delete(blockRef);
                        });
                        
                        // Delete transactions
                        relatedTransactionsForStudent.forEach(transaction => {
                            const transactionRef = window.db.collection('transactions').doc(transaction.id);
                            batch.delete(transactionRef);
                        });
                        
                        // Delete users document
                        if (hasUsersDoc) {
                            const usersRef = window.db.collection('users').doc(docId);
                            batch.delete(usersRef);
                        }
                        
                        await batch.commit();
                        
                        // Delete auth user separately (not part of batch)
                        if (hasAuthUser) {
                            const manageAuthUsers = window.functions.httpsCallable('manageAuthUsers');
                            await manageAuthUsers({ operation: 'delete', uid: docId });
                            await loadAuthUsers();
                        }
                    } catch (cascadeError) {
                        console.warn('Error during cascade deletion:', cascadeError);
                    }
                }
                
                // Delete Firestore document
                await window.db.collection(currentCollection).doc(docId).delete();
                
                // Also delete Auth user if checkbox was checked (for users collection)
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
                
                // Also delete related concession block if checkbox was checked
                if (deleteConcessionBlock) {
                    try {
                        await window.db.collection('concessionBlocks').doc(relatedConcessionBlock.id).delete();
                    } catch (blockError) {
                        console.warn('Error deleting related concession block:', blockError);
                    }
                }
                
                // Also delete related checkin if checkbox was checked
                if (deleteCheckin) {
                    try {
                        await window.db.collection('checkins').doc(relatedCheckin.id).delete();
                    } catch (checkinError) {
                        console.warn('Error deleting related checkin:', checkinError);
                    }
                }
                
                let successMessage = 'Document deleted successfully';
                if (deleteAllStudentData) {
                    const deletedCount = relatedCheckins.length + relatedConcessionBlocks.length + relatedTransactionsForStudent.length + (hasUsersDoc ? 1 : 0) + (hasAuthUser ? 1 : 0);
                    successMessage = `Student and ${deletedCount} related document${deletedCount > 1 ? 's' : ''} deleted successfully`;
                } else if (deleteAuthUser && deleteTransactions) {
                    successMessage = 'Document, authentication user, and related transactions deleted successfully';
                } else if (deleteAuthUser && deleteConcessionBlock) {
                    successMessage = 'Document, authentication user, and related concession block deleted successfully';
                } else if (deleteAuthUser && deleteCheckin) {
                    successMessage = 'Document, authentication user, and related check-in deleted successfully';
                } else if (deleteAuthUser) {
                    successMessage = 'Document and authentication user deleted successfully';
                } else if (deleteTransactions) {
                    successMessage = `Document and ${relatedTransactions.length} related transaction${relatedTransactions.length > 1 ? 's' : ''} deleted successfully`;
                } else if (deleteConcessionBlock) {
                    successMessage = 'Document and related concession block deleted successfully';
                } else if (deleteCheckin) {
                    successMessage = 'Document and related check-in deleted successfully';
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
