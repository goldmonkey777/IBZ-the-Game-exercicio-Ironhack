// Core game logic: player movement, zones, collision, feedback

// Player state
const player = {
  x: 384, // initial position (centered)
  y: 284,
  size: 32,
  speed: 8,
  canMove: true
};

// Define zones (example coordinates and sizes)
const zones = [
  { name: 'Ibiza Town', x: 600, y: 400, w: 120, h: 100, color: 'rgba(0,0,255,0.2)' },
  { name: 'Sant Antoni', x: 80, y: 420, w: 120, h: 100, color: 'rgba(255,140,0,0.2)' },
  { name: 'North / Hippie', x: 300, y: 80, w: 180, h: 100, color: 'rgba(0,255,0,0.2)' },
  { name: 'Disco Area', x: 500, y: 120, w: 120, h: 80, color: 'rgba(255,0,255,0.2)' }
];

let currentZone = null;

function movePlayer(dx, dy) {
  if (!player.canMove) return;
  player.x = Math.max(0, Math.min(800 - player.size, player.x + dx));
  player.y = Math.max(0, Math.min(600 - player.size, player.y + dy));
  updatePlayerPosition();
  checkZoneEntry();
}

function updatePlayerPosition() {
  const playerEl = document.getElementById('player');
  playerEl.style.left = player.x + 'px';
  playerEl.style.top = player.y + 'px';
}

function checkZoneEntry() {
  let foundZone = null;
  for (const zone of zones) {
    if (
      player.x + player.size / 2 > zone.x &&
      player.x + player.size / 2 < zone.x + zone.w &&
      player.y + player.size / 2 > zone.y &&
      player.y + player.size / 2 < zone.y + zone.h
    ) {
      foundZone = zone;
      break;
    }
  }
  if (foundZone && (!currentZone || currentZone.name !== foundZone.name)) {
    currentZone = foundZone;
    showZoneFeedback(foundZone);
  } else if (!foundZone && currentZone) {
    hideZoneFeedback();
    currentZone = null;
  }
}

function showZoneFeedback(zone) {
  const mapContainer = document.getElementById('map-container');
  let zoneDiv = document.getElementById('zone-feedback');
  if (!zoneDiv) {
    zoneDiv = document.createElement('div');
    zoneDiv.id = 'zone-feedback';
    mapContainer.appendChild(zoneDiv);
  }
  zoneDiv.style.position = 'absolute';
  zoneDiv.style.left = zone.x + 'px';
  zoneDiv.style.top = zone.y + 'px';
  zoneDiv.style.width = zone.w + 'px';
  zoneDiv.style.height = zone.h + 'px';
  zoneDiv.style.background = zone.color;
  zoneDiv.style.border = '2px solid #333';
  zoneDiv.style.zIndex = 3;
  zoneDiv.style.display = 'flex';
  zoneDiv.style.alignItems = 'center';
  zoneDiv.style.justifyContent = 'center';
  zoneDiv.style.fontWeight = 'bold';
  zoneDiv.style.fontSize = '1.2em';
  zoneDiv.style.color = '#222';
  zoneDiv.innerText = zone.name;
}

function hideZoneFeedback() {
  const zoneDiv = document.getElementById('zone-feedback');
  if (zoneDiv) zoneDiv.remove();
}

// Expose for main.js
window.IBZGame = {
  movePlayer,
  updatePlayerPosition,
  checkZoneEntry,
  player
};
