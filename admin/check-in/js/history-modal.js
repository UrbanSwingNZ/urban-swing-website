/**
 * history-modal.js - Check-in history modal
 * Displays filterable history of past check-ins
 */

/**
 * Open history modal
 */
function openHistoryModal() {
    const modal = document.getElementById('history-modal');
    
    // Load history with default filter (last 7 days)
    loadHistory('week');
    
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
 * Initialize history modal listeners
 */
function initializeHistoryModalListeners() {
    const dateRangeSelect = document.getElementById('date-range');
    const customDates = document.getElementById('custom-dates');
    const applyDatesBtn = document.getElementById('apply-dates');
    const studentFilter = document.getElementById('history-student-filter');
    
    // Date range selection
    dateRangeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customDates.style.display = 'flex';
        } else {
            customDates.style.display = 'none';
            loadHistory(e.target.value);
        }
    });
    
    // Apply custom dates
    applyDatesBtn.addEventListener('click', () => {
        const from = document.getElementById('date-from').value;
        const to = document.getElementById('date-to').value;
        
        if (!from || !to) {
            showError('Please select both start and end dates');
            return;
        }
        
        loadHistory('custom', from, to);
    });
    
    // Student filter
    studentFilter.addEventListener('change', () => {
        const range = dateRangeSelect.value;
        if (range === 'custom') {
            const from = document.getElementById('date-from').value;
            const to = document.getElementById('date-to').value;
            loadHistory('custom', from, to);
        } else {
            loadHistory(range);
        }
    });
    
    // Populate student filter
    populateStudentFilter();
    
    // Close modal when clicking outside
    document.getElementById('history-modal').addEventListener('click', (e) => {
        if (e.target.id === 'history-modal') {
            closeHistoryModal();
        }
    });
}

/**
 * Populate student filter dropdown
 */
function populateStudentFilter() {
    const select = document.getElementById('history-student-filter');
    const students = getStudents();
    
    // Add all students option (already in HTML)
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = getStudentFullName(student);
        select.appendChild(option);
    });
}

/**
 * Load history based on filters
 */
function loadHistory(range, customFrom = null, customTo = null) {
    // TODO: Query Firestore when backend is ready
    // For now, show mock data
    const mockHistory = generateMockHistory(range, customFrom, customTo);
    displayHistory(mockHistory);
}

/**
 * Generate mock history data (for UI demonstration)
 */
function generateMockHistory(range, customFrom, customTo) {
    const students = getStudents().slice(0, 10); // Use first 10 students
    const history = [];
    
    // Generate mock check-ins
    const now = new Date();
    const daysBack = range === 'today' ? 0 : range === 'week' ? 7 : 30;
    
    for (let i = 0; i < daysBack * 3; i++) {
        const randomDays = Math.floor(Math.random() * daysBack);
        const date = new Date(now);
        date.setDate(date.getDate() - randomDays);
        date.setHours(19, Math.floor(Math.random() * 60), 0, 0);
        
        const student = students[Math.floor(Math.random() * students.length)];
        const entryTypes = ['concession', 'casual', 'free'];
        const entryType = entryTypes[Math.floor(Math.random() * entryTypes.length)];
        
        history.push({
            id: 'mock-' + i,
            studentId: student.id,
            studentName: getStudentFullName(student),
            timestamp: date,
            entryType: entryType
        });
    }
    
    // Sort by date descending
    history.sort((a, b) => b.timestamp - a.timestamp);
    
    // Filter by student if selected
    const studentFilter = document.getElementById('history-student-filter').value;
    if (studentFilter) {
        return history.filter(h => h.studentId === studentFilter);
    }
    
    return history;
}

/**
 * Display history items
 */
function displayHistory(history) {
    const historyList = document.getElementById('history-list');
    const countElement = document.getElementById('history-count');
    
    countElement.textContent = `${history.length} check-in${history.length !== 1 ? 's' : ''} found`;
    
    if (history.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">No check-ins found for selected filters</p>';
        return;
    }
    
    historyList.innerHTML = history.map(item => {
        const date = formatDate(item.timestamp);
        const time = formatTime(item.timestamp);
        const typeClass = item.entryType;
        const typeLabel = item.entryType === 'concession' ? 'Concession' : 
                         item.entryType === 'casual' ? 'Casual $15' : 'Free Entry';
        
        return `<div class="history-item">
            <div class="history-date">${date}</div>
            <div class="history-student">${escapeHtml(item.studentName)}</div>
            <div class="history-time">${time}</div>
            <div class="history-type">
                <span class="checkin-type ${typeClass}">${typeLabel}</span>
            </div>
        </div>`;
    }).join('');
}
