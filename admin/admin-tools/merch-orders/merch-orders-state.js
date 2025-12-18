// merch-orders-state.js - State management for orders

// UI state
let allOrders = [];
let displayedOrders = [];
let currentSort = { field: 'createdAt', direction: 'desc' };

/**
 * Set orders data
 */
export function setOrders(orders) {
    allOrders = orders;
    // Filter out deleted orders by default
    displayedOrders = orders.filter(o => !o.deleted);
}

/**
 * Get all orders
 */
export function getAllOrders() {
    return allOrders;
}

/**
 * Get displayed orders
 */
export function getDisplayedOrders() {
    return displayedOrders;
}

/**
 * Set displayed orders
 */
export function setDisplayedOrders(orders) {
    displayedOrders = orders;
}

/**
 * Get current sort state
 */
export function getCurrentSort() {
    return currentSort;
}

/**
 * Set current sort state
 */
export function setCurrentSort(sort) {
    currentSort = sort;
}
