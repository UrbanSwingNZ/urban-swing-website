// My Concessions Page

// Page Initialization
// Wait for auth check to complete and student data to be loaded
window.addEventListener('authCheckComplete', async (event) => {
    // Show main container
    document.getElementById('main-container').style.display = 'block';
    
    if (event.detail.isAuthorized) {
        // Admin viewing student portal
        // Check if we have a selected student in sessionStorage (from navigation)
        const currentStudentId = sessionStorage.getItem('currentStudentId');
        if (currentStudentId) {
            // Hide empty state immediately - student-loader will load the data
            document.getElementById('empty-state').style.display = 'none';
        }
    } else {
        // Regular student - check if data already loaded
        if (window.currentStudent) {
            await loadStudentConcessions(window.currentStudent.id);
        }
    }
});

// Listen for student selection (admin) or student loaded (regular student)
window.addEventListener('studentSelected', async (event) => {
    await loadStudentConcessions(event.detail.id);
});

window.addEventListener('studentLoaded', async (event) => {
    await loadStudentConcessions(event.detail.id);
});

// Check if a student is already selected on page load
window.addEventListener('DOMContentLoaded', () => {
    const currentStudentId = sessionStorage.getItem('currentStudentId');
    if (currentStudentId) {
        loadStudentConcessions(currentStudentId);
    }
});

