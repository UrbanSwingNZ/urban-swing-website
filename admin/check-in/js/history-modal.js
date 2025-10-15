/**
 * history-modal.js - Check-in history modal
 * Displays filterable history of past check-ins
 */

/**
 * Open history modal
 */
function openHistoryModal() {
    const modal = document.getElementById('history-modal');
    
    // Initialize date range to last 7 days
    initializeHistoryDateRange();
    
    // Load history with default filter
    loadHistory();
    
    modal.style.display = 'flex';
}

/**
 * Close history modal
 */
function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    modal.style.display = 'none';
}

/**
 * Initialize history date range inputs
 */
function initializeHistoryDateRange() {
    const dateFrom = document.getElementById('history-date-from');
    const dateTo = document.getElementById('history-date-to');
    
    // Set default range to last 7 days
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    dateFrom.value = formatDateToString(sevenDaysAgo);
    dateTo.value = formatDateToString(today);
}

/**
 * Initialize history modal listeners
 */
function initializeHistoryModalListeners() {
    const dateFrom = document.getElementById('history-date-from');
    const dateTo = document.getElementById('history-date-to');
    const studentSearch = document.getElementById('history-student-search');
    const searchResults = document.getElementById('history-search-results');
    const clearBtn = document.getElementById('clear-history-search');
    
    // Date range changes - reload history
    dateFrom.addEventListener('change', () => {
        loadHistory();
    });
    
    dateTo.addEventListener('change', () => {
        loadHistory();
    });
    
    // Student search functionality
    let selectedHistoryStudentId = null;
    
    // Function to position the dropdown
    const positionDropdown = () => {
        const rect = studentSearch.getBoundingClientRect();
        searchResults.style.top = `${rect.bottom}px`;
        searchResults.style.left = `${rect.left}px`;
        searchResults.style.width = `${rect.width}px`;
    };
    
    studentSearch.addEventListener('focus', (e) => {
        // Show all students when focused with empty or default value
        if (e.target.value === '' || e.target.value === 'All Students') {
            const students = getStudents();
            
            // Add "All Students" option at the top
            const allStudentsHtml = `
                <div class="student-result" data-student-id="">
                    <div class="student-name" style="font-weight: 600; color: var(--admin-purple);">All Students</div>
                    <div class="student-email">Show all check-ins</div>
                </div>
            `;
            
            const studentsHtml = students.map(student => `
                <div class="student-result" data-student-id="${student.id}">
                    <div class="student-name">${getStudentFullName(student)}</div>
                    <div class="student-email">${student.email || 'No email'}</div>
                </div>
            `).join('');
            
            searchResults.innerHTML = allStudentsHtml + studentsHtml;
            positionDropdown();
            searchResults.style.display = 'block';
            
            // Add click handlers
            searchResults.querySelectorAll('.student-result').forEach(result => {
                result.addEventListener('click', () => {
                    const studentId = result.dataset.studentId;
                    if (studentId === '') {
                        selectedHistoryStudentId = null;
                        studentSearch.value = 'All Students';
                        clearBtn.style.display = 'block';
                    } else {
                        const student = students.find(s => s.id === studentId);
                        selectedHistoryStudentId = studentId;
                        studentSearch.value = getStudentFullName(student);
                        clearBtn.style.display = 'block';
                    }
                    searchResults.style.display = 'none';
                    loadHistory();
                });
            });
        }
    });
    
    studentSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        // Show/hide clear button
        clearBtn.style.display = e.target.value ? 'block' : 'none';
        
        // If empty, show all students and clear filter
        if (query === '' || query === 'all students') {
            selectedHistoryStudentId = null;
            searchResults.style.display = 'none';
            loadHistory();
            return;
        }
        
        // Filter students
        const students = getStudents();
        const filtered = students.filter(student => {
            const fullName = getStudentFullName(student).toLowerCase();
            const email = student.email ? student.email.toLowerCase() : '';
            return fullName.includes(query) || email.includes(query);
        });
        
        // Display results with "All Students" option
        if (filtered.length > 0) {
            const allStudentsHtml = `
                <div class="student-result" data-student-id="">
                    <div class="student-name" style="font-weight: 600; color: var(--admin-purple);">All Students</div>
                    <div class="student-email">Show all check-ins</div>
                </div>
            `;
            
            const studentsHtml = filtered.map(student => `
                <div class="student-result" data-student-id="${student.id}">
                    <div class="student-name">${getStudentFullName(student)}</div>
                    <div class="student-email">${student.email || 'No email'}</div>
                </div>
            `).join('');
            
            searchResults.innerHTML = allStudentsHtml + studentsHtml;
            positionDropdown();
            searchResults.style.display = 'block';
            
            // Add click handlers to results
            searchResults.querySelectorAll('.student-result').forEach(result => {
                result.addEventListener('click', () => {
                    const studentId = result.dataset.studentId;
                    if (studentId === '') {
                        selectedHistoryStudentId = null;
                        studentSearch.value = 'All Students';
                        clearBtn.style.display = 'block';
                    } else {
                        const student = students.find(s => s.id === studentId);
                        selectedHistoryStudentId = studentId;
                        studentSearch.value = getStudentFullName(student);
                        clearBtn.style.display = 'block';
                    }
                    searchResults.style.display = 'none';
                    loadHistory();
                });
            });
        } else {
            searchResults.innerHTML = '<div class="student-result" style="cursor: default;"><div class="student-name" style="color: var(--text-muted);">No students found</div></div>';
            positionDropdown();
            searchResults.style.display = 'block';
        }
    });
    
    // Clear button functionality
    clearBtn.addEventListener('click', () => {
        studentSearch.value = 'All Students';
        selectedHistoryStudentId = null;
        clearBtn.style.display = 'none';
        searchResults.style.display = 'none';
        loadHistory();
        studentSearch.focus();
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.student-search-wrapper')) {
            searchResults.style.display = 'none';
        }
    });
    
    // Calendar button clicks - trigger date picker
    const dateInputWrappers = document.querySelectorAll('#history-modal .date-input-wrapper');
    dateInputWrappers.forEach(wrapper => {
        const input = wrapper.querySelector('.date-input');
        const button = wrapper.querySelector('.calendar-button');
        
        wrapper.addEventListener('click', (e) => {
            if (e.target !== input && input.showPicker) {
                input.showPicker();
            }
        });
    });
    
    // Store selected student ID for loadHistory to access
    window.getSelectedHistoryStudentId = () => selectedHistoryStudentId;
    
    // Close modal when clicking outside
    document.getElementById('history-modal').addEventListener('click', (e) => {
        if (e.target.id === 'history-modal') {
            closeHistoryModal();
        }
    });
}

