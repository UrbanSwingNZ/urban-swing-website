/**
 * Urban Swing - Enhanced Features
 * Phase 3: Advanced Features & Interactivity
 */

// ============================================
// 1. LAZY LOADING IMAGES
// ============================================

function initLazyLoading() {
  // Use Intersection Observer for lazy loading images
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.classList.add('loaded');
            observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    // Observe all images with data-src attribute
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  } else {
    // Fallback for browsers without Intersection Observer
    document.querySelectorAll('img[data-src]').forEach(img => {
      img.src = img.dataset.src;
    });
  }
}

// ============================================
// 2. SMOOTH SCROLLING
// ============================================

function initSmoothScrolling() {
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      
      // Skip if it's just "#"
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        
        // Update URL without jumping
        history.pushState(null, null, href);
      }
    });
  });
}

// ============================================
// 3. SCROLL TO TOP BUTTON
// ============================================

function initScrollToTop() {
  // Create scroll to top button
  const scrollBtn = document.createElement('button');
  scrollBtn.className = 'scroll-to-top';
  scrollBtn.innerHTML = `<i class="fas ${ICONS.ARROW_UP}"></i>`;
  scrollBtn.setAttribute('aria-label', 'Scroll to top');
  scrollBtn.style.display = 'none';
  document.body.appendChild(scrollBtn);

  // Show/hide button based on scroll position
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      if (window.pageYOffset > 300) {
        scrollBtn.style.display = 'flex';
      } else {
        scrollBtn.style.display = 'none';
      }
    }, 100);
  });

  // Scroll to top on click
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// ============================================
// 4. ACTIVE NAVIGATION HIGHLIGHTING
// ============================================

function initActiveNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  navButtons.forEach(btn => {
    const href = btn.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      btn.classList.add('active');
    }
  });
}

// ============================================
// 5. FAQ ACCORDION
// ============================================

function initFAQAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach((item, index) => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    
    if (!question || !answer) return;
    
    // Make question a button for accessibility
    const button = document.createElement('button');
    button.className = 'faq-question-button';
    button.innerHTML = question.innerHTML;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', `faq-answer-${index}`);
    
    answer.id = `faq-answer-${index}`;
    answer.setAttribute('role', 'region');
    answer.setAttribute('aria-labelledby', `faq-question-${index}`);
    button.id = `faq-question-${index}`;
    
    // Replace h3 with button
    question.replaceWith(button);
    
    // Initially hide answer
    answer.style.display = 'none';
    
    // Toggle on click
    button.addEventListener('click', () => {
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      
      // Close all other FAQs (optional - remove for multiple open)
      // faqItems.forEach(otherItem => {
      //   const otherButton = otherItem.querySelector('.faq-question-button');
      //   const otherAnswer = otherItem.querySelector('.faq-answer');
      //   if (otherButton !== button) {
      //     otherButton.setAttribute('aria-expanded', 'false');
      //     otherAnswer.style.display = 'none';
      //   }
      // });
      
      // Toggle current FAQ
      button.setAttribute('aria-expanded', !isExpanded);
      answer.style.display = isExpanded ? 'none' : 'block';
      button.classList.toggle('expanded');
    });
  });
}

// ============================================
// 6. MOBILE MENU
// ============================================

function initMobileMenu() {
  const nav = document.querySelector('.nav-buttons');
  if (!nav) return;
  
  // Create hamburger button
  const hamburger = document.createElement('button');
  hamburger.className = 'hamburger-menu';
  hamburger.setAttribute('aria-label', 'Toggle navigation menu');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.innerHTML = `
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
  `;
  
  // Insert before nav
  nav.parentNode.insertBefore(hamburger, nav);
  
  // Toggle menu
  hamburger.addEventListener('click', () => {
    const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', !isExpanded);
    hamburger.classList.toggle('active');
    nav.classList.toggle('mobile-open');
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.classList.remove('active');
      nav.classList.remove('mobile-open');
    }
  });
  
  // Close menu when selecting a link
  nav.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.classList.remove('active');
      nav.classList.remove('mobile-open');
    });
  });
}

// ============================================
// 7. LOADING STATES
// ============================================

function initLoadingStates() {
  // Add loaded class to body when page is fully loaded
  window.addEventListener('load', () => {
    document.body.classList.add('page-loaded');
  });
  
  // Show loading indicator for slow-loading content
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (!img.complete) {
      img.classList.add('loading');
      img.addEventListener('load', () => {
        img.classList.remove('loading');
        img.classList.add('loaded');
      });
    }
  });
}

// ============================================
// 8. SKIP LINK FOR ACCESSIBILITY
// ============================================

function initSkipLink() {
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Skip to main content';
  document.body.insertBefore(skipLink, document.body.firstChild);
  
  // Ensure main content has ID
  const mainContent = document.querySelector('.main-content, main');
  if (mainContent && !mainContent.id) {
    mainContent.id = 'main-content';
  }
}

// ============================================
// 9. FORM ENHANCEMENTS
// ============================================

function initFormEnhancements() {
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    // Add loading state to submit buttons
    form.addEventListener('submit', (e) => {
      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
      }
    });
    
    // Real-time validation
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        if (input.validity.valid) {
          input.classList.remove('error');
          input.classList.add('valid');
        } else {
          input.classList.add('error');
          input.classList.remove('valid');
        }
      });
    });
  });
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Urban Swing - Enhanced Features Loaded');
  
  // Initialize all features
  initLazyLoading();
  initSmoothScrolling();
  initScrollToTop();
  initActiveNavigation();
  initFAQAccordion();
  initMobileMenu();
  initLoadingStates();
  initSkipLink();
  initFormEnhancements();
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Debounce function for performance
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export for use in other scripts
window.urbanSwing = {
  debounce
};
