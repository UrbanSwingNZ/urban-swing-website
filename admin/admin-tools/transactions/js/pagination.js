/**
 * Pagination Module for Transactions
 * Handles table pagination
 */

let currentPage = 1;
let itemsPerPage = 20;

/**
 * Get current page
 */
function getCurrentPage() {
    return currentPage;
}

/**
 * Get items per page
 */
function getItemsPerPage() {
    return itemsPerPage;
}

/**
 * Set current page
 */
function setCurrentPage(page) {
    currentPage = page;
}

/**
 * Get paginated data
 */
function getPaginatedData(data) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
}

/**
 * Get total pages
 */
function getTotalPages(totalItems) {
    return Math.ceil(totalItems / itemsPerPage);
}

/**
 * Render pagination controls
 */
function renderPagination(totalItems) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    const totalPages = getTotalPages(totalItems);

    // Hide pagination if only one page
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';

    let paginationHTML = '<div class="pagination">';

    // Previous button
    if (currentPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i> <span>Previous</span>
        </button>`;
    } else {
        paginationHTML += `<button class="pagination-btn" disabled>
            <i class="fas fa-chevron-left"></i> <span>Previous</span>
        </button>`;
    }

    // Page numbers
    paginationHTML += '<div class="pagination-pages">';

    // Always show first page
    if (currentPage > 3) {
        paginationHTML += `<button class="pagination-number" onclick="goToPage(1)">1</button>`;
        if (currentPage > 4) {
            paginationHTML += '<span class="pagination-ellipsis">...</span>';
        }
    }

    // Show pages around current page
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `<button class="pagination-number active">${i}</button>`;
        } else {
            paginationHTML += `<button class="pagination-number" onclick="goToPage(${i})">${i}</button>`;
        }
    }

    // Always show last page
    if (currentPage < totalPages - 2) {
        if (currentPage < totalPages - 3) {
            paginationHTML += '<span class="pagination-ellipsis">...</span>';
        }
        paginationHTML += `<button class="pagination-number" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    paginationHTML += '</div>';

    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(${currentPage + 1})">
            <span>Next</span> <i class="fas fa-chevron-right"></i>
        </button>`;
    } else {
        paginationHTML += `<button class="pagination-btn" disabled>
            <span>Next</span> <i class="fas fa-chevron-right"></i>
        </button>`;
    }

    paginationHTML += '</div>';

    paginationContainer.innerHTML = paginationHTML;
}

/**
 * Go to specific page
 */
function goToPage(page) {
    const totalPages = getTotalPages(filteredTransactions.length);
    
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayFilteredTransactions();
    
    // Scroll to top of table
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
        tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Update pagination info text
 */
function updatePaginationInfo(totalItems) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    // Update showing info
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo) {
        if (totalItems > 0) {
            paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${totalItems} transactions`;
        } else {
            paginationInfo.textContent = '';
        }
    }
}
