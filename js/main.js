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

        // Re-add menu functionality after header loads
        const hamburgerMenu = document.getElementById('hamburger-menu');
        const closeMenu = document.getElementById('close-menu');
        const menu = document.getElementById('menu');
        const body = document.body;
        
        // Verify required elements exist
        if (!hamburgerMenu || !closeMenu || !menu) {
            console.error('Header elements not found after loading');
            return;
        }

        // Toggle the menu visibility and body shift
        hamburgerMenu.addEventListener('click', () => {
            menu.classList.toggle('active'); // Show/hide sliding menu
            body.classList.toggle('menu-open'); // Shift page content
        });

        // Close menu with "X" icon
        closeMenu.addEventListener('click', () => {
            menu.classList.remove('active'); // Hide the menu
            body.classList.remove('menu-open'); // Reset content position
            closeMenu.style.display = 'none'; // Hide the X button
        });

        // Close the menu when a menu link is clicked
        menu.addEventListener('click', (event) => {
            if (event.target.tagName === 'A') {
                menu.classList.remove('active');
                body.classList.remove('menu-open');
            }
        });
    })
    .catch(error => {
        console.error('Error loading header:', error);
        // Provide a fallback message to the user
        const fallbackHeader = document.createElement('div');
        fallbackHeader.style.cssText = 'text-align: center; padding: 20px; color: red;';
        fallbackHeader.textContent = 'Unable to load navigation. Please refresh the page.';
        document.body.insertAdjacentElement('afterbegin', fallbackHeader);
    });
