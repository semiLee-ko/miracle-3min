// Bedrock SDK (Simplified for Miracle 3-Min)
// Mimics find-meow/src/bedrock.js structure

export const config = {
    APPENTOS_APP_KEY: 'miracle-3min', // Placeholder
    ENV: 'dev'
};

// Exported Wrappers for convenience
export async function loadAppsInTossAdMob(params) {
    if (window.Bedrock && window.Bedrock.loadAppsInTossAdMob) {
        return window.Bedrock.loadAppsInTossAdMob(params);
    }
    console.warn('⚠️ Bedrock.loadAppsInTossAdMob not available');
    return { adId: 'mock_fallback_id' };
}

export async function showAppsInTossAdMob(params) {
    if (window.Bedrock && window.Bedrock.showAppsInTossAdMob) {
        return window.Bedrock.showAppsInTossAdMob(params);
    }
    console.warn('⚠️ Bedrock.showAppsInTossAdMob not available');
    return { result: 'success' };
}

let isBedrockInitialized = false;

export async function initializeBedrock() {
    if (isBedrockInitialized) return;

    if (!window.Bedrock) {
        console.warn('⚠️ Bedrock SDK not found. Initializing Mock SDK.');
        setupMockBedrock();
    }

    try {
        const { Bedrock } = window;
        await Bedrock.init({
            appKey: config.APPENTOS_APP_KEY,
            env: config.ENV
        });
        console.log('✅ Bedrock initialized successfully');
        isBedrockInitialized = true;
        setupNavigationBar();
    } catch (error) {
        console.error('❌ Bedrock initialization failed:', error);
    }
}

function setupMockBedrock() {
    window.Bedrock = {
        init: () => Promise.resolve(),
        appLogin: () => {
            console.log('📱 Mock Toss Login Initiated');
            return Promise.resolve({
                authorizationCode: 'mock_auth_code_' + Date.now(),
                referrer: 'sandbox'
            });
        },
        fetchAlbumPhotos: (options) => {
            console.log('🖼️ Mock Toss fetchAlbumPhotos:', options);
            // Return a mock result after a short delay
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve([
                        {
                            id: 'mock_photo_1',
                            dataUri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' // Mock Salad Image
                        }
                    ]);
                }, 1000);
            });
        },
        exit: () => {
            if (confirm('앱을 종료하시겠습니까? (Mock)')) {
                console.log('App Exited');
            }
        },
        /**
         * Mock: loadAppsInTossAdMob
         * Loads an ad and returns an adId.
         */
        loadAppsInTossAdMob: (params) => {
            console.log('📺 Mock Bedrock: Loading Ad...', params);
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        adId: `mock_ad_${Date.now()}`,
                        type: params.type
                    });
                }, 500);
            });
        },

        /**
         * Mock: showAppsInTossAdMob
         * Shows the ad associated with the adId.
         */
        showAppsInTossAdMob: (params) => {
            console.log('📺 Mock Bedrock: Showing Ad...', params);
            return new Promise((resolve) => {
                const isRewarded = params.adId && params.adId.includes('rewarded'); // primitive check for mock
                // In real usage, params would be checked against loaded ads.

                // Determine message based on context (we don't have easy context here unless we pass it, 
                // but for mock, let's just ask generically or infer from a saved state if needed.
                // For simplicity, we'll prompt generic.)

                const msg = '광고가 재생됩니다. (Mock)\n끝까지 시청하시겠습니까?';

                if (confirm(msg)) {
                    setTimeout(() => {
                        console.log('✅ Ad Watched');
                        resolve({ result: 'success' });
                    }, 1000);
                } else {
                    console.log('❌ Ad Cancelled');
                    resolve({ result: 'cancelled' });
                }
            });
        }
    };
    window.NavigationBar = {
        setTitle: (title) => console.log(`Title set to: ${title}`),
        setBackButton: (opts) => console.log('Back button set:', opts)
    };
}

function setupNavigationBar() {
    try {
        const { NavigationBar } = window;
        if (!NavigationBar) return;

        NavigationBar.setTitle('3분의 기적');
        NavigationBar.setBackButton({
            visible: true,
            onPress: handleBackButton
        });
    } catch (error) {
        console.warn('Navigation bar setup failed:', error);
    }
}

function handleBackButton() {
    // Logic to handle back button
    // If tool modal is open, close it.
    // If in main timer, ask confirmation.
    // If in result, exit or restart.

    // Simple implementation:
    const activeTool = document.querySelector('[id$="-modal"]:not(.hidden)');
    if (activeTool) {
        activeTool.classList.add('hidden');
        return;
    }

    // Default exit behavior
    showExitConfirmation();
}

export function showExitConfirmation() {
    if (confirm('정말 종료하시겠습니까? 3분을 참아야 합니다!')) {
        try {
            window.Bedrock.exit();
        } catch (error) {
            console.warn('Cannot exit:', error);
        }
    }
}
