/**
 * Merge UI - UI Rendering Functions
 * Handles rendering student cards, field comparisons, and search results
 */

/**
 * Initialize search functionality
 */
function initializeSearch() {
    setupSearchInput('primary');
    setupSearchInput('deprecated');
}

/**
 * Setup search input for a panel
 */
function setupSearchInput(panelType) {
    const searchInput = document.getElementById(`${panelType}-search`);
    const clearButton = document.getElementById(`clear-${panelType}`);
    const resultsDiv = document.getElementById(`${panelType}-results`);

    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim();

        // Show/hide clear button
        clearButton.style.display = term ? 'flex' : 'none';

        // Clear previous timeout
        clearTimeout(searchTimeout);

        if (term.length < 2) {
            resultsDiv.style.display = 'none';
            return;
        }

        // Debounce search
        searchTimeout = setTimeout(() => {
            performSearch(term, panelType);
        }, 300);
    });

    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        clearButton.style.display = 'none';
        resultsDiv.style.display = 'none';
        searchInput.focus();
    });

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.style.display = 'none';
        }
    });
}

/**
 * Perform student search
 */
async function performSearch(term, panelType) {
    const resultsDiv = document.getElementById(`${panelType}-results`);
    
    try {
        // Query students by name
        const snapshot = await firebase.firestore().collection('students')
            .orderBy('firstName')
            .get();

        const searchLower = term.toLowerCase();
        const results = [];

        snapshot.forEach(doc => {
            const student = { id: doc.id, ...doc.data() };
            
            // Skip deleted students
            if (student.deleted === true) return;

            // Skip already selected student
            const selectedStudent = panelType === 'primary' ? primaryStudent : deprecatedStudent;
            if (selectedStudent && selectedStudent.id === student.id) return;

            // Skip the opposite panel's selected student
            const oppositeStudent = panelType === 'primary' ? deprecatedStudent : primaryStudent;
            if (oppositeStudent && oppositeStudent.id === student.id) return;

            // Search in name and email
            const searchableText = [
                student.firstName || '',
                student.lastName || '',
                student.email || ''
            ].join(' ').toLowerCase();

            if (searchableText.includes(searchLower)) {
                results.push(student);
            }
        });

        displaySearchResults(results, panelType);
    } catch (error) {
        console.error('Error searching students:', error);
        resultsDiv.innerHTML = '<div class="no-results">Error searching students</div>';
        resultsDiv.style.display = 'block';
    }
}

/**
 * Display search results
 */
function displaySearchResults(results, panelType) {
    const resultsDiv = document.getElementById(`${panelType}-results`);

    if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results">No students found</div>';
        resultsDiv.style.display = 'block';
        return;
    }

    let html = '';
    results.slice(0, 10).forEach(student => {
        html += `
            <div class="search-result-item" onclick="selectStudent('${student.id}', '${panelType}')">
                <div class="result-name">${student.firstName} ${student.lastName}</div>
                <div class="result-details">${student.email}</div>
            </div>
        `;
    });

    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
}

/**
 * Select a student
 */
async function selectStudent(studentId, panelType) {
    try {
        // Get student data
        const doc = await firebase.firestore().collection('students').doc(studentId).get();
        if (!doc.exists) {
            alert('Student not found');
            return;
        }

        const student = { id: doc.id, ...doc.data() };

        // Get related document counts
        const counts = await getRelatedDocumentCounts(studentId);
        student.counts = counts;

        // Store student
        if (panelType === 'primary') {
            primaryStudent = student;
        } else {
            deprecatedStudent = student;
        }

        // Render student card
        renderStudentCard(student, panelType);

        // Hide search results
        document.getElementById(`${panelType}-results`).style.display = 'none';
        document.getElementById(`${panelType}-search`).value = '';
        document.getElementById(`clear-${panelType}`).style.display = 'none';

        // Enable continue button if both students selected
        if (primaryStudent && deprecatedStudent) {
            document.getElementById('btn-continue-review').disabled = false;
        }
    } catch (error) {
        console.error('Error selecting student:', error);
        alert('Error selecting student. Please try again.');
    }
}

/**
 * Render student card
 */
function renderStudentCard(student, panelType) {
    const cardDiv = document.getElementById(`${panelType}-card`);
    
    const html = `
        <div class="student-card">
            <div class="card-header">
                <div class="student-name">${student.firstName} ${student.lastName}</div>
                <button class="remove-btn" onclick="removeStudent('${panelType}')" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="card-info">
                <div class="info-row">
                    <i class="fas fa-envelope fa-fw"></i>
                    <span class="info-label">Email:</span>
                    <span class="info-value">${student.email || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-phone fa-fw"></i>
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${student.phoneNumber || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-user fa-fw"></i>
                    <span class="info-label">Pronouns:</span>
                    <span class="info-value">${student.pronouns || 'N/A'}</span>
                </div>
            </div>
            <div class="card-stats">
                <div class="stat-item">
                    <span class="stat-value">${student.counts.transactions}</span>
                    <span class="stat-label">Transactions</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${student.counts.checkins}</span>
                    <span class="stat-label">Check-ins</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${student.counts.concessionBlocks}</span>
                    <span class="stat-label">Concessions</span>
                </div>
            </div>
        </div>
    `;

    cardDiv.innerHTML = html;
}

/**
 * Remove selected student
 */
function removeStudent(panelType) {
    if (panelType === 'primary') {
        primaryStudent = null;
    } else {
        deprecatedStudent = null;
    }

    // Reset card
    const cardDiv = document.getElementById(`${panelType}-card`);
    cardDiv.innerHTML = `
        <i class="fas fa-user"></i>
        <p>Search for a student to select</p>
    `;

    // Disable continue button
    document.getElementById('btn-continue-review').disabled = true;
}
