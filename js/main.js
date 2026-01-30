// IBZ the Game — screen switching

document.addEventListener('DOMContentLoaded', () => {
  const ageGate = document.getElementById('age-gate');
  const enterBtn = document.getElementById('enter-game');
  // Tela 18+ sempre aparece ao carregar; só esconde ao clicar em "I understand"
  if (enterBtn && ageGate) {
    enterBtn.addEventListener('click', () => {
      localStorage.setItem('ibz-age-accepted', 'true');
      ageGate.style.opacity = '0';
      setTimeout(() => ageGate.classList.add('hidden'), 500);
    });
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');

    if (id === 'flappy-screen' && window.FlappyGame) {
      if (!window.FlappyGame.canvas) window.FlappyGame.init('flappy-canvas');
      window.FlappyGame.reset();
      window.FlappyGame.updateUI();
      // Music and game only start on first tap (Tap to Start) = sync with the song
    } else if (window.FlappyGame && window.FlappyGame.stop) {
      window.FlappyGame.stop();
    }
  }

  document.getElementById('start-survival-btn')?.addEventListener('click', () => showScreen('flappy-screen'));
  document.getElementById('how-to-play-btn')?.addEventListener('click', () => showScreen('how-to-play'));
  document.getElementById('info-btn')?.addEventListener('click', () => showScreen('info-screen'));
  document.getElementById('back-to-menu-btn')?.addEventListener('click', () => showScreen('start-screen'));
  document.getElementById('start-playing-from-howto')?.addEventListener('click', () => showScreen('flappy-screen'));
  document.getElementById('back-from-info-btn')?.addEventListener('click', () => showScreen('start-screen'));
  document.getElementById('flappy-menu-btn')?.addEventListener('click', () => showScreen('start-screen'));
  document.getElementById('flappy-restart-btn')?.addEventListener('click', () => {
    if (window.FlappyGame) { window.FlappyGame.reset(); window.FlappyGame.start(); }
  });

  const bg = document.getElementById('bgMusic');
  const vol = document.getElementById('volume-slider');
  const mute = document.getElementById('mute-music-btn');
  if (bg) {
    const v = localStorage.getItem('ibz-music-volume');
    bg.volume = v != null ? parseFloat(v) : 0.5;
    if (vol) vol.value = Math.round(bg.volume * 100);
  }
  if (mute && bg) mute.addEventListener('click', () => { bg.paused ? bg.play() : bg.pause(); });
  if (vol && bg) vol.addEventListener('input', () => { bg.volume = vol.value / 100; localStorage.setItem('ibz-music-volume', bg.volume); });

  // Initial screen = menu (Start Season / About). Do not open on Welcome to Ibiza.
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('start-screen').classList.add('active');
});
