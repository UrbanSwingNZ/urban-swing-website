/* ========================================
   MOBILE PLAYLIST SELECTOR
   Handles the mobile playlist dropdown functionality
   ======================================== */

export function initMobilePlaylistSelector() {
  const mobileBtn = document.getElementById('mobile-playlist-btn');
  const mobileOverlay = document.getElementById('mobile-playlist-overlay');
  const closeBtn = document.getElementById('close-mobile-playlist');
  const mobileSearch = document.getElementById('mobile-playlist-search');
  const mobileList = document.getElementById('mobile-playlists-list');

  if (!mobileBtn || !mobileOverlay) {
    return; // Not on mobile or elements don't exist
  }

  // Toggle dropdown
  function toggleDropdown() {
    const isActive = mobileOverlay.classList.contains('active');
    
    if (isActive) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  function openDropdown() {
    mobileOverlay.classList.add('active');
    mobileBtn.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  function closeDropdown() {
    mobileOverlay.classList.remove('active');
    mobileBtn.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Event listeners
  mobileBtn.addEventListener('click', toggleDropdown);
  closeBtn.addEventListener('click', closeDropdown);
  
  // Close when clicking overlay background
  mobileOverlay.addEventListener('click', (e) => {
    if (e.target === mobileOverlay) {
      closeDropdown();
    }
  });

  // Search functionality
  if (mobileSearch) {
    mobileSearch.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const items = mobileList.querySelectorAll('li');
      
      items.forEach(item => {
        const playlistName = item.querySelector('.playlist-name')?.textContent.toLowerCase() || '';
        if (playlistName.includes(searchTerm)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }

  return {
    openDropdown,
    closeDropdown,
    updateSelectedPlaylist
  };
}

// Update the button text to show selected playlist
export function updateSelectedPlaylist(playlistName) {
  // Keep the text as "Select Playlist" since the playlist name is already shown in the main view
  const mobileNameSpan = document.getElementById('mobile-playlist-name');
  if (mobileNameSpan) {
    mobileNameSpan.textContent = 'Select Playlist';
  }
}

// Populate mobile playlist list (call this when playlists are loaded)
export function populateMobilePlaylistList(playlists, selectedPlaylistId) {
  const mobileList = document.getElementById('mobile-playlists-list');
  if (!mobileList) return;

  mobileList.innerHTML = '';

  if (!playlists || playlists.length === 0) {
    mobileList.innerHTML = `
      <div class="empty-message">
        <i class="fas fa-music"></i>
        <p>No playlists found</p>
      </div>
    `;
    return;
  }

  playlists.forEach(playlist => {
    const li = document.createElement('li');
    li.dataset.playlistId = playlist.id;
    
    if (playlist.id === selectedPlaylistId) {
      li.classList.add('active');
    }

    const imageUrl = playlist.images && playlist.images.length > 0 
      ? playlist.images[0].url 
      : '/images/icons/playlist-placeholder.png';

    li.innerHTML = `
      <a href="#" data-playlist-id="${playlist.id}">
        <img src="${imageUrl}" alt="${playlist.name}">
        <div class="playlist-info">
          <p class="playlist-name">${playlist.name}</p>
          <p class="playlist-tracks">${playlist.tracks?.total || 0} tracks</p>
        </div>
      </a>
    `;

    mobileList.appendChild(li);
  });

  // Add click handlers to playlist items
  mobileList.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const playlistId = link.dataset.playlistId;
      const playlistName = link.querySelector('.playlist-name').textContent;
      
      // Update active state
      mobileList.querySelectorAll('li').forEach(item => item.classList.remove('active'));
      link.closest('li').classList.add('active');
      
      // Update button text
      updateSelectedPlaylist(playlistName);
      
      // Close dropdown
      const overlay = document.getElementById('mobile-playlist-overlay');
      overlay?.classList.remove('active');
      document.getElementById('mobile-playlist-btn')?.classList.remove('active');
      document.body.style.overflow = '';
      
      // Trigger playlist selection (this will be handled by the main playlist manager)
      const event = new CustomEvent('mobile-playlist-selected', { 
        detail: { playlistId, playlistName } 
      });
      document.dispatchEvent(event);
    });
  });
}
