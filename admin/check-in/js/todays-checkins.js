/**
 * todays-checkins.js - Manages today's check-ins list display
 */

let todaysCheckins = [];

/**
 * Load today's check-ins from Firestore
 */
async function loadTodaysCheckins() {
    // TODO: Query Firestore for transactions where date = today when backend is ready
    // For now, start with empty list (will be populated as mock check-ins are added)
    todaysCheckins = [];
    displayTodaysCheckins();
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
