/**
 * todays-checkins.js - Manages today's check-ins list display
 */

let todaysCheckins = [];

/**
 * Load today's check-ins from Firestore
 */
async function loadTodaysCheckins() {
    try {
        // Get the selected check-in date (not today's actual date)
        const selectedDate = getSelectedCheckinDate();
        
        // Start and end of selected day
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Query Firestore for check-ins on selected date
        const snapshot = await firebase.firestore()
            .collection('checkins')
            .where('checkinDate', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
            .where('checkinDate', '<=', firebase.firestore.Timestamp.fromDate(endOfDay))
            .orderBy('checkinDate', 'desc')
            .get();
        
        // Convert to array
        todaysCheckins = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                studentId: data.studentId,
                studentName: data.studentName,
                timestamp: data.checkinDate.toDate(),
                entryType: data.entryType,
                paymentMethod: data.paymentMethod,
                freeEntryReason: data.freeEntryReason,
                balance: 0, // TODO: Get actual balance from student or concessionBlocks
                notes: data.notes
            };
        });
        
        displayTodaysCheckins();
        
    } catch (error) {
        console.error('Error loading check-ins:', error);
        todaysCheckins = [];
        displayTodaysCheckins();
    }
}

/**
 * Add a check-in to today's list
 */
function addCheckinToDisplay(checkin) {
    todaysCheckins.unshift(checkin); // Add to beginning of array
    displayTodaysCheckins();
    updateCheckinCount(todaysCheckins.length);
}

/**
 * Display today's check-ins list
 */
function displayTodaysCheckins() {
    const checkinsList = document.getElementById('checkins-list');
    const emptyState = document.getElementById('empty-state');
    
    if (todaysCheckins.length === 0) {
        emptyState.style.display = 'block';
        checkinsList.style.display = 'none';
        updateCheckinCount(0);
        return;
    }
    
    emptyState.style.display = 'none';
    checkinsList.style.display = 'block';
    
    checkinsList.innerHTML = todaysCheckins.map(checkin => {
        const time = formatTime(checkin.timestamp);
        const typeClass = checkin.entryType;
        const typeLabel = checkin.entryType === 'concession' ? 'Concession' : 
                         checkin.entryType === 'casual' ? 'Casual $15' : 'Free Entry';
        
        return `<div class="checkin-item">
            <div class="checkin-info">
                <span class="checkin-name">${escapeHtml(checkin.studentName)}</span>
                <span class="checkin-time">${time}</span>
            </div>
            <div class="checkin-details">
                <span class="checkin-type ${typeClass}">${typeLabel}</span>
                ${checkin.balanceAfter !== undefined ? 
                    `<span class="checkin-balance">Balance: ${checkin.balanceAfter}</span>` : ''}
            </div>
        </div>`;
    }).join('');
    
    updateCheckinCount(todaysCheckins.length);
}

/**
 * Update check-in count badge
 */
function updateCheckinCount(count) {
    const countElement = document.getElementById('checkin-count');
    countElement.textContent = count;
}

/**
 * Get today's check-ins (for other modules to access)
 */
function getTodaysCheckins() {
    return todaysCheckins;
}
