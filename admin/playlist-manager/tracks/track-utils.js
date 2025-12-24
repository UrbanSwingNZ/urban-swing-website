// Track Utilities Module
// Shared utility functions for track operations

// ========================================
// UTILITIES
// ========================================

export function formatTotalDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}

// Expose to window for import compatibility
window.formatTotalDuration = formatTotalDuration;
