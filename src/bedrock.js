
// Bedrock SDK (Refactored for Miracle 3-Min)
import {
    GoogleAdMob,
    appLogin as frameworkAppLogin,
    fetchAlbumPhotos as frameworkFetchAlbumPhotos,
    generateHapticFeedback as frameworkHaptic
} from '@apps-in-toss/web-framework';

export const config = {
    APPENTOS_APP_KEY: 'jAicsveDu9OQDtYs4m8H3v0SiI9DfhV9uKgB97_0WVA', // Placeholder
    ENV: 'dev'
};

let isBedrockInitialized = false;

// Ad state management
let isAdLoaded = false;
let adCleanup = null;

// Rewarded ad state management
let isRewardedAdLoaded = false;
let rewardedAdCleanup = null;

/**
 * 전면 광고 미리 로드 (앱 시작 시 호출)
 */
export async function prepareInterstitialAd() {


    try {
        if (!GoogleAdMob.loadAppsInTossAdMob.isSupported()) {
            console.warn('⚠️ AdMob not supported');
            return;
        }

        const cleanup = GoogleAdMob.loadAppsInTossAdMob({
            options: { adGroupId: 'ait.v2.live.35a5357d08ca409f' },
            //options: { adGroupId: 'ait-ad-test-interstitial-id' },
            onEvent: (event) => {
                if (event.type === 'loaded') {
                    isAdLoaded = true;

                    cleanup(); // IMPORTANT: Must call cleanup after load success!
                }
            },
            onError: (error) => {
                console.error('❌ Ad Preload Failed:', error);
                isAdLoaded = false;
                cleanup && cleanup();
            }
        });
    } catch (error) {
        console.error('❌ prepareInterstitialAd Error:', error);
    }
}

// Initialize Bedrock
export async function initializeBedrock() {
    if (isBedrockInitialized) return;



    // Framework support check
    let supported = false;
    try {
        supported = GoogleAdMob.loadAppsInTossAdMob.isSupported();
        // alert(`DEBUG: GoogleAdMob.isSupported = ${supported}`); // Too noisy, verify via logs

    } catch (e) {
        console.warn('⚠️ Framework isSupported check failed:', e);
        // alert(`DEBUG: Framework check failed: ${e.message}`);
    }

    if (!supported) {
        console.warn('⚠️ GoogleAdMob not supported. Initializing Mock SDK.');
        setupMockBedrock();
    } else {

        // alert('DEBUG: Framework Native Support Enabled');
    }

    isBedrockInitialized = true;
    setupNavigationBar();
}

/**
 * 전면 광고 표시 (미리 로드된 광고 사용)
 */
export function showInterstitialAd() {
    return new Promise((resolve) => {
        if (!isAdLoaded) {

            prepareInterstitialAd(); // Try to load for next time
            resolve();
            return;
        }

        try {
            if (!GoogleAdMob.showAppsInTossAdMob.isSupported()) {
                console.warn('⚠️ showAppsInTossAdMob not supported');
                resolve();
                return;
            }


            GoogleAdMob.showAppsInTossAdMob({
                options: { adGroupId: 'ait.v2.live.35a5357d08ca409f' },
                //options: { adGroupId: 'ait-ad-test-interstitial-id' },
                onEvent: (event) => {

                    switch (event.type) {
                        case 'show':

                            break;
                        case 'dismissed':

                            isAdLoaded = false;
                            prepareInterstitialAd(); // Preload next ad
                            resolve();
                            break;
                        case 'failedToShow':
                            console.warn('⚠️ 광고 표시 실패');
                            isAdLoaded = false;
                            resolve();
                            break;
                    }
                },
                onError: (error) => {
                    console.error('❌ Failed to show Ad:', error);
                    isAdLoaded = false;
                    resolve();
                }
            });
        } catch (error) {
            console.error('❌ Error calling showAd:', error);
            resolve();
        }
    });
}

/**
 * 보상형 광고 미리 로드
 */
export async function prepareRewardedAd() {


    try {
        if (!GoogleAdMob.loadAppsInTossAdMob.isSupported()) {
            console.warn('⚠️ AdMob not supported');
            return;
        }

        const cleanup = GoogleAdMob.loadAppsInTossAdMob({
            options: { adGroupId: 'ait.v2.live.1285567918504cc7' },
            //options: { adGroupId: 'ait-ad-test-rewarded-id' },
            onEvent: (event) => {
                if (event.type === 'loaded') {
                    isRewardedAdLoaded = true;

                    cleanup(); // IMPORTANT: Must call cleanup after load success!
                }
            },
            onError: (error) => {
                console.error('❌ Rewarded Ad Preload Failed:', error);
                isRewardedAdLoaded = false;
                cleanup && cleanup();
            }
        });
    } catch (error) {
        console.error('❌ prepareRewardedAd Error:', error);
    }
}