/**
 * Load history based on filters
 */
function loadHistory() {
    const dateFrom = document.getElementById('history-date-from').value;
    const dateTo = document.getElementById('history-date-to').value;
    const studentId = window.getSelectedHistoryStudentId ? window.getSelectedHistoryStudentId() : null;
    
    // Validate date range
    if (!dateFrom || !dateTo) {
        displayHistory([]);
        return;
    }
    
    if (new Date(dateFrom) > new Date(dateTo)) {
        showSnackbar('Start date must be before end date', 'warning');
        displayHistory([]);
        return;
    }
    
    // Query Firestore for check-ins between dateFrom and dateTo
    (async () => {
        try {
            const start = new Date(dateFrom);
            start.setHours(0, 0, 0, 0);
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);

            let query = firebase.firestore()
                .collection('checkins')
                .where('checkinDate', '>=', firebase.firestore.Timestamp.fromDate(start))
                .where('checkinDate', '<=', firebase.firestore.Timestamp.fromDate(end));

            // Always order by date, fetch all in range, filter by studentId client-side for compatibility
            query = query.orderBy('checkinDate', 'desc');
            const snapshot = await query.get();

            let history = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    studentId: data.studentId,
                    studentName: data.studentName,
                    timestamp: data.checkinDate.toDate(),
                    entryType: data.entryType,
                    paymentMethod: data.paymentMethod,
                    freeEntryReason: data.freeEntryReason,
                    notes: data.notes
                };
            });
            if (studentId) {
                history = history.filter(item => item.studentId === studentId);
            }
            displayHistory(history);
        } catch (err) {
            console.error('Error loading check-in history:', err);
            displayHistory([]);
        }
    })();
}

/**
 * Display history items
 */
function displayHistory(history) {
    const historyList = document.getElementById('history-list');
    const countElement = document.getElementById('history-count');
    
    // Get student filter name
    const studentSearch = document.getElementById('history-student-search');
    const studentFilterName = studentSearch.value || 'All Students';
    
    if (history.length === 0) {
        countElement.textContent = '';
        historyList.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 40px;">No check-ins found for ${studentFilterName}</p>`;
        return;
    }
    
    countElement.textContent = `${history.length} check-in${history.length !== 1 ? 's' : ''} found`;
    
    historyList.innerHTML = history.map(item => {
        const date = formatDate(item.timestamp);
        const typeClass = item.entryType;
        const typeLabel = item.entryType === 'concession' ? 'Concession' : 
                         item.entryType === 'casual' ? 'Casual $15' : 'Free Entry';
        return `<div class="history-item" style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
            <div class="history-date-name" style="display:flex;align-items:center;gap:12px;">
                <span class="history-date" style="font-weight:600;">${date}</span>
                <span class="history-student">${escapeHtml(item.studentName)}</span>
            </div>
            <div class="history-type">
                <span class="checkin-type ${typeClass}">${typeLabel}</span>
            </div>
        </div>`;
    }).join('');
}
