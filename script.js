// Load header.html into the page
fetch('header.html')
    .then(response => response.text())
    .then(html => {
        document.body.insertAdjacentHTML('afterbegin', html);

        // Re-add menu functionality after header loads
        const hamburgerMenu = document.getElementById('hamburger-menu');
        const menu = document.getElementById('menu');
        const body = document.body;

        // Toggle the menu visibility and body shift
        hamburgerMenu.addEventListener('click', () => {
            menu.classList.toggle('active'); // Show/hide sliding menu
            body.classList.toggle('menu-open'); // Shift page content
        });

        // Close the menu when a menu link is clicked
        menu.addEventListener('click', (event) => {
            if (event.target.tagName === 'A') {
                menu.classList.remove('active');
                body.classList.remove('menu-open');
            }
        });
    })
    .catch(error => console.error('Error loading header:', error));
