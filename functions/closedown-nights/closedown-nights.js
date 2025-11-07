/**
 * Closedown Nights Banner
 * Displays a banner on public pages when classes won't be operating
 * 
 * Usage:
 * 1. Include Firebase: <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
 * 2. Include Firestore: <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
 * 3. Include Firebase config: <script src="/config/firebase-config.js"></script>
 * 4. Include this script: <script src="/functions/closedown-nights/closedown-nights.js"></script>
 * 5. Include the CSS: <link rel="stylesheet" href="/styles/banners/closedown-banner.css">
 * 6. Call: initClosedownBanner() after DOM is loaded
 */

/**
 * Initialize and display the closedown banner
 */
async function initClosedownBanner() {
    try {
        // Check if Firebase is available
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.warn('Closedown Banner: Firebase not available');
            return;
        }

        const db = firebase.firestore();
        
        // Get the look-ahead period setting (default 4 weeks)
        let lookAheadWeeks = 4;
        try {
            const settingsDoc = await db.collection('settings').doc('closedownNights').get();
            if (settingsDoc.exists) {
                lookAheadWeeks = settingsDoc.data().bannerLookAheadWeeks || 4;
            }
        } catch (error) {
            console.warn('Closedown Banner: Could not load settings, using default 4 weeks');
        }

        // Calculate date range to check
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + (lookAheadWeeks * 7));
        futureDate.setHours(23, 59, 59, 999);

        // Fetch closedown nights within the look-ahead period
        const snapshot = await db.collection('closedownNights').get();
        
        // Filter for upcoming closedown periods within the look-ahead window
        const upcomingClosedowns = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
                startDate: doc.data().startDate.toDate(),
                endDate: doc.data().endDate.toDate()
            }))
            .filter(period => {
                // End date must be in the future (not already passed)
                // Start date must be within the look-ahead window
                return period.endDate >= today && period.startDate <= futureDate;
            })
            .sort((a, b) => a.startDate - b.startDate);

        if (upcomingClosedowns.length > 0) {
            displayClosedownBanner(upcomingClosedowns);
        }

    } catch (error) {
        console.error('Closedown Banner: Error loading closedown nights:', error);
    }
}

/**
 * Display the closedown banner with upcoming closedown dates
 */
function displayClosedownBanner(closedowns) {
    // Create banner container if it doesn't exist
    let banner = document.getElementById('closedown-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'closedown-banner';
        banner.className = 'closedown-banner';
        
        // Try to insert after page title (h1.page-title or any h1), otherwise after header, otherwise at top of body
        const pageTitle = document.querySelector('h1.page-title') || document.querySelector('.content-wrapper h1') || document.querySelector('main h1');
        if (pageTitle) {
            // Insert after the page title
            if (pageTitle.nextSibling) {
                pageTitle.parentNode.insertBefore(banner, pageTitle.nextSibling);
            } else {
                pageTitle.parentNode.appendChild(banner);
            }
        } else {
            const header = document.querySelector('header');
            if (header && header.nextSibling) {
                header.parentNode.insertBefore(banner, header.nextSibling);
            } else {
                // Fallback: insert at the top of the body
                document.body.insertBefore(banner, document.body.firstChild);
            }
        }
    }

    // Build the banner content
    let bannerHTML = `
        <div class="closedown-banner-content">
            <i class="fas fa-info-circle"></i>
            <div class="closedown-banner-text">
                <strong>Classes will not be run on the following date${closedowns.length > 1 ? 's' : ''}:</strong>
                <ul class="closedown-dates-list">
    `;

    closedowns.forEach(period => {
        const startStr = formatDateForBanner(period.startDate);
        const endStr = formatDateForBanner(period.endDate);
        
        let dateDisplay;
        if (startStr === endStr) {
            // Single day
            dateDisplay = startStr;
        } else {
            // Date range
            dateDisplay = `${startStr} - ${endStr}`;
        }

        // Add reason if it should be displayed
        const reasonText = (period.reason && period.displayReason) 
            ? ` (${period.reason})` 
            : '';

        bannerHTML += `<li>${dateDisplay}${reasonText}</li>`;
    });

    bannerHTML += `
                </ul>
            </div>
        </div>
    `;

    banner.innerHTML = bannerHTML;
}

/**
 * Format a date for display in the banner
 */
function formatDateForBanner(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-NZ', options);
}

// Auto-initialize when DOM is ready (if not already called manually)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClosedownBanner);
} else {
    // DOM already loaded
    initClosedownBanner();
}
