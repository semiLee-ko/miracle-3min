
// Chill Mode Type 2: Bubble Wrap
let cleanup = null;

export function mount(container) {
    const styleId = 'chill-type2-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            #chill-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 50;
                background-color: #f0f2f5;
                font-family: 'Noto Sans KR', sans-serif;
                overflow: hidden;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding-top: calc(20px + env(safe-area-inset-top));
                padding-bottom: calc(20px + env(safe-area-inset-bottom));
            }

            .bubble-container {
                display: grid;
                gap: 8px;
                padding: 10px;
                background: #fff;
                border-radius: 15px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                /* width and height will be dynamic or max based on screen */
                max-width: 95%;
                max-height: 95%;
                overflow: hidden; /* Prevent scroll if calc is perfect, or auto if not */
                touch-action: manipulation;
                box-sizing: border-box;
                flex-shrink: 0;
                /* Center content */
                justify-content: center;
                align-content: center;
            }

            .bubble {
                width: 55px;
                height: 55px;
                border-radius: 50%;
                background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9), rgba(200, 230, 255, 0.4));
                box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.8), 3px 3px 6px rgba(0, 0, 0, 0.1), inset -2px -2px 5px rgba(0, 0, 0, 0.05);
                border: 1px solid rgba(200, 230, 255, 0.8);
                position: relative;
                cursor: pointer;
                transition: transform 0.1s;
                display: flex;
                align-items: center;
                justify-content: center;
                -webkit-tap-highlight-color: transparent;
            }

            .bubble.popped {
                background: rgba(230, 230, 230, 0.3);
                box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.1);
                transform: scale(0.9);
                border: 1px solid rgba(200, 200, 200, 0.3);
            }

            .pop-text {
                position: absolute;
                font-size: 0.75rem;
                font-weight: bold;
                color: #ff6b6b;
                text-align: center;
                width: 100px;
                pointer-events: none;
                opacity: 0;
                z-index: 10;
                white-space: nowrap;
            }

            @keyframes floatUp {
                0% { transform: translateY(0) scale(0.5); opacity: 0; }
                30% { transform: translateY(-10px) scale(1.1); opacity: 1; }
                100% { transform: translateY(-30px) scale(1); opacity: 0; }
            }

            .animate-pop { animation: floatUp 0.8s ease-out forwards; }

            .game-over-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(255, 255, 255, 0.6);
                border-radius: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s;
                z-index: 20;
                backdrop-filter: blur(2px);
            }

            .game-over-overlay.active { opacity: 1; pointer-events: auto; }

            .retry-btn-styled {
                width: 60px;
                height: 60px;
                background-color: #3182f6;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(49, 130, 246, 0.4);
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            }

            .retry-btn-styled:active { transform: scale(0.92); box-shadow: 0 2px 6px rgba(49, 130, 246, 0.3); }
            .retry-btn-styled svg { width: 32px; height: 32px; color: white; stroke-width: 2.5; }
        `;
        document.head.appendChild(style);
    }

    container.innerHTML = `
        <div class="bubble-container" id="grid">
            <div class="game-over-overlay" id="gameOverOverlay">
                <div class="retry-btn-styled" id="btn-retry">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21.5 2v6h-6"></path>
                        <path d="M2.5 22v-6h6"></path>
                        <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8"></path>
                        <path d="M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16"></path>
                    </svg>
                </div>
            </div>
        </div>
    `;

    const grid = container.querySelector('#grid');
    const gameOverOverlay = container.querySelector('#gameOverOverlay');
    const btnRetry = container.querySelector('#btn-retry');

    let totalBubbles = 0;
    let poppedCount = 0;
    let resizeTimeout;

    const messages = [
        "배달비 굳음", "살 안찜", "피부 좋아짐", "붓기 빠짐",
        "통장 지킴", "건강 챙김", "승리자", "참은 자",
        "지방 분해", "위장 휴식", "꿀잠 예약", "내일 가볍다",
        "치킨값 저금", "야식 끊기", "디톡스", "칭찬해"
    ];

    function triggerHaptic(type) {
        try {
            const bedrock = window.Bedrock;
            if (bedrock && bedrock.generateHapticFeedback) {
                bedrock.generateHapticFeedback({ type: type });
            }
        } catch (e) {
            console.log("Haptic error:", e);
        }
    }

    function calculateGrid() {
        const availableW = container.clientWidth * 0.95 - 20; // 95% width - padding
        const availableH = container.clientHeight * 0.95 - 20; // 95% height - padding (approx)

        const bubbleSize = 55;
        const gap = 8;

        const cols = Math.floor(availableW / (bubbleSize + gap));
        const rows = Math.floor(availableH / (bubbleSize + gap));

        return { cols: Math.max(3, cols), rows: Math.max(3, rows) };
    }

    function createBubbles() {
        // Clear existing bubbles (except overlay)
        const existingBubbles = grid.querySelectorAll('.bubble');
        existingBubbles.forEach(b => b.remove());

        const { cols, rows } = calculateGrid();

        // Update grid style
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

        totalBubbles = cols * rows;

        for (let i = 0; i < totalBubbles; i++) {
            const bubble = document.createElement('div');
            bubble.classList.add('bubble');
            bubble.dataset.index = i;
            bubble.addEventListener('touchstart', handlePop, { passive: false });
            bubble.addEventListener('mousedown', handlePop);
            grid.insertBefore(bubble, gameOverOverlay);
        }

        poppedCount = 0;
        gameOverOverlay.classList.remove('active');
    }

    function handlePop(e) {
        if (e.cancelable) e.preventDefault();
        const bubble = e.currentTarget;

        if (bubble.classList.contains('popped')) return;

        bubble.classList.add('popped');
        if (navigator.vibrate) navigator.vibrate(50);
        triggerHaptic('tap');
        showPopText(bubble);

        poppedCount++;
        checkWin();
    }

    function showPopText(target) {
        const text = document.createElement('div');
        text.classList.add('pop-text', 'animate-pop');
        text.innerText = messages[Math.floor(Math.random() * messages.length)];
        target.appendChild(text);
        setTimeout(() => { text.remove(); }, 800);
    }

    function checkWin() {
        if (poppedCount >= totalBubbles) {
            triggerHaptic('success');
            setTimeout(() => {
                gameOverOverlay.classList.add('active');
            }, 300);
        }
    }

    function resetBubbles() {
        gameOverOverlay.classList.remove('active');
        const bubbles = grid.querySelectorAll('.bubble');
        bubbles.forEach((b, idx) => {
            setTimeout(() => {
                b.classList.remove('popped');
                const oldText = b.querySelector('.pop-text');
                if (oldText) oldText.remove();
            }, Math.min(idx * 5, 500)); // Cap delay for large grids
        });
        poppedCount = 0;
    }

    const handleRetry = () => { resetBubbles(); };
    btnRetry.addEventListener('click', handleRetry);

    // Initial creation
    // Timeout to ensure container has size
    setTimeout(createBubbles, 50);

    const onResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(createBubbles, 200);
    };
    window.addEventListener('resize', onResize);

    cleanup = () => {
        window.removeEventListener('resize', onResize);
        const bubbles = grid.querySelectorAll('.bubble');
        bubbles.forEach(b => {
            b.removeEventListener('touchstart', handlePop);
            b.removeEventListener('mousedown', handlePop);
        });
        btnRetry.removeEventListener('click', handleRetry);

        const style = document.getElementById(styleId);
        if (style) style.remove();
        container.innerHTML = '';
    }
}

export function unmount() {
    if (cleanup) {
        cleanup();
        cleanup = null;
    }
}
