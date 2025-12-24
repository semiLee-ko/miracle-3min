import { initializeBedrock, appLogin, prepareInterstitialAd, prepareRewardedAd } from './bedrock.js';
import { appLogic, appState } from './logic.js';
// Make appLogic global for inline HTML handlers
window.appLogic = appLogic;
import { initFirebase } from './firebase.js';
import './modal-a11y.js'; // Modal accessibility (ESC key, focus management)
import './ios-fixes.js'; // iOS touch and keyboard fixes

async function initApp() {


    try {
        await initializeBedrock();

        // Preload ads
        prepareInterstitialAd();
        prepareRewardedAd();

        // --- Toss Login Flow (BEFORE Firebase init) ---
        let tossLoginSuccess = false;
        try {
            const loginResult = await appLogin();

            if (loginResult && loginResult.authorizationCode) {
                // Import Firebase modules
                const { auth, functions } = await import('./firebase.js');
                const { httpsCallable } = await import('firebase/functions');
                const { signInWithCustomToken } = await import('firebase/auth');

                const tossLogin = httpsCallable(functions, 'tossLogin');

                const result = await tossLogin({
                    authorizationCode: loginResult.authorizationCode,
                    referrer: loginResult.referrer
                });

                // Sign in to Firebase with custom token
                if (result.data && result.data.token) {
                    await signInWithCustomToken(auth, result.data.token);
                    tossLoginSuccess = true;
                }
            }
        } catch (e) {
            console.warn('⚠️ Toss Login Skipped/Failed:', e);
        }

        // Initialize Firebase (will use existing auth if Toss login succeeded)
        if (!tossLoginSuccess) {

            await initFirebase();
        } else {

            // Just initialize the user tracking
            const { auth } = await import('./firebase.js');
            const { onAuthStateChanged } = await import('firebase/auth');
            await new Promise(resolve => {
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    if (user) {

                        unsubscribe();
                        resolve(user);
                    }
                });
            });
        }

        await appLogic.init();

        bindEvents();

        // Hide loading indicator
        const loadingEl = document.getElementById('loading-indicator');
        if (loadingEl) loadingEl.style.display = 'none';


    } catch (error) {
        console.error('❌ App Init Failed:', error);
    }
}

function bindEvents() {
    // Main Screen Buttons - with debounce to prevent double-click
    let isStarting = false;
    document.getElementById('start-btn')?.addEventListener('click', (e) => {
        // Prevent double-click
        if (isStarting) {

            return;
        }
        isStarting = true;

        // Create ripple effect
        const button = e.currentTarget;
        button.disabled = true; // Disable button immediately

        const ripple = document.createElement('span');
        ripple.classList.add('ripple');

        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        button.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);

        // Start timer after ripple begins
        setTimeout(() => appLogic.startMainTimer(), 200);
    });



    // Tools - Open
    document.getElementById('btn-blue')?.addEventListener('click', () => appLogic.openTool('blue'));
    document.getElementById('btn-game')?.addEventListener('click', () => appLogic.openTool('game'));
    document.getElementById('btn-labor')?.addEventListener('click', () => appLogic.openTool('labor'));
    document.getElementById('btn-breathe')?.addEventListener('click', () => appLogic.openTool('breathe'));

    // Help Modal
    document.getElementById('btn-help')?.addEventListener('click', () => {
        document.getElementById('help-modal').classList.remove('hidden');
    });
    document.getElementById('btn-close-help')?.addEventListener('click', () => {
        document.getElementById('help-modal').classList.add('hidden');
    });

    // Tools - Close
    document.querySelectorAll('.btn-close-tool').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tool = e.target.closest('button').dataset.tool || e.target.dataset.tool;
            appLogic.closeTool(tool);
        });
    });

    // Tool Specifics
    // Blue Filter
    document.getElementById('btn-blue-strong')?.addEventListener('click', () => appLogic.toggleBlueFilter(true));
    document.getElementById('btn-blue-weak')?.addEventListener('click', () => appLogic.toggleBlueFilter(false));
    document.getElementById('image-upload')?.addEventListener('change', (e) => appLogic.handleImageUpload(e.target));

    // Game
    // Game (Removed for Chill Mode)
    // document.getElementById('btn-game-start')?.addEventListener('click', () => { ... });

    // Labor
    document.getElementById('btn-labor-calc')?.addEventListener('click', appLogic.calculateLabor);

    // Restart - Save to DB after ad watch, then reload
    // Restart - Save to DB after ad watch (handled in checkDailyLimit), then reload
    // Restart - Save to DB after ad watch (handled in checkDailyLimit), then reload
    let isRestarting = false;
    document.getElementById('btn-restart')?.addEventListener('click', async (e) => {
        if (isRestarting) return;
        isRestarting = true;

        const btn = e.currentTarget;
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';

        // Import dependencies dynamically
        const { saveRecord } = await import('./firebase.js');
        const { appState } = await import('./logic.js');

        // Check Daily Limit (Handles Ad Logic internally)
        // This awaits until the ad is CLOSED or SKIPPED
        const canProceed = await appLogic.checkDailyLimit();

        if (!canProceed) {
            // User cancelled (only for rewarded ads)
            isRestarting = false;
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
            return;
        }

        // 4. Save current session to Firebase
        await saveRecord(appState.sessionSavings, 800);

        // 5. Reload page
        location.reload();
    });

    // Particle bubbles - Add click handlers
    const setupBubbleHandlers = () => {
        document.querySelectorAll('.particle').forEach(particle => {
            // Use both click and touchstart for better mobile support
            const popBubble = (e) => {
                e.preventDefault();
                e.stopPropagation();
                particle.style.animation = 'pop 0.3s ease-out forwards';
                setTimeout(() => particle.remove(), 300);
            };

            particle.addEventListener('click', popBubble);
            particle.addEventListener('touchstart', popBubble, { passive: false });
        });
    };

    // Setup initially
    setupBubbleHandlers();

    // Re-setup when new bubbles are added (MutationObserver)
    const observer = new MutationObserver(() => {
        setupBubbleHandlers();
    });

    const bgParticles = document.querySelector('.bg-particles');
    if (bgParticles) {
        observer.observe(bgParticles, { childList: true });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
