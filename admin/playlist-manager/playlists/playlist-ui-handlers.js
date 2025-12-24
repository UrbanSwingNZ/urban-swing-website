// Playlist UI Handlers Module
// Handles playlist menu display and actions

import * as State from '../playlist-state.js';
import { openRenamePlaylistModal, handleDeletePlaylist, handleRemovePlaylistFromLibrary } from './playlist-crud.js';

/**
 * Show playlist menu (desktop dropdown or mobile bottom sheet)
 */
export function showPlaylistMenu(button, playlist, isMobile = false) {
  // Close any other open menus
  document.querySelectorAll('.playlist-menu').forEach(menu => menu.remove());
  document.querySelectorAll('.playlist-menu-mobile-overlay').forEach(overlay => overlay.remove());
  
  // Check if menu is already open for this button (only for desktop)
  if (!isMobile) {
    const existingMenu = button.closest('.playlist-item-actions').querySelector('.playlist-menu');
    if (existingMenu) {
      existingMenu.remove();
      return; // Toggle off - don't create new menu
    }
  }
  
  State.setPlaylistMenuTarget(playlist);
  
  // Check if the playlist is owned by the current user
  const isOwned = State.isPlaylistOwnedByCurrentUser(playlist);
  
  if (isMobile) {
    // Mobile: Create bottom sheet overlay
    const menuOverlay = document.createElement('div');
    menuOverlay.className = 'playlist-menu-mobile-overlay';

    // Bottom sheet menu
    const menu = document.createElement('div');
    menu.className = 'playlist-menu playlist-menu-mobile show';

    // Playlist title
    const title = document.createElement('div');
    title.className = 'playlist-menu-title';
    title.textContent = playlist.name;
    menu.appendChild(title);

    // Menu options based on ownership
    if (isOwned) {
      const renameBtn = document.createElement('button');
      renameBtn.className = 'playlist-menu-item';
      renameBtn.dataset.action = 'rename';
      renameBtn.innerHTML = '<i class="fas fa-edit"></i> <span>Rename</span>';
      renameBtn.addEventListener('click', () => {
        handlePlaylistMenuAction('rename', playlist);
        document.body.removeChild(menuOverlay);
      });
      menu.appendChild(renameBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'playlist-menu-item menu-delete';
      deleteBtn.dataset.action = 'delete';
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i> <span>Delete</span>';
      deleteBtn.addEventListener('click', () => {
        handlePlaylistMenuAction('delete', playlist);
        document.body.removeChild(menuOverlay);
      });
      menu.appendChild(deleteBtn);
    } else {
      // Not owned - show "Remove from Library" option
      const removeBtn = document.createElement('button');
      removeBtn.className = 'playlist-menu-item menu-delete';
      removeBtn.dataset.action = 'remove';
      removeBtn.innerHTML = '<i class="fas fa-minus-circle"></i> <span>Remove from Library</span>';
      removeBtn.addEventListener('click', () => {
        handlePlaylistMenuAction('remove', playlist);
        document.body.removeChild(menuOverlay);
      });
      menu.appendChild(removeBtn);
    }

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'playlist-menu-item menu-cancel';
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
  } else {
    // Desktop: Create dropdown menu
    const menu = document.createElement('div');
    menu.className = 'playlist-menu show';
    
    // Build menu HTML based on ownership
    if (isOwned) {
      menu.innerHTML = `
        <button data-action="rename">
          <i class="fas fa-edit"></i> <span>Rename</span>
        </button>
        <button data-action="delete" class="menu-delete">
          <i class="fas fa-trash"></i> <span>Delete</span>
        </button>
      `;
    } else {
      // Not owned - show "Remove from Library" option
      menu.innerHTML = `
        <button data-action="remove" class="menu-delete">
          <i class="fas fa-minus-circle"></i> <span>Remove from Library</span>
        </button>
      `;
    }
    
    // Position under the action button
    const actions = button.closest('.playlist-item-actions');
    actions.appendChild(menu);
    
    // Add click handlers
    menu.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        handlePlaylistMenuAction(action, playlist);
        menu.remove();
      });
    });
    
    // Close menu on outside click
    setTimeout(() => {
      const closeMenu = (e) => {
        if (!menu.contains(e.target) && e.target !== button) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      };
      document.addEventListener('click', closeMenu);
    }, 10);
  }
}

/**
 * Route menu action to appropriate handler
 */
function handlePlaylistMenuAction(action, playlist) {
  if (action === 'rename') {
    openRenamePlaylistModal(playlist);
  } else if (action === 'delete') {
    // Set as current for deletion
    State.setCurrentPlaylist(playlist);
    handleDeletePlaylist();
  } else if (action === 'remove') {
    // Remove from library (unfollow)
    State.setCurrentPlaylist(playlist);
    handleRemovePlaylistFromLibrary();
  }
}

// Expose to window for onclick handlers
window.showPlaylistMenu = showPlaylistMenu;