/**
 * 보상형 광고 표시 (미리 로드된 광고 사용)
 */
export function showRewardedAd() {
    return new Promise((resolve) => {
        if (!isRewardedAdLoaded) {

            prepareRewardedAd(); // Try to load for next time
            resolve({ rewarded: false });
            return;
        }

        try {
            if (!GoogleAdMob.showAppsInTossAdMob.isSupported()) {
                console.warn('⚠️ showAppsInTossAdMob not supported');
                resolve({ rewarded: false });
                return;
            }


            GoogleAdMob.showAppsInTossAdMob({
                options: { adGroupId: 'ait.v2.live.1285567918504cc7' },
                //options: { adGroupId: 'ait-ad-test-rewarded-id' },
                onEvent: (event) => {

                    switch (event.type) {
                        case 'show':

                            break;
                        case 'userEarnedReward':

                            break;
                        case 'dismissed':

                            isRewardedAdLoaded = false;
                            prepareRewardedAd(); // Preload next ad
                            resolve({ rewarded: true });
                            break;
                        case 'failedToShow':
                            console.warn('⚠️ 보상형 광고 표시 실패');
                            isRewardedAdLoaded = false;
                            resolve({ rewarded: false });
                            break;
                    }
                },
                onError: (error) => {
                    console.error('❌ Failed to show Rewarded Ad:', error);
                    isRewardedAdLoaded = false;
                    resolve({ rewarded: false });
                }
            });
        } catch (error) {
            console.error('❌ Error calling showRewardedAd:', error);
            resolve({ rewarded: false });
        }
    });
}

// Exported Wrappers using Framework
export async function loadAppsInTossAdMob(params) {


    // Map internal types to Live Ad IDs
    let adGroupId = 'ait.v2.live.35a5357d08ca409f'; // Interstitial
    //let adGroupId = 'ait-ad-test-interstitial-id'; // Interstitial
    if (params?.type === 'REWARDED') {
        adGroupId = 'ait.v2.live.1285567918504cc7';
        //adGroupId = 'ait-ad-test-rewarded-id';
    } else if (params?.type === 'INTERSTITIAL') {
        adGroupId = 'ait.v2.live.35a5357d08ca409f';
        //adGroupId = 'ait-ad-test-interstitial-id';
    }

    // 1. Try Framework
    try {
        if (GoogleAdMob.loadAppsInTossAdMob.isSupported()) {
            //alert('LOAD-DEBUG 3: Framework isSupported = true');


            // Return Promise that resolves when ad loads
            return new Promise((resolve, reject) => {
                try {
                    const cleanup = GoogleAdMob.loadAppsInTossAdMob({
                        options: { adGroupId },
                        onEvent: (event) => {
                            //alert(`LOAD-EVENT: ${event.type}`);
                            if (event.type === 'loaded') {
                                const adId = event.data?.adId || adGroupId; // Use adId from event or fallback
                                alert(`LOAD-DEBUG 4: 광고 로드 성공! adId=${adId}`);
                                resolve({ adId, cleanup });
                            }
                        },
                        onError: (error) => {
                            //alert(`LOAD-DEBUG ERR: ${error.message}`);
                            console.error('❌ Ad Load Error:', error);
                            reject(error);
                        }
                    });
                } catch (e) {
                    //alert(`LOAD-DEBUG CATCH-ERR: ${e.message}`);
                    reject(e);
                }
            });
        } else {
            //alert('LOAD-DEBUG 3: Framework isSupported = false');
        }
    } catch (e) {
        console.warn('⚠️ Framework Ad check failed:', e);
    }

    // 2. Fallback to Window (Mock or Legacy)
    if (window.Bedrock && window.Bedrock.loadAppsInTossAdMob) {
        return new Promise((resolve) => {
            window.Bedrock.loadAppsInTossAdMob({
                options: { adGroupId },
                onEvent: (event) => {
                    if (event.type === 'loaded') {
                        resolve({ adId: adGroupId });
                    }
                }
            });
        });
    }

    console.warn('⚠️ Bedrock.loadAppsInTossAdMob not available');
    return { adId: 'mock_fallback_id' };
}

