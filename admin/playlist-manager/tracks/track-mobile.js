// Track Mobile Interactions Module
// Handles mobile-specific gestures: swipe to delete and long-press menu

import * as State from '../playlist-state.js';
import { handleDeleteTrack } from './track-actions.js';

// ========================================
// MOBILE INTERACTIONS
// ========================================

// Swipe to delete functionality for mobile
export function addSwipeToDelete(element, track) {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  let isSwiping = false;
  let deleteIcon = null;
  
  element.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    isSwiping = false;
  }, { passive: true });
  
  element.addEventListener('touchmove', (e) => {
    const currentX = e.changedTouches[0].screenX;
    const currentY = e.changedTouches[0].screenY;
    const diffX = touchStartX - currentX;
    const diffY = Math.abs(touchStartY - currentY);
    
    // Only consider it a swipe if horizontal movement is greater than vertical
    if (Math.abs(diffX) > 50 && diffY < 30) {
      isSwiping = true;
      
      // Apply swipe visual feedback
      if (diffX > 0) { // Swiping left
        const swipeAmount = Math.min(diffX, 100);
        element.style.transform = `translateX(-${swipeAmount}px)`;
        element.style.transition = 'none';
        element.style.backgroundColor = 'rgba(255, 68, 68, 0.1)';
        
        // Create or update delete icon
        if (!deleteIcon) {
          deleteIcon = document.createElement('div');
          deleteIcon.className = 'swipe-delete-icon';
          deleteIcon.innerHTML = '<i class="fas fa-trash"></i>';
          element.appendChild(deleteIcon);
        }
        
        // Show icon as we swipe further
        const iconOpacity = Math.min(swipeAmount / 100, 1);
        deleteIcon.style.opacity = iconOpacity;
      }
    }
  }, { passive: true });
  
  element.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    
    const swipeDistance = touchStartX - touchEndX;
    const verticalDistance = Math.abs(touchStartY - touchEndY);
    
    // Reset visual feedback with transition
    element.style.transition = 'transform 0.3s ease, background-color 0.3s ease';
    element.style.transform = '';
    element.style.backgroundColor = '';
    
    // Remove delete icon
    if (deleteIcon) {
      deleteIcon.remove();
      deleteIcon = null;
    }
    
    // If swiped left more than 100px and vertical movement is minimal
    if (isSwiping && swipeDistance > 100 && verticalDistance < 30) {
      // Delete without confirmation
      handleDeleteTrack(track.uri, track.name);
    }
  }, { passive: true });
}

// Long press menu functionality for mobile
export function addLongPressMenu(element, track) {
  let pressTimer = null;
  let touchMoved = false;
  
  element.addEventListener('touchstart', (e) => {
    touchMoved = false;
    
    // Start timer for long press (500ms)
    pressTimer = setTimeout(() => {
      if (!touchMoved) {
        // Show track menu
        showMobileTrackMenu(track);
      }
    }, 500);
  }, { passive: true });
  
  element.addEventListener('touchmove', () => {
    touchMoved = true;
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }, { passive: true });
  
  element.addEventListener('touchend', () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }, { passive: true });
  
  element.addEventListener('touchcancel', () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }, { passive: true });
}

// Show mobile-friendly track menu with options
function showMobileTrackMenu(track) {
  // Check if current playlist is owned by the user
  const currentPlaylist = State.getCurrentPlaylist();
  const isOwned = State.isPlaylistOwnedByCurrentUser(currentPlaylist);
  
  // Build options array based on ownership
  const options = [
    { label: 'Copy to Playlist', icon: 'fa-copy', action: () => handleCopyTrack(track) }
  ];
  
  // Only show "Move to Playlist" if the current playlist is owned by the user
  if (isOwned) {
    options.push({ label: 'Move to Playlist', icon: 'fa-arrow-right', action: () => handleMoveTrack(track) });
  }
  
  options.push({ label: 'Delete from Playlist', icon: 'fa-trash', action: () => handleDeleteTrack(track.uri, track.name), class: 'menu-delete' });

  // Overlay
  const menuOverlay = document.createElement('div');
  menuOverlay.className = 'track-menu-mobile-overlay';

  // Floating menu (styled like desktop, but centered and touch-friendly)
  const menu = document.createElement('div');
  menu.className = 'track-menu track-menu-mobile show';

  // Track title with artist
  const title = document.createElement('div');
  title.className = 'track-menu-title';
  const artistNames = track.artists.map(a => a.name).join(', ');
  title.textContent = `${track.name} • ${artistNames}`;
  menu.appendChild(title);

  // Menu options
  options.forEach(option => {
    const btn = document.createElement('button');
    btn.className = 'track-menu-item' + (option.class ? ' ' + option.class : '');
    btn.innerHTML = `<i class="fas ${option.icon}"></i> <span>${option.label}</span>`;
    btn.addEventListener('click', () => {
      option.action();
      document.body.removeChild(menuOverlay);
    });
    menu.appendChild(btn);
  });

  // Cancel option (styled as a normal menu item, but with .menu-cancel class)
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'track-menu-item menu-cancel';
  cancelBtn.innerHTML = '<span>Cancel</span>';
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(menuOverlay);
  });
  menu.appendChild(cancelBtn);

  menuOverlay.appendChild(menu);

  // Close on overlay click
  menuOverlay.addEventListener('click', (e) => {
    if (e.target === menuOverlay) {
      document.body.removeChild(menuOverlay);
    }
  });

  document.body.appendChild(menuOverlay);
}

// Placeholder functions (will be imported from track-actions)
function handleCopyTrack(track) {
  window.handleCopyTrack?.(track);
}

function handleMoveTrack(track) {
  window.handleMoveTrack?.(track);
}

// Expose to window for import compatibility
window.addSwipeToDelete = addSwipeToDelete;
window.addLongPressMenu = addLongPressMenu;
