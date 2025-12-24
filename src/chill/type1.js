
// Chill Mode Type 1: Deep Sea (Abyss)
let cleanup = null;

export function mount(container) {
    // 1. Inject CSS
    const styleId = 'chill-type1-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Wrapper to ensure full screen overlay */
            #chill-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 50; /* High z-index to cover main app */
                background-color: #000510;
                overflow: hidden;
                font-family: 'Noto Sans KR', sans-serif;
                touch-action: none;
            }

            .ocean-bg {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle at 50% -10%, #006080 0%, #003050 40%, #000510 100%);
                z-index: 0;
            }

            .caustics {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background:
                    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px);
                background-size: 100px 100px;
                transform: scale(1.5) perspective(500px) rotateX(60deg);
                opacity: 0.3;
                animation: ocean-move 20s linear infinite;
                pointer-events: none;
                z-index: 1;
            }

            @keyframes ocean-move {
                0% { background-position: 0 0; }
                100% { background-position: 100px 100px; }
            }

            .light-rays {
                position: absolute;
                top: -20%;
                left: -20%;
                width: 140%;
                height: 120%;
                background: repeating-linear-gradient(75deg, transparent 0%, rgba(255, 255, 255, 0.03) 10%, transparent 20%);
                filter: blur(8px);
                animation: light-sway 12s infinite alternate ease-in-out;
                pointer-events: none;
                z-index: 1;
            }

            @keyframes light-sway {
                0% { transform: translateX(-30px) rotate(0deg); opacity: 0.6; }
                100% { transform: translateX(30px) rotate(3deg); opacity: 0.8; }
            }

            canvas {
                position: absolute;
                top: 0;
                left: 0;
                z-index: 2;
                display: block;
                width: 100%;
                height: 100%;
            }

            #receipt-overlay {
                position: absolute;
                top: calc(50% + env(safe-area-inset-top) / 2);
                left: 50%;
                transform: translate(-50%, -50%) scale(0.8);
                width: 200px;
                background: #fff;
                padding: 15px;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
                opacity: 0;
                pointer-events: none;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                z-index: 10;
                text-align: center;
                border-top: 5px solid #ff4757;
                clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 95% 97%, 90% 100%, 85% 97%, 80% 100%, 75% 97%, 70% 100%, 65% 97%, 60% 100%, 55% 97%, 50% 100%, 45% 97%, 40% 100%, 35% 97%, 30% 100%, 25% 97%, 20% 100%, 15% 97%, 10% 100%, 5% 97%, 0% 100%);
                padding-bottom: 40px;
            }

            #receipt-overlay.active {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }

            .receipt-title {
                font-size: 1.2rem;
                font-weight: bold;
                color: #333;
                margin-bottom: 10px;
                border-bottom: 2px dashed #ccc;
                padding-bottom: 10px;
            }

            .receipt-item {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
                color: #555;
                font-size: 0.9rem;
            }

            .receipt-total {
                margin-top: 15px;
                font-size: 1.1rem;
                font-weight: bold;
                color: #d63031;
                text-align: right;
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Inject HTML
    container.innerHTML = `
        <div class="ocean-bg"></div>
        <div class="caustics"></div>
        <div class="light-rays"></div>
        <canvas id="bubbleCanvas"></canvas>
        <div id="receipt-overlay">
            <div class="receipt-title">CARD RECEIPT</div>
            <div id="receipt-content"></div>
            <div class="receipt-total" id="receipt-total">Total: 0원</div>
            <div style="margin-top:10px; font-size:0.8rem; color:#888;">다이어트는 내일부터...?</div>
        </div>
    `;

    // 3. Logic Initialization
    const canvas = container.querySelector('#bubbleCanvas');
    const ctx = canvas.getContext('2d');
    const overlay = container.querySelector('#receipt-overlay');
    const receiptContent = container.querySelector('#receipt-content');
    const receiptTotal = container.querySelector('#receipt-total');

    let animationId;
    let width, height;
    let bubbles = [];
    let snow = [];
    let particles = [];

    const billData = [
        { item: "야식 세트(특대)", price: "32,000", extra: "배달팁 5,000" },
        { item: "마라탕 + 꿔바로우", price: "28,000", extra: "최소주문 맞춤" },
        { item: "치킨 + 치즈볼", price: "26,000", extra: "새벽 1시 주문" },
        { item: "지난달 카드값", price: "1,500,000", extra: "할부 3개월" },
        { item: "편의점 4캔", price: "11,000", extra: "뱃살 +1kg" },
    ];

    function resize() {
        width = container.clientWidth;
        height = container.clientHeight;
        canvas.width = width;
        canvas.height = height;
    }

    // Initial resize is important
    resize();
    window.addEventListener('resize', resize);

    class MarineSnow {
        constructor() { this.init(); }
        init() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 2;
            this.speedY = Math.random() * 0.2 + 0.05;
            this.speedX = Math.random() * 0.2 - 0.1;
            this.opacity = Math.random() * 0.3 + 0.1;
        }
        update() {
            this.y += this.speedY;
            this.x += this.speedX;
            if (this.y > height) this.y = 0;
            if (this.x > width) this.x = 0;
            if (this.x < 0) this.x = width;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.fill();
        }
    }

    class Bubble {
        constructor() { this.init(); }
        init(bottom = true) {
            this.radius = Math.random() * 15 + 8;
            this.x = Math.random() * width;
            this.y = bottom ? height + this.radius : Math.random() * height;
            this.speed = Math.random() * 1.5 + 0.5;
            this.wobble = Math.random() * Math.PI * 2;
            this.wobbleSpeed = Math.random() * 0.05 + 0.02;
            this.isBill = Math.random() < 0.2;
            this.opacity = 0;
            this.fadeIn = true;
        }
        update() {
            this.y -= this.speed;
            this.wobble += this.wobbleSpeed;
            this.x += Math.sin(this.wobble) * 0.5;
            if (this.fadeIn) {
                this.opacity += 0.01;
                if (this.opacity >= 1) { this.opacity = 1; this.fadeIn = false; }
            }
            if (this.y < -this.radius) this.init(true);
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(
                this.x - this.radius * 0.4, this.y - this.radius * 0.4, this.radius * 0.1,
                this.x, this.y, this.radius
            );
            if (this.isBill) {
                gradient.addColorStop(0, 'rgba(255, 200, 200, 0.6)');
                gradient.addColorStop(0.8, 'rgba(255, 50, 50, 0.2)');
                gradient.addColorStop(1, 'rgba(255, 50, 50, 0.0)');
                ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)';
            } else {
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                gradient.addColorStop(0.8, 'rgba(150, 255, 255, 0.1)');
                gradient.addColorStop(1, 'rgba(150, 255, 255, 0.0)');
                ctx.strokeStyle = 'rgba(200, 255, 255, 0.2)';
            }
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.15, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fill();

            if (this.isBill) {
                const size = this.radius * 1.0;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fillRect(this.x - size / 2, this.y - size / 2, size, size * 1.2);
                ctx.fillStyle = '#ff6b6b';
                ctx.fillRect(this.x - size / 3, this.y, size * 0.6, 2);
            }
        }
    }

    class Particle {
        constructor(x, y, color) {
            this.x = x; this.y = y;
            this.radius = Math.random() * 2 + 1;
            this.speedX = (Math.random() - 0.5) * 4;
            this.speedY = (Math.random() - 0.5) * 4;
            this.life = 1.0;
            this.color = color;
        }
        update() { this.x += this.speedX; this.y += this.speedY; this.life -= 0.03; }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color}, ${this.life})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < 20; i++) bubbles.push(new Bubble());
    for (let i = 0; i < 60; i++) snow.push(new MarineSnow());

    function triggerHaptic(type) {
        try {
            // Check for window.Bedrock from main app scope since we are module
            // We can just rely on logic.js to have initialized it or look at window
            // In module scope, window is global window. 
            // The Bedrock object should be attached to window by main.js or logic.js if real env.
            // For now, let's look for both just in case.
            const bedrock = window.Bedrock;
            if (bedrock && bedrock.generateHapticFeedback) {
                bedrock.generateHapticFeedback({ type: type });
            }
        } catch (e) {
            console.log("Haptic error:", e);
        }
    }

    function popBubble(b) {
        const color = b.isBill ? '255, 100, 100' : '200, 255, 255';
        triggerHaptic(b.isBill ? 'error' : 'basicWeak');
        for (let k = 0; k < 6; k++) particles.push(new Particle(b.x, b.y, color));
        if (b.isBill) showReceipt();
        b.init(true);
    }

    function showReceipt() {
        const data = billData[Math.floor(Math.random() * billData.length)];
        receiptContent.innerHTML = `
            <div class="receipt-item"><span>상품명</span><span>${data.item}</span></div>
            <div class="receipt-item"><span>추가항목</span><span>${data.extra}</span></div>
        `;
        receiptTotal.innerText = `Total: - ${data.price}원`;
        overlay.classList.add('active');
        setTimeout(() => { overlay.classList.remove('active'); }, 2000);
    }

    function handleInteraction(e) {
        if (overlay.classList.contains('active')) return;
        const rect = canvas.getBoundingClientRect();
        let cx, cy;
        if (e.changedTouches) {
            cx = e.changedTouches[0].clientX;
            cy = e.changedTouches[0].clientY;
        } else {
            cx = e.clientX;
            cy = e.clientY;
        }

        // Fix: Subtract rect position to get canvas-relative coordinates
        const localX = cx - rect.left;
        const localY = cy - rect.top;

        for (let i = bubbles.length - 1; i >= 0; i--) {
            const b = bubbles[i];
            const dist = Math.hypot(localX - b.x, localY - b.y);
            if (dist < b.radius + 20) {
                popBubble(b);
                break;
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        snow.forEach(s => { s.update(); s.draw(); });
        bubbles.forEach(b => { b.update(); b.draw(); });

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.update();
            p.draw();
            if (p.life <= 0) particles.splice(i, 1);
        }
        animationId = requestAnimationFrame(animate);
    }

    animate();

    container.addEventListener('mousedown', handleInteraction);
    container.addEventListener('touchstart', handleInteraction);

    // 4. Cleanup Function
    cleanup = () => {
        window.removeEventListener('resize', resize);
        cancelAnimationFrame(animationId);
        container.removeEventListener('mousedown', handleInteraction);
        container.removeEventListener('touchstart', handleInteraction);

        // Remove style? Maybe keep it for caching if app reused? 
        // Better to remove to avoid style pollution if logic changes or we want clean state.
        const style = document.getElementById(styleId);
        if (style) style.remove();

        container.innerHTML = '';
    };
}

export function unmount() {
    if (cleanup) {
        cleanup();
        cleanup = null;
    }
}
