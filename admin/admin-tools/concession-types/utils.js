// Utility Functions for Concession Types Manager

function showLoading(show) {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.style.display = show ? 'flex' : 'none';
  }
}

function showError(message) {
  alert(message);
}

function showStatusMessage(message, type = 'success') {
  const dragHint = document.getElementById('drag-hint');
  if (!dragHint) {
    // Fallback to alert if drag hint element doesn't exist
    alert(message);
    return;
  }
  
  const originalHTML = dragHint.innerHTML;
  const originalColor = dragHint.style.color;
  
  const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
  const color = type === 'success' ? 'var(--admin-success)' : 'var(--admin-error)';
  
  dragHint.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
  dragHint.style.color = color;
  
  setTimeout(() => {
    dragHint.innerHTML = originalHTML;
    dragHint.style.color = originalColor;
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
