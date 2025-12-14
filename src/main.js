import { initializeBedrock } from './bedrock.js';
import { appLogic, appState } from './logic.js';
// Make appLogic global for inline HTML handlers
window.appLogic = appLogic;
import { initFirebase } from './firebase.js';

async function initApp() {
    console.log('🚀 Miracle 3-Min App Starting...');

    try {
        await initFirebase();
        await initializeBedrock();

        // --- Toss Login Flow ---
        try {
            if (window.Bedrock && window.Bedrock.appLogin) {
                const loginResult = await window.Bedrock.appLogin();
                console.log('🔑 Toss Login Auth Code:', loginResult.authorizationCode);
                // NOTE: In a real implementation with a backend server:
                // 1. Send `loginResult.authorizationCode` to your backend.
                // 2. Backend calls Toss API -> Get Access Token -> Get User Info (UserKey).
                // 3. Backend creates a custom Firebase Token for that UserKey.
                // 4. Frontend receives token -> auth.signInWithCustomToken(token).

                // For now, we continue using Firebase Anonymous Auth for persistence.
            }
        } catch (e) {
            console.warn('Toss Login Skipped/Failed:', e);
        }

        await appLogic.init();



        bindEvents();

        console.log('✅ App Initialized');
    } catch (error) {
        console.error('❌ App Init Failed:', error);
    }
}

function bindEvents() {
    // Main Screen Buttons
    document.getElementById('start-btn')?.addEventListener('click', (e) => {
        // Create ripple effect
        const button = e.currentTarget;
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

    document.getElementById('btn-giveup')?.addEventListener('click', () => {
        const savingsFormatted = appState.sessionSavings.toLocaleString();
        appLogic.showCustomConfirm(
            `정말요? ${savingsFormatted}원이 공중분해 됩니다.`,
            () => {
                location.reload();
            }
        );
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
    document.getElementById('btn-restart')?.addEventListener('click', async () => {
        // Import dependencies dynamically
        const { saveRecord, getTodaySuccessCount } = await import('./firebase.js');
        const { appState } = await import('./logic.js');
        const { loadAppsInTossAdMob, showAppsInTossAdMob } = await import('./bedrock.js');

        // 1. Check Today's Success Count
        const count = await getTodaySuccessCount();
        console.log(`📊 Today's Success Count: ${count}`);

        // 2. Determine Ad Type
        // Guide implies specific types, let's assume 'INTERSTITIAL' and 'REWARDED' strings or similar.
        // We'll use uppercase standard keys commonly used in AdMob wrappers.
        const adType = count < 5 ? 'INTERSTITIAL' : 'REWARDED';

        // 3. Load & Show Ad (AppsInToss Standard Pattern)
        try {
            console.log(`⏳ Loading Ad (${adType})...`);
            const adInfo = await loadAppsInTossAdMob({ type: adType });

            if (adInfo && adInfo.adId) {
                console.log(`▶️ Showing Ad (${adInfo.adId})...`);
                await showAppsInTossAdMob({ adId: adInfo.adId });
            } else {
                console.warn('⚠️ Ad Load Failed or No Fill');
            }
        } catch (e) {
            console.error('Ad Flow Error:', e);
            // Fail open: continue to save even if ad fails
        }

        // 4. Save current session to Firebase
        await saveRecord(appState.sessionSavings, 800);

        // 5. Reload page
        location.reload();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
