// Entry point for IBZ the GAME
// Handles state transitions and basic screen switching

document.addEventListener('DOMContentLoaded', () => {
  const startScreen = document.getElementById('start-screen');
  const gameScreen = document.getElementById('game-screen');
  const endScreen = document.getElementById('end-screen');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const endMessage = document.getElementById('end-message');

  function showScreen(screen) {
    startScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    endScreen.classList.remove('active');
    screen.classList.add('active');
  }

  startBtn.addEventListener('click', () => {
    showScreen(gameScreen);
    // TODO: Initialize game logic
  });

  restartBtn.addEventListener('click', () => {
    showScreen(startScreen);
  });

  // Start on start screen
  showScreen(startScreen);
});
