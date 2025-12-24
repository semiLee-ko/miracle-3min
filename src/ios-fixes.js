// iOS Touch Fixes
// 1. Prevent double-tap zoom globally
document.addEventListener('touchstart', function (e) {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', function (e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, { passive: false });

// 2. iOS Keyboard viewport fix
let lastHeight = window.innerHeight;
window.visualViewport?.addEventListener('resize', () => {
    const currentHeight = window.visualViewport.height;
    const diff = lastHeight - currentHeight;

    if (diff > 100) {
        // Keyboard is open - do nothing, let it push content up
    } else if (diff < -100) {
        // Keyboard closed - force recalculate
        document.body.style.height = `${window.innerHeight}px`;
        setTimeout(() => {
            document.body.style.height = '';
            window.scrollTo(0, 0);
        }, 100);
    }

    lastHeight = currentHeight;
});

// Fallback for older iOS
window.addEventListener('resize', () => {
    if (document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA') {
        // Keyboard closed
        setTimeout(() => {
            document.body.style.height = `${window.innerHeight}px`;
            setTimeout(() => {
                document.body.style.height = '';
            }, 100);
        }, 300);
    }
});