export async function showAppsInTossAdMob(params) {

    // 1. Try Framework
    try {
        if (GoogleAdMob.showAppsInTossAdMob.isSupported()) {
            //alert('SHOW-DEBUG 2: Framework isSupported = true');
            const adId = params?.adId;

            return new Promise((resolve, reject) => {
                //alert('SHOW-DEBUG 3: GoogleAdMob.showAppsInTossAdMob 호출');
                GoogleAdMob.showAppsInTossAdMob({
                    options: { adGroupId: adId },
                    onEvent: (event) => {
                        //alert(`SHOW-EVENT: ${event.type}`);
                        if (event.type === 'dismissed') {
                            //alert('SHOW-DEBUG 4: 광고 닫힘');
                            resolve({ result: 'dismissed' });
                        } else if (event.type === 'failedToShow') {
                            resolve({ result: 'failed' });
                        }
                    },
                    onError: (error) => {
                        //alert(`SHOW-ERR: ${error.message}`);
                        reject(error);
                    }
                });
            });
        } else {
            //alert('SHOW-DEBUG 2: Framework isSupported = false');
        }
    } catch (e) {
        console.warn('⚠️ Framework show check failed:', e);
        throw e; // Re-throw to propagate error
    }

    // 2. Fallback to Window
    if (window.Bedrock && window.Bedrock.showAppsInTossAdMob) {
        return window.Bedrock.showAppsInTossAdMob(params);
    }

    console.warn('⚠️ Bedrock.showAppsInTossAdMob not available');
    return { result: 'success' };
}

export async function appLogin() {
    // 1. Try Framework (only if available)
    try {
        // Check if framework is actually loaded
        if (typeof frameworkAppLogin === 'function') {
            const result = await frameworkAppLogin();
            return result;
        }
    } catch (e) {
        console.warn('⚠️ Framework Login check failed:', e);
    }

    // 2. Mock (for local development & sandbox)
    return {
        authorizationCode: 'mock_auth_code_' + Date.now(),
        referrer: 'local_dev'
    };
}

export async function fetchAlbumPhotos(options) {
    // 1. Try Framework
    try {
        if (typeof frameworkFetchAlbumPhotos === 'function') {

            return frameworkFetchAlbumPhotos(options);
        }
    } catch (e) {
        console.warn('⚠️ Framework Album check failed:', e);
    }

    // 2. Fallback
    if (window.Bedrock && window.Bedrock.fetchAlbumPhotos) {
        return window.Bedrock.fetchAlbumPhotos(options);
    }

    throw new Error('FetchAlbumPhotosPermissionError'); // Simulate native error to trigger fallback in logic
}

export function generateHapticFeedback(params) {
    try {
        if (typeof frameworkHaptic === 'function') {
            return frameworkHaptic(params);
        }
    } catch (e) {
        console.warn('⚠️ Framework Haptic failed:', e);
    }
    if (window.Bedrock && window.Bedrock.generateHapticFeedback) {
        return window.Bedrock.generateHapticFeedback(params);
    }
}

// Assign to window for legacy/iframe support (like type3.html)
if (typeof window !== 'undefined') {
    window.Bedrock = window.Bedrock || {};
    window.Bedrock.generateHapticFeedback = generateHapticFeedback;
    window.Bedrock.appLogin = appLogin; // Ensure other methods are also available
    window.Bedrock.fetchAlbumPhotos = fetchAlbumPhotos;
}

function setupMockBedrock() {
    if (window.Bedrock) return;

    window.Bedrock = {
        init: () => Promise.resolve(),
        appLogin: () => {

            return Promise.resolve({
                authorizationCode: 'mock_auth_code_' + Date.now(),
                referrer: 'sandbox'
            });
        },
        fetchAlbumPhotos: (options) => {

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

            }
        },
        /**
         * Mock: loadAppsInTossAdMob
         * Loads an ad and returns an adId.
         */
        loadAppsInTossAdMob: (params) => {

            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        adId: `mock_ad_${Date.now()} `,
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

            return new Promise((resolve) => {
                // In real usage, params would be checked against loaded ads.

                // Remove confirm dialog for seamless UX in mock
                // const msg = '광고가 재생됩니다. (Mock)\n끝까지 시청하시겠습니까?';


                resolve({ result: 'success' });
            });
        }
    };
    window.NavigationBar = {


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
