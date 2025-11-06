// Transaction History Page

// Pagination
let allTransactions = [];
let currentPage = 1;
const itemsPerPage = 12;

// Page Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Transaction History page loaded');
    
    // Initialize page
    initializePage();
});

async function initializePage() {
    try {
        // Wait for auth to be ready
        await waitForAuth();
        
        // Check if student is selected (from sessionStorage or URL)
        const studentId = sessionStorage.getItem('currentStudentId');
        
        if (!studentId && !isAuthorized) {
            // Student not logged in and no student selected
            console.error('No student selected');
            window.location.href = '../dashboard/index.html';
            return;
        }
        
        // Show main container
        document.getElementById('main-container').style.display = 'block';
        
        if (studentId) {
            // Load transactions for the selected student
            await loadStudentTransactions(studentId);
        } else {
            // Show empty state (admin only)
            document.getElementById('empty-state').style.display = 'flex';
        }
        
    } catch (error) {
        console.error('Error initializing page:', error);
    }
}

function waitForAuth() {
    return new Promise((resolve) => {
        if (typeof isAuthorized !== 'undefined') {
            resolve();
        } else {
            const checkAuth = setInterval(() => {
                if (typeof isAuthorized !== 'undefined') {
                    clearInterval(checkAuth);
                    resolve();
                }
            }, 100);
        }
    });
}

// Load transactions for a specific student
async function loadStudentTransactions(studentId) {
    try {
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
        document.getElementById('student-name').textContent = `${studentName}'s Transaction History`;
        
        // Query all transactions for this student
        const transactionsSnapshot = await window.db.collection('transactions')
            .where('studentId', '==', studentId)
            .get();
        
        const transactions = [];
        transactionsSnapshot.forEach(doc => {
            const data = doc.data();
            // Filter for only financial transactions (amountPaid > 0)
            if (data.amountPaid && data.amountPaid > 0) {
                transactions.push({
                    id: doc.id,
                    ...data
                });
            }
        });
        
        // Sort by date descending (most recent first)
        transactions.sort((a, b) => {
            const dateA = a.transactionDate?.toDate() || new Date(0);
            const dateB = b.transactionDate?.toDate() || new Date(0);
            return dateB - dateA;
        });
        
        console.log(`Found ${transactions.length} transactions`);
        
        // Store all transactions for pagination
        allTransactions = transactions;
        currentPage = 1;
        
        // Display transactions
        displayTransactionsPage();
        setupPagination();
        
        // Show content
        document.getElementById('transactions-content').style.display = 'block';
        document.getElementById('empty-state').style.display = 'none';
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        alert('Error loading transactions. Please try again.');
    } finally {
        showLoading(false);
    }
}

function displayTransactionsPage() {
    const tbody = document.getElementById('transactions-tbody');
    const cardsContainer = document.getElementById('transactions-cards');
    const noDataDiv = document.getElementById('no-transactions');
    
    // Clear existing rows and cards
    tbody.innerHTML = '';
    cardsContainer.innerHTML = '';
    
    if (allTransactions.length === 0) {
        noDataDiv.style.display = 'block';
        document.querySelector('.table-container').style.display = 'none';
        cardsContainer.style.display = 'none';
        document.querySelector('.total-info').style.display = 'none';
        document.getElementById('pagination-controls').style.display = 'none';
        return;
    }
    
    noDataDiv.style.display = 'none';
    document.querySelector('.table-container').style.display = 'block';
    cardsContainer.style.display = 'block';
    document.querySelector('.total-info').style.display = 'flex';
    
    // Update summary (showing total count)
    document.getElementById('total-count').textContent = allTransactions.length;
    
    // Calculate pagination
    const totalPages = Math.ceil(allTransactions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, allTransactions.length);
    const pageTransactions = allTransactions.slice(startIndex, endIndex);
    
    // Create table rows and cards for current page
    pageTransactions.forEach(transaction => {
        // Create table row (for desktop)
        const row = createTransactionRow(transaction);
        tbody.appendChild(row);
        
        // Create card (for mobile)
        const card = createTransactionCard(transaction);
        cardsContainer.appendChild(card);
    });
    
    // Update pagination controls
    updatePaginationControls(totalPages);
}

/**
 * Update pagination controls state
 */
function updatePaginationControls(totalPages) {
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const paginationControls = document.getElementById('pagination-controls');
    
    // Show/hide pagination controls
    if (totalPages <= 1) {
        paginationControls.style.display = 'none';
        return;
    } else {
        paginationControls.style.display = 'flex';
    }
    
    // Update page info
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Enable/disable buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

/**
 * Setup pagination button handlers
 */
function setupPagination() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    // Remove existing listeners by cloning
    const newPrevBtn = prevBtn.cloneNode(true);
    const newNextBtn = nextBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    
    // Add new listeners
    newPrevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayTransactionsPage();
        }
    });
    
    newNextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(allTransactions.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayTransactionsPage();
        }
    });
}

