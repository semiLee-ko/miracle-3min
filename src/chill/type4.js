
// Chill Mode Type 5: Bonfire (Camping Mode)
let cleanup = null;

export function mount(container) {
    const styleId = 'chill-type4-style';
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
                background-color: #050505;
                font-family: 'Noto Sans KR', sans-serif;
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
            .bg-camping {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(to bottom, #020111 0%, #191621 100%);
                z-index: 1;
                overflow: hidden;
            }
            .stars {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 60%;
                background-image: 
                    radial-gradient(1px 1px at 10% 10%, white, transparent),
                    radial-gradient(1px 1px at 20% 40%, white, transparent),
                    radial-gradient(2px 2px at 40% 20%, white, transparent),
                    radial-gradient(1px 1px at 50% 50%, white, transparent),
                    radial-gradient(2px 2px at 70% 30%, white, transparent),
                    radial-gradient(1px 1px at 80% 60%, white, transparent),
                    radial-gradient(1.5px 1.5px at 90% 10%, white, transparent);
                background-size: 300px 300px;
                opacity: 0.8;
                z-index: 2;
            }
            .tent {
                position: absolute;
                bottom: 25%;
                right: 15%;
                width: 120px;
                height: 80px;
                background: linear-gradient(135deg, #2c3e50 0%, #000 100%);
                clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
                opacity: 0.4;
                z-index: 3;
            }
            .ground {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 30%;
                background: radial-gradient(circle at 50% 0%, #3e2723 0%, #1a0f0a 100%);
                z-index: 4;
            }
            .logs {
                position: absolute;
                bottom: 20%; /* Adjusted for ground */
                left: 50%;
                transform: translateX(-50%);
                width: 140px;
                height: 70px;
                background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><path d="M10,50 L90,50 L80,20 L20,20 Z" fill="%233e2723"/><path d="M15,50 L85,40 L60,10 Z" fill="%234e342e"/><path d="M25,55 L75,55" stroke="%232d1e18" stroke-width="3"/><circle cx="30" cy="52" r="2" fill="%231a0f0a"/><circle cx="70" cy="52" r="2" fill="%231a0f0a"/></svg>') no-repeat bottom center;
                background-size: contain;
                z-index: 5;
                opacity: 1;
                pointer-events: none;
                filter: brightness(0.6);
            }
            .helper-text {
                position: absolute;
                top: 15%;
                width: 100%;
                text-align: center;
                color: rgba(255, 255, 255, 0.5);
                font-size: 0.9rem;
                pointer-events: none;
                z-index: 20;
                text-shadow: 0 1px 3px rgba(0,0,0,0.8);
                font-weight: 300;
                letter-spacing: 1px;
            }
        `;
        document.head.appendChild(style);
    }

    container.innerHTML = `
        <div class="bg-camping">
            <div class="stars"></div>
        </div>
        <div class="tent"></div>
        <div class="ground"></div>
        <div class="logs"></div>
        <canvas id="fireCanvas"></canvas>
        <div class="helper-text">불멍과 함께 잠시 쉬어가세요</div>
    `;

    const canvas = container.querySelector('#fireCanvas');
    const ctx = canvas.getContext('2d');

    let width, height;
    let particles = [];
    let animationId;
    let fireIntensity = 1.0;

    function resize() {
        width = container.clientWidth;
        height = container.clientHeight;
        canvas.width = width;
        canvas.height = height;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor(x, y, type) {
            this.init(x, y, type);
        }

        init(x, y, type) {
            this.type = type || 'fire'; // fire, spark, smoke, shootingStar
            this.x = x || width / 2 + (Math.random() - 0.5) * 50;
            this.y = y || height * 0.75; // Raised fire origin to sit ON logs (was 0.85)

            if (this.type === 'fire') {
                this.size = Math.random() * 20 + 10;
                this.speedY = Math.random() * 1.2 + 0.5; // Slower speed
                this.speedX = (Math.random() - 0.5) * 0.5; // Reduced sway
                this.life = Math.random() * 0.6 + 0.4; // Longer life
                this.decay = Math.random() * 0.008 + 0.004; // Slower decay
                this.color = { r: 255, g: Math.random() * 150 + 50, b: 0 };
            } else if (this.type === 'spark') {
                this.size = Math.random() * 3 + 1;
                this.speedY = Math.random() * 5 + 3;
                this.speedX = (Math.random() - 0.5) * 6;
                this.life = Math.random() * 0.8 + 0.2;
                this.decay = Math.random() * 0.02 + 0.01;
                this.color = { r: 255, g: 200, b: 100 };
            } else if (this.type === 'smoke') {
                this.size = Math.random() * 30 + 10;
                this.speedY = Math.random() * 1 + 0.5;
                this.speedX = (Math.random() - 0.5) * 2;
                this.life = Math.random() * 0.6 + 0.2;
                this.decay = 0.005;
                this.color = { r: 50, g: 50, b: 50 };
            } else if (this.type === 'shootingStar') {
                this.x = Math.random() * width;
                this.y = Math.random() * (height * 0.4); // Sky area
                this.size = Math.random() * 2 + 1;
                this.speedX = -Math.random() * 15 - 10; // Fast left
                // Negative speedY for "Down" movement (since update does y -= speedY)
                this.speedY = -(Math.random() * 5 + 2);
                this.life = 0.7;
                this.decay = 0.01;
                this.color = { r: 255, g: 255, b: 255 };
            }
        }

        update() {
            this.life -= this.decay;

            // Separate update logic
            if (this.type === 'shootingStar') {
                this.y -= this.speedY; // -(-val) = +val (Down)
                this.x += this.speedX; // Linear
            } else {
                this.y -= this.speedY * fireIntensity;
                this.x += this.speedX + Math.sin(Date.now() / 200 + this.y / 100) * 0.5;
            }

            if (this.type === 'fire') {
                this.size *= 0.98;
            } else if (this.type === 'smoke') {
                this.size *= 1.01;
                this.speedX += (Math.random() - 0.5) * 0.2;
            } else if (this.type === 'spark') {
                // erratic movement
                this.x += (Math.random() - 0.5) * 2;
            }

            if (this.life <= 0 || this.size <= 0.5) {
                if (this.type === 'fire') {
                    // Respawn fire particles near source
                    this.init(undefined, undefined, 'fire');
                } else if (this.type === 'smoke' && Math.random() < 0.1) {
                    this.init(undefined, undefined, 'smoke');
                } else if (this.type === 'spark' || this.type === 'shootingStar') {
                    // Sparks and stars die out
                    return false;
                }
            }
            return true;
        }

        draw() {
            ctx.beginPath();
            let alpha = this.life;
            if (this.type === 'smoke') alpha *= 0.3;

            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);

            const r = Math.floor(this.color.r);
            const g = Math.floor(this.color.g);
            const b = Math.floor(this.color.b);

            if (this.type === 'fire') {
                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
                gradient.addColorStop(1, `rgba(${r}, 0, 0, 0)`);
                ctx.globalCompositeOperation = 'screen';
            } else if (this.type === 'spark') {
                gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
                gradient.addColorStop(1, `rgba(255, 100, 0, 0)`);
                ctx.globalCompositeOperation = 'screen';
            } else if (this.type === 'shootingStar') {
                ctx.globalCompositeOperation = 'screen';
                gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

                // Trail: from (x, y) backwards against velocity
                // x moved by speedX. Old X = x - speedX.
                // y moved by -speedY (since y -= speedY). Old Y = y + speedY.
                // So trail should point to (x - speedX, y + speedY).

                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
                ctx.lineWidth = 2;
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x - this.speedX * 2, this.y + this.speedY * 2);
                ctx.stroke();
            } else { // smoke
                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
                gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
                ctx.globalCompositeOperation = 'source-over';
            }

            if (this.type !== 'shootingStar') {
                ctx.fillStyle = gradient;
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Initialize particles
    for (let i = 0; i < 150; i++) particles.push(new Particle(undefined, undefined, 'fire'));
    for (let i = 0; i < 30; i++) particles.push(new Particle(undefined, undefined, 'smoke'));

    function animate() {
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, width, height);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            const alive = p.update();
            if (alive) {
                p.draw();
            } else {
                particles.splice(i, 1);
            }
        }

        // Randomly spawn shooting star
        if (Math.random() < 0.005) { // 0.5% chance per frame
            particles.push(new Particle(undefined, undefined, 'shootingStar'));
        }

        // Decay intensity
        if (fireIntensity > 1.0) fireIntensity -= 0.01;

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

    function addSparks(count = 10, x, y) {
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(x || width / 2, y || height * 0.8, 'spark'));
        }
    }

    function handleInteraction(e) {
        // Prevent default touch actions (scrolling)
        if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();

        fireIntensity = 2.0;
        triggerHaptic('success');

        // Get coords
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

        addSparks(15, x, y);
    }

    canvas.addEventListener('mousedown', handleInteraction);
    canvas.addEventListener('touchstart', handleInteraction, { passive: false });

    cleanup = () => {
        window.removeEventListener('resize', resize);
        cancelAnimationFrame(animationId);

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
