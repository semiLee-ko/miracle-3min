export function triggerSuccessEffect() {
    const canvas = document.createElement('canvas');
    canvas.id = 'effect-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles = [];
    const coins = []; // Separate array for coins to render them on top or differently

    // Resize handler
    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    });

    // Color palette for confetti
    const colors = ['#FFD700', '#FF6347', '#32CD32', '#1E90FF', '#FF69B4'];

    function createParticles() {
        // Create Confetti
        for (let i = 0; i < 150; i++) {
            particles.push({
                x: width / 2,
                y: height / 2 + 100, // Trigger from slightly below center (or where the emoji was)
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 1) * 20 - 5, // Upward burst
                gravity: 0.5,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 10 + 5,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                opacity: 1
            });
        }

        // Create Coins
        for (let i = 0; i < 30; i++) {
            coins.push({
                x: width / 2,
                y: height / 2 + 100,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 1) * 25 - 10, // Higher upward burst
                gravity: 0.8,
                rotation: 0,
                scale: 1,
                opacity: 1
            });
        }
    }

    createParticles();

    let animationId;

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Animate Confetti
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.vx *= 0.96; // Air resistance
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;
            p.opacity -= 0.005;

            if (p.opacity <= 0) {
                particles.splice(i, 1);
                i--;
                continue;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        }

        // Animate Coins
        for (let i = 0; i < coins.length; i++) {
            const c = coins[i];
            c.vx *= 0.95;
            c.vy += c.gravity;
            c.x += c.vx;
            c.y += c.vy;
            c.opacity -= 0.002; // Fade out slower

            if (c.opacity <= 0) {
                coins.splice(i, 1);
                i--;
                continue;
            }

            ctx.save();
            ctx.translate(c.x, c.y);
            // Simple spinning effect using scaling
            c.scale = Math.abs(Math.cos(Date.now() / 100));

            ctx.globalAlpha = c.opacity;

            // Draw Coin (Yellow Circle with inner detail)
            ctx.beginPath();
            ctx.ellipse(0, 0, 20 * c.scale, 20, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700'; // Gold
            ctx.fill();
            ctx.strokeStyle = '#DAA520'; // Darker Gold border
            ctx.lineWidth = 2;
            ctx.stroke();

            // Inner $ symbol or simple detail
            ctx.fillStyle = '#DAA520';
            ctx.font = `bold 20px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Scale text width to match coin flip
            ctx.scale(c.scale, 1);
            ctx.fillText('₩', 0, 2); // Won symbol

            ctx.restore();
        }

        if (particles.length > 0 || coins.length > 0) {
            animationId = requestAnimationFrame(animate);
        } else {
            // Cleanup
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
        }
    }

    animate();
}
