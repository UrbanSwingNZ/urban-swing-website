/**
 * BaseModal - Foundation class for all modal dialogs
 * Handles core modal functionality: lifecycle, events, accessibility
 * 
 * @example
 * const modal = new BaseModal({
 *   id: 'my-modal',
 *   title: 'Modal Title',
 *   content: '<p>Modal content</p>',
 *   onOpen: () => console.log('opened'),
 *   onClose: () => console.log('closed')
 * });
 * modal.show();
 */

class BaseModal {
    /**
     * Create a new modal instance
     * @param {Object} options - Configuration options
     * @param {string} options.id - Unique ID for the modal element
     * @param {HTMLElement} options.element - Existing modal element (alternative to creating new)
     * @param {string} options.title - Modal title
     * @param {string} options.content - Modal body content (HTML string)
     * @param {Array} options.buttons - Array of button configs {text, class, onClick}
     * @param {string} options.size - Modal size: 'small', 'medium', 'large'
     * @param {boolean} options.closeOnEscape - Close on ESC key (default: true)
     * @param {boolean} options.closeOnOverlay - Close on overlay click (default: true)
     * @param {boolean} options.showCloseButton - Show X close button (default: true)
     * @param {Function} options.onOpen - Callback when modal opens
     * @param {Function} options.onClose - Callback when modal closes
     * @param {Function} options.onBeforeClose - Callback before modal closes (can prevent close)
     */
    constructor(options = {}) {
        this.options = {
            id: `modal-${Date.now()}`,
            element: null,
            title: '',
            content: '',
            buttons: [],
            size: 'medium',
            closeOnEscape: true,
            closeOnOverlay: true,
            showCloseButton: true,
            onOpen: null,
            onClose: null,
            onBeforeClose: null,
            ...options
        };

        this.isOpen = false;
        this.element = null;
        this.focusedElementBeforeOpen = null;
        this.boundHandlers = {};

        this._initialize();
    }

    /**
     * Initialize the modal
     * @private
     */
    _initialize() {
        if (this.options.element) {
            // Use existing modal element
            this.element = this.options.element;
            this._attachEventListeners();
        } else {
            // Create new modal element
            this._createModal();
        }
    }

    /**
     * Create modal DOM structure
     * @private
     */
    _createModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = this.options.id;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.style.display = 'none';

        const sizeClass = this.options.size !== 'medium' ? `modal-${this.options.size}` : '';

        modal.innerHTML = `
            <div class="modal-content ${sizeClass}">
                ${this._createHeader()}
                ${this._createBody()}
                ${this._createFooter()}
            </div>
        `;

