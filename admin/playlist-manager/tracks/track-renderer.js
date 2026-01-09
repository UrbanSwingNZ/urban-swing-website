// Track Renderer Module
// Handles track display, progressive rendering, and lazy loading

import * as State from '../playlist-state.js';
import { showTrackMenu } from './track-actions.js';
import { handleTrackPlayPause, restorePlaybackState } from './track-audio.js';
import { addSwipeToDelete, addLongPressMenu } from './track-mobile.js';
import { initializeDragDrop } from './track-drag-drop.js';
import { getDuplicateTooltip, isTrackDuplicate } from './track-duplicates.js';

// ========================================
// PROGRESSIVE RENDERING CONFIGURATION
// ========================================

// Progressive rendering: Only render 50 tracks initially, load more on scroll
let renderedTrackCount = 0;
const INITIAL_RENDER_COUNT = 50; // First batch - renders in 1-2 seconds
const LAZY_RENDER_BATCH_SIZE = 50; // Subsequent batches when scrolling

// ========================================
// TRACK DISPLAY
// ========================================

export function displayTracks(tracks) {
  const tbody = document.getElementById('tracks-list');
  
  // Always clear tbody and reset count when displayTracks is called
  // This function is only called when loading a new playlist or searching
  tbody.innerHTML = '';
  renderedTrackCount = 0;
  
  if (tracks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #888;">
          No tracks found
        </td>
      </tr>
    `;
    return;
  }
  
  // Progressive rendering: Render in batches
  const tracksToRender = tracks.length <= INITIAL_RENDER_COUNT 
    ? tracks 
    : tracks.slice(0, INITIAL_RENDER_COUNT);
  
  // Render initial batch or all if small playlist
  renderTrackBatch(tracksToRender, 0);
  
  // If there are more tracks, set up lazy loading
  if (tracks.length > INITIAL_RENDER_COUNT) {
    setupLazyTrackLoading(tracks);
  }
}

// Render a batch of tracks
function renderTrackBatch(tracks, startIndex) {
  const tbody = document.getElementById('tracks-list');
  
  tracks.forEach((item, batchIndex) => {
    if (!item.track) return;
    
    const index = startIndex + batchIndex;
    const track = item.track;
    const features = item.audioFeatures || {};
    const tr = document.createElement('tr');
    tr.dataset.trackUri = track.uri;
    tr.dataset.trackId = track.id;
    tr.dataset.trackIndex = index;
    
    // Check if track exists in other playlists (only for playlists not owned by current user)
    const currentPlaylist = State.getCurrentPlaylist();
    const currentUserId = State.getCurrentUserId();
    const currentPlaylistId = currentPlaylist?.id;
    const isOwnPlaylist = currentPlaylist?.owner?.id === currentUserId;
    
    // Only apply duplicate detection to playlists NOT owned by the user
    if (!isOwnPlaylist) {
      const isDuplicate = isTrackDuplicate(track.id, currentPlaylistId, currentUserId);
      const tooltipText = isDuplicate ? getDuplicateTooltip(track.id, currentPlaylistId, currentUserId) : '';
      
      if (isDuplicate) {
        tr.classList.add('track-duplicate');
        tr.title = tooltipText;
      }
    }
    
    const albumArt = track.album.images && track.album.images.length > 0
      ? track.album.images[track.album.images.length - 1].url
      : '';
    
    const artistNames = track.artists.map(a => a.name).join(', ');
    const duration = spotifyAPI.formatDuration(track.duration_ms);
    const bpm = features.tempo ? spotifyAPI.formatBPM(features.tempo) : 'N/A';
    const explicit = track.explicit;
    
    tr.innerHTML = `
      <td class="col-drag">
        <div class="drag-handle">
          <i class="fas fa-grip-vertical"></i>
        </div>
      </td>
      <td class="col-number">
        <span class="track-number">${index + 1}</span>
        <div class="now-playing-animation" style="display: none;">
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
        </div>
      </td>
      <td class="col-title">
        <div class="track-info">
          ${albumArt ? `<img src="${albumArt}" alt="${track.name}" class="track-album-art">` : ''}
          <div class="track-details">
            <div class="track-name">${track.name}</div>
            <div class="track-artist-mobile">${artistNames}</div>
          </div>
        </div>
      </td>
      <td class="col-artist">
        <div class="track-artist">${artistNames}</div>
      </td>
      <td class="col-duration">${duration}</td>
      <td class="col-bpm">
        <span class="bpm-badge">${bpm}</span>
      </td>
      <td class="col-explicit">
        ${explicit ? '<span class="explicit-badge">E</span>' : ''}
      </td>
      <td class="col-actions">
        <div class="track-actions">
          <button class="track-play-btn" data-track-uri="${track.uri}" data-track-id="${track.id}" title="Play track">
            <i class="fas fa-play"></i>
          </button>
          <button class="track-menu-btn" data-track-uri="${track.uri}">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </td>
    `;
    
    // Add track menu click handler
    const menuBtn = tr.querySelector('.track-menu-btn');
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showTrackMenu(e.currentTarget, track);
    });
    
    // Add play button click handler
    const playBtn = tr.querySelector('.track-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleTrackPlayPause(playBtn, track.uri, track.id);
      });
    }
    
    // Make entire row tappable on mobile (excluding drag handle)
    tr.addEventListener('click', (e) => {
      // Only trigger on mobile (screen width <= 768px)
      if (window.innerWidth <= 768) {
        // Don't trigger if clicking drag handle
        if (e.target.closest('.drag-handle')) {
          return;
        }
        
        // Trigger play/pause (pass the row element instead of playBtn for mobile)
        handleTrackPlayPause(tr, track.uri, track.id);
      }
    });
    
    // Add swipe to delete and long press on mobile
    if (window.innerWidth <= 768) {
      addSwipeToDelete(tr, track);
      addLongPressMenu(tr, track);
    }
    
    tbody.appendChild(tr);
  });
  
  renderedTrackCount = startIndex + tracks.length;
  
  // Restore playback state after tracks are displayed
  restorePlaybackState();
}

// Set up lazy loading for remaining tracks
function setupLazyTrackLoading(allTracks) {
  const tbody = document.getElementById('tracks-list');
  const tracksContainer = tbody.closest('.tracks-container');
  
  if (!tracksContainer) return;
  
  // Remove any existing scroll listener
  if (tracksContainer._lazyLoadListener) {
    tracksContainer.removeEventListener('scroll', tracksContainer._lazyLoadListener);
  }
  
  // Create loading indicator
  let loadingIndicator = tbody.querySelector('.lazy-loading-indicator');
  if (!loadingIndicator) {
    loadingIndicator = document.createElement('tr');
    loadingIndicator.className = 'lazy-loading-indicator';
    loadingIndicator.innerHTML = `
      <td colspan="8" style="text-align: center; padding: 20px; color: #888;">
        <i class="fas fa-spinner fa-spin"></i> Loading more tracks...
      </td>
    `;
  }
  tbody.appendChild(loadingIndicator);
  
  // Set up intersection observer for lazy loading
  let isLoading = false;
  
  const loadMoreTracks = () => {
    if (isLoading || renderedTrackCount >= allTracks.length) {
      // All tracks loaded, remove indicator
      if (loadingIndicator && loadingIndicator.parentNode) {
        loadingIndicator.remove();
      }
      return;
    }
    
    isLoading = true;
    
    // Calculate next batch
    const nextBatch = allTracks.slice(
      renderedTrackCount, 
      renderedTrackCount + LAZY_RENDER_BATCH_SIZE
    );
    
    // Small delay to make it feel smoother
    setTimeout(() => {
      // Remove loading indicator temporarily
      if (loadingIndicator && loadingIndicator.parentNode) {
        loadingIndicator.remove();
      }
      
      // Render next batch
      renderTrackBatch(nextBatch, renderedTrackCount);
      
      // Re-initialize drag-drop for new elements
      initializeDragDrop();
      
      isLoading = false;
      
      // Re-add loading indicator if more tracks remain
      if (renderedTrackCount < allTracks.length) {
        tbody.appendChild(loadingIndicator);
      }
    }, 100);
  };
  
  // Use Intersection Observer for efficient scroll detection
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadMoreTracks();
      }
    });
  }, {
    root: tracksContainer,
    rootMargin: '200px' // Start loading 200px before reaching the indicator
  });
  
  observer.observe(loadingIndicator);
  
  // Store cleanup function
  tracksContainer._lazyLoadCleanup = () => {
    observer.disconnect();
    if (loadingIndicator && loadingIndicator.parentNode) {
      loadingIndicator.remove();
    }
  };
}

// Reset rendered count (for search/filter)
export function resetRenderedCount() {
  renderedTrackCount = 0;
}

// Expose to window for import compatibility
window.displayTracks = displayTracks;
window.resetRenderedCount = resetRenderedCount;
