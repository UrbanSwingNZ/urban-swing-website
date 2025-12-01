/**
 * terms-modal.js - Terms and Conditions Modal Handler
 * Manages the display and interaction with the terms modal using BaseModal
 */

import { BaseModal } from '../../../components/modals/modal-base.js';

const termsContent = `
    <div style="line-height: 1.6;">
        <h4 style="margin-top: 0;">Urban Swing Terms and Conditions</h4>
        <p><strong>Last Updated: November 16, 2025</strong></p>
        
        <p><strong>Recent Changes:</strong></p>
        <p>November 16, 2025: Added Concession Payments and Single Class Booking Policy terms<br>
        January 10, 2025: Initial terms published</p>
        
        <h5>Liability Waiver & Acknowledgment of Risk</h5>
        <p>I understand that participating in dance classes, events, or activities at Urban Swing involves inherent risks, including but not limited to physical injury. While Urban Swing will take all reasonable precautions to ensure a safe environment and minimize these risks, I acknowledge that the ultimate responsibility for my safety lies with me as the participant.</p>
        
        <p>By participating in Urban Swing's classes or events, I agree to assume full responsibility for any injuries, accidents, or other incidents that may occur during my participation. I understand that Urban Swing cannot be held liable for any injuries or damages sustained while attending or engaging in its activities.</p>
        
        <p>I hereby release Urban Swing, its instructors, crew, and affiliates from any and all claims, demands, or causes of action related to injury, loss, or damage that may arise during my participation in classes or events.</p>
        
        <h5>Concession Payments</h5>
        <p>Concession purchases are non-refundable and non-transferable. Unused classes or credits will not be reimbursed or credited to another person.</p>
        
        <h5>Single Class Booking Policy</h5>
        <p>Payments for individual classes are non-refundable. However, you may request to reschedule your booked class to another date, provided the request is made before 7:00pm on the day of the class. Class changes after this time cannot be processed and your payment will be forfeited.</p>
        
        <h5>Media</h5>
        <p>By submitting this form, I give permission to Urban Swing Limited to capture photos, videos, and other media of my participation in dance classes, events, or performances. These images and videos may be used for advertising, educational, training, or other promotional purposes across various platforms, including social media, websites, and other digital media.</p>
        
        <p>I understand that my participation in media captured by Urban Swing may be shared publicly. However, if I have any concerns or would prefer not to be included in such media, I will inform an owner of Urban Swing upon my arrival at a class or event. Urban Swing respects my right to privacy and will make every effort to exclude me from media coverage if requested.</p>
        
        <p><strong>By submitting this form, I acknowledge that I fully understand and agree to these terms.</strong></p>
    </div>
`;

let termsModal = null;

document.addEventListener('DOMContentLoaded', () => {
    const termsLink = document.getElementById('terms-link');
    const termsCheckbox = document.getElementById('termsAccepted');

    // Create modal instance
    termsModal = new BaseModal({
        title: '<i class="fas fa-file-contract"></i> Terms and Conditions',
        content: termsContent,
        footer: `
            <button class="btn-cancel" id="terms-cancel-btn">Cancel</button>
            <button class="btn-primary" id="terms-accept-btn">
                <i class="fas fa-check"></i> Accept & Close
            </button>
        `,
        size: 'medium',
        onOpen: () => {
            // Attach button handlers after modal is shown
            const acceptBtn = document.getElementById('terms-accept-btn');
            const cancelBtn = document.getElementById('terms-cancel-btn');
            
            if (acceptBtn) {
                acceptBtn.addEventListener('click', () => {
                    if (termsCheckbox) {
                        termsCheckbox.checked = true;
                    }
                    termsModal.hide();
                });
            }
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    termsModal.hide();
                });
            }
        }
    });

    // Open modal when clicking the "Read the full T&C" link
    if (termsLink) {
        termsLink.addEventListener('click', (e) => {
            e.preventDefault();
            termsModal.show();
        });
    }
});
