// Modal Accessibility: ESC key handler and focus management
let lastFocusedElement = null;

// ESC key listener for all modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Close any open modal
        const openModals = [
            'alert-modal',
            'confirm-modal',
            'breathe-modal',
            'labor-modal'
        ];

        openModals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && !modal.classList.contains('hidden')) {
                // Close the modal
                modal.classList.add('hidden');

                // Restore focus
                if (lastFocusedElement) {
                    lastFocusedElement.focus();
                    lastFocusedElement = null;
                }
            }
        });
    }
});

// Focus management helper
export function saveFocusAndShowModal(modalId) {
    lastFocusedElement = document.activeElement;
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        // Focus first button in modal
        setTimeout(() => {
            const firstButton = modal.querySelector('button');
            if (firstButton) {
                firstButton.focus();
            }
        }, 100);
    }
}

export function hideModalAndRestoreFocus(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        if (lastFocusedElement) {
            lastFocusedElement.focus();
            lastFocusedElement = null;
        }
    }
}
