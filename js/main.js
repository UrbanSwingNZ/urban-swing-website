// Load header.html into the page
// Determine the correct path based on current page location
const currentPath = window.location.pathname;
const isInPagesFolder = currentPath.includes('/pages/');
const headerPath = isInPagesFolder ? 'header.html' : 'pages/header.html';

fetch(headerPath)
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load header: ' + response.status);
        }
        return response.text();
    })
    .then(html => {
        // Insert the header HTML into the document
        document.body.insertAdjacentHTML('afterbegin', html);

        // Set active menu item based on current page
        setActiveMenuItem();

        // Initialize mobile navigation using MobileDrawer component
        if (typeof PublicMobileNav !== 'undefined') {
            PublicMobileNav.initialize();
        } else {
            console.error('PublicMobileNav not found. Make sure public-mobile-nav.js is loaded.');
        }
    })
    .catch(error => {
        console.error('Error loading header:', error);
        // Provide a fallback message to the user
        const fallbackHeader = document.createElement('div');
        fallbackHeader.style.cssText = 'text-align: center; padding: 20px; color: red;';
        fallbackHeader.textContent = 'Unable to load navigation. Please refresh the page.';
        document.body.insertAdjacentElement('afterbegin', fallbackHeader);
    });

// Function to set the active menu item based on current page
function setActiveMenuItem() {
    const currentPath = window.location.pathname;
    const menuLinks = document.querySelectorAll('#menu a');
    
    menuLinks.forEach(link => {
        const linkPath = new URL(link.href).pathname;
        
        // Check if the link matches the current page
        if (linkPath === currentPath || 
            (currentPath === '/' && linkPath === '/') ||
            (currentPath === '/index.html' && linkPath === '/') ||
            (currentPath.endsWith('/') && linkPath === currentPath.slice(0, -1)) ||
            (linkPath.endsWith('/') && currentPath === linkPath.slice(0, -1))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}