        document.body.appendChild(modal);
        this.element = modal;
        this._attachEventListeners();
    }

    /**
     * Create modal header
     * @private
     */
    _createHeader() {
        if (!this.options.title && !this.options.showCloseButton) return '';

        return `
            <div class="modal-header">
                ${this.options.title ? `<h3>${this.options.title}</h3>` : ''}
                ${this.options.showCloseButton ? '<button class="modal-close" aria-label="Close">&times;</button>' : ''}
            </div>
        `;
    }

    /**
     * Create modal body
     * @private
     */
    _createBody() {
        if (!this.options.content) return '';

        return `
            <div class="modal-body">
                ${this.options.content}
            </div>
        `;
    }

    /**
     * Create modal footer with buttons
     * @private
     */
    _createFooter() {
        // If custom footer HTML is provided, use it
        if (this.options.footer) {
            return `
                <div class="modal-footer">
                    ${this.options.footer}
                </div>
            `;
        }

        // Otherwise, use buttons array if provided
        if (!this.options.buttons || this.options.buttons.length === 0) return '';

        const buttonsHtml = this.options.buttons.map((btn, index) => {
            const btnClass = btn.class || 'btn-primary';
            const btnText = btn.text || 'OK';
            return `<button type="button" class="${btnClass}" data-button-index="${index}">${btnText}</button>`;
        }).join('');

        return `
            <div class="modal-footer">
                ${buttonsHtml}
            </div>
        `;
    }

    /**
     * Attach event listeners
     * @private
     */
    _attachEventListeners() {
        // Close button
        if (this.options.showCloseButton) {
            const closeBtn = this.element.querySelector('.modal-close');
            if (closeBtn) {
                this.boundHandlers.closeClick = () => this.hide();
                closeBtn.addEventListener('click', this.boundHandlers.closeClick);
            }
        }

        // Overlay click
        if (this.options.closeOnOverlay) {
            this.boundHandlers.overlayClick = (e) => {
                if (e.target === this.element) {
                    this.hide();
                }
            };
            this.element.addEventListener('click', this.boundHandlers.overlayClick);
        }

        // ESC key
        if (this.options.closeOnEscape) {
            this.boundHandlers.escapeKey = (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.hide();
                }
            };
            document.addEventListener('keydown', this.boundHandlers.escapeKey);
        }

        // Custom button clicks
        if (this.options.buttons && this.options.buttons.length > 0) {
            const footer = this.element.querySelector('.modal-footer');
            if (footer) {
                this.boundHandlers.buttonClick = (e) => {
                    const button = e.target.closest('[data-button-index]');
                    if (button) {
                        const index = parseInt(button.dataset.buttonIndex, 10);
                        const btnConfig = this.options.buttons[index];
                        if (btnConfig && btnConfig.onClick) {
                            btnConfig.onClick(this);
                        }
                    }
                };
                footer.addEventListener('click', this.boundHandlers.buttonClick);
            }
        }
    }

    /**
     * Show the modal
     */
    show() {
        if (this.isOpen) return;

        // Store currently focused element
        this.focusedElementBeforeOpen = document.activeElement;

        // Show modal
        this.element.style.display = 'flex';
        this.isOpen = true;

        // Lock body scroll
        this._lockBodyScroll();

        // Focus first focusable element
        this._trapFocus();

        // Callback
        if (this.options.onOpen) {
            this.options.onOpen(this);
        }
    }

    /**
     * Hide the modal
     */
    hide() {
        if (!this.isOpen) return;

        // Before close callback - can prevent close
        if (this.options.onBeforeClose) {
            const shouldClose = this.options.onBeforeClose(this);
            if (shouldClose === false) return;
        }

        // Hide modal
        this.element.style.display = 'none';
        this.isOpen = false;

        // Unlock body scroll
        this._unlockBodyScroll();

        // Restore focus
        if (this.focusedElementBeforeOpen && this.focusedElementBeforeOpen.focus) {
            this.focusedElementBeforeOpen.focus();
        }

        // Callback
        if (this.options.onClose) {
            this.options.onClose(this);
        }
    }

    /**
     * Toggle modal visibility
     */
    toggle() {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Lock body scroll when modal is open
     * @private
     */
    _lockBodyScroll() {
        document.body.style.overflow = 'hidden';
    }

    /**
     * Unlock body scroll when modal is closed
     * @private
     */
    _unlockBodyScroll() {
        document.body.style.overflow = '';
    }

    /**
     * Trap focus within modal for accessibility
     * @private
     */
    _trapFocus() {
        const focusableElements = this.element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

    /**
     * Update modal content
     * @param {string} content - New content HTML
     */
    setContent(content) {
        const body = this.element.querySelector('.modal-body');
        if (body) {
            body.innerHTML = content;
        }
    }

    /**
     * Update modal title
     * @param {string} title - New title
     */
    setTitle(title) {
        const header = this.element.querySelector('.modal-header h3');
        if (header) {
            header.textContent = title;
        }
    }

    /**
     * Destroy the modal and clean up
     */
    destroy() {
        // Remove event listeners
        if (this.boundHandlers.closeClick) {
            const closeBtn = this.element.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.removeEventListener('click', this.boundHandlers.closeClick);
            }
        }

        if (this.boundHandlers.overlayClick) {
            this.element.removeEventListener('click', this.boundHandlers.overlayClick);
        }

        if (this.boundHandlers.escapeKey) {
            document.removeEventListener('keydown', this.boundHandlers.escapeKey);
        }

        if (this.boundHandlers.buttonClick) {
            const footer = this.element.querySelector('.modal-footer');
            if (footer) {
                footer.removeEventListener('click', this.boundHandlers.buttonClick);
            }
        }

        // Remove element if created by this class
        if (!this.options.element && this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        this.element = null;
        this.boundHandlers = {};
    }
}

export { BaseModal };
