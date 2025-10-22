/**
 * transaction-history-attendance.js
 * Handles loading and displaying class attendance history
 * Reuses logic from check-in history-firestore.js and history-display.js
 */

/**
 * Load attendance history for a student
 */
async function loadTransactionHistoryAttendance(studentId) {
    const contentEl = document.getElementById('attendance-content');
    
    // Show loading
    contentEl.innerHTML = '<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading attendance history...</p>';
    
    try {
        // Query all check-ins since the first class (23 January 2025)
        // Note: We query by date range only, then filter by studentId client-side
        // This avoids needing a composite index on (studentId, checkinDate)
        const end = new Date();
        const start = new Date('2025-01-23'); // First Urban Swing class
        
        const snapshot = await firebase.firestore()
            .collection('checkins')
            .where('checkinDate', '>=', firebase.firestore.Timestamp.fromDate(start))
            .where('checkinDate', '<=', firebase.firestore.Timestamp.fromDate(end))
            .orderBy('checkinDate', 'desc')
            .get();
        
        // Filter by studentId client-side
        const history = snapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    studentId: data.studentId,
                    timestamp: data.checkinDate.toDate(),
                    entryType: data.entryType,
                    paymentMethod: data.paymentMethod,
                    freeEntryReason: data.freeEntryReason,
                    notes: data.notes
                };
            })
            .filter(item => item.studentId === studentId);
        
        displayAttendanceHistory(history);
    } catch (error) {
        console.error('Error loading attendance history:', error);
        contentEl.innerHTML = '<p class="text-error">Error loading attendance history. Please try again.</p>';
    }
}

/**
 * Display attendance history
 * Similar to displayHistory from history-display.js
 */
function displayAttendanceHistory(history) {
    const contentEl = document.getElementById('attendance-content');
    
    if (history.length === 0) {
        contentEl.innerHTML = '<p class="text-muted">No class attendance found.</p>';
        return;
    }
    
    let html = '<div class="attendance-list">';
    
    history.forEach(item => {
        const date = formatDate(item.timestamp);
        const typeClass = item.entryType;
        let typeLabel = '';
        
        if (item.entryType === 'concession') {
            typeLabel = 'Concession';
        } else if (item.entryType === 'casual') {
            typeLabel = item.paymentMethod ? `Casual (${item.paymentMethod})` : 'Casual $15';
        } else if (item.entryType === 'free') {
            typeLabel = item.freeEntryReason ? `Free (${item.freeEntryReason})` : 'Free Entry';
        }
        
        html += `
            <div class="attendance-item">
                <div class="attendance-date-time">
                    <span class="attendance-date">${date}</span>
                </div>
                <div class="attendance-type">
                    <span class="checkin-type ${typeClass}">${typeLabel}</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    contentEl.innerHTML = html;
}
