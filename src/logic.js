// Core Application Logic
import { saveRecord, getTotalSavings, getSuccessCount, getWeeklyStats, injectMockData, getMonthlyStats, getTodaySuccessCount, resetUserData } from './firebase.js';

export const quotes = [
    "오늘 먹을 치킨을 내일로 미루면,<br>통장 잔고가 웃는다.",
    "당신의 위장은 사실<br>아무 말도 하지 않았습니다.",
    "지금 그 배고픔,<br>물 한 잔이면 사라질 거짓말.",
    "당신의 뱃살은 이미<br>충분히 권위 있습니다.",
    "야식은 내일 아침<br>얼굴 붓기로 보답합니다.",
    "배달비 모았으면,<br>이미 에어팟 샀다.",
    "최소주문금액 맞추다,<br>최대몸무게 맞춘다.",
    "클릭 한 번에 3만 원 순삭!<br>마술이 따로 없네.",
    "치킨은 죄가 없어요.<br>주문한 손가락이 유죄.",
    "지금 그 식욕,<br>수분 부족이 보낸<br>스팸 메시지입니다.",
    "뇌: '당 땡겨',<br>위장: '난 꽉 찼는데?'<br>합의 좀 하시죠.",
    "냉장고 속 계란이랑 두부가<br>서운해하고 있어.",
    "일회용 수저 안 받기 체크하면 뭐해,<br>플라스틱 용기가 산더미인데.",
    "배달앱 VIP 등급,<br>이력서엔 못 씁니다.",
    "또 속냐,<br>그 가짜 배고픔에.",
    "지금 느끼는 행복 30분,<br>내일 아침 후회 24시간.",
    "니가 잠든 사이에...<br>위장은 밤새도록 야근 중.",
    "역류성 식도염이 현관문 두드리고 있습니다.<br>열어주시겠습니까?",
    "야식은 간이 쉴 시간을 뺏는<br>노동착취입니다.",
    "치킨 값 3만 원 시대,<br>이 돈이면 주식 1주를 산다.",
    "떠나간 배달비는 돌아오지 않습니다.<br>마치 당신의 월급처럼.<br>(- 텅장 씀)",
    "행복은 배달 오는 것이 아니라,<br>통장에 머무는 것입니다.<br>(- 자본주의)",
    "사람은 배신해도,<br>뱃살은 주인을 배신하지 않더군요.<br>(- 체지방)",
    "밤은 깊어가고,<br>당신의 붓기는 내일 아침 떠오르겠죠.<br>(- 야식)",
    "위장은 비울수록 아름답고,<br>통장은 채울수록 빛납니다.<br>(- 무소유? 아니 풀소유)",
    "식욕은 순간이지만,<br>카드 할부는 영원합니다.",
    "인류는 걷지 않기 위해 배달앱을 만들었습니다.<br>그리고 당신은 지금 그 정점에 서 있습니다.",
    "당신의 주말은 48시간인데,<br>잠옷은 48시간째 주말을 기념하고 있습니다.",
    "주말에 당신의 칼로리는,<br>휴대폰 화면 스크롤과 리모컨 버튼 누르는 데 전부 썼습니다.",
    "혼자 먹는데<br>2~3인분은 왜 기본값일까.",
    "스트레스 해소용이었는데<br>스트레스가 더 늘어났어요.",
    "이 정도면 괜찮다는 말,<br>오늘만 세 번째입니다.",
    "카드 명세서는<br>나보다 나를 잘 안다.",
    "최소 주문 금액을 채우기 위해<br>필요 없는 것을 추가하는 당신의 모습,<br>마케팅 교과서에 실려야 합니다."
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
    rollerInterval: null
};