function createTransactionRow(transaction) {
    const row = document.createElement('tr');
    
    // Add reversed class if transaction is reversed
    if (transaction.reversed) {
        row.classList.add('reversed');
    }
    
    // Date column
    const dateCell = document.createElement('td');
    dateCell.className = 'transaction-date';
    const date = transaction.transactionDate?.toDate() || new Date();
    dateCell.textContent = formatDate(date);
    row.appendChild(dateCell);
    
    // Type column with badges
    const typeCell = document.createElement('td');
    typeCell.className = 'transaction-type';
    
    // Add reversed badge if applicable
    if (transaction.reversed) {
        const reversedBadge = document.createElement('span');
        reversedBadge.className = 'type-badge reversed';
        reversedBadge.textContent = 'REVERSED';
        typeCell.appendChild(reversedBadge);
    }
    
    // Normalize transaction type and get display info
    const typeInfo = normalizeTransactionType(transaction);
    
    // Add type badge
    const typeBadge = document.createElement('span');
    typeBadge.className = `type-badge ${typeInfo.badgeClass}`;
    typeBadge.textContent = typeInfo.typeName;
    typeCell.appendChild(typeBadge);
    
    row.appendChild(typeCell);
    
    // Amount column
    const amountCell = document.createElement('td');
    amountCell.className = 'align-right amount';
    amountCell.textContent = `$${(transaction.amountPaid || 0).toFixed(2)}`;
    row.appendChild(amountCell);
    
    // Payment method column
    const paymentCell = document.createElement('td');
    paymentCell.className = 'payment-method';
    
    // Check if online payment first (has stripeCustomerId)
    if (transaction.stripeCustomerId) {
        paymentCell.innerHTML = '<span class="payment-badge online">Online</span>';
    } else {
        const paymentMethod = String(transaction.paymentMethod || '').toLowerCase();
        let paymentBadge = '';
        
        if (paymentMethod === 'cash') {
            paymentBadge = '<span class="payment-badge cash"><i class="fas fa-money-bill-wave"></i> Cash</span>';
        } else if (paymentMethod === 'eftpos') {
            paymentBadge = '<span class="payment-badge eftpos"><i class="fas fa-credit-card"></i> EFTPOS</span>';
        } else if (paymentMethod === 'bank-transfer' || paymentMethod === 'bank transfer') {
            paymentBadge = '<span class="payment-badge bank"><i class="fas fa-building-columns"></i> Bank Transfer</span>';
        } else {
            paymentBadge = '<span class="payment-badge unknown"><i class="fas fa-question-circle"></i> Unknown</span>';
        }
        
        paymentCell.innerHTML = paymentBadge;
    }
    
    row.appendChild(paymentCell);
    
    return row;
}

function createTransactionCard(transaction) {
    const card = document.createElement('div');
    card.className = 'transaction-card';
    
    // Add reversed class if transaction is reversed
    if (transaction.reversed) {
        card.classList.add('reversed');
    }
    
    // Format date
    const date = transaction.transactionDate?.toDate() || new Date();
    const formattedDate = formatDate(date);
    
    // Get type info
    const typeInfo = normalizeTransactionType(transaction);
    
    // Build type badges HTML
    let typeBadgesHTML = '';
    if (transaction.reversed) {
        typeBadgesHTML += '<span class="type-badge reversed">REVERSED</span>';
    }
    typeBadgesHTML += `<span class="type-badge ${typeInfo.badgeClass}">${typeInfo.typeName}</span>`;
    
    // Get payment method badge
    let paymentBadgeHTML = '';
    
    // Check if online payment first (has stripeCustomerId)
    if (transaction.stripeCustomerId) {
        paymentBadgeHTML = '<span class="payment-badge online">Online</span>';
    } else {
        const paymentMethod = String(transaction.paymentMethod || '').toLowerCase();
        
        if (paymentMethod === 'cash') {
            paymentBadgeHTML = '<span class="payment-badge cash"><i class="fas fa-money-bill-wave"></i> Cash</span>';
        } else if (paymentMethod === 'eftpos') {
            paymentBadgeHTML = '<span class="payment-badge eftpos"><i class="fas fa-credit-card"></i> EFTPOS</span>';
        } else if (paymentMethod === 'bank-transfer' || paymentMethod === 'bank transfer') {
            paymentBadgeHTML = '<span class="payment-badge bank"><i class="fas fa-building-columns"></i> Bank Transfer</span>';
        } else {
            paymentBadgeHTML = '<span class="payment-badge unknown"><i class="fas fa-question-circle"></i> Unknown</span>';
        }
    }
    
    // Build card HTML
    card.innerHTML = `
        <div class="card-header">
            <div class="card-date">${formattedDate}</div>
            <div class="card-amount">$${(transaction.amountPaid || 0).toFixed(2)}</div>
        </div>
        <div class="card-body">
            <div class="card-row">
                <div class="card-label">Type</div>
                <div class="card-value">${typeBadgesHTML}</div>
            </div>
            <div class="card-row">
                <div class="card-label">Payment</div>
                <div class="card-value">${paymentBadgeHTML}</div>
            </div>
        </div>
    `;
    
    return card;
}

// Normalize transaction type and get display info
function normalizeTransactionType(transaction) {
    let transactionType = transaction.type || 'concession-purchase';
    let typeName;
    let badgeClass;
    
    // Handle both old and new type names for concession purchases
    if (transactionType === 'concession-purchase' || transactionType === 'purchase') {
        transactionType = 'concession-purchase';
        typeName = 'Concession Purchase';
        badgeClass = 'concession';
    } else if (transactionType === 'concession-gift') {
        typeName = 'Gifted Concessions';
        badgeClass = 'gift';
    } else if (transactionType === 'casual-entry' || transactionType === 'entry' || transactionType === 'casual' || transactionType === 'casual-student') {
        // Check the entryType field to distinguish casual vs casual-student
        if (transaction.entryType === 'casual-student' || transactionType === 'casual-student') {
            transactionType = 'casual-student';
            typeName = 'Casual Student';
            badgeClass = 'casual-student';
        } else {
            transactionType = 'casual';
            typeName = 'Casual Entry';
            badgeClass = 'casual';
        }
    } else {
        typeName = 'Transaction';
        badgeClass = 'other';
    }
    
    return { type: transactionType, typeName, badgeClass };
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
        await loadStudentTransactions(student.id);
    }
};
