// merch-orders-ui.js - UI module exports

// Re-export state management
export { setOrders, getAllOrders, getDisplayedOrders } from './merch-orders-state.js';

// Re-export rendering functions
export { renderOrders, viewOrderDetails, closeOrderModal, updateOrderCount } from './merch-orders-render.js';

// Re-export action functions
export { toggleInvoiced, markOrderComplete, deleteOrder, restoreOrder } from './merch-orders-actions.js';

// Re-export filter/search/sort functions
export { handleDeletedFilter, handleSearch, clearSearch, handleSort } from './merch-orders-filters.js';

