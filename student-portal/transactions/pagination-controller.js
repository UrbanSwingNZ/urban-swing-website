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
     * Setup pagination button handlers
     */
    setupEventListeners() {
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousPage());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextPage());
        }
    }

    /**
     * Go to previous page
     */
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.displayPage();
        }
    }

    /**
     * Go to next page
     */
    nextPage() {
        const totalPages = this.transactionService.getTotalPages(this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
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
        pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        
        // Enable/disable buttons
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages;
    }
}

// Export singleton instance
window.PaginationController = new PaginationController(
    window.TransactionService,
    window.TransactionRenderer
);
