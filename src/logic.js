// Core Application Logic
import { saveRecord, getTotalSavings, getSuccessCount, getWeeklyStats, injectMockData, getMonthlyStats, getTodaySuccessCount } from './firebase.js';

export const quotes = [
    "오늘 먹을 치킨을 내일로 미루면,<br>통장 잔고가 웃어요.",
    "위장은 사실<br>아무 말도 안 했어요.",
    "지금 그 배고픔,<br>물 한 잔이면 사라지는 거짓말.",
    "뱃살은 이미<br>충분히 권위가 넘쳐요.",
    "야식은 내일 아침<br>얼굴 붓기로 보답해요.",
    "배달비 모았으면,<br>이미 에어팟 샀을걸요?",
    "최소주문금액 맞추다,<br>최대 몸무게 찍을지도 몰라요.",
    "클릭 한 번에 3만 원 순삭!<br>마술이 따로 없어요.",
    "치킨은 죄가 없어요.<br>주문 버튼이 문제예요.",
    "지금 그 식욕,<br>수분 부족이 보낸<br>스팸 메시지예요.",
    "뇌: '당 땡겨',<br>위장: '난 꽉 찼는데?'<br>합의가 필요해요.",
    "냉장고 속 계란이랑 두부가<br>서운해하고 있어요.",
    "일회용 수저 안 받기 체크하면 뭐해요,<br>플라스틱 용기가 산더미인걸요.",
    "배달앱 VIP 등급,<br>이력서엔 못 써요.",
    "또 속고 있나요?<br>그 가짜 배고픔에.",
    "지금 느끼는 행복 30분,<br>내일 아침 후회 24시간.",
    "당신이 잠든 사이에...<br>위장은 밤새 야근 중이에요.",
    "역류성 식도염이 문을 두드리고 있어요.<br>열어줄 건가요?",
    "야식은 간이 쉴 시간을 뺏는<br>노동 착취예요.",
    "치킨 값 3만 원 시대,<br>이 돈이면 주식 1주를 살 수 있어요.",
    "떠나간 배달비는 돌아오지 않아요.<br>내 월급처럼요.<br>(- 텅장 씀)",
    "행복은 배달 오는 게 아니라,<br>통장에 머무는 거예요.<br>(- 자본주의)",
    "사람은 배신해도,<br>뱃살은 절대 배신하지 않아요.<br>(- 체지방)",
    "밤은 깊어가고,<br>내일 아침 얼굴은 둥실 떠오르겠죠.<br>(- 야식)",
    "위장은 비울수록 아름답고,<br>통장은 채울수록 빛나요.<br>(- 무소유? 아니 풀소유)",
    "식욕은 순간이지만,<br>카드 할부는 영원해요.",
    "사람은 걷지 않으려고 배달앱을 만들었죠.<br>혹시 지금 그 정점에 서 있나요?",
    "주말은 48시간인데,<br>잠옷은 48시간째 그대로네요.",
    "주말 칼로리, 혹시 스크롤 내리는 데<br>다 썼나요?",
    "혼자 먹는데<br>2~3인분은 왜 기본값일까요.",
    "스트레스 해소용이었는데<br>스트레스가 더 늘어났어요.",
    "이 정도면 괜찮다는 말,<br>오늘만 세 번째예요.",
    "카드 명세서는<br>나보다 나를 더 잘 알아요."
];

export const appState = {
    screen: 'intro',
    timer: 180, // 3 minutes
    timerInterval: null,
    totalSavings: 0,
    sessionSavings: 25000,
    activeTool: null,
    breathInterval: null,
    breathTimeout1: null,
    breathTimeout2: null,
    rollerInterval: null,
    activeGameModule: null // Track active game module for cleanup
};

