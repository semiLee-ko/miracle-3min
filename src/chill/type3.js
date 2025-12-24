
// Chill Mode Type 4: Rainy Window
let cleanup = null;

export function mount(container) {
    const styleId = 'chill-type3-style';
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
                background-color: #050a10;
                overflow: hidden;
            }
            canvas {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 2;
                touch-action: none;
            }
            .bg-image {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: url('https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80') no-repeat center center;
                background-size: cover;
                filter: blur(8px) brightness(0.6);
                z-index: 1;
            }
            .helper-text {
                position: absolute;
                bottom: 10%;
                width: 100%;
                text-align: center;
                color: rgba(255, 255, 255, 0.4);
                font-size: 0.9rem;
                pointer-events: none;
                z-index: 10;
                font-family: 'Noto Sans KR', sans-serif;
                text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            }
        `;
        document.head.appendChild(style);
    }

    container.innerHTML = `
        <div class="bg-image"></div>
        <canvas id="rainCanvas"></canvas>
        <div class="helper-text">화면을 닦아보세요</div>
    `;

    const canvas = container.querySelector('#rainCanvas');
    const ctx = canvas.getContext('2d');

    let width, height;
    let drops = [];
    let trails = [];
    let wipePath = [];
    let animationId;

    function resize() {
        width = container.clientWidth;
        height = container.clientHeight;
        canvas.width = width;
        canvas.height = height;
    }
    resize();
    window.addEventListener('resize', resize);

    class Drop {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 2 + 1;
            this.speed = Math.random() * 3 + 2;
            this.hasTrail = Math.random() < 0.3;
        }
        update() {
            this.y += this.speed;
            if (this.y > height) {
                this.y = -10;
                this.x = Math.random() * width;
            }
            if (this.hasTrail && Math.random() < 0.1) {
                // trails.push({x: this.x, y: this.y, alpha: 0.5});
            }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fill();
        }
    }

    // Condensation Layer
    let fogCanvas = document.createElement('canvas'); // Offscreen canvas for fog
    let fogCtx = fogCanvas.getContext('2d');

    function initFog() {
        fogCanvas.width = width;
        fogCanvas.height = height;
        fogCtx.fillStyle = 'rgba(200, 200, 210, 0.2)'; // Fog color
        fogCtx.fillRect(0, 0, width, height);
    }
    initFog();

    function drawFog() {
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(fogCanvas, 0, 0);
    }

    function wipe(x, y) {
        fogCtx.globalCompositeOperation = 'destination-out';
        fogCtx.beginPath();
        fogCtx.arc(x, y, 20, 0, Math.PI * 2);
        fogCtx.fillStyle = 'rgba(0,0,0,1)';
        fogCtx.fill();

        // Trigger haptic lightly
        if (Math.random() < 0.1) triggerHaptic('selection');
    }

    function triggerHaptic(type) {
        try {
            const bedrock = window.Bedrock;
            if (bedrock && bedrock.generateHapticFeedback) {
                bedrock.generateHapticFeedback({ type: type });
            }
        } catch (e) { }
    }

    for (let i = 0; i < 100; i++) {
        drops.push(new Drop());
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Draw fog first
        drawFog();

        // Draw drops
        drops.forEach(d => {
            d.update();
            d.draw();
        });

        // Slowly regenerate fog
        if (Math.random() < 0.05) {
            fogCtx.globalCompositeOperation = 'source-over';
            fogCtx.fillStyle = 'rgba(200, 200, 210, 0.015)';
            fogCtx.fillRect(0, 0, width, height);
        }

        animationId = requestAnimationFrame(animate);
    }

    animate();

    // Interaction
    let isWiping = false;

    function handleStart(e) {
        isWiping = true;
        const { x, y } = getPos(e);
        wipe(x, y);
    }

    function handleMove(e) {
        if (!isWiping) return;
        if (e.cancelable) e.preventDefault(); // Prevent scroll
        const { x, y } = getPos(e);
        wipe(x, y);
    }

    function handleEnd() {
        isWiping = false;
    }

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        let x, y;
        if (e.changedTouches) {
            x = e.changedTouches[0].clientX - rect.left;
            y = e.changedTouches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        return { x, y };
    }

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);

    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);

    cleanup = () => {
        window.removeEventListener('resize', resize);
        cancelAnimationFrame(animationId);

        canvas.removeEventListener('mousedown', handleStart);
        canvas.removeEventListener('mousemove', handleMove);
        canvas.removeEventListener('mouseup', handleEnd);
        canvas.removeEventListener('touchstart', handleStart);
        canvas.removeEventListener('touchmove', handleMove);
        canvas.removeEventListener('touchend', handleEnd);

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
