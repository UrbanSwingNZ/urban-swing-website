/**
 * history-display.js - Display history results
 */

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
