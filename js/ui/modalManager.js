/**
 * Modal Manager
 * Handles modal dialog display and interactions
 */

import { getDosModal, getDosModalHeader, getDosModalContent } from '../config/constants.js';

/**
 * Displays a modal dialog with a custom message
 * Can show errors, warnings, or informational messages
 *
 * @param {string} message - The message to display (can be HTML)
 * @param {string} title - The modal title (default: "! WARNING !")
 * @param {boolean} isError - Whether to style as an error (red) or info (cyan)
 */
export function showModal(message, title = "! WARNING !", isError = true) {
    const dosModal = getDosModal();
    const dosModalHeader = getDosModalHeader();
    const dosModalContent = getDosModalContent();

    dosModalHeader.textContent = title;
    dosModalHeader.style.color = isError ? 'var(--dos-error)' : 'var(--dos-header)';

    // Check if message contains HTML tags
    if (message.startsWith('<')) {
        dosModalContent.innerHTML = message;
    } else {
        dosModalContent.textContent = message;
    }

    dosModal.style.display = 'block';
}

/**
 * Hides the modal dialog
 */
export function hideModal() {
    const dosModal = getDosModal();
    dosModal.style.display = 'none';
}

/**
 * Initialize modal event listeners
 * Sets up the OK button to close the modal
 */
export function initModal() {
    const okButton = document.getElementById('dos-modal-ok');
    if (okButton) {
        okButton.addEventListener('click', hideModal);
    }
}
