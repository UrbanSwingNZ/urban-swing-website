// Pagination Controller - Handles pagination logic and controls

class PaginationController {
    constructor(transactionService, transactionRenderer) {
        this.transactionService = transactionService;
        this.transactionRenderer = transactionRenderer;
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.setupEventListeners();
    }

    /**
     * Setup pagination button handlers (no longer needed with inline onclick)
     */
    setupEventListeners() {
        // Event handlers are now inline in the rendered HTML
    }

    /**
     * Go to specific page
     */
    goToPage(page) {
        const totalPages = this.transactionService.getTotalPages(this.itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.displayPage();
        }
    }

    /**
     * Reset to first page
     */
    reset() {
        this.currentPage = 1;
    }

    /**
     * Display current page of transactions
     */
    displayPage() {
        const tbody = document.getElementById('transactions-tbody');
        const cardsContainer = document.getElementById('transactions-cards');
        const noDataDiv = document.getElementById('no-transactions');
        
        // Clear existing rows and cards
        tbody.innerHTML = '';
        cardsContainer.innerHTML = '';
        
        const totalCount = this.transactionService.getCount();
        
        if (totalCount === 0) {
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
        
        // Update summary
        document.getElementById('total-count').textContent = totalCount;
        
        // Get transactions for current page
        const pageTransactions = this.transactionService.getPaginated(
            this.currentPage, 
            this.itemsPerPage
        );
        
        // Create table rows and cards for current page
        pageTransactions.forEach(transaction => {
            // Create table row (for desktop)
            const row = this.transactionRenderer.createRow(transaction);
            tbody.appendChild(row);
            
            // Create card (for mobile)
            const card = this.transactionRenderer.createCard(transaction);
            cardsContainer.appendChild(card);
        });
        
        // Update pagination controls
        this.updateControls();
    }

    /**
     * Update pagination controls state
     */
    updateControls() {
        const totalPages = this.transactionService.getTotalPages(this.itemsPerPage);
        const paginationControls = document.getElementById('pagination-controls');
        
        // Show/hide pagination controls
        if (totalPages <= 1) {
            paginationControls.style.display = 'none';
            return;
        }
        
        paginationControls.style.display = 'flex';
        
        // Build pagination HTML
        let paginationHTML = '<div class="pagination">';
        
        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="window.PaginationController.goToPage(${this.currentPage - 1})">
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
        if (this.currentPage > 3) {
            paginationHTML += `<button class="pagination-number" onclick="window.PaginationController.goToPage(1)">1</button>`;
            if (this.currentPage > 4) {
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
        }
        
        // Show pages around current page
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            if (i === this.currentPage) {
                paginationHTML += `<button class="pagination-number active">${i}</button>`;
            } else {
                paginationHTML += `<button class="pagination-number" onclick="window.PaginationController.goToPage(${i})">${i}</button>`;
            }
        }
        
        // Always show last page
        if (this.currentPage < totalPages - 2) {
            if (this.currentPage < totalPages - 3) {
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
            paginationHTML += `<button class="pagination-number" onclick="window.PaginationController.goToPage(${totalPages})">${totalPages}</button>`;
        }
        
        paginationHTML += '</div>';
        
        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `<button class="pagination-btn" onclick="window.PaginationController.goToPage(${this.currentPage + 1})">
                <span>Next</span> <i class="fas fa-chevron-right"></i>
            </button>`;
        } else {
            paginationHTML += `<button class="pagination-btn" disabled>
                <span>Next</span> <i class="fas fa-chevron-right"></i>
            </button>`;
        }
        
        paginationHTML += '</div>';
        
        paginationControls.innerHTML = paginationHTML;
    }
}

// Export singleton instance
window.PaginationController = new PaginationController(
    window.TransactionService,
    window.TransactionRenderer
);
