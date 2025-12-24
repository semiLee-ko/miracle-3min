
// Chill Mode Type 6: Water Ripples (Zen)
let cleanup = null;

export function mount(container) {
    const styleId = 'chill-type5-style';
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
                background-color: #000;
                overflow: hidden;
            }
            canvas {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10;
                touch-action: none;
            }
            .bg-water {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle at 50% 50%, #001020 0%, #000510 100%);
                z-index: 1;
            }
            .center-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: rgba(255, 255, 255, 0.1);
                font-size: 0.8rem;
                pointer-events: none;
                z-index: 5;
                font-family: 'Noto Sans KR', sans-serif;
                white-space: nowrap;
            }
        `;
        document.head.appendChild(style);
    }

    container.innerHTML = `
        <div class="bg-water"></div>
        <canvas id="rippleCanvas"></canvas>
    `;

    const canvas = container.querySelector('#rippleCanvas');
    const ctx = canvas.getContext('2d');

    let width, height;
    let ripples = [];
    let animationId;

    function resize() {
        width = container.clientWidth;
        height = container.clientHeight;
        canvas.width = width;
        canvas.height = height;
    }
    resize();
    window.addEventListener('resize', resize);

    class Ripple {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.radius = 0;
            this.maxRadius = Math.max(width, height) * 0.8;
            this.speed = 3;
            this.alpha = 0.8;
            this.lw = 2; // Line width
        }

        update() {
            this.radius += this.speed;
            this.alpha -= 0.005;
            this.lw -= 0.01;
        }

        draw() {
            if (this.alpha <= 0) return;

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(100, 200, 255, ${this.alpha})`;
            ctx.lineWidth = Math.max(0.5, this.lw);
            ctx.stroke();

            // Echo ripple
            if (this.radius > 20) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius - 15, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(100, 200, 255, ${this.alpha * 0.5})`;
                ctx.lineWidth = Math.max(0.5, this.lw * 0.5);
                ctx.stroke();
            }
        }
    }

    class Koi {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.angle = Math.random() * Math.PI * 2;
            this.speed = 0.5 + Math.random() * 0.5;
            this.baseSpeed = this.speed;
            this.turnSpeed = (Math.random() - 0.5) * 0.02;
            this.size = 10 + Math.random() * 6;

            // 70% Orange, 20% White, 10% Red pattern
            const rand = Math.random();
            if (rand < 0.7) {
                this.color = '#ff6b35';
            } else if (rand < 0.9) {
                this.color = '#f7f7f7';
            } else {
                this.color = '#d63031';
            }
            this.tailWiggle = 0;
        }

        update() {
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;

            // Wall avoidance
            const buffer = 50;
            if (this.x < buffer) this.angle += 0.05;
            if (this.x > width - buffer) this.angle -= 0.05;
            if (this.y < buffer) this.angle += 0.05;
            if (this.y > height - buffer) this.angle -= 0.05;

            // Random wander
            this.angle += this.turnSpeed;
            if (Math.random() < 0.01) this.turnSpeed = (Math.random() - 0.5) * 0.05;

            // Slow down if handled interaction speed up
            if (this.speed > this.baseSpeed) {
                this.speed *= 0.98;
            } else {
                this.speed = this.baseSpeed;
            }

            this.tailWiggle += 0.15 * (this.speed / this.baseSpeed);
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);

            // Body
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size * 1.5, this.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Head (slightly lighter)
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.ellipse(this.size * 0.8, 0, this.size * 0.5, this.size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Fins
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.8;

            // Left Fin
            ctx.beginPath();
            ctx.moveTo(0, -this.size * 0.4);
            ctx.lineTo(-this.size * 0.5, -this.size * 1.2);
            ctx.lineTo(this.size * 0.5, -this.size * 0.4);
            ctx.fill();

            // Right Fin
            ctx.beginPath();
            ctx.moveTo(0, this.size * 0.4);
            ctx.lineTo(-this.size * 0.5, this.size * 1.2);
            ctx.lineTo(this.size * 0.5, this.size * 0.4);
            ctx.fill();

            // Tail
            const tailAngle = Math.sin(this.tailWiggle) * 0.5;
            ctx.rotate(tailAngle);
            ctx.beginPath();
            ctx.moveTo(-this.size * 1.2, 0);
            ctx.lineTo(-this.size * 2.5, -this.size * 0.8);
            ctx.lineTo(-this.size * 2.2, 0);
            ctx.lineTo(-this.size * 2.5, this.size * 0.8);
            ctx.fill();

            ctx.restore();
        }

        flee(tx, ty) {
            const dx = this.x - tx;
            const dy = this.y - ty;
            const dist = Math.hypot(dx, dy);

            if (dist < 150) {
                const angleTo = Math.atan2(dy, dx); // Angle AWAY from touch
                // Smooth turn towards escape angle
                let diff = angleTo - this.angle;
                // Normalize angle
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                this.angle += diff * 0.1;
                this.speed = this.baseSpeed * 4; // Burst speed
            }
        }
    }

    let fish = [];
    for (let i = 0; i < 10; i++) fish.push(new Koi());

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Draw Fish below ripples
        fish.forEach(f => {
            f.update();
            f.draw();
        });

        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            r.update();
            r.draw();
            if (r.alpha <= 0) {
                ripples.splice(i, 1);
            }
        }

        animationId = requestAnimationFrame(animate);
    }

    animate();

    function triggerHaptic(type) {
        try {
            const bedrock = window.Bedrock;
            if (bedrock && bedrock.generateHapticFeedback) {
                bedrock.generateHapticFeedback({ type: type });
            }
        } catch (e) { }
    }

    function addRipple(x, y) {
        ripples.push(new Ripple(x, y));
        triggerHaptic('basicWeak'); // Or similar soft haptic

        // Scare fish
        fish.forEach(f => f.flee(x, y));
    }

    let lastTime = 0;

    function handleInteraction(e) {
        // Limit rate slightly
        const now = Date.now();
        if (now - lastTime < 100) return;
        lastTime = now;

        let x, y;
        if (e.touches) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else {
            x = e.clientX;
            y = e.clientY;
        }

        // Adjust for container
        const rect = container.getBoundingClientRect();
        x -= rect.left;
        y -= rect.top;

        addRipple(x, y);
    }

    // Auto drop occasionally
    let autoInterval = setInterval(() => {
        if (Math.random() < 0.2) {
            const rx = Math.random() * width;
            const ry = Math.random() * height;
            addRipple(rx, ry);
        }
    }, 2500);

    canvas.addEventListener('mousedown', handleInteraction);
    canvas.addEventListener('touchstart', handleInteraction, { passive: true });
    // canvas.addEventListener('touchmove', handleInteraction, {passive: true}); // Drag ripples? maybe too much

    cleanup = () => {
        window.removeEventListener('resize', resize);
        cancelAnimationFrame(animationId);
        clearInterval(autoInterval);

        canvas.removeEventListener('mousedown', handleInteraction);
        canvas.removeEventListener('touchstart', handleInteraction);

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