export const appLogic = {
    init: async () => {
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
        // Bind Reset Data Button (in Help Modal)
        const btnReset = document.getElementById('btn-reset-data');
        if (btnReset) {
            btnReset.addEventListener('click', async () => {
                if (confirm("정말 모든 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) {
                    await resetUserData();
                    // Reset local display
                    appState.totalSavings = 0;
                    document.getElementById('total-savings-display').innerText = "0";
                    appLogic.showCustomAlert("데이터가 초기화되었습니다.");
                    // Close help modal
                    document.getElementById('help-modal')?.classList.add('hidden');
                }
            });
        }
    },

    checkDailyLimit: () => {
        const today = new Date().toISOString().split('T')[0];
        const key = `daily_success_${today}`;
        const count = parseInt(localStorage.getItem(key) || '0');

        if (count >= 5) {
            appLogic.showCustomAlert("오늘의 인내심은 여기까지!\n하루 5번만 도전 가능해요.\n과유불급! 내일 다시 만나요 👋");
            return false;
        }
        return true;
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

            if (appState.timer === 179) updateStatus("괜찮아. 아직 배달앱 안켰어."); // Just after start
            if (appState.timer === 120) updateStatus("진짜 배고픈 거 맞아?");
            if (appState.timer === 60) updateStatus("집에 있는 것 부터 떠올려봐.");
            if (appState.timer === 30) updateStatus("배달 시켜먹고 후회한 적 있지?");

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
        appState.screen = 'result';

        // Temporarily update totalSavings for display only (not saved to DB yet)
        appState.totalSavings += appState.sessionSavings;

        const main = document.getElementById('main-screen');
        const result = document.getElementById('result-screen');

        if (main) {
            main.style.opacity = '0';
            main.classList.add('hidden'); // Immediate hide after transition logic needed but for simplicity
        }

        setTimeout(() => {
            if (result) result.classList.remove('hidden');
            document.getElementById('total-savings-display').innerText = appState.totalSavings.toLocaleString();

            // Update Success Count - Get current count and display +1 temporarily
            getSuccessCount().then(count => {
                const el = document.getElementById('success-count-display');
                if (el) el.innerText = count + 1; // +1 for current session (not saved yet)
            });

            // Update Today's Count Display
            getTodaySuccessCount().then(count => {
                const el = document.getElementById('today-count-display');
                if (el) {
                    // Display current + 1 (this session)
                    // If count is 4, it becomes 5/5
                    const current = count + 1;
                    el.innerHTML = `오늘 참은 횟수 : <span class="text-yellow-300 font-extrabold text-lg">${current}</span>/5회`;
                }
            });

            // Update Chart with Real Data + current session
            getWeeklyStats().then(stats => {
                // Add current session to this week's total for display
                const updatedStats = [...stats];
                updatedStats[3] = (stats[3] || 0) + appState.sessionSavings;

                appLogic.renderChart(updatedStats);

                // Update "This week's saved money" display with current session included
                const resultMoneyEl = document.getElementById('result-money');
                if (resultMoneyEl) {
                    resultMoneyEl.innerText = updatedStats[3].toLocaleString();
                }
            });

            // Trigger Visual Effect
            import('./effects.js').then(module => {
                module.triggerSuccessEffect();
            });
        }, 500);
    },

    openTool: (toolName) => {
        appState.activeTool = toolName;
        const modal = document.getElementById(`${toolName}-modal`);
        if (modal) modal.classList.remove('hidden');

        if (toolName === 'game') {
            const chillFrame = document.getElementById('chill-frame');
            if (chillFrame) {
                const randomType = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
                chillFrame.setAttribute('scrolling', 'auto'); // Ensure scrolling is enabled if needed
                chillFrame.src = `chill/type${randomType}.html`;
            }
        } else if (toolName === 'breathe') {
            appLogic.startBreathingGuide();
        } else if (toolName === 'labor') {
            appLogic.calculateLabor();
        }
    },

    closeTool: (toolName) => {
        appState.activeTool = null;
        const modal = document.getElementById(`${toolName}-modal`);
        if (modal) modal.classList.add('hidden');
        if (toolName === 'game') {
            const chillFrame = document.getElementById('chill-frame');
            if (chillFrame) {
                chillFrame.src = ''; // Stop content/sound
            }
        }

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
            { name: "뜨아(커피)", price: 4500, unit: "잔" },
            { name: "에어팟 프로", price: 359000, unit: "개" },
            { name: "마라탕", price: 12000, unit: "그릇" },
            { name: "영화 티켓", price: 15000, unit: "장" },
            { name: "편의점 도시락", price: 5500, unit: "개" },
            { name: "넷플릭스 (1달)", price: 17000, unit: "달" }
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
                rollerContent.innerHTML = `이 돈이면 <span class="text-[#5B4DFF] font-black text-lg">${item.name}</span><br><span class="text-black font-black text-xl">${count}</span>${item.unit} 가능! 😲`;

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

    showCustomConfirm: (message, onConfirm) => {
        const modal = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-message');
        const btnOk = document.getElementById('btn-ok-confirm');

        if (modal && msgEl && btnOk) {
            msgEl.innerText = message;

            // Clean up old listener to avoid duplicates (naive approach)
            // Ideally should use a named function or once:true if simple
            // But here we might overwrite onclick for simplicity in this constraint
            btnOk.onclick = () => {
                onConfirm();
                modal.classList.add('hidden');
            };

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
        // Check if running in Toss Bedrock Environment
        if (window.Bedrock) {
            try {
                const photos = await window.Bedrock.fetchAlbumPhotos({
                    maxCount: 1,
                    base64: true
                });

                if (photos && photos.length > 0) {
                    const photo = photos[0];
                    console.log('📸 Photo data:', photo);
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
                // Fallback to standard input on error? Or just alert?
                // For now, let's alert if specific permission error, otherwise fallback
                if (error.name === 'FetchAlbumPhotosPermissionError') {
                    alert("앨범 접근 권한이 필요합니다.");
                } else {
                    // Fallback to standard generic file input
                    document.getElementById('image-upload').click();
                }
            }
        } else {
            // Fallback for non-Toss environment (Local Dev)
            document.getElementById('image-upload').click();
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
