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

        // Theme toggle button functionality
        const themeToggleButton = document.getElementById('theme-toggle');
        const savedTheme = localStorage.getItem('theme');

        // Apply the saved theme on page load
        if (savedTheme) {
            body.classList.add(savedTheme);
            themeToggleButton.textContent =
                savedTheme === 'dark-mode' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        }

        // Add event listener for the button
        themeToggleButton.addEventListener('click', () => {
            // Toggle dark mode class on the body
            if (body.classList.contains('dark-mode')) {
                body.classList.remove('dark-mode');
                localStorage.setItem('theme', ''); // Clear saved theme
                themeToggleButton.textContent = 'Switch to Dark Mode';
            } else {
                body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark-mode'); // Save theme
                themeToggleButton.textContent = 'Switch to Light Mode';
            }
        });
    })
    .catch(error => console.error('Error loading header:', error));
