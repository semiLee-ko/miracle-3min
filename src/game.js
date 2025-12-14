// Mini Game Logic
export const game = {
    canvas: null,
    ctx: null,
    loopId: null,
    score: 0,
    player: { x: 0, y: 0, width: 60, height: 60 },
    items: [],
    isRunning: false,
    charImage: null,

    init: (canvasElement, containerElement) => {
        game.canvas = canvasElement;
        game.ctx = game.canvas.getContext('2d');

        // Prepare Character Image (SVG from Intro)
        const svgString = `
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="#FFD233" d="M43.6,-57.3C55.3,-46.2,62.8,-30.9,64.8,-15.2C66.8,0.5,63.3,16.6,53.8,29.1C44.3,41.6,28.8,50.5,12.7,53.8C-3.4,57.1,-20.1,54.8,-34.7,46.1C-49.3,37.4,-61.8,22.3,-64.5,5.6C-67.2,-11.1,-60.1,-29.4,-47.5,-41.2C-34.9,-53,-16.8,-58.3,-0.2,-58C16.4,-57.8,31.9,-68.4,43.6,-57.3Z" transform="translate(100 100) scale(1.1)" />
            <circle cx="75" cy="90" r="5" fill="#2D2D2D" />
            <circle cx="125" cy="90" r="5" fill="#2D2D2D" />
            <ellipse cx="65" cy="110" rx="6" ry="3" fill="#FF9E9E" opacity="0.6" />
            <ellipse cx="135" cy="110" rx="6" ry="3" fill="#FF9E9E" opacity="0.6" />
            <path d="M85 110 Q100 125 115 110" stroke="#2D2D2D" fill="none" stroke-width="3" stroke-linecap="round" />
        </svg>`;
        game.charImage = new Image();
        game.charImage.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

        // Handle Resize
        const resize = () => {
            game.canvas.width = containerElement.clientWidth;
            game.canvas.height = containerElement.clientHeight;
            game.player.x = game.canvas.width / 2 - 30;
            game.player.y = game.canvas.height - 80;
        };
        window.addEventListener('resize', resize);
        resize();

        // Input Handling
        const inputHandler = (e) => {
            if (!game.isRunning) return;
            e.preventDefault();
            const rect = game.canvas.getBoundingClientRect();
            let clientX = e.clientX;

            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
            }

            game.player.x = (clientX - rect.left) - (game.player.width / 2);

            // Boundary checks
            if (game.player.x < 0) game.player.x = 0;
            if (game.player.x > game.canvas.width - game.player.width)
                game.player.x = game.canvas.width - game.player.width;
        };

        game.canvas.addEventListener('touchstart', inputHandler, { passive: false });
        game.canvas.addEventListener('touchmove', inputHandler, { passive: false });
        game.canvas.addEventListener('mousedown', inputHandler);
        game.canvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) inputHandler(e);
        });
    },

    start: (livesElement) => {
        game.isRunning = true;
        game.lives = 5;
        game.items = [];
        // Initial render of lives
        if (livesElement) livesElement.innerText = "❤️❤️❤️❤️❤️";
        game.loop(livesElement);
    },

    stop: () => {
        game.isRunning = false;
        cancelAnimationFrame(game.loopId);
    },

    loop: (livesElement) => {
        if (!game.isRunning) return;

        // Clear and fill background
        game.ctx.fillStyle = '#1e1b4b'; // Darker Indigo
        game.ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

        // Spawn Items
        if (Math.random() < 0.04) {
            const types = ['chicken', 'pizza', 'broccoli', 'money'];
            game.items.push({
                x: Math.random() * (game.canvas.width - 30),
                y: -30,
                type: types[Math.floor(Math.random() * types.length)],
                speed: 4 + Math.random() * 3
            });
        }

        // Update Items
        for (let i = game.items.length - 1; i >= 0; i--) {
            let item = game.items[i];
            item.y += item.speed;

            // Render Item
            game.ctx.font = "28px Pretendard";
            let icon = '';
            if (item.type === 'chicken') icon = '🍗';
            if (item.type === 'pizza') icon = '🍕';
            if (item.type === 'broccoli') icon = '🥦';
            if (item.type === 'money') icon = '💰';
            game.ctx.fillText(icon, item.x, item.y);

            // Collision Detection
            const hitBox = { x: item.x, y: item.y - 20, w: 30, h: 30 };
            const playerBox = { x: game.player.x + 10, y: game.player.y + 10, w: game.player.width - 20, h: game.player.height - 20 };

            if (
                hitBox.x < playerBox.x + playerBox.w &&
                hitBox.x + hitBox.w > playerBox.x &&
                hitBox.y < playerBox.y + playerBox.h &&
                hitBox.y + hitBox.h > playerBox.y
            ) {
                // If Item is Food (Bad)
                if (item.type === 'chicken' || item.type === 'pizza') {
                    game.lives--;

                    // Update UI
                    if (livesElement) {
                        livesElement.innerText = "❤️".repeat(Math.max(0, game.lives));
                    }

                    // Handheld Vibration (if supported)
                    if (navigator.vibrate) navigator.vibrate(200);

                    // Flash Red
                    game.ctx.fillStyle = "rgba(239, 68, 68, 0.5)";
                    game.ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

                    // Game Over Check
                    if (game.lives <= 0) {
                        game.stop();
                        // Show Game Over Overlay (Reuse Start Overlay with modified text)
                        const overlay = document.getElementById('game-start-overlay');
                        const title = overlay.querySelector('h2');
                        const desc = overlay.querySelector('p');
                        const btn = document.getElementById('btn-game-start');

                        if (overlay && title && desc && btn) {
                            title.innerText = "게임 종료!";
                            desc.innerText = "유혹에 굴복했습니다...";
                            btn.innerText = "다시 도전하기";
                            overlay.classList.remove('hidden');
                        }
                    }
                }
                // Collect Good Items (Just visual/sound for now per request)
                else {
                    // Optional: Visual float text or sound
                }

                game.items.splice(i, 1);
                continue;
            }

            // Remove out of bounds
            if (item.y > game.canvas.height) {
                game.items.splice(i, 1);
            }
        }

        // Render Player
        if (game.charImage && game.charImage.complete) {
            game.ctx.drawImage(game.charImage, game.player.x, game.player.y, game.player.width, game.player.height);
        } else {
            game.ctx.font = "36px Pretendard";
            game.ctx.fillText('😎', game.player.x, game.player.y + 35);
        }

        if (game.isRunning) {
            game.loopId = requestAnimationFrame(() => game.loop(livesElement));
        }
    }
};
