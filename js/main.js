// Ponto de entrada para IBZ the GAME
// Gerencia transições de estado e troca básica de telas

document.addEventListener('DOMContentLoaded', () => {
    // =============================================
    // 🔞 AGE GATE - Verifica se o usuário já aceitou
    // =============================================
    const ageGate = document.getElementById('age-gate');
    const enterGameBtn = document.getElementById('enter-game');

    if (localStorage.getItem('ibz-age-accepted')) {
        // Usuário já aceitou, esconder o portal imediatamente
        // MODO DESENVOLVEDOR: Comentado para forçar a exibição do Age Gate
        // if (ageGate) ageGate.classList.add('hidden');
    }

    if (enterGameBtn) {
        enterGameBtn.addEventListener('click', () => {
            localStorage.setItem('ibz-age-accepted', 'true');
            if (ageGate) {
                ageGate.style.opacity = '0';
                ageGate.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    ageGate.classList.add('hidden');
                }, 500);
            }
        });
    }
    // Screens
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const flappyScreen = document.getElementById('flappy-screen');
    const infoScreen = document.getElementById('info-screen');

    // Buttons
    const startBtn = document.getElementById('start-btn'); // Link to Map
    const startSurvivalBtn = document.getElementById('start-survival-btn'); // Link to Survival Mode

    const backToMenuBtn = document.getElementById('back-to-menu-btn'); // In Map
    const flappyMenuBtn = document.getElementById('flappy-menu-btn'); // In Flappy
    const flappyRestartBtn = document.getElementById('flappy-restart-btn');
    const infoBtn = document.getElementById('info-btn');
    const backFromInfoBtn = document.getElementById('back-from-info-btn');

    function showScreen(screen) {
        // Hide all
        [startScreen, gameScreen, flappyScreen, infoScreen].forEach(s => {
            if (s) s.classList.remove('active');
        });

        // Show target
        if (screen) screen.classList.add('active');

        // Stop Flappy if leaving it
        if (screen !== flappyScreen && window.FlappyGame && window.FlappyGame.stop) {
            window.FlappyGame.stop();
        }

        // Start Flappy if entering it
        if (screen === flappyScreen && window.FlappyGame && window.FlappyGame.init) {
             // Init if not already
             if (!window.FlappyGame.canvas) window.FlappyGame.init('flappy-canvas');
             window.FlappyGame.reset();
             window.FlappyGame.start(); // Auto start or wait for input? Let's wait for input in 'START' state
        }
    }

    // --- Event Listeners ---

    // 1. Go to Map Game
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            showScreen(gameScreen);
            // Initialize Map Game if needed (it currently runs on load in game.js, but we might want to reset positions)
        });
    }

    // 2. Go to Survival Game
    if (startSurvivalBtn) {
        startSurvivalBtn.addEventListener('click', () => {
            showScreen(flappyScreen);
        });
    }

    // 3. Back to Menu (from Map)
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', () => {
            showScreen(startScreen);
        });
    }

    // 4. Back to Menu (from Flappy)
    if (flappyMenuBtn) {
        flappyMenuBtn.addEventListener('click', () => {
            showScreen(startScreen);
        });
    }

    // 5. Restart Flappy
    if (flappyRestartBtn) {
        flappyRestartBtn.addEventListener('click', () => {
             if (window.FlappyGame) {
                window.FlappyGame.reset();
                window.FlappyGame.start();
            }
        });
    }

    // 6. Info Screen Navigation
    if (infoBtn) {
        infoBtn.addEventListener('click', () => {
            showScreen(infoScreen);
        });
    }

    if (backFromInfoBtn) {
        backFromInfoBtn.addEventListener('click', () => {
             showScreen(startScreen);
        });
    }

    // 7. Mute / Unmute + Volume control
    window._musicMuted = false;
    const muteMusicBtn = document.getElementById('mute-music-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const bgMusicEl = document.getElementById('bgMusic');
    const defaultVolume = 0.5;
    const savedVolume = localStorage.getItem('ibz-music-volume');
    if (bgMusicEl) {
        bgMusicEl.volume = savedVolume !== null ? parseFloat(savedVolume) : defaultVolume;
        if (volumeSlider) volumeSlider.value = Math.round((bgMusicEl.volume || defaultVolume) * 100);
    }
    if (muteMusicBtn && bgMusicEl) {
        muteMusicBtn.addEventListener('click', () => {
            if (bgMusicEl.paused) {
                bgMusicEl.play().catch(() => {});
                window._musicMuted = false;
                muteMusicBtn.textContent = '🔇 Music';
                muteMusicBtn.title = 'Mute music';
            } else {
                bgMusicEl.pause();
                window._musicMuted = true;
                muteMusicBtn.textContent = '🔈 Music';
                muteMusicBtn.title = 'Play music';
            }
        });
    }
    if (volumeSlider && bgMusicEl) {
        volumeSlider.addEventListener('input', () => {
            const v = volumeSlider.value / 100;
            bgMusicEl.volume = v;
            localStorage.setItem('ibz-music-volume', String(v));
        });
    }

    // Start on start screen
    showScreen(startScreen);
});
