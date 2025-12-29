/**
 * history-firestore.js - Load history from Firestore
 */

/**
 * Load history based on filters
 */
function loadHistory() {
    // Get dates from DatePicker instances
    const dateFrom = historyDateFromPicker ? historyDateFromPicker.getSelectedDate() : null;
    const dateTo = historyDateToPicker ? historyDateToPicker.getSelectedDate() : null;
    const studentId = getSelectedHistoryStudentId();
    
    // Validate date range
    if (!dateFrom || !dateTo) {
        displayHistory([]);
        return;
    }
    
    if (dateFrom > dateTo) {
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
                .where('checkinDate', '<=', firebase.firestore.Timestamp.fromDate(end))
                .orderBy('checkinDate', 'desc');

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
            
            // Filter by studentId client-side if selected
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
