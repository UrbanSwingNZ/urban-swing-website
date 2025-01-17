// Load header.html into the page
fetch('header.html')
    .then(response => response.text())
    .then(html => {
        // Insert the header HTML into the document
        document.body.insertAdjacentHTML('afterbegin', html);

        // Re-add menu functionality after header loads
        const hamburgerMenu = document.getElementById('hamburger-menu');
        const closeMenu = document.getElementById('close-menu');
        const menu = document.getElementById('menu');
        const body = document.body;

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

        // Detect and apply the system's color scheme
        function applySystemTheme() {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                body.classList.add('dark-mode');
            } else {
                body.classList.remove('dark-mode');
            }
        }

        // Apply the system theme on page load
        applySystemTheme();

        // Listen for system theme changes and update dynamically
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            applySystemTheme();
        });
    })
    .catch(error => console.error('Error loading header:', error));