// Load concessions for a specific student
async function loadStudentConcessions(studentId) {
    try {
        if (!studentId) {
            console.log('No student selected yet');
            return;
        }
        
        showLoading(true);
        
        // First, get student info for header
        const studentDoc = await window.db.collection('students').doc(studentId).get();
        if (!studentDoc.exists) {
            console.error('Student not found');
            return;
        }
        
        const studentData = studentDoc.data();
        const studentName = `${studentData.firstName} ${studentData.lastName}`;
        
        // Update header with student name
        document.getElementById('student-name').textContent = `${studentName}'s Concessions`;
        
        // Query concession blocks for this student
        const concessionsSnapshot = await window.db.collection('concessionBlocks')
            .where('studentId', '==', studentId)
            .limit(100)
            .get();
        
        const blocks = [];
        concessionsSnapshot.forEach(doc => {
            blocks.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort by purchase date descending (most recent first) client-side
        blocks.sort((a, b) => {
            const dateA = a.purchaseDate?.toDate ? a.purchaseDate.toDate() : new Date(a.purchaseDate || 0);
            const dateB = b.purchaseDate?.toDate ? b.purchaseDate.toDate() : new Date(b.purchaseDate || 0);
            return dateB - dateA;
        });
        
        // Calculate stats and display
        const stats = calculateConcessionStats(blocks);
        displayConcessions(blocks, stats);
        
        // Show content
        document.getElementById('concessions-content').style.display = 'block';
        document.getElementById('empty-state').style.display = 'none';
        
    } catch (error) {
        console.error('Error loading concessions:', error);
    } finally {
        showLoading(false);
    }
}

// Calculate concession statistics
function calculateConcessionStats(blocks) {
    const now = new Date();
    const activeBlocks = [];
    const expiredBlocks = [];
    const depletedBlocks = [];
    
    blocks.forEach(block => {
        const expiryDate = block.expiryDate?.toDate ? block.expiryDate.toDate() : new Date(block.expiryDate);
        const hasBalance = block.remainingQuantity > 0;
        const isExpired = expiryDate < now;
        
        if (hasBalance && !isExpired) {
            activeBlocks.push(block);
        } else if (isExpired && hasBalance) {
            expiredBlocks.push(block);
        } else {
            depletedBlocks.push(block);
        }
    });
    
    return {
        activeBlocks,
        expiredBlocks,
        depletedBlocks,
        activeCount: activeBlocks.length,
        expiredCount: expiredBlocks.length,
        depletedCount: depletedBlocks.length
    };
}

// Display concessions
function displayConcessions(blocks, stats) {
    const displayEl = document.getElementById('concessions-display');
    const noDataEl = document.getElementById('no-concessions');
    
    if (blocks.length === 0) {
        noDataEl.style.display = 'block';
        displayEl.style.display = 'none';
        return;
    }
    
    noDataEl.style.display = 'none';
    displayEl.style.display = 'block';
    
    let html = '';
    
    // Active concessions section (expanded by default)
    if (stats.activeBlocks.length > 0) {
        html += buildConcessionSection(
            'Active Concessions',
            stats.activeCount,
            stats.activeBlocks,
            'active',
            true
        );
    }
    
    // Expired concessions section (collapsed by default)
    if (stats.expiredBlocks.length > 0) {
        html += buildConcessionSection(
            'Expired Concessions',
            stats.expiredCount,
            stats.expiredBlocks,
            'expired',
            false
        );
    }
    
    // Depleted concessions section (collapsed by default)
    if (stats.depletedBlocks.length > 0) {
        html += buildConcessionSection(
            'Depleted Concessions',
            stats.depletedCount,
            stats.depletedBlocks,
            'depleted',
            false
        );
    }
    
    displayEl.innerHTML = html;
    
    // Add accordion event listeners
    attachAccordionListeners();
}

// Build HTML for a concession section
function buildConcessionSection(title, count, blocks, status, isExpanded) {
    let icon, iconColor;
    
    switch (status) {
        case 'active':
            icon = 'fa-check-circle';
            iconColor = 'var(--admin-success)';
            break;
        case 'expired':
            icon = 'fa-exclamation-circle';
            iconColor = 'var(--admin-error)';
            break;
        case 'depleted':
            icon = 'fa-battery-empty';
            iconColor = 'var(--admin-warning)';
            break;
        default:
            icon = 'fa-circle';
            iconColor = 'var(--text-muted)';
    }
    
    const accordionId = `concession-accordion-${status}`;
    
    let html = `
        <div class="concessions-section">
            <h4 class="concession-accordion-header ${isExpanded ? 'active' : ''}" data-target="${accordionId}">
                <span><i class="fas ${icon}" style="color: ${iconColor};"></i> ${title} (${count})</span>
                <i class="fas fa-chevron-down accordion-icon"></i>
            </h4>
            <div id="${accordionId}" class="concessions-list accordion-content ${isExpanded ? 'show' : ''}">
    `;
    
    blocks.forEach(block => {
        html += buildConcessionItem(block, status);
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

// Build HTML for a single concession item
function buildConcessionItem(block, status) {
    const expiryDate = block.expiryDate?.toDate ? block.expiryDate.toDate() : new Date(block.expiryDate);
    const purchaseDate = block.purchaseDate?.toDate ? block.purchaseDate.toDate() : new Date(block.purchaseDate);
    const isLocked = block.isLocked === true;
    const isGifted = block.packageId === 'gifted-concessions';
    
    const lockBadge = isLocked ? '<span class="badge badge-locked"><i class="fas fa-lock"></i> LOCKED</span>' : '';
    const giftedBadge = isGifted ? '<span class="badge badge-gifted"><i class="fas fa-gift"></i> Gifted Concession</span>' : '';
    
    // Set labels and icons based on status
    let expiryLabel, expiryIcon, entriesLabel, statusClass;
    
    switch (status) {
        case 'expired':
            expiryLabel = 'Expired';
            expiryIcon = 'fa-calendar-times';
            entriesLabel = 'classes unused';
            statusClass = 'expired';
            break;
        case 'depleted':
            expiryLabel = 'Expired';
            expiryIcon = 'fa-calendar-alt';
            entriesLabel = 'classes (all used)';
            statusClass = 'depleted';
            break;
        case 'active':
        default:
            expiryLabel = 'Expires';
            expiryIcon = 'fa-calendar-alt';
            entriesLabel = 'classes remaining';
            statusClass = '';
    }
    
    let html = `
        <div class="concession-item ${statusClass} ${isLocked ? 'locked' : ''} ${isGifted ? 'gifted' : ''}">
            <div class="concession-content">
                <div class="concession-info">
                    <strong>${block.remainingQuantity} of ${block.initialQuantity || block.originalQuantity} ${entriesLabel}</strong>
                    ${lockBadge}
                    ${giftedBadge}
                </div>
                <div class="concession-details">
                    <span><i class="fas ${expiryIcon}"></i> ${expiryLabel}: ${formatDate(expiryDate)}</span>
                    <span><i class="fas fa-shopping-cart"></i> ${isGifted ? 'Gifted' : 'Purchased'}: ${formatDate(purchaseDate)}</span>
                    <span><i class="fas fa-dollar-sign"></i> Paid: $${(block.amountPaid || 0).toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
    
    return html;
}

// Attach accordion event listeners
function attachAccordionListeners() {
    const headers = document.querySelectorAll('.concession-accordion-header');
    
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const targetId = header.getAttribute('data-target');
            const content = document.getElementById(targetId);
            
            // Toggle active class
            header.classList.toggle('active');
            content.classList.toggle('show');
        });
    });
}

// Format date as DD/MM/YYYY
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Show/hide loading spinner
function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

// Listen for student selection changes (from student-loader.js)
window.loadStudentDashboard = async function(student) {
    console.log('Student selection changed:', student);
    if (student && student.id) {
        await loadStudentConcessions(student.id);
    }
};