export const appLogic = {
    init: async () => {
        // Fix for Mobile Keyboard: Hide Tool Panel when Input is Focused
        const savingsInputRef = document.getElementById('savings-input');
        const mainCard = document.querySelector('#main-screen .main-card');

        if (savingsInputRef && mainCard) {
            savingsInputRef.addEventListener('focus', () => {
                // Hide the tool panel to give space for the keyboard
                mainCard.classList.add('hidden');
                // Scroll to top/center to ensure input is visible if needed
                setTimeout(() => {
                    savingsInputRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            });

            savingsInputRef.addEventListener('blur', () => {
                // Restore the tool panel
                mainCard.classList.remove('hidden');
            });
        }

        try {
            // Use getMonthlyStats for "This Month's Savings" header
            appState.totalSavings = await getMonthlyStats();
        } catch (e) {
            console.error(e);
        }
        document.getElementById('total-savings-display').innerText = appState.totalSavings.toLocaleString();

        // Alert Modal Binding
        const btnCloseAlert = document.getElementById('btn-close-alert');
        if (btnCloseAlert) {
            btnCloseAlert.addEventListener('click', () => {
                document.getElementById('alert-modal')?.classList.add('hidden');
            });
        }

        // Confirm Modal Binding
        const btnCancelConfirm = document.getElementById('btn-cancel-confirm');
        if (btnCancelConfirm) {
            btnCancelConfirm.addEventListener('click', () => {
                document.getElementById('confirm-modal')?.classList.add('hidden');
            });
        }

        // Helper to format number with commas
        const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const parseNumber = (str) => parseInt(str.replace(/,/g, '')) || 0;

        // Helper to block invalid number characters (allow only numbers)
        const blockInvalidChars = (e) => {
            // Allow: backspace, delete, tab, escape, enter, arrows
            if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
                // Allow: Ctrl+A, Command+A
                (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
                // Allow: home, end, left, right, down, up
                (e.keyCode >= 35 && e.keyCode <= 40)) {
                return;
            }
            // Ensure that it is a number and stop the keypress
            if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                e.preventDefault();
            }
        };

        // Initialize Session Savings from Input
        const savingsInput = document.getElementById('savings-input');
        if (savingsInput) {
            // Initial Parse
            appState.sessionSavings = parseNumber(savingsInput.value) || 25000;

            savingsInput.addEventListener('keydown', blockInvalidChars);

            // Bind Input Change with Formatting
            savingsInput.addEventListener('input', (e) => {
                let rawVal = parseNumber(e.target.value);

                if (rawVal > 1000000) {
                    appLogic.showCustomAlert("한 번에 100만원 이상\n배달음식을 주문하려는 당신!\n부럽습니다...\n\n(최대 100만 원까지만 입력 가능해요)");
                    rawVal = 1000000;
                }

                if (rawVal > 0) {
                    appState.sessionSavings = rawVal;
                    e.target.value = formatNumber(rawVal);
                } else {
                    e.target.value = ''; // Clear if invalid
                }
            });
        }

        // Initialize Hourly Wage Input
        const wageInput = document.getElementById('hourly-wage');
        if (wageInput) {
            wageInput.addEventListener('keydown', blockInvalidChars);

            wageInput.addEventListener('input', (e) => {
                let rawVal = parseNumber(e.target.value);

                if (rawVal > 1000000) {
                    appLogic.showCustomAlert("시급이 100만원이 넘으신다니...\n여기 계실 분이 아니군요!\n\n(최대 100만 원까지만 입력 가능해요)");
                    rawVal = 1000000;
                }

                if (rawVal > 0) {
                    e.target.value = formatNumber(rawVal);
                } else {
                    e.target.value = '';
                }

                // Auto Calculate
                appLogic.calculateLabor();
            });
        }

        // Random Quote - Set text immediately to prevent layout shift
        const quoteText = document.getElementById('quote-text');
        if (quoteText) {
            // Set innerHTML immediately to allocate space
            quoteText.innerHTML = quotes[Math.floor(Math.random() * quotes.length)];
            // Then fade in
            setTimeout(() => {
                quoteText.classList.add('fade-enter-active');
                quoteText.classList.remove('opacity-0');
            }, 500);
        }

        // Intro Animations
        setTimeout(() => {
            const startBtn = document.getElementById('start-btn');
            if (startBtn) {
                startBtn.classList.remove('opacity-0');
            }
        }, 1500);

    },

    checkDailyLimit: async () => {
        const { getTodaySuccessCount } = await import('./firebase.js');
        const { showInterstitialAd, showRewardedAd } = await import('./bedrock.js');

        const count = await getTodaySuccessCount();


        if (count >= 5) {
            // Ask user if they want to watch rewarded ad
            return new Promise((resolve) => {
                appLogic.showCustomConfirm("기본 하루 5번까지만 도전 가능해요.\n광고를 보고 한 번 더 기록할까요?", async () => {
                    // User confirmed - show rewarded ad
                    try {

                        const result = await showRewardedAd();
                        // Only allow save if user earned reward
                        resolve(result.rewarded);
                    } catch (e) {
                        console.error('Rewarded Ad Error:', e);
                        resolve(false);
                    }
                }, () => {
                    // User cancelled
                    resolve(false);
                });
            });
        } else {
            // Under limit: Show Interstitial Ad
            try {

                await showInterstitialAd();
            } catch (e) {
                console.error('Ad Error:', e);
            }
            return true;
        }
    },

    incrementDailySuccess: () => {
        const today = new Date().toISOString().split('T')[0];
        const key = `daily_success_${today}`;
        const count = parseInt(localStorage.getItem(key) || '0');
        localStorage.setItem(key, (count + 1).toString());
    },

    startMainTimer: () => {
        // Daily Limit Check - Removed to allow play, ad enforcement moved to save
        // if (!appLogic.checkDailyLimit()) return;

        const intro = document.getElementById('intro-screen');
        const main = document.getElementById('main-screen');

        // Start timer display
        const timerDisplay = document.getElementById('timer-display');

        // Fade out intro with delay for ripple effect
        setTimeout(() => {
            if (intro) {
                intro.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
                intro.style.opacity = '0';
                intro.style.transform = 'scale(0.95)';
            }
        }, 400);

        setTimeout(() => {
            if (intro) intro.classList.add('hidden');
            if (main) {
                main.classList.remove('hidden');
                main.style.opacity = '0';
                main.style.transform = 'scale(1.05)';

                // Animate in
                setTimeout(() => {
                    main.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
                    main.style.opacity = '1';
                    main.style.transform = 'scale(1)';
                }, 50);
            }
        }, 1200);

        appState.screen = 'main';

        appState.timerInterval = setInterval(() => {
            appState.timer--;

            const m = Math.floor(appState.timer / 60).toString().padStart(2, '0');
            const s = (appState.timer % 60).toString().padStart(2, '0');
            if (timerDisplay) timerDisplay.innerText = `${m}:${s}`;

            // --- Dynamic Status Messages with Rolling Effect ---
            const statusMsg = document.getElementById('status-message');
            const updateStatus = (text) => {
                if (!statusMsg) return;
                statusMsg.classList.remove('animate-slideInRight'); // Reset
                statusMsg.classList.add('animate-slideOutLeft');

                setTimeout(() => {
                    statusMsg.innerText = text;
                    statusMsg.classList.remove('animate-slideOutLeft');
                    statusMsg.classList.add('animate-slideInRight');
                }, 400); // 0.4s sync with slideOut
            };

            if (appState.timer === 179) updateStatus("괜찮아요. 아직 배달앱 안켰어요."); // Just after start
            if (appState.timer === 120) updateStatus("진짜 배고픈 거 맞아요?");
            if (appState.timer === 60) updateStatus("집에 있는 것 부터 떠올려봐요.");
            if (appState.timer === 30) updateStatus("배달 시켜먹고 후회한 적 있죠?");

            // Character State Changes
            const sweatDrop = document.getElementById('sweat-drop');
            const paleEffect = document.getElementById('pale-effect');
            const charBody = document.getElementById('main-blob-body');

            if (sweatDrop && paleEffect && charBody) {
                if (appState.timer <= 120) {
                    // Stage 1: Sweat (Starts at 2 min remaining)
                    sweatDrop.style.opacity = '1';
                }

                if (appState.timer <= 60) {
                    // Stage 2: Pale (Starts at 1 min remaining)
                    paleEffect.style.opacity = '0.8';
                }
            }

            if (appState.timer <= 0) {
                appLogic.finishTimer();
            }
        }, 1000);
    },

    finishTimer: async () => {
        clearInterval(appState.timerInterval);

        // --- 1. JUST Show Result Screen (No Auto-Save, No Auto-Ad) ---
        // Ad and Save will be handled by the 'Record' button in main.js

        // --- 2. Update UI (Result Screen) ---
        appState.screen = 'result';

        // NOTE: We do NOT add sessionSavings to totalSavings yet.
        // It's only added after the user successfully records it.

        const main = document.getElementById('main-screen');
        const result = document.getElementById('result-screen');

        if (main) {
            main.style.opacity = '0';
            main.classList.add('hidden');
        }

        setTimeout(() => {
            if (result) result.classList.remove('hidden');

            // Show current total (without new session yet)
            document.getElementById('total-savings-display').innerText = appState.totalSavings.toLocaleString();

            // Using dynamic import instead of require logic
            import('./firebase.js').then(({ getSuccessCount, getTodaySuccessCount, getWeeklyStats }) => {
                // Success Count
                getSuccessCount().then(count => {
                    const el = document.getElementById('success-count-display');
                    if (el) el.innerText = count;
                });

                // Today's Count
                getTodaySuccessCount().then(c => {
                    const el = document.getElementById('today-count-display');
                    if (el) el.innerHTML = `오늘 참은 횟수 : <span class="text-yellow-300 font-extrabold text-lg">${c}</span>/5회`;
                });

                // Chart
                getWeeklyStats().then(stats => {
                    appLogic.renderChart(stats);
                    const resultMoneyEl = document.getElementById('result-money');
                    if (resultMoneyEl) {
                        // Show current week's total (excluding current session)
                        resultMoneyEl.innerText = stats[3].toLocaleString();
                    }
                });
            });

            // Effect (Success Confetti)
            import('./effects.js').then(module => {
                module.triggerSuccessEffect();
            });

        }, 500);
    },

    openTool: async (toolName) => {
        appState.activeTool = toolName;
        const modal = document.getElementById(toolName === 'game' ? 'game-modal' : `${toolName}-modal`);

        // Ensure modal exists
        if (modal) modal.classList.remove('hidden');

        if (toolName === 'game') {
            const container = document.getElementById('chill-container');
            if (container) {
                // Determine Random Game Type (1-5)
                const randomType = Math.floor(Math.random() * 5) + 1;


                try {
                    // Dynamic Import
                    const module = await import(`./chill/type${randomType}.js`);

                    // Mount Game
                    if (module && module.mount) {
                        module.mount(container);
                        appState.activeGameModule = module;
                    }
                } catch (e) {
                    console.error("Failed to load game module:", e);
                    container.innerHTML = `<div class="text-white p-4 text-center">게임 로딩 실패<br>${e.message}</div>`;
                }
            }
        } else if (toolName === 'breathe') {
            appLogic.startBreathingGuide();
        } else if (toolName === 'labor') {
            appLogic.calculateLabor();
        }
    },

    closeTool: (toolName) => {
        appState.activeTool = null;

        // Handle Game Cleanup specifically
        if (toolName === 'game') {
            const modal = document.getElementById('game-modal');
            if (modal) modal.classList.add('hidden');

            // Unmount Module
            if (appState.activeGameModule && appState.activeGameModule.unmount) {
                appState.activeGameModule.unmount();
                appState.activeGameModule = null;
            }

            // Clear Container
            const container = document.getElementById('chill-container');
            if (container) container.innerHTML = '';

            return;
        }

        // Generic Modal Close
        const modal = document.getElementById(`${toolName}-modal`);
        if (modal) modal.classList.add('hidden');

        if (toolName === 'breathe') appLogic.stopBreathingGuide();
        if (appState.rollerInterval) {
            clearInterval(appState.rollerInterval);
            appState.rollerInterval = null;
        }
    },

    // --- Tool Specific Logics ---

    calculateLabor: () => {
        const wageStr = document.getElementById('hourly-wage').value;
        const wage = parseInt(wageStr.replace(/,/g, '')) || 0;
        const price = appState.sessionSavings; // Use dynamic session savings

        if (wage > 0 && price > 0) {
            const hours = Math.floor(price / wage);
            const minutes = Math.floor((price % wage) / (wage / 60));

            document.getElementById('labor-hours').innerText = hours;
            document.getElementById('labor-minutes').innerText = minutes;

            // Start Comparison Roller
            appLogic.startExpenseRoller(price);
        } else {
            appLogic.showCustomAlert("시급과 절약 금액을 올바르게 입력해주세요.");
        }
    },

    startExpenseRoller: (amount) => {
        const rollerBox = document.getElementById('expense-roller');
        const rollerContent = document.getElementById('roller-content');
        if (!rollerBox || !rollerContent) return;

        rollerBox.classList.remove('hidden');

        // Alternatives Data
        // Prices are approximate (KRW)
        const items = [
            { name: "에어팟 프로", price: 359000, unit: "개 살" },
            { name: "영화 티켓", price: 15000, unit: "장 살" },
            { name: "삼각김밥", price: 1200, unit: "개 살" },
            { name: "컵라면", price: 1100, unit: "개 살" },
            { name: "넷플릭스", price: 17000, unit: "개월 구독할" }
        ];

        let index = 0;

        // Clear existing interval if any (store in appState?)
        if (appState.rollerInterval) clearInterval(appState.rollerInterval);

        const updateRoller = () => {
            const item = items[index];
            const count = (amount / item.price).toFixed(2); // 2 decimal places

            // Animation: Slide Out Up
            rollerContent.style.transform = 'translateY(-100%)';
            rollerContent.style.opacity = '0';

            setTimeout(() => {
                // Change Text
                rollerContent.innerHTML = `이 돈이면 <span class="text-[#5B4DFF] font-black text-lg">${item.name}</span><br><span class="text-black font-black text-xl">${count}</span>${item.unit} 수 있어요!`;

                // Animation: Slide In from Bottom
                rollerContent.style.transition = 'none'; // Instant reset
                rollerContent.style.transform = 'translateY(100%)';

                setTimeout(() => {
                    rollerContent.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s ease-out';
                    rollerContent.style.transform = 'translateY(0)';
                    rollerContent.style.opacity = '1';
                }, 50); // Small ticking for transition re-enable
            }, 500); // Wait for slide out

            index = (index + 1) % items.length;
        };

        updateRoller(); // First run
        appState.rollerInterval = setInterval(updateRoller, 3000); // Every 3 sec
    },

    showCustomAlert: (message) => {
        const modal = document.getElementById('alert-modal');
        const msgEl = document.getElementById('alert-message');
        if (modal && msgEl) {
            msgEl.innerText = message;
            modal.classList.remove('hidden');
        }
    },

    showCustomConfirm: (message, onConfirm, onCancel) => {
        const modal = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-message');
        const btnOk = document.getElementById('btn-ok-confirm');
        const btnCancel = document.getElementById('btn-cancel-confirm');

        if (modal && msgEl && btnOk) {
            msgEl.innerText = message;

            btnOk.onclick = () => {
                onConfirm();
                modal.classList.add('hidden');
            };

            if (btnCancel) {
                btnCancel.onclick = () => {
                    if (onCancel) onCancel();
                    modal.classList.add('hidden');
                };
            }

            modal.classList.remove('hidden');
        }
    },

    startBreathingGuide: () => {
        const textEl = document.getElementById('breath-text');
        if (!textEl) return;

        // Clear any existing timers
        appLogic.stopBreathingGuide();

        const cycle = () => {
            const modal = document.getElementById('breathe-modal');
            if (!modal || modal.classList.contains('hidden')) return;

            // Inhale (4 seconds)
            textEl.innerText = "들이마시기 (4초)";

            appState.breathTimeout1 = setTimeout(() => {
                if (!modal || modal.classList.contains('hidden')) return;
                // Hold (7 seconds)
                textEl.innerText = "멈춤 (7초)";

                appState.breathTimeout2 = setTimeout(() => {
                    if (!modal || modal.classList.contains('hidden')) return;
                    // Exhale (8 seconds)
                    textEl.innerText = "내뱉기 (8초)";
                }, 7000);
            }, 4000);
        };

        // Start immediately to sync with animation
        cycle();
        appState.breathInterval = setInterval(cycle, 19000);
    },

    stopBreathingGuide: () => {
        if (appState.breathInterval) clearInterval(appState.breathInterval);
        if (appState.breathTimeout1) clearTimeout(appState.breathTimeout1);
        if (appState.breathTimeout2) clearTimeout(appState.breathTimeout2);
        appState.breathInterval = null;
        appState.breathTimeout1 = null;
        appState.breathTimeout2 = null;
    },

    toggleBlueFilter: (isStrong) => {
        const img = document.getElementById('food-preview');
        if (!img) return;

        img.classList.remove('appetite-killer', 'appetite-killer-weak');
        if (isStrong) {
            img.classList.add('appetite-killer');
        } else {
            img.classList.add('appetite-killer-weak');
        }
    },

    handleImageUpload: (input) => {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const preview = document.getElementById('food-preview');
                if (preview) preview.src = e.target.result;
            };
            reader.readAsDataURL(input.files[0]);
        }
    },

    triggerAlbum: async () => {
        // Dynamically import to ensure module scope availability if called late
        const { fetchAlbumPhotos } = await import('./bedrock.js');

        try {
            const photos = await fetchAlbumPhotos({
                maxCount: 1,
                base64: true
            });

            if (photos && photos.length > 0) {
                const photo = photos[0];

                let imageUri;

                // Check if legitimate URL (Mock) or Base64 (Real SDK)
                if (photo.dataUri.startsWith('http') || photo.dataUri.startsWith('data:')) {
                    imageUri = photo.dataUri;
                } else {
                    // Assume raw base64 string if no prefix
                    imageUri = 'data:image/jpeg;base64,' + photo.dataUri;
                }

                const preview = document.getElementById('food-preview');
                if (preview) preview.src = imageUri;
            }
        } catch (error) {
            console.error("Bedrock Album Error:", error);

            // Check for specific permission error string or name
            if (error?.name === 'FetchAlbumPhotosPermissionError' || error?.toString().includes('Permission')) {
                appLogic.showCustomAlert("앨범 접근 권한이 필요합니다.");
            } else {
                // Fallback to standard generic file input for non-Toss environment or general error
                console.warn('Falling back to file input due to error.');
                document.getElementById('image-upload').click();
            }
        }
    },

    renderChart: (data) => {
        const ctx = document.getElementById('savingsChart')?.getContext('2d');
        if (!ctx) return;

        // Default data if not provided (or empty)
        const chartData = data || [0, 0, 0, 0];

        // Destroy existing chart if any (to avoid overlay)
        if (window.mySavingsChart) window.mySavingsChart.destroy();

        window.mySavingsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['3주전', '2주전', '1주전', '이번주'],
                datasets: [{
                    label: '절약 금액',
                    data: chartData,
                    backgroundColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#34d399'], // Past: Slate-300, Current: Emerald-400
                    borderRadius: 8,
                    barThickness: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, ticks: { color: '#64748b' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    }
};
