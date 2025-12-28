/**
 * ConfirmationModal - Specialized modal for confirmation dialogs
 * Extends BaseModal with confirm/cancel pattern
 * 
 * @example
 * const modal = new ConfirmationModal({
 *   title: 'Delete Item',
 *   message: 'Are you sure you want to delete this?',
 *   confirmText: 'Delete',
 *   confirmClass: 'btn-danger',
 *   onConfirm: () => console.log('confirmed')
 * });
 * modal.show();
 */

import { BaseModal } from './modal-base.js';

class ConfirmationModal extends BaseModal {
    /**
     * Create a confirmation modal
     * @param {Object} options - Configuration options
     * @param {string} options.title - Modal title
     * @param {string} options.message - Confirmation message (HTML allowed)
     * @param {string} options.icon - Icon class (e.g., 'fas fa-exclamation-triangle')
     * @param {string} options.confirmText - Text for confirm button (default: 'Confirm')
     * @param {string} options.confirmClass - CSS class for confirm button (default: 'btn-primary')
     * @param {string} options.cancelText - Text for cancel button (default: 'Cancel')
     * @param {string} options.cancelClass - CSS class for cancel button (default: 'btn-cancel')
     * @param {Function} options.onConfirm - Callback when confirmed
     * @param {Function} options.onCancel - Callback when cancelled
     * @param {string} options.variant - Modal variant: 'danger' for delete actions (red header), others use default gradient
     */
    constructor(options = {}) {
        const confirmationOptions = {
            size: options.size || 'small',
            confirmText: options.confirmText || 'Confirm',
            confirmClass: options.confirmClass || 'btn-primary',
            cancelText: options.cancelText || 'Cancel',
            cancelClass: options.cancelClass || 'btn-cancel',
            icon: options.icon || null,
            message: options.message || '',
            variant: options.variant || null,
            onConfirm: options.onConfirm || null,
            onCancel: options.onCancel || null,
            ...options
        };

        // Build content with icon and message
        const content = confirmationOptions.message || '';

        // Build title with icon
        const titleWithIcon = confirmationOptions.icon && confirmationOptions.title ?
            `<i class="${confirmationOptions.icon}"></i> ${confirmationOptions.title}` :
            confirmationOptions.title;

        // Build buttons
        const buttons = [
            {
                text: confirmationOptions.cancelText,
                class: confirmationOptions.cancelClass,
                onClick: (modal) => this._handleCancel()
            },
            {
                text: confirmationOptions.confirmText,
                class: confirmationOptions.confirmClass,
                onClick: (modal) => this._handleConfirm()
            }
        ];

        // Initialize base modal
        super({
            ...confirmationOptions,
            title: titleWithIcon,
            content,
            buttons,
            showCloseButton: true
        });

        // Store confirmation-specific options
        this.confirmationOptions = confirmationOptions;

        // Add variant class if specified
        if (confirmationOptions.variant) {
            this.element.classList.add(`modal-${confirmationOptions.variant}`);
        }
    }

    /**
     * Handle confirm action
     * @private
     */
    _handleConfirm() {
        if (this.confirmationOptions.onConfirm) {
            this.confirmationOptions.onConfirm(this);
        }
        this.hide();
    }

    /**
     * Handle cancel action
     * @private
     */
    _handleCancel() {
        if (this.confirmationOptions.onCancel) {
            this.confirmationOptions.onCancel(this);
        }
        this.hide();
    }

    /**
     * Update the confirmation message
     * @param {string} message - New message (HTML allowed)
     */
    setMessage(message) {
        const body = this.element.querySelector('.modal-body');
        if (body) {
            body.innerHTML = message;
        }
    }
}

export { ConfirmationModal };
