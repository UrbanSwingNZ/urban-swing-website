// merch-orders-filters.js - Filtering, search, and sorting functions

import { getAllOrders, getDisplayedOrders, setDisplayedOrders, getCurrentSort, setCurrentSort } from './merch-orders-state.js';
import { renderOrders, updateOrderCount } from './merch-orders-render.js';

/**
 * Handle deleted filter toggle
 */
export function handleDeletedFilter() {
    const showDeleted = document.getElementById('show-deleted-checkbox').checked;
    const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
    const allOrders = getAllOrders();
    
    // Start with all orders
    let filtered = [...allOrders];
    
    // Filter out deleted orders if checkbox is unchecked
    if (!showDeleted) {
        filtered = filtered.filter(order => !order.deleted);
    }
    
    // Apply search filter if there's a query
    if (searchQuery) {
        filtered = filtered.filter(order => 
            order.fullName?.toLowerCase().includes(searchQuery) ||
            order.email?.toLowerCase().includes(searchQuery) ||
            order.phoneNumber?.includes(searchQuery) ||
            order.id?.toLowerCase().includes(searchQuery)
        );
    }
    
    setDisplayedOrders(filtered);
    renderOrders();
    updateOrderCount();
}

/**
 * Handle search
 */
export function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    const clearBtn = document.getElementById('clear-search');
    const resultsInfo = document.getElementById('search-results-info');
    const showDeleted = document.getElementById('show-deleted-checkbox')?.checked || false;
    const allOrders = getAllOrders();

    clearBtn.style.display = query ? 'block' : 'none';

    if (!query) {
        const filtered = showDeleted ? [...allOrders] : allOrders.filter(o => !o.deleted);
        setDisplayedOrders(filtered);
        resultsInfo.style.display = 'none';
    } else {
        let filtered = showDeleted ? [...allOrders] : allOrders.filter(o => !o.deleted);
        filtered = filtered.filter(order => 
            order.fullName?.toLowerCase().includes(query) ||
            order.email?.toLowerCase().includes(query) ||
            order.phoneNumber?.includes(query) ||
            order.id?.toLowerCase().includes(query)
        );
        setDisplayedOrders(filtered);

        resultsInfo.textContent = `Found ${filtered.length} order${filtered.length !== 1 ? 's' : ''}`;
        resultsInfo.style.display = 'block';
    }

    updateOrderCount();
    renderOrders();
}

/**
 * Clear search
 */
export function clearSearch() {
    const showDeleted = document.getElementById('show-deleted-checkbox')?.checked || false;
    const allOrders = getAllOrders();
    
    document.getElementById('search-input').value = '';
    document.getElementById('clear-search').style.display = 'none';
    document.getElementById('search-results-info').style.display = 'none';
    
    const filtered = showDeleted ? [...allOrders] : allOrders.filter(o => !o.deleted);
    setDisplayedOrders(filtered);
    updateOrderCount();
    renderOrders();
}

/**
 * Handle table sorting
 */
export function handleSort(field) {
    const currentSort = getCurrentSort();
    
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    
    setCurrentSort(currentSort);
    
    const displayedOrders = getDisplayedOrders();
    displayedOrders.sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];

        // Handle dates
        if (field === 'createdAt') {
            aVal = aVal?.getTime() || 0;
            bVal = bVal?.getTime() || 0;
        }

        // Handle strings
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = (bVal || '').toLowerCase();
        }

        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return currentSort.direction === 'asc' ? comparison : -comparison;
    });

    updateSortIcons();
    renderOrders();
}

/**
 * Update sort icons
 */
function updateSortIcons() {
    const currentSort = getCurrentSort();
    document.querySelectorAll('.sortable').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.dataset.sort === currentSort.field) {
            header.classList.add(`sort-${currentSort.direction}`);
        }
    });
}
