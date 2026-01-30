// Música = único relógio. Letra entra LIGEIRAMENTE ANTES do vocal (segundos).
const LYRICS_LEAD = 0.28;
// Tempo que a letra permanece visível após o vocal (evita texto em silêncio)
const LYRICS_WINDOW_SEC = 3.2;

// Global lyrics controller — single source of truth; NEVER reset on zone change
const LyricsController = {
  index: 0,
  activeText: "",
  started: false
};

const FlappyGame = {
  canvas: null,
  ctx: null,
  animationFrameId: null,
  state: 'START', // START, PLAYING, GAMEOVER
  score: 0,

  // Game settings
  // Game settings
  gravity: 0.4,
  jumpStrength: -12, // Tuned: -12/0.4 = 30 frames up + 30 down = 60 frames (1 sec / 2 beats)
  groundY: 0,
  speed: 3,
  // spawnRate removed (handled in update loop via beat calculation)

  // Audio Spectrum & Beat Detection
  analyser: null,
  spectrumData: null,
  onBeat: false,
  lastBassHit: false,
  beatPulse: 1, // Scale multiplier for visual pulse

  // Entities
  player: {
    x: 50,
    y: 0,
    w: 40,
    h: 60, // Human height
    dy: 0,
    isDucking: false,
    originalH: 60,
    duckH: 30,
    color: '#3498db' // Worker Blue
  },

  entities: [], // Obstacles and Items
  frame: 0,

  // Official zones (exact names): Cala Saladeta → Norte Hippie → Universo → Ibiza → Dalt Vila
  zones: ['Cala Saladeta', 'Norte Hippie', 'Universo', 'Ibiza', 'Dalt Vila'],
  currentZoneIndex: 0,

  // Zones by music time (seconds): phase split by song time; first change at 40s so phases are visible
  zoneTimeThresholds: [0, 40, 80, 160, 320], // Cala Saladeta (0–40s) | Norte (40–80) | Universo (80–160) | Ibiza (160–320) | Dalt Vila (320+)

  // Interaction dialogues: always on collision; 6 seconds of dialogue in all areas (beach, club, city, hippie)
  NPC_DIALOGUE_DURATION_FRAMES: 6 * 60, // 6 seconds at ~60 fps
  npcDialogues: {
    chica: {
      request: "Hey Miranda give me a Mojito",
      reply: "Sure! Here you go."
    },
    hippie: {
      request: "Hey Miranda, take this flower."
    },
    police: {
      request: "Hey, do you have drugs?"
    }
  },

  // Benediction – Hot Natured | Music = único relógio; time = ataque do vocal (s); texto em (time - LYRICS_LEAD).
  LYRICS_LEAD,
  lyricsLines: [
    { time: 12.20, text: "Hey!" },
    { time: 13.90, text: "Hey!" },
    { time: 19.00, text: "When I give you my love…" },
    { time: 22.45, text: "I want you to want me…" },
    { time: 27.10, text: "You know I got it…" },
    { time: 30.45, text: "I want you to want me…" },
    { time: 35.55, text: "Benediction…" },
    { time: 38.95, text: "Benediction…" },
    { time: 45.25, text: "When I give you my love…" },
    { time: 48.65, text: "I want you to want me…" },
    { time: 53.45, text: "You know I got it…" },
    { time: 56.75, text: "I want you to want me…" },
    { time: 61.95, text: "Benediction…" },
    { time: 65.35, text: "Benediction…" }
  ],

  // Obstacle Timeline (seconds) - Calibrated from verified timestamps
  // Reference: 40s="Hey", 51s="Feeling", 116s="Wait" → confirms ~120 BPM
  // 1 beat = 0.5s, 1 bar (4 beats) = 2s
  // First bar starts at 0s (music start)
  obstacleTimeline: [],
  currentObstacleIndex: 0,

  // BPM real Benediction ≈123 (swing house, vocais off-beat)
  bpm: 123,
  barDuration: 1.951, // 4 beats @ 123 BPM = 60/123*4
  firstBarOffset: 0,

  // Fine sync adjustment (seconds): positive = lyric later, negative = earlier
  lyricsOffsetSeconds: 0, // loaded from localStorage at start; + = lyrics later, - = earlier
  // AudioContext = relógio preciso; base e latência para sync tipo LyricsSync
  lyricsSyncBase: null,
  lyricsLatencyComp: 0,

  // Debug overlay (toggle with D) — invisible to players, for calibration
  debugOverlay: false,

  // Vocal spectrum: only show lyrics bubble when vocal energy above threshold (avoids stale text)
  useVocalFilter: false, // true = só mostra letra quando há vocal; false = mostra pelo tempo da música
  vocalThreshold: 15, // tune in debug overlay; bins 1–5 ≈ 300Hz–3kHz

  // =============================================
  // 🎵 SONG SECTIONS - The heart of the game
  // Each section has: type, vibe, start, end, and GAME RULES
  // =============================================
  sections: [
    // INTRO (0:00 - 0:40) - Calm buildup
    { type: "intro", vibe: "build", start: 0, end: 40,
      speed: 2, obstacleRate: 0, seaCalm: true, hudOpacity: 1 },

    // VERSE 1 (0:40 - 1:10)
    { type: "verse", vibe: "flow", start: 40, end: 70,
      speed: 3, obstacleRate: 8, seaCalm: false, hudOpacity: 1 },

    // PRE-CHORUS 1 (1:10 - 1:20)
    { type: "pre-chorus", vibe: "lift", start: 70, end: 80,
      speed: 3.5, obstacleRate: 6, seaCalm: false, hudOpacity: 1 },

    // CHORUS 1 (1:20 - 1:50)
    { type: "chorus", vibe: "drive", start: 80, end: 110,
      speed: 4, obstacleRate: 3, seaCalm: false, hudOpacity: 1 },

    // VERSE 2 (1:50 - 2:20)
    { type: "verse", vibe: "flow", start: 110, end: 140,
      speed: 3, obstacleRate: 8, seaCalm: false, hudOpacity: 1 },

    // PRE-CHORUS 2 (2:20 - 2:30)
    { type: "pre-chorus", vibe: "lift", start: 140, end: 150,
      speed: 3.5, obstacleRate: 6, seaCalm: false, hudOpacity: 1 },

    // CHORUS 2 (2:30 - 3:00)
    { type: "chorus", vibe: "drive", start: 150, end: 180,
      speed: 4, obstacleRate: 3, seaCalm: false, hudOpacity: 1 },

    // BRIDGE 1 (3:00 - 3:20) - Emotional, ethereal
    { type: "bridge", vibe: "emotional", start: 180, end: 200,
      speed: 2.5, obstacleRate: 12, seaCalm: true, hudOpacity: 0.6 },

    // HOOK 1 (3:20 - 3:40) - Transcendence
    { type: "hook", vibe: "transcend", start: 200, end: 220,
      speed: 2, obstacleRate: 15, seaCalm: true, hudOpacity: 0.3 },

    // BRIDGE 2 (3:40 - 4:00)
    { type: "bridge", vibe: "emotional", start: 220, end: 240,
      speed: 2.5, obstacleRate: 12, seaCalm: true, hudOpacity: 0.6 },

    // HOOK 2 (4:00 - 4:30)
    { type: "hook", vibe: "transcend", start: 240, end: 270,
      speed: 2, obstacleRate: 15, seaCalm: true, hudOpacity: 0.3 },

    // OUTRO (4:30+) - Fade out, peaceful
    { type: "outro", vibe: "fade", start: 270, end: 399,
      speed: 2, obstacleRate: 0, seaCalm: true, hudOpacity: 0.5 }
  ],

  currentSection: null,

  // Get current section based on music time
  getCurrentSection(time) {
    for (let i = this.sections.length - 1; i >= 0; i--) {
      if (time >= this.sections[i].start) {
        return this.sections[i];
      }
    }
    return this.sections[0];
  },

  // Tempo de playback: AudioContext quando disponível (relógio preciso), senão media.currentTime.
  getLyricsTime(audio) {
    if (!audio || audio.paused) return audio ? audio.currentTime : 0;
    if (this.audioCtx && this.lyricsSyncBase != null) {
      const ctxTime = this.audioCtx.currentTime - this.lyricsSyncBase;
      return ctxTime + (this.lyricsLatencyComp || 0);
    }
    return audio.currentTime;
  },

  // Sincronização: relógio = música (AudioContext ou currentTime). Todo frame; while = catch-up.
  updateLyrics(audio) {
    if (!audio || audio.paused) return;

    const t = this.getLyricsTime(audio) + (this.lyricsOffsetSeconds || 0);

    if (!LyricsController.started) LyricsController.started = true;

    // Catch-up: avançar todas as letras que já deveriam estar visíveis (evita atraso acumulado)
    while (
      this.lyricsLines[LyricsController.index] &&
      t >= this.lyricsLines[LyricsController.index].time - LYRICS_LEAD
    ) {
      LyricsController.activeText = this.lyricsLines[LyricsController.index].text;
      LyricsController.index++;
    }

    // Nunca mostrar texto durante silêncio musical: limpar após a janela da letra
    const idx = LyricsController.index;
    if (idx > 0) {
      const lastShown = this.lyricsLines[idx - 1];
      if (t > lastShown.time + LYRICS_WINDOW_SEC) LyricsController.activeText = "";
    }
  },

  // Retorna a letra ativa no tempo t (só audio; usado ex.: spawn Chica)
  getActiveLyric(t) {
    const adj = t + (this.lyricsOffsetSeconds || 0);
    const current = this.lyricsLines.find(l => adj >= l.time - LYRICS_LEAD && adj < l.time + LYRICS_WINDOW_SEC);
    if (current) return current;
    const lastStarted = this.lyricsLines.filter(l => l.time - LYRICS_LEAD <= adj).pop();
    return lastStarted && adj < lastStarted.time + LYRICS_WINDOW_SEC ? lastStarted : null;
  },

  // Vocal energy (bins 1–5 ≈ 300Hz–3kHz) for auto-sync: only show bubble when vocal present
  getVocalEnergy() {
    if (!this.analyser || !this.spectrumData) return 0;
    this.analyser.getByteFrequencyData(this.spectrumData);
    const len = this.spectrumData.length;
    let sum = 0;
    let count = 0;
    for (let i = 1; i <= 5 && i < len; i++) {
      sum += this.spectrumData[i];
      count++;
    }
    return count ? sum / count : 0;
  },

  // Generate timeline with PROGRESSIVE DIFFICULTY
  // SUPER EASY: 0-4 min (obstacles every 10s - let the player SING!)
  // Medium: 4-5 min (every 4s)
  // Hard: 5-6:39 (every 2s)
  generateObstacleTimeline() {
      this.obstacleTimeline = [];
      const musicDuration = 399; // 6:39

      // First spawns early (3s, 5s, 8s) so the beach doesn’t feel static
      this.obstacleTimeline.push(3, 5, 8);
      // Phase 1: SUPER EASY (10-240s) - Every 10 seconds
      for (let t = 10; t < 240; t += 10) {
          this.obstacleTimeline.push(t);
      }

      // Phase 2: MEDIUM (240-300s = 4-5 minutes) - Every 4 seconds
      for (let t = 240; t < 300; t += 4) {
          this.obstacleTimeline.push(t);
      }

      // Phase 3: HARD (300-399s = 5+ minutes) - Every 2 seconds (FINALE!)
      for (let t = 300; t < musicDuration; t += 2) {
          this.obstacleTimeline.push(t);
      }

      this.obstacleTimeline.sort((a, b) => a - b);
      console.log(`Timeline: ${this.obstacleTimeline.length} obstacles (early 3/5/8s → Easy→Medium→Hard)`);
  },

  // Assets
  assets: {
      score: new Image(),
      collision: new Image(),
      jump: new Image(),
      bonus: new Image(),
      money: new Image()
  },

  // FX State
  activeFX: [],

  // Audio State
  audioCtx: null,
  gameOverReason: '',

  initAudio() {
      if (this.audioCtx) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
          this.audioCtx = new AudioContext();
      }
  },

  playSound(type) {
      if (!this.audioCtx) return;

      const oscillator = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      if (type === 'jump') {
          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(150, this.audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(600, this.audioCtx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
          oscillator.start();
          oscillator.stop(this.audioCtx.currentTime + 0.1);
      } else if (type === 'score') {
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(440, this.audioCtx.currentTime);
          oscillator.frequency.setValueAtTime(880, this.audioCtx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
          oscillator.start();
          oscillator.stop(this.audioCtx.currentTime + 0.1);
      } else if (type === 'crash') {
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(100, this.audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(10, this.audioCtx.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(this.audioCtx.currentTime + 0.3);
      } else if (type === 'powerup') {
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(330, this.audioCtx.currentTime);
          oscillator.frequency.linearRampToValueAtTime(660, this.audioCtx.currentTime + 0.2);
          oscillator.frequency.linearRampToValueAtTime(880, this.audioCtx.currentTime + 0.4);
          gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.4);
          oscillator.start();
          oscillator.stop(this.audioCtx.currentTime + 0.4);
      }
  },

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.groundY = this.canvas.height - 20; // 20px ground

    // Init Audio (User interaction required first typically, but we init struct here)
    // We will call resume() on first interaction if needed keydown
    this.initAudio();

    // Load Assets
    // Load Assets
    // this.assets.score.src = 'assets/images/fx/score.png';     // Missing -> Uses fallback
    // this.assets.collision.src = 'assets/images/fx/collision.png'; // Missing -> Uses fallback
    // this.assets.jump.src = 'assets/images/fx/jump.png';       // Missing -> Uses fallback
    // this.assets.bonus.src = 'assets/images/fx/bonus.png';     // Missing -> Uses fallback
    this.assets.money.src = 'assets/images/sprites/money.png';
    this.assets.map = new Image();
    this.assets.map.src = 'assets/images/istockphoto-516624722-612x612.jpg'; // Real Map

    // Input Handling
    this.handleInput = this.handleInput.bind(this);
    this.handleStopInput = this.handleStopInput.bind(this);

    document.addEventListener('keydown', this.handleInput);
    document.addEventListener('keyup', this.handleStopInput);
    this.canvas.addEventListener('mousedown', () => {
        if(this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
        if (this.state === 'START' || this.state === 'GAMEOVER') this.action();
        else this.jump();
    });
    this.canvas.addEventListener('touchstart', (e) => {
        if(this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
        e.preventDefault();
        if (this.state === 'START' || this.state === 'GAMEOVER') this.action();
        else this.jump();
    });

    this.reset();
    this.draw();
  },

  handleInput(e) {
      // Debug overlay: toggle with D (works in any state)
      if (e.code === 'KeyD' && !e.repeat) {
          this.debugOverlay = !this.debugOverlay;
          e.preventDefault();
      }
      // Vocal filter: toggle with V (only when debug on)
      if (e.code === 'KeyV' && !e.repeat && this.debugOverlay) {
          this.useVocalFilter = !this.useVocalFilter;
          e.preventDefault();
      }
      // Line nudge and threshold: when debug on
      if (this.debugOverlay && !e.repeat) {
          const i = LyricsController.index;
          if (e.code === 'Comma' && i < this.lyricsLines.length) {
              this.lyricsLines[i].time = Math.max(0, this.lyricsLines[i].time - 0.05);
              e.preventDefault();
          }
          if (e.code === 'Period' && i < this.lyricsLines.length) {
              this.lyricsLines[i].time = Math.min(399, this.lyricsLines[i].time + 0.05);
              e.preventDefault();
          }
          if (e.code === 'Minus') {
              this.vocalThreshold = Math.max(0, this.vocalThreshold - 2);
              e.preventDefault();
          }
          if (e.code === 'Equal' || e.code === 'NumpadEqual') {
              this.vocalThreshold = Math.min(255, this.vocalThreshold + 2);
              e.preventDefault();
          }
      }

      if (this.state !== 'PLAYING') {
          // 🎛️ Lyrics calibration (works even outside PLAYING)
          if (e.code === 'BracketLeft') {
              this.lyricsOffsetSeconds = (this.lyricsOffsetSeconds || 0) - 0.05;
              localStorage.setItem('ibz-lyrics-offset-seconds', String(this.lyricsOffsetSeconds));
          }
          if (e.code === 'BracketRight') {
              this.lyricsOffsetSeconds = (this.lyricsOffsetSeconds || 0) + 0.05;
              localStorage.setItem('ibz-lyrics-offset-seconds', String(this.lyricsOffsetSeconds));
          }
          if (e.code === 'Space' || e.code === 'Enter') this.action();
          return;
      }

      if (e.code === 'ArrowUp' || e.code === 'Space') {
          this.jump();
      }
      if (e.code === 'ArrowDown') {
          this.duck(true);
      }
      // 🎛️ Lyrics calibration (real-time)
      if (e.code === 'BracketLeft') {
          this.lyricsOffsetSeconds = (this.lyricsOffsetSeconds || 0) - 0.05;
          localStorage.setItem('ibz-lyrics-offset-seconds', String(this.lyricsOffsetSeconds));
      }
      if (e.code === 'BracketRight') {
          this.lyricsOffsetSeconds = (this.lyricsOffsetSeconds || 0) + 0.05;
          localStorage.setItem('ibz-lyrics-offset-seconds', String(this.lyricsOffsetSeconds));
      }
  },

  handleStopInput(e) {
      if (e.code === 'ArrowDown') {
          this.duck(false);
      }
  },

  action() {
    if (this.state === 'START' || this.state === 'GAMEOVER') {
      if(this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
      this.start();
    }
  },

  start() {
    this.reset();
    this.state = 'PLAYING';
    this.generateObstacleTimeline(); // Build timeline

    // Load persisted lyrics calibration (if any)
    const savedLyricsOffset = localStorage.getItem('ibz-lyrics-offset-seconds');
    if (savedLyricsOffset !== null && !isNaN(parseFloat(savedLyricsOffset))) {
        this.lyricsOffsetSeconds = parseFloat(savedLyricsOffset);
    }

    // Play Music & Setup Spectrum Analyser (unless user muted)
    const music = document.getElementById('bgMusic');
    if (music) {
        music.currentTime = 0; // Always from the start: lyrics and obstacles synced with the music
        const savedVol = localStorage.getItem('ibz-music-volume');
        if (savedVol !== null) music.volume = parseFloat(savedVol);
        else if (typeof music.volume !== 'number' || isNaN(music.volume)) music.volume = 0.5;
        if (typeof window._musicMuted === 'undefined' || !window._musicMuted) {
            music.play().catch(e => console.log("Audio play failed:", e));
        }

        // Setup Analyser (once)
        if (!this.analyser && this.audioCtx) {
            try {
                const source = this.audioCtx.createMediaElementSource(music);
                this.analyser = this.audioCtx.createAnalyser();
                this.analyser.fftSize = 64; // Small for performance
                source.connect(this.analyser);
                this.analyser.connect(this.audioCtx.destination);
                this.spectrumData = new Uint8Array(this.analyser.frequencyBinCount);
            } catch (e) {
                console.log("Analyser setup failed:", e);
            }
        }

        // Relógio preciso (LyricsSync-style): base = ctx - media no PLAY
        if (this.audioCtx) {
            this.lyricsSyncBase = this.audioCtx.currentTime - music.currentTime;
            this.lyricsLatencyComp = this.audioCtx.outputLatency || 0;
        }
    }

    this.loop();
    this.updateUI();
  },

  reset() {
    this.state = 'START';
    this.score = 0;
    this.speed = 3; // Reset to match new base speed
    this.currentZoneIndex = 0;
    this.frame = 0;
    this.lives = 5; // Start with 5 Lives (Easier)
    this.energy = 0; // New Energy Stat
    this.money = 0; // Currency
    this.invulnerable = false;
    this.invulnerableTimer = 0;
    this.lastMilestone = 0; // Track score milestones

    // Reset Player
    this.player.y = this.groundY - this.player.h;
    this.player.dy = 0;
    this.player.h = this.player.originalH;
    this.player.isDucking = false;

    this.entities = [];
    this.activeFX = [];
    this.currentObstacleIndex = 0; // Reset timeline index

    // Zen Mode State (Zone 1 Feature)
    this.zenMode = false;
    this.zenTimer = 0;
    this.musicAlterTimer = 0;
    this.policeSpawnBlockedUntil = 0;

    // 🎧 CLUB: Drug state (risk/reward)
    this.drugEffect = false;
    this.drugEffectUntil = 0;
    this.baseSpeed = 3;
    this.baseJumpStrength = -12;

    // 🚓 Prison & Escape
    this.prisonFlashFrames = 0;
    this.escapeSurviveUntil = 0;

    // Single NPC Event controller (freezes gameplay, fixed 6s, bubble above NPC)
    this.npcEvent = {
      active: false,
      type: null,   // 'chica' | 'hippie' | 'police'
      npc: null,
      text: '',
      timer: 0,
      duration: 360, // 6s a ~60fps
      hadDrug: false // only for police
    };

    // LyricsController: reset only on new game, NEVER on zone change
    LyricsController.index = 0;
    LyricsController.activeText = "";
    LyricsController.started = false;

    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;

    this.updateUI();
  },

  jump() {
      // Can only jump if on ground
      if (this.player.y + this.player.h >= this.groundY - 1) {
          this.player.dy = this.jumpStrength;
          this.player.isDucking = false;
          this.player.h = this.player.originalH; // Un-duck if jumping

          // FX
          this.playSound('jump');
          // this.spawnFX('jump', this.player.x, this.player.y + this.player.h);
      }
  },

  duck(isDucking) {
      this.player.isDucking = isDucking;
      if (isDucking) {
          this.player.h = this.player.duckH;
          // Push down if in air? No, usually ducking is for ground sliding or faster drop
          if (this.player.y + this.player.h < this.groundY) {
               this.player.dy += 5; // Fast drop
          }
      } else {
          this.player.h = this.player.originalH;
          this.player.y -= (this.player.originalH - this.player.duckH); // Pop up
      }
  },

  loop() {
    if (this.state !== 'PLAYING' && this.state !== 'EVENT' && this.state !== 'PRISON') return;
    this.update();
    this.draw();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  },

  update() {
    this.frame++;

    // Continuous lyrics update — music is the clock; runs every frame; zone-independent
    this.updateLyrics(document.getElementById('bgMusic'));

    // ** STATE MANAGEMENT: EVENT ** — gameplay fully frozen
    if (this.state === 'EVENT') {
        this.updateEvent();
        return;
    }

    // ** STATE MANAGEMENT: PRISON ** (pause + flash, then apply penalty)
    if (this.state === 'PRISON') {
        this.prisonFlashFrames--;
        if (this.prisonFlashFrames <= 0) {
            this.state = 'PLAYING';
            this.drugEffect = false;
            this.drugEffectUntil = 0;
            this.speed = this.baseSpeed;
            this.jumpStrength = this.baseJumpStrength;
        }
        return;
    }

    // Zen Mode Timer
    if (this.zenTimer > 0) {
        this.zenTimer--;
        this.zenMode = true;
    } else {
        this.zenMode = false;
    }
    if (this.musicAlterTimer > 0) this.musicAlterTimer--;

    // Drug effect duration (club boost) — when it ends, restores speed and jump
    if (this.drugEffect && this.frame >= this.drugEffectUntil) {
        this.drugEffect = false;
        this.drugEffectUntil = 0;
        this.speed = this.baseSpeed;
        this.jumpStrength = this.baseJumpStrength;
    }
    if (this.policeSpawnBlockedUntil > 0 && this.frame >= this.policeSpawnBlockedUntil) {
        this.policeSpawnBlockedUntil = 0;
    }

    // Manage Invulnerability
    if (this.invulnerable) {
        this.invulnerableTimer--;
        if (this.invulnerableTimer <= 0) {
            this.invulnerable = false;
        }
    }

    // -- BEAT DETECTION from Spectrum (Bass = first 2 bins) --
    this.onBeat = false; // Reset each frame
    if (this.analyser && this.spectrumData) {
        this.analyser.getByteFrequencyData(this.spectrumData);
        // Bass = average of first 2 frequency bins
        const bass = (this.spectrumData[0] + this.spectrumData[1]) / 2;
        const bassThreshold = 180; // Adjust for sensitivity

        if (bass > bassThreshold && !this.lastBassHit) {
            this.onBeat = true;
            this.lastBassHit = true;
            // Visual pulse on beat
            this.beatPulse = 1.2; // Scale factor
        } else if (bass < bassThreshold - 30) {
            this.lastBassHit = false;
        }

        // Decay pulse
        if (this.beatPulse > 1) {
            this.beatPulse -= 0.05;
            if (this.beatPulse < 1) this.beatPulse = 1;
        }
    }

    // =============================================
    // 🎵 SECTION-BASED GAME RULES
    // Speed, difficulty, and mood change with the music
    // =============================================
    const music = document.getElementById('bgMusic');
    if (music && !music.paused) {
        const currentTime = music.currentTime;
        this.currentSection = this.getCurrentSection(currentTime);

        // Apply section-based speed (smooth transition); drug boost on top
        let targetSpeed = this.currentSection.speed;
        if (this.drugEffect) targetSpeed += 0.8;
        if (this.speed < targetSpeed) {
            this.speed += 0.05;
        } else if (this.speed > targetSpeed) {
            this.speed -= 0.05;
        }
    }
    if (this.drugEffect && this.jumpStrength > this.baseJumpStrength - 2) {
        this.jumpStrength = Math.max(this.baseJumpStrength - 2, -16); // Longer jump when on drug
    }

    // Lives & Speed Boost Milestone (Every 100 fruits/cocktails)
    // Check if current score passed a new 100 threshold
    const currentMilestone = Math.floor(this.score / 100);
    if (currentMilestone > this.lastMilestone) {
        this.lastMilestone = currentMilestone;
        this.lives++;
        this.speed += 1.0; // Significant Speed Boost as requested
        this.playSound('powerup');
        // Optional: Short notification visual could be added here
        this.spawnFX('score', this.player.x, this.player.y - 50); // Reuse visual for now
    }

    // Zone change by MUSIC (song time), not by score — synced transition
    const musicEl = document.getElementById('bgMusic');
    const audioTime = musicEl && !musicEl.paused ? musicEl.currentTime : 0;
    const thresholds = this.zoneTimeThresholds;
    if (audioTime < thresholds[1]) this.currentZoneIndex = 0;       // 0–40s Cala Saladeta
    else if (audioTime < thresholds[2]) this.currentZoneIndex = 1;  // 40–80s Norte Hippie
    else if (audioTime < thresholds[3]) this.currentZoneIndex = 2;  // 80–160s Universo
    else if (audioTime < thresholds[4]) this.currentZoneIndex = 3;   // 160–320s Ibiza
    else this.currentZoneIndex = 4;                                 // 320s+ Dalt Vila

    // -- Player Physics --
    this.player.dy += this.gravity;
    this.player.y += this.player.dy;

    // Ground collision
    if (this.player.y + this.player.h > this.groundY) {
        this.player.y = this.groundY - this.player.h;
        this.player.dy = 0;
    }

    // -- Spawning (timeline synced with audio) --
    // Music is the MACRO CLOCK.
    if (music && !music.paused) {
        const t = music.currentTime;
        if (
            this.currentObstacleIndex < this.obstacleTimeline.length &&
            t >= this.obstacleTimeline[this.currentObstacleIndex]
        ) {
            this.spawnEntity(t);
            this.currentObstacleIndex++;
        }
    }

    // -- Entidades --
    for (let i = 0; i < this.entities.length; i++) {
        let e = this.entities[i];

        // Seagulls: fly only in the upper part, left→right or right→left (no collision)
        if (e.name === 'Seagull') {
            const birdSpeed = 2.5;
            e.x += (e.direction === 1 ? birdSpeed : -birdSpeed);
        } else {
            e.x -= this.speed;
        }

        // Check Collision (Skip DECOR type)
        if (e.type !== 'DECOR' &&
            this.player.x < e.x + e.w &&
            this.player.x + this.player.w > e.x &&
            this.player.y < e.y + e.h &&
            this.player.y + this.player.h > e.y
        ) {
             if (e.type === 'GOOD') {
                // Collect item: reward only; zone change ONLY by score (update), never here
                if (e.name === 'Sunbather') {
                    // 💋 Social Boost: +1 Life
                    if (this.lives < 5) this.lives++;
                    this.playSound('score');
                    this.spawnFX('heart', e.x, e.y);
                } else if (e.name === 'Chica' || e.name === 'ChicaSilhouette') {
                    this.startNPCEvent('chica', e, this.npcDialogues.chica.request);
                    this.playSound('score');
                } else if (e.name === 'Hippie') {
                    this.startNPCEvent('hippie', e, this.npcDialogues.hippie.request);
                    this.playSound('score');
                } else if (e.name === 'Flower') {
                    // Loose flower (no Hippie): immediate effect
                    this.score += e.value || 10;
                    this.playSound('score');
                    this.spawnFX('flower', e.x, e.y);
                    const flowerRoll = Math.random();
                    if (flowerRoll < 0.33) { if (this.lives < 5) this.lives++; }
                    else if (flowerRoll < 0.66) { this.zenTimer = 300; this.invulnerable = true; this.invulnerableTimer = 90; }
                    else { this.zenTimer = 200; this.musicAlterTimer = 180; this.policeSpawnBlockedUntil = this.frame + 300; }
                } else if (e.name === 'Dealer') {
                    // 💊 Club: accept drugs — fruits/cocktails + boost, police will chase
                    this.money += 80;
                    this.energy = Math.min(100, (this.energy || 0) + 30);
                    this.drugEffect = true;
                    this.drugEffectUntil = this.frame + 600; // 10 sec
                    this.speed += 0.8;
                    this.jumpStrength = Math.min(-14, this.jumpStrength - 2);
                    this.playSound('score');
                    this.spawnFX('score', e.x, e.y);
                } else if (e.name === 'Fruit' || e.name === 'Drink') {
                    // Beach (and other zones): fruits and cocktails
                    this.money += e.value || 10;
                    this.score += e.value || 10;
                    this.playSound('score');
                    this.spawnFX('score', e.x, e.y);
                } else {
                    // Standard Item
                    this.score += e.value;
                    this.playSound('score');
                    this.spawnFX('score', e.x, e.y);
                }
                if (!e.isEventChica) e.passed = true;
                this.updateUI();
            } else if (e.type === 'BAD') {
                // Custom BAD Logic (Gold Digger / Police / Standard)
                if (e.name === 'GoldDigger') {
                    // Universo: 50% drugs (money + police risk) / 50% kiss (life only)
                    if (Math.random() < 0.5) {
                        this.money += 40;
                        this.drugEffect = true;
                        this.drugEffectUntil = this.frame + 600;
                        this.speed += 0.5;
                        this.jumpStrength = Math.min(-14, this.jumpStrength - 1);
                        this.spawnFX('score', e.x, e.y);
                    } else {
                        if (this.lives < 5) this.lives++;
                        this.spawnFX('heart', e.x, e.y);
                    }
                    this.playSound('score');
                } else if (e.name === 'Police' && this.currentZoneIndex === 3) {
                    if (!this.invulnerable) {
                        this.startNPCEvent('police', e, this.npcDialogues.police.request, { hadDrug: this.drugEffect });
                        this.playSound('crash');
                    }
                } else if (e.name === 'Police') {
                    if (!this.invulnerable) {
                        this.lives--;
                        this.playSound('crash');
                        if (this.lives <= 0) this.gameOver('Busted by Police!');
                        else { this.invulnerable = true; this.invulnerableTimer = 60; }
                    }
                } else {
                     if (!this.invulnerable) {
                        this.lives--;
                        this.playSound('crash');
                        this.spawnFX('collision', this.player.x, this.player.y);
                        if (this.lives <= 0) this.gameOver('Game Over');
                        else { this.invulnerable = true; this.invulnerableTimer = 60; }
                     }
                }
                if (!(e.name === 'Police' && this.state === 'EVENT' && this.npcEvent.type === 'police')) e.passed = true;
            }
        }


        // Remove: off-screen or already passed
        const offLeft = e.x + e.w < 0;
        const offRight = e.x > this.canvas.width;
        if (e.name === 'Seagull') {
            if (offLeft || offRight) {
                this.entities.splice(i, 1);
                i--;
            }
        } else if (offLeft || (e.passed && !(this.npcEvent.active && this.npcEvent.npc === e))) {
            this.entities.splice(i, 1);
            i--;
        }
    }

    // Check End of Music (Victory condition)
    if (music && music.ended && this.state === 'PLAYING') {
        this.gameOver('You survived the season! 🎉');
        return;
    }

    // -- FX update --
    for (let i = 0; i < this.activeFX.length; i++) {
        let fx = this.activeFX[i];
        fx.life--;
        fx.y -= 1;
        if (fx.life <= 0) {
            this.activeFX.splice(i, 1);
            i--;
        }
    }
  },

  spawnFX(type, x, y) {
      this.activeFX.push({
          type: type,
          x: x,
          y: y,
          life: 30, // Frames
          maxLife: 30
      });
  },

  startNPCEvent(type, npc, text, extra = {}) {
      this.state = 'EVENT';
      this.npcEvent.active = true;
      this.npcEvent.type = type;
      this.npcEvent.npc = npc;
      this.npcEvent.text = text;
      this.npcEvent.replyText = (type === 'chica' && this.npcDialogues.chica.reply) ? this.npcDialogues.chica.reply : '';
      this.npcEvent.timer = 0;
      this.npcEvent.duration = 360;
      this.npcEvent.hadDrug = extra.hadDrug || false;
  },

  updateEvent() {
      this.npcEvent.timer++;
      if (this.npcEvent.timer >= this.npcEvent.duration) {
          this.endNPCEvent();
      }
  },

  endNPCEvent() {
      const ev = this.npcEvent;
      const npc = ev.npc;

      if (ev.type === 'chica') {
          if (this.lives < 5) this.lives++;
          this.money += 35;
          this.energy = Math.min(100, (this.energy || 0) + 15);
          this.score += 8;
          this.playSound('score');
          this.spawnFX('mojito', this.player.x + 20, this.player.y - 40);
      } else if (ev.type === 'hippie') {
          this.score += npc ? (npc.value || 10) : 10;
          this.playSound('score');
          this.spawnFX('flower', this.player.x + 20, this.player.y - 40);
          const flowerRoll = Math.random();
          if (flowerRoll < 0.33) { if (this.lives < 5) this.lives++; }
          else if (flowerRoll < 0.66) { this.zenTimer = 300; this.invulnerable = true; this.invulnerableTimer = 90; }
          else { this.zenTimer = 200; this.musicAlterTimer = 180; this.policeSpawnBlockedUntil = this.frame + 300; }
      } else if (ev.type === 'police') {
          if (ev.hadDrug) {
              const escapeChance = 0.4;
              if (Math.random() < escapeChance) {
                  this.drugEffect = false;
                  this.drugEffectUntil = 0;
                  this.speed = this.baseSpeed;
                  this.jumpStrength = this.baseJumpStrength;
                  this.policeSpawnBlockedUntil = this.frame + 300;
                  this.playSound('score');
              } else {
                  const livesLost = 2 + (Math.random() < 0.5 ? 1 : 0);
                  this.lives = Math.max(0, this.lives - livesLost);
                  this.money = Math.floor(this.money * 0.5);
                  this.drugEffect = false;
                  this.drugEffectUntil = 0;
                  this.state = 'PRISON';
                  this.prisonFlashFrames = 60;
                  this.playSound('crash');
                  if (this.lives <= 0) this.gameOver('Busted!');
              }
          } else {
              this.lives = Math.max(0, this.lives - 1);
              if (this.lives <= 0) this.gameOver('Busted by Police!');
              else { this.invulnerable = true; this.invulnerableTimer = 60; }
          }
      }

      if (npc) {
          npc.passed = true;
          this.entities = this.entities.filter(ent => ent !== npc);
      }
      this.npcEvent.active = false;
      this.npcEvent.type = null;
      this.npcEvent.npc = null;
      this.npcEvent.text = '';
      this.npcEvent.replyText = '';
      this.npcEvent.timer = 0;
      this.state = 'PLAYING';
  },

  // Single speech bubble system — same for player and all NPCs. character = { x, y, w, h }.
  drawSpeechBubble(character, text) {
    if (!character || !text || !String(text).trim()) return;
    const MARGIN = 10;
    const ARROW_HEIGHT = 14;
    const TIP_ABOVE_HEAD = 6;
    const MIN_BUBBLE_WIDTH = 100;
    const MAX_BUBBLE_WIDTH = 280;
    const PADDING_H = 20;
    const PADDING_V = 14;
    const LINE_HEIGHT = 20;
    const RADIUS = 12;
    const ARROW_BASE_HALF = 10;

    const headX = character.x + character.w / 2;
    const headY = character.y;

    this.ctx.font = 'bold 18px Arial';
    const maxLineWidth = MAX_BUBBLE_WIDTH - PADDING_H * 2;
    const words = String(text).trim().split(/\s+/);
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (this.ctx.measureText(test).width <= maxLineWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = this.ctx.measureText(word).width <= maxLineWidth ? word : word.slice(0, 12) + '…';
      }
    }
    if (current) lines.push(current);

    const longestW = Math.min(MAX_BUBBLE_WIDTH - PADDING_H * 2, Math.max(...lines.map(l => this.ctx.measureText(l).width), MIN_BUBBLE_WIDTH - PADDING_H * 2));
    const bubbleWidth = Math.min(MAX_BUBBLE_WIDTH, Math.max(MIN_BUBBLE_WIDTH, longestW + PADDING_H * 2));
    const bubbleHeight = PADDING_V * 2 + lines.length * LINE_HEIGHT;

    let bubbleX = headX - bubbleWidth / 2;
    bubbleX = Math.max(MARGIN, Math.min(this.canvas.width - bubbleWidth - MARGIN, bubbleX));
    let bubbleY = headY - bubbleHeight - ARROW_HEIGHT - MARGIN;
    bubbleY = Math.max(MARGIN, bubbleY);
    const bubbleBottom = bubbleY + bubbleHeight;

    // Balloon body
    this.ctx.fillStyle = 'rgba(255,255,255,0.95)';
    this.ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    this.ctx.lineWidth = 2;
    if (this.ctx.roundRect) {
      this.ctx.beginPath();
      this.ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, RADIUS);
      this.ctx.fill();
      this.ctx.stroke();
    } else {
      this.ctx.beginPath();
      this.ctx.rect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
      this.ctx.fill();
      this.ctx.stroke();
    }

    // Arrow: tip ~6px above head, base on balloon bottom, centered on headX
    const tipY = headY - TIP_ABOVE_HEAD;
    const baseY = bubbleBottom;
    const baseL = Math.max(bubbleX + 8, headX - ARROW_BASE_HALF);
    const baseR = Math.min(bubbleX + bubbleWidth - 8, headX + ARROW_BASE_HALF);
    this.ctx.beginPath();
    this.ctx.moveTo(headX, tipY);
    this.ctx.lineTo(baseR, baseY);
    this.ctx.lineTo(baseL, baseY);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Text
    this.ctx.fillStyle = '#111';
    this.ctx.textAlign = 'center';
    const textStartY = bubbleY + PADDING_V + LINE_HEIGHT / 2 + 4;
    lines.forEach((line, i) => {
      this.ctx.fillText(line, bubbleX + bubbleWidth / 2, textStartY + i * LINE_HEIGHT);
    });
  },

  draw() {
    // 1. Fundo (Baseado na Zona)
    const zonesColors = [
        ['#FF5E62', '#FF9966'], // 0 Cala Saladeta
        ['#1abc9c', '#27ae60'], // 1 Norte Hippie
        ['#8e44ad', '#c0392b'], // 2 Universo
        ['#2980b9', '#ecf0f1'], // 3 Ibiza
        ['#5d4037', '#8d6e63'], // 4 Dalt Vila (historic)
    ];

    // Background gradient
    if (this.currentZoneIndex === 0) {
        // Sant Antoni: Blue sky
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#4facfe');
        gradient.addColorStop(1, '#00f2fe');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Sea (before sun) so it never covers bubbles
        this.drawSeaSpectrum();

        // Sol
        const sunX = this.canvas.width * 0.85;
        this.ctx.fillStyle = '#fceabb';
        this.ctx.beginPath();
        this.ctx.arc(sunX, 80, 40, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.fillStyle = 'rgba(255, 204, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(sunX, 80, 50, 0, Math.PI*2);
        this.ctx.fill();

    } else if (this.currentZoneIndex === 1) {
        // Hippie: Sunset
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#f7b733');
        gradient.addColorStop(1, '#fc4a1a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Hills
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY);
        this.ctx.bezierCurveTo(100, this.groundY - 50, 200, this.groundY - 20, 320, this.groundY);
        this.ctx.fill();

    } else if (this.currentZoneIndex === 2) {
        // Universo (club): dark background, DJ and gold diggers dancing in the back, then lights
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0a0015');
        gradient.addColorStop(0.5, '#1a0525');
        gradient.addColorStop(1, '#0d0012');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawClubBackdrop();
        const music = document.getElementById('bgMusic');
        const audioTime = music && !music.paused ? music.currentTime : 0;
        this.drawClubLights(audioTime, this.bpm);

    } else if (this.currentZoneIndex === 3) {
        // Ibiza (base city) — buildings; lights follow beat/spectrum
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1a237e');
        gradient.addColorStop(0.6, '#283593');
        gradient.addColorStop(1, '#3949ab');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const gw = this.canvas.width;
        const gy = this.groundY;
        // Several buildings (silhouettes) — varied heights and widths
        const buildings = [
            { x: 10, w: 35, h: 70 },
            { x: 48, w: 42, h: 95 },
            { x: 93, w: 38, h: 55 },
            { x: 134, w: 45, h: 85 },
            { x: 182, w: 40, h: 65 },
            { x: 225, w: 48, h: 90 },
            { x: 276, w: 36, h: 75 },
            { x: 315, w: 42, h: 60 },
        ];
        this.ctx.fillStyle = '#37474f';
        buildings.forEach(b => {
            this.ctx.fillRect(b.x, gy - b.h, b.w, b.h);
        });
        // Roof/band detail (orange/brown)
        this.ctx.fillStyle = '#5d4037';
        buildings.forEach(b => {
            this.ctx.fillRect(b.x, gy - b.h, b.w, 6);
        });

        // Windows: follow spectrum and music beat (same as beach/club/wave)
        let bassLevel = 0;
        if (this.analyser && this.spectrumData) {
            this.analyser.getByteFrequencyData(this.spectrumData);
            bassLevel = (this.spectrumData[0] + this.spectrumData[1]) / 2;
        }
        const intensity = Math.min(1, bassLevel / 200); // 0..1 by bass
        const beatFlash = this.onBeat || this.beatPulse > 1 ? 0.5 : 0;
        buildings.forEach((b, bIdx) => {
            const rows = Math.max(2, Math.floor(b.h / 22));
            const cols = Math.max(1, Math.floor(b.w / 14));
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const wx = b.x + 6 + c * 14;
                    const wy = gy - b.h + 12 + r * 22;
                    const alpha = Math.min(1, 0.15 + intensity * 0.5 + beatFlash);
                    this.ctx.fillStyle = alpha > 0.2
                        ? `rgba(255, 235, 59, ${alpha})`
                        : '#1a252f';
                    this.ctx.fillRect(wx, wy, 8, 10);
                }
            }
        });
    } else if (this.currentZoneIndex === 4) {
        // Dalt Vila (historic zone) — older tone, buildings
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#3e2723');
        gradient.addColorStop(0.5, '#5d4037');
        gradient.addColorStop(1, '#6d4c41');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        const gy = this.groundY;
        const buildings = [
            { x: 15, w: 38, h: 65 }, { x: 56, w: 45, h: 80 }, { x: 104, w: 40, h: 55 },
            { x: 147, w: 42, h: 70 }, { x: 192, w: 48, h: 85 }, { x: 243, w: 36, h: 60 },
            { x: 282, w: 42, h: 75 },
        ];
        this.ctx.fillStyle = '#4e342e';
        buildings.forEach(b => { this.ctx.fillRect(b.x, gy - b.h, b.w, b.h); });
        this.ctx.fillStyle = '#3e2723';
        buildings.forEach(b => { this.ctx.fillRect(b.x, gy - b.h, b.w, 5); });
        let bassLevel = 0;
        if (this.analyser && this.spectrumData) {
            this.analyser.getByteFrequencyData(this.spectrumData);
            bassLevel = (this.spectrumData[0] + this.spectrumData[1]) / 2;
        }
        const intensity = Math.min(1, bassLevel / 200);
        const beatFlash = this.onBeat || this.beatPulse > 1 ? 0.4 : 0;
        buildings.forEach((b) => {
            const rows = Math.max(2, Math.floor(b.h / 22));
            const cols = Math.max(1, Math.floor(b.w / 14));
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const wx = b.x + 6 + c * 14, wy = gy - b.h + 12 + r * 22;
                    const alpha = Math.min(1, 0.12 + intensity * 0.4 + beatFlash);
                    this.ctx.fillStyle = alpha > 0.2 ? `rgba(255, 213, 79, ${alpha})` : '#2c1810';
                    this.ctx.fillRect(wx, wy, 8, 10);
                }
            }
        });
    }

    // Zone name (larger and more readable)
    this.ctx.fillStyle = 'rgba(255,255,255,0.85)';
    this.ctx.font = 'bold 36px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.zones[this.currentZoneIndex], this.canvas.width/2, 160);

    // 2. Ground (color by zone)
    if (this.currentZoneIndex === 0) this.ctx.fillStyle = '#e8d5b7';
    else if (this.currentZoneIndex === 1) this.ctx.fillStyle = '#27ae60';
    else if (this.currentZoneIndex === 2) this.ctx.fillStyle = '#333';
    else if (this.currentZoneIndex === 3) this.ctx.fillStyle = '#95a5a6';
    else this.ctx.fillStyle = '#5d4037'; // Dalt Vila

    this.ctx.fillRect(0, this.groundY, this.canvas.width, 20);

    // 3. Player (Procedural Pixel Art)
    const pulse = this.beatPulse || 1;
    const pulseW = this.player.w * pulse;
    const pulseH = this.player.h * pulse;
    const pulseX = this.player.x - (pulseW - this.player.w) / 2;
    const pulseY = this.player.y - (pulseH - this.player.h);
    this.drawPlayer(pulseX, pulseY, pulseW, pulseH);

    // Beat indicator (flash on bass hit)
    if (this.onBeat) {
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 50, 0, Math.PI * 2);
        this.ctx.fill();
    }



    // 4. Entities (during EVENT entities are frozen; we draw all, including the event NPC)
    for (let e of this.entities) {
        this.drawEntity(e);
    }

    // 5. FX
    for (let fx of this.activeFX) {
        this.ctx.globalAlpha = fx.life / fx.maxLife;
        // Check complete AND naturalWidth to ensure image loaded successfully
        if (this.assets[fx.type] && this.assets[fx.type].complete && this.assets[fx.type].naturalWidth > 0) {
            // Draw image centered
            this.ctx.drawImage(this.assets[fx.type], fx.x, fx.y, 50, 50);
        } else if (fx.type === 'heart') {
            // ❤️ Heart FX
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = '30px serif';
            this.ctx.fillText('❤️', fx.x + 10, fx.y + 30);
        } else if (fx.type === 'flower') {
            // 🌸 Flower FX
            const hue = (this.frame * 10) % 360;
            this.ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
            this.ctx.beginPath();
            this.ctx.arc(fx.x + 25, fx.y + 25, 20, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.font = '20px serif';
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText('☮️', fx.x + 15, fx.y + 32);
        } else if (fx.type === 'mojito') {
             // 🍸 Mojito FX
             this.ctx.font = '30px serif';
             this.ctx.fillText('🍸', fx.x, fx.y);
        } else {
             // Fallback circle
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(fx.x + 25, fx.y + 25, 20, 0, Math.PI*2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;
    }

    // PRISON: luz vermelha/azul (1s)
    if (this.state === 'PRISON' && this.prisonFlashFrames > 0) {
      const flash = this.prisonFlashFrames / 60;
      this.ctx.fillStyle = (Math.floor(this.frame / 8) % 2 === 0) ? `rgba(200, 0, 0, ${0.4 * flash})` : `rgba(0, 0, 200, ${0.4 * flash})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 28px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('🚓 BUSTED', this.canvas.width / 2, this.canvas.height / 2);
    }

    // 6. Real-time Map HUD (draw before bubble so it doesn’t cover)
    this.drawHUD();

    // Speech bubbles: above scenery; during EVENT only the NPC bubble (anchored at NPC head)
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';
    if (this.state === 'EVENT' && this.npcEvent.active && this.npcEvent.npc) {
      const ev = this.npcEvent;
      const isChicaReply = ev.type === 'chica' && ev.replyText && ev.timer >= ev.duration / 2;
      const who = isChicaReply ? this.player : ev.npc;
      const msg = isChicaReply ? ev.replyText : ev.text;
      if (msg) this.drawSpeechBubble(who, msg);
    } else {
      const lyricsText = LyricsController.activeText && LyricsController.activeText.trim().length
        ? LyricsController.activeText
        : "";
      const vocalOk = !this.useVocalFilter || this.getVocalEnergy() >= this.vocalThreshold;
      if (lyricsText && vocalOk) this.drawSpeechBubble(this.player, lyricsText);
    }
    this.ctx.restore();

    // Debug overlay (D) — invisible to players; see DEBUG_CALIBRATION.md
    if (this.debugOverlay) this.drawDebugOverlay();
  },

  // Debug overlay: time, lyric index, offset, vocal energy, nudge. Toggle with [D].
  // [ / ] = offset; [ , . ] = nudge current line ±0.05s; [V] = vocal filter on/off.
  drawDebugOverlay() {
    const music = document.getElementById('bgMusic');
    const t = music && !music.paused ? music.currentTime : 0;
    const adj = t + (this.lyricsOffsetSeconds || 0);
    const next = this.lyricsLines[LyricsController.index];
    const vocal = Math.round(this.getVocalEnergy());
    const lines = [
      `time: ${t.toFixed(2)}s`,
      `adj: ${adj.toFixed(2)}s (offset ${(this.lyricsOffsetSeconds || 0).toFixed(2)})`,
      `lyric #${LyricsController.index} ${next ? `@ ${next.time.toFixed(1)}s` : "—"}`,
      `active: "${(LyricsController.activeText || "").slice(0, 18)}${(LyricsController.activeText || "").length > 18 ? "…" : ""}"`,
      `vocal: ${vocal}  thresh: ${this.vocalThreshold}  [V] ${this.useVocalFilter ? "on" : "off"}  [ - + ] thresh`,
      `LEAD: ${LYRICS_LEAD}s  [ / ] offset  [ , . ] nudge line #${LyricsController.index}`,
      `zone: ${this.currentZoneIndex}  BPM: ${this.bpm}`,
      `[D] toggle debug`
    ];
    const pad = 10;
    const lineH = 16;
    const w = 280;
    const h = lines.length * lineH + pad * 2;
    const x = this.canvas.width - w - pad;
    const y = pad;
    this.ctx.save();
    this.ctx.fillStyle = "rgba(0,0,0,0.75)";
    this.ctx.strokeStyle = "rgba(255,255,255,0.4)";
    this.ctx.lineWidth = 1;
    if (this.ctx.roundRect) this.ctx.roundRect(x, y, w, h, 6);
    else this.ctx.rect(x, y, w, h);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.fillStyle = "#b0f0b0";
    this.ctx.font = "12px monospace";
    this.ctx.textAlign = "left";
    lines.forEach((line, i) => {
      this.ctx.fillText(line, x + pad, y + pad + (i + 1) * lineH);
    });
    this.ctx.restore();
  },

  drawPlayer(x, y, w, h) {
      if (this.invulnerable && Math.floor(this.frame / 10) % 2 === 0) {
          return; // Blink effect
      }

      // Body
      this.ctx.fillStyle = '#3498db'; // Blue Tank Top
      this.ctx.fillRect(x, y + 10, w, h - 10);

      // Face
      this.ctx.fillStyle = '#cd853f'; // Moreno Skin (Peru)
      this.ctx.fillRect(x + 5, y, 30, 20);

      // Sunglasses (Ibiza Vibe)
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(x + 15, y + 5, 20, 5);

      // Shorts
      this.ctx.fillStyle = '#e74c3c';
      this.ctx.fillRect(x, y + 35, w, 15);

      // Backpack (from original)
      this.ctx.fillStyle = '#555';
      this.ctx.fillRect(x - 5, y + 25, 10, 25);

      // Legs (Simple animation) (from original)
      this.ctx.fillStyle = '#f1c40f';
      if (this.frame % 10 < 5) {
          this.ctx.fillRect(x + 5, y + 60, 10, 15); // Left leg
      } else {
          this.ctx.fillRect(x + 25, y + 60, 10, 15); // Right leg
      }
  },

  drawChica(x, y, w, h) {
      // Hair
      this.ctx.fillStyle = '#f4d03f';
      this.ctx.fillRect(x + 6, y - 4, 28, 14);
      this.ctx.fillRect(x + 4, y, 6, 12);
      this.ctx.fillRect(x + w - 10, y, 6, 12);
      // Face (skin)
      this.ctx.fillStyle = '#ffefd5';
      this.ctx.fillRect(x + 6, y, 28, 22);
      this.ctx.fillStyle = '#1a1a1a';
      this.ctx.fillRect(x + 12, y + 6, 22, 6);
      this.ctx.fillStyle = '#2c3e50';
      this.ctx.fillRect(x + 14, y + 7, 8, 4);
      this.ctx.fillRect(x + 24, y + 7, 8, 4);
      // Topless torso — shoulders/stomach in normal skin; breasts in lighter tone to stand out
      this.ctx.fillStyle = '#ffefd5';
      this.ctx.fillRect(x + 10, y + 28, 20, 8);
      this.ctx.fillRect(x + 4, y + 46, w - 8, 6);
      this.ctx.fillStyle = '#ffe4d4';
      this.ctx.beginPath();
      this.ctx.ellipse(x + 14, y + 36, 10, 12, 0, 0, Math.PI * 2);
      this.ctx.ellipse(x + 26, y + 36, 10, 12, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#d4b896';
      this.ctx.beginPath();
      this.ctx.arc(x + 14, y + 36, 4, 0, Math.PI * 2);
      this.ctx.arc(x + 26, y + 36, 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#ffefd5';
      this.ctx.fillRect(x - 3, y + 24, 10, 20);
      this.ctx.fillRect(x + w - 7, y + 24, 10, 20);
      this.ctx.fillStyle = '#c0392b';
      this.ctx.fillRect(x, y + 50, w, 12);
      this.ctx.fillStyle = '#ffefd5';
      if (this.frame % 12 < 6) {
          this.ctx.fillRect(x + 4, y + 62, 12, 16);
          this.ctx.fillRect(x + 24, y + 58, 12, 20);
      } else {
          this.ctx.fillRect(x + 4, y + 58, 12, 20);
          this.ctx.fillRect(x + 24, y + 62, 12, 16);
      }
      this.ctx.fillStyle = '#2c3e50';
      this.ctx.fillRect(x - 4, y + 28, 8, 22);
  },

  drawHippie(x, y, w, h) {
      this.ctx.fillStyle = '#8b4513';
      this.ctx.fillRect(x + 4, y - 2, 32, 14);
      this.ctx.fillStyle = '#daa520';
      this.ctx.fillRect(x + 8, y, 24, 22);
      this.ctx.fillStyle = '#2ecc71';
      this.ctx.fillRect(x + 10, y + 6, 8, 6);
      this.ctx.fillRect(x + 22, y + 6, 8, 6);
      this.ctx.fillStyle = '#27ae60';
      this.ctx.fillRect(x, y + 22, w, 28);
      this.ctx.fillStyle = '#daa520';
      this.ctx.fillRect(x - 2, y + 24, 10, 20);
      this.ctx.fillRect(x + w - 8, y + 24, 10, 20);
      this.ctx.fillStyle = '#1e8449';
      this.ctx.fillRect(x, y + 50, w, 12);
      this.ctx.fillStyle = '#daa520';
      if (this.frame % 12 < 6) {
          this.ctx.fillRect(x + 4, y + 62, 12, 16);
          this.ctx.fillRect(x + 24, y + 58, 12, 20);
      } else {
          this.ctx.fillRect(x + 4, y + 58, 12, 20);
          this.ctx.fillRect(x + 24, y + 62, 12, 16);
      }
      this.ctx.fillStyle = '#f1c40f';
      this.ctx.beginPath();
      this.ctx.arc(x + w - 8, y + 36, 8, 0, Math.PI * 2);
      this.ctx.fill();
  },

  drawGoldDigger(x, y, w, h) {
      this.ctx.fillStyle = '#f4d03f';
      this.ctx.fillRect(x + 4, y - 4, 32, 16);
      this.ctx.fillStyle = '#ffdbac';
      this.ctx.fillRect(x + 6, y, 28, 22);
      this.ctx.fillStyle = '#1a1a1a';
      this.ctx.fillRect(x + 12, y + 6, 18, 5);
      this.ctx.fillStyle = '#f1c40f';
      this.ctx.fillRect(x + 14, y + 8, 4, 3);
      this.ctx.fillRect(x + 24, y + 8, 4, 3);
      this.ctx.fillStyle = '#8e44ad';
      this.ctx.fillRect(x, y + 22, w, 30);
      this.ctx.fillStyle = '#f1c40f';
      this.ctx.fillRect(x + 16, y + 26, 8, 4);
      this.ctx.fillStyle = '#ffdbac';
      this.ctx.fillRect(x - 2, y + 24, 8, 22);
      this.ctx.fillRect(x + w - 6, y + 24, 8, 22);
      this.ctx.fillStyle = '#2c3e50';
      this.ctx.fillRect(x, y + 52, w, 10);
      this.ctx.fillStyle = '#ffdbac';
      if (this.frame % 12 < 6) {
          this.ctx.fillRect(x + 4, y + 62, 10, 14);
          this.ctx.fillRect(x + 26, y + 60, 10, 16);
      } else {
          this.ctx.fillRect(x + 4, y + 60, 10, 16);
          this.ctx.fillRect(x + 26, y + 62, 10, 14);
      }
  },

  drawPolice(x, y, w, h) {
      this.ctx.fillStyle = '#2c3e50';
      this.ctx.fillRect(x + 4, y - 2, 32, 12);
      this.ctx.fillStyle = '#ecf0f1';
      this.ctx.fillRect(x + 6, y, 28, 22);
      this.ctx.fillStyle = '#1a1a1a';
      this.ctx.fillRect(x + 12, y + 6, 20, 6);
      this.ctx.fillStyle = '#3498db';
      this.ctx.fillRect(x, y + 22, w, 28);
      this.ctx.fillStyle = '#2c3e50';
      this.ctx.fillRect(x + 8, y + 24, 6, 6);
      this.ctx.fillRect(x + 26, y + 24, 6, 6);
      this.ctx.fillStyle = '#ecf0f1';
      this.ctx.fillRect(x - 2, y + 24, 8, 20);
      this.ctx.fillRect(x + w - 6, y + 24, 8, 20);
      this.ctx.fillStyle = '#2c3e50';
      this.ctx.fillRect(x, y + 50, w, 12);
      this.ctx.fillStyle = '#34495e';
      if (this.frame % 12 < 6) {
          this.ctx.fillRect(x + 4, y + 62, 12, 16);
          this.ctx.fillRect(x + 24, y + 58, 12, 20);
      } else {
          this.ctx.fillRect(x + 4, y + 58, 12, 20);
          this.ctx.fillRect(x + 24, y + 62, 12, 16);
      }
  },

  drawHUD() {
      // Lives (Hearts)
      const heartSize = 25;
      const startX = 20;
      const startY = 120; // Adjusted for smaller map (Map 80px + padding)

      for (let i = 0; i < this.lives; i++) {
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.font = '20px Arial'; // Smaller hearts
        this.ctx.fillText('❤️', startX + (i * 25), startY);
    }

    // Stats: all in top center (between map and sun) — PTS and energy
    const centerX = this.canvas.width / 2;
    const topY = 28;
    this.ctx.font = 'bold 24px Courier New';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText('PTS: ' + this.score, centerX, topY);
    this.ctx.fillStyle = '#f1c40f';
    this.ctx.fillText('⚡ ' + this.energy, centerX, topY + 30);
    this.ctx.fillStyle = '#27ae60';
    this.ctx.fillText('🍎 ' + this.money, centerX, topY + 60);
    if (this.drugEffect) {
      this.ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
      this.ctx.font = 'bold 16px Arial';
      this.ctx.fillText('💊', centerX - 80, topY + 30);
    }

    // Lyrics offset debug (small)
    this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`LYR Δ: ${(this.lyricsOffsetSeconds || 0).toFixed(2)}s  ([ / ])`, this.canvas.width - 12, 16);

    // Map Config — upper left corner
      const mapSize = 70;
      const mapX = 20;
      const mapY = 20;

      // Ensure map asset is loaded
      if (this.assets.map && this.assets.map.complete && this.assets.map.naturalWidth > 0) {
          // Draw Map Background
          this.ctx.globalAlpha = 0.8;
          this.ctx.drawImage(this.assets.map, mapX, mapY, mapSize, mapSize);

          // Draw Border
          this.ctx.strokeStyle = '#fff';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(mapX, mapY, mapSize, mapSize);
          this.ctx.globalAlpha = 1.0;

          // Route: Cala Saladeta → Norte Hippie → Universo → Ibiza → Dalt Vila
          const points = [
              {x: 0.2, y: 0.6},  // 0 Cala Saladeta
              {x: 0.5, y: 0.2},  // 1 Norte Hippie
              {x: 0.5, y: 0.5},  // 2 Universo
              {x: 0.75, y: 0.7}, // 3 Ibiza
              {x: 0.8, y: 0.85}, // 4 Dalt Vila
              {x: 0.2, y: 0.6}   // back
          ];

          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.moveTo(mapX + points[0].x*mapSize, mapY + points[0].y*mapSize);
          for (let i = 1; i < points.length; i++) {
              this.ctx.lineTo(mapX + points[i].x*mapSize, mapY + points[i].y*mapSize);
          }
          this.ctx.stroke();

          const maxScore = 140;
          const progress = Math.min(this.score / maxScore, 0.99);
          const totalSegments = points.length - 1; // 5
          const scaledProgress = progress * totalSegments; // 0.0 to 4.0
          const currentSegmentIndex = Math.floor(scaledProgress); // 0, 1, 2, 3
          const t = scaledProgress - currentSegmentIndex; // 0.0 to 1.0 within segment

          const pStart = points[currentSegmentIndex];
          const pEnd = points[currentSegmentIndex + 1];

          // Linear Interpolation
          const playerMapX = pStart.x + (pEnd.x - pStart.x) * t;
          const playerMapY = pStart.y + (pEnd.y - pStart.y) * t;

          // Convert to Screen Coords
          const finalX = mapX + playerMapX * mapSize;
          const finalY = mapY + playerMapY * mapSize;

          // Draw Player Marker (Pulsing Red Dot)
          const pulse = 1 + Math.sin(this.frame * 0.2) * 0.2;
          this.ctx.fillStyle = '#e74c3c';
          this.ctx.beginPath();
          this.ctx.arc(finalX, finalY, 3 * pulse, 0, Math.PI*2); // Smaller dot
          this.ctx.fill();
          this.ctx.strokeStyle = '#fff';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();

          // Ibiza (zone 3): Entry in HUD
          if (this.currentZoneIndex === 3) {
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('Entry 60', mapX, mapY + mapSize + 64);
          }
      }
  },



    spawnEntity(musicTime = 0) {
      // 🎯 STRICT ZONE-BASED SPAWNING
      const rand = Math.random();
      let type, name, value, w, h, y, color;

      type = 'GOOD';
      name = 'Drink';
      value = 10;
      w = 20; h = 20;
      color = '#f1c40f';
      y = this.groundY - 50 - (Math.random() * 50);

      if (this.currentZoneIndex === 0) {
          // ZONE 0: BEACH — Chica ≈2x; mais gaivotas; fruits e drinks
          if (rand < 0.25) {
              name = 'ChicaSilhouette';
              w = 40; h = 50;
              y = this.groundY - 50;
              value = 30;
              color = '#e67e22';
              type = 'GOOD';
          } else if (rand < 0.45) {
              name = 'Fruit';
              value = 10;
              w = 22; h = 22;
              y = this.groundY - 50 - (Math.random() * 80);
              color = '#e74c3c';
              type = 'GOOD';
          } else if (rand < 0.65) {
              name = 'Drink';
              value = 10;
              w = 20; h = 20;
              y = this.groundY - 50 - (Math.random() * 80);
              color = '#f1c40f';
              type = 'GOOD';
          } else {
               // Gaivotas: mais presentes na praia (35%)
               name = 'Seagull';
               w = 40; h = 20;
               y = this.groundY - 220 - (Math.random() * 120);
               value = 0;
               const seagullColors = ['#fff', '#dfe6e9', '#ffeaa7', '#fd79a8', '#81ecec', '#a29bfe', '#fab1a0', '#74b9ff', '#55efc4', '#e17055', '#b2bec3'];
               color = seagullColors[Math.floor(Math.random() * seagullColors.length)];
               type = 'BAD';
          }

      } else if (this.currentZoneIndex === 1) {
          // ☮️ ZONE 1: HIPPIE
          // Spawns: Flowers, maybe distinct obstacles?
          // Keeping it simple/safe per current specs, maybe add Drone here if needed later.

           if (rand < 0.25) {
               name = 'Hippie';
               w = 40; h = 60;
               y = this.groundY - 60;
               value = 15;
               color = '#27ae60';
               type = 'GOOD';
           } else if (rand < 0.5) {
               name = 'Flower';
               w = 24; h = 24;
               y = this.groundY - 100 - (Math.random() * 150);
               value = 10;
               color = '#ff00ff';
               type = 'GOOD';
           } else {
               name = 'Drink';
           }

      } else if (this.currentZoneIndex === 2) {
          // ZONE 2: UNIVERSO (clube) — Dealer, Gold Digger 50/50, Police (quando droga), Drinks
          const policeBlocked = this.policeSpawnBlockedUntil > this.frame;
          if (this.drugEffect && !policeBlocked && rand < 0.35) {
              name = 'Police';
              w = 60; h = 30;
              y = this.groundY - 40;
              value = 0;
              color = '#2c3e50';
              type = 'BAD';
          } else if (rand < 0.25) {
              name = 'Dealer';
              w = 40; h = 55;
              y = this.groundY - 55;
              value = 80;
              color = '#1a1a1a';
              type = 'GOOD';
          } else if (rand < 0.5) {
              name = 'GoldDigger';
              w = 35; h = 50;
              y = this.groundY - 50;
              value = 0;
              color = '#d4af37';
              type = 'BAD';
          } else {
              name = 'Drink';
          }

      } else if (this.currentZoneIndex === 3) {
          // ZONE 3: IBIZA (cidade base) — Police ativa, Drones, Drinks
          const policeBlocked = this.policeSpawnBlockedUntil > this.frame;
          const policeChance = this.drugEffect ? 0.7 : 0.5;
          if (!policeBlocked && rand < policeChance) {
              name = 'Police';
              w = 60; h = 30;
              y = this.groundY - 40;
              value = 0;
              color = '#2c3e50';
              type = 'BAD';
          } else if (rand < 0.8) {
              // Drone (Aerial Threat)
              name = 'Drone';
              w = 40; h = 30;
              y = this.groundY - 90;
              color = '#e74c3c';
              type = 'BAD';
          } else {
              name = 'Drink';
          }
      } else if (this.currentZoneIndex === 4) {
          // ZONE 4: DALT VILA (historic) — medium difficulty, police, drinks
          const policeBlocked = this.policeSpawnBlockedUntil > this.frame;
          if (!policeBlocked && rand < 0.4) {
              name = 'Police';
              w = 60; h = 30;
              y = this.groundY - 40;
              value = 0;
              color = '#2c3e50';
              type = 'BAD';
          } else if (rand < 0.6) {
              name = 'Drink';
          } else {
              name = 'Drone';
              w = 40; h = 30;
              y = this.groundY - 90;
              color = '#e74c3c';
              type = 'BAD';
          }
      }

      // Final Push
      let spawnX = this.canvas.width;
      let direction = -1;
      // Seagulls: random direction — from left (1) or from right (-1)
      if (name === 'Seagull') {
          direction = Math.random() < 0.5 ? 1 : -1;
          spawnX = direction === 1 ? -w - 20 : this.canvas.width;
      }
      this.entities.push({
          type: type,
          name: name,
          value: value,
          x: spawnX,
          y: y,
          w: w,
          h: h,
          color: color,
          direction: name === 'Seagull' ? direction : undefined
      });
  },

  drawEntity(e) {
      if (e.name === 'Sunbather') {
           // 🏖️ Sunbather - Stylized Silhouette (Pixel Art Vibe)
           this.ctx.fillStyle = '#eebb99'; // Skin
           this.ctx.fillRect(e.x, e.y + 10, e.w, e.h - 10); // Body
           this.ctx.fillStyle = '#ff69b4'; // Bikini Top (suggestion) / Hair
           this.ctx.fillRect(e.x + 5, e.y, 20, 10); // Head/Hair

           // Heart Icon floating above
           if (this.frame % 20 < 10) {
               this.ctx.font = '16px serif';
               this.ctx.fillText('💋', e.x + 5, e.y - 5);
           }

      } else if (e.name === 'Flower') {
           const hue = (this.frame * 5) % 360;
           this.ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
           this.ctx.beginPath();
           this.ctx.arc(e.x + 12, e.y + 12, 12, 0, Math.PI * 2);
           this.ctx.fill();
           this.ctx.fillStyle = '#fff';
           this.ctx.beginPath();
           this.ctx.arc(e.x + 12, e.y + 12, 5, 0, Math.PI * 2);
      } else if (e.name === 'Hippie') {
           this.drawHippie(e.x, e.y, 40, 60);
      } else if (e.name === 'ChicaSilhouette' || e.name === 'Chica') {
           this.drawChica(e.x, e.y, 40, 60);
      } else if (e.name === 'GoldDigger') {
           this.drawGoldDigger(e.x, e.y, 40, 60);
      } else if (e.name === 'Police') {
           this.drawPolice(e.x, e.y, 40, 60);
      } else if (e.name === 'Drone') {
           // Drone
           this.ctx.fillStyle = '#95a5a6';
           this.ctx.fillRect(e.x + 10, e.y + 10, 20, 10);
           this.ctx.fillStyle = '#e74c3c';
           this.ctx.fillRect(e.x, e.y, 10, 5); // Prop L
           this.ctx.fillRect(e.x + 30, e.y, 10, 5); // Prop R
      } else if (e.name === 'Seagull') {
           // Seagull: various colors, flies left→right or right→left
           const birdColor = e.color || '#fff';
           this.ctx.fillStyle = birdColor;
           this.ctx.beginPath();
           this.ctx.ellipse(e.x + 20, e.y + 10, 20, 10, 0, 0, Math.PI * 2);
           this.ctx.fill();
           this.ctx.fillStyle = '#f39c12';
           this.ctx.beginPath();
           this.ctx.moveTo(e.x, e.y + 10);
           this.ctx.lineTo(e.x - 10, e.y + 15);
           this.ctx.lineTo(e.x, e.y + 20);
           this.ctx.fill();
           this.ctx.fillStyle = '#bdc3c7';
           if (this.frame % 10 < 5) {
               this.ctx.fillRect(e.x + 15, e.y - 10, 10, 10);
           } else {
               this.ctx.fillRect(e.x + 15, e.y + 10, 10, 10);
           }
      } else if (e.name === 'Dealer') {
           // Dealer (Shady Guy)
           this.ctx.fillStyle = '#2c3e50'; // Dark Hoodie
           this.ctx.fillRect(e.x, e.y, e.w, e.h);
           this.ctx.fillStyle = '#000'; // Sunglasses
           this.ctx.fillRect(e.x - 5, e.y + 10, 20, 5);

      } else if (e.name === 'Fruit') {
           // Fruit (apple / red fruit)
           this.ctx.fillStyle = e.color || '#e74c3c';
           this.ctx.beginPath();
           this.ctx.arc(e.x + e.w/2, e.y + e.h/2, Math.min(e.w, e.h)/2 - 2, 0, Math.PI*2);
           this.ctx.fill();
           this.ctx.strokeStyle = '#c0392b';
           this.ctx.lineWidth = 1;
           this.ctx.stroke();
      } else if (e.name === 'Drink') {
           // Cocktail (glass + umbrella)
           this.ctx.fillStyle = '#9b59b6';
           this.ctx.fillRect(e.x + 6, e.y + 4, 8, 16);
           this.ctx.fillStyle = '#e74c3c';
           this.ctx.beginPath();
           this.ctx.arc(e.x + 10, e.y, 10, Math.PI, 0);
           this.ctx.fill();
      } else {
          // Default
          this.ctx.fillStyle = e.color;
          this.ctx.fillRect(e.x, e.y, e.w, e.h);
      }
  },

  gameOver(reason) {
    this.state = 'GAMEOVER';
    this.gameOverReason = reason || 'Season Over';

    // Stop Music
    const music = document.getElementById('bgMusic');
    if (music) {
        music.pause();
        music.currentTime = 0;
    }

    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.updateUI();
  },

  updateUI() {
    const hudScoreEl = document.getElementById('flappy-score-hud'); // Live HUD
    const overlay = document.getElementById('flappy-overlay');
    const overlayContent = document.querySelector('.overlay-content');
    const msgEl = document.getElementById('flappy-msg');
    const reasonEl = document.getElementById('flappy-reason');

    // Stats in Game Over Modal
    const statsEl = document.getElementById('flappy-stats');
    const finalScoreEl = document.getElementById('flappy-final-score');

    const zoneResEl = document.getElementById('flappy-zone-result');
    const restartBtn = document.getElementById('flappy-restart-btn');
    const menuBtn = document.getElementById('flappy-menu-btn');

    if (this.state === 'START') {
        // Game screen: no overlay "Tap to Start Season" — only on the entry screen is the Start Season button
        if (overlay) overlay.style.display = 'none';
        if (statsEl) statsEl.style.display = 'none';
        if (hudScoreEl) hudScoreEl.style.display = 'none';
        if (restartBtn) { restartBtn.style.display = 'none'; restartBtn.classList.add('btn-hidden'); }
        if (menuBtn) { menuBtn.style.display = 'none'; menuBtn.classList.add('btn-hidden'); }

    } else if (this.state === 'PLAYING') {
        // HIDE Overlay completely
        if (overlay) overlay.style.display = 'none';

        // Show HUD Score
        if (hudScoreEl) {
             hudScoreEl.style.display = 'block';
             hudScoreEl.innerText = `PTS: ${this.score}`;
        }

    } else if (this.state === 'GAMEOVER') {
        // Show Game Over in Overlay
        if (overlay) overlay.style.display = 'flex';
        if (overlayContent) overlayContent.style.display = 'block';

        if (msgEl) msgEl.innerText = "Season Over";
        if (reasonEl) reasonEl.innerText = this.gameOverReason;
        if (statsEl) statsEl.style.display = 'block';

        if (finalScoreEl) finalScoreEl.innerText = `Points: ${this.score}`;
        if (zoneResEl) zoneResEl.innerText = `Last Zone: ${this.zones[this.currentZoneIndex]}`;

        if (overlayContent) overlayContent.style.pointerEvents = 'auto';
        if (restartBtn) { restartBtn.style.display = 'block'; restartBtn.classList.remove('btn-hidden'); }
        if (menuBtn) { menuBtn.style.display = 'block'; menuBtn.classList.remove('btn-hidden'); }
        if (hudScoreEl) hudScoreEl.style.display = 'none';
    }
  },

  stop() {
     document.removeEventListener('keydown', this.handleInput);
     document.removeEventListener('keyup', this.handleStopInput);
     if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
     this.state = 'START';
  },

  // 🎧 Discoteca: DJ (stacked box style) + 2 blonde dancers (Gāogāo) with arms animation
  drawClubBackdrop() {
    const gy = this.groundY;
    const w = this.canvas.width;

    this.ctx.globalAlpha = 0.85;

    // =========================
    // 🎧 DJ — stacked box style
    // =========================
    const djX = w * 0.65;
    const djY = gy - 120;

    // Bottom box
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(djX, djY + 60, 80, 30);

    // Middle box
    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(djX + 5, djY + 30, 70, 30);

    // Top box
    this.ctx.fillStyle = '#2a2a2a';
    this.ctx.fillRect(djX + 10, djY, 60, 30);

    // DJ Head
    this.ctx.fillStyle = '#f1c27d';
    this.ctx.beginPath();
    this.ctx.arc(djX + 40, djY - 10, 14, 0, Math.PI * 2);
    this.ctx.fill();

    // Headphones
    this.ctx.strokeStyle = '#444';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(djX + 40, djY - 10, 18, Math.PI, 0);
    this.ctx.stroke();

    // =========================
    // 💃 Gāogāo Dancers (2)
    // Blonde, arms up animation
    // =========================
    const dancers = [
      { x: w * 0.3, baseY: gy - 55, phase: 0 },
      { x: w * 0.45, baseY: gy - 55, phase: Math.PI }
    ];

    dancers.forEach((d, i) => {
      const armUp = Math.sin(this.frame * 0.15 + d.phase) > 0;
      const y = d.baseY + Math.sin(this.frame * 0.1) * 4;

      // Hair (blonde)
      this.ctx.fillStyle = '#f7dc6f';
      this.ctx.beginPath();
      this.ctx.arc(d.x, y - 18, 10, 0, Math.PI * 2);
      this.ctx.fill();

      // Head
      this.ctx.fillStyle = '#ffdbac';
      this.ctx.beginPath();
      this.ctx.arc(d.x, y - 10, 8, 0, Math.PI * 2);
      this.ctx.fill();

      // Body
      this.ctx.fillStyle = '#d4af37';
      this.ctx.fillRect(d.x - 6, y, 12, 28);

      // Arms
      this.ctx.strokeStyle = '#ffdbac';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      if (armUp) {
        // Arms up
        this.ctx.moveTo(d.x - 6, y + 4);
        this.ctx.lineTo(d.x - 14, y - 18);
        this.ctx.moveTo(d.x + 6, y + 4);
        this.ctx.lineTo(d.x + 14, y - 18);
      } else {
        // Arms down
        this.ctx.moveTo(d.x - 6, y + 6);
        this.ctx.lineTo(d.x - 14, y + 18);
        this.ctx.moveTo(d.x + 6, y + 6);
        this.ctx.lineTo(d.x + 14, y + 18);
      }
      this.ctx.stroke();

      // Legs
      this.ctx.fillStyle = '#b8860b';
      this.ctx.fillRect(d.x - 8, y + 28, 6, 16);
      this.ctx.fillRect(d.x + 2, y + 28, 6, 16);
    });

    this.ctx.globalAlpha = 1;
  },

  // 🎧 CLUB LIGHTS — Universo: pulsing lights synced with music (BPM, beat, drop, volume)
  drawClubLights(audioTime, bpm) {
      const bpmFactor = (2 * Math.PI * bpm) / 60; // rad/s for sin
      const baseIntensity = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(audioTime * bpmFactor));
      const section = this.currentSection || this.sections[0];
      const isDrop = section.type === 'drop' || section.type === 'chorus';
      const dropBoost = isDrop ? 0.35 : 0.1;
      let volumeIntensity = 0.2;
      if (this.analyser && this.spectrumData) {
          this.analyser.getByteFrequencyData(this.spectrumData);
          const bass = (this.spectrumData[0] + this.spectrumData[1]) / 2;
          volumeIntensity = Math.min(0.6, bass / 200);
      }
      const beatFlash = this.onBeat || this.beatPulse > 1 ? 0.4 : 0;
      const intensity = Math.min(1, baseIntensity + dropBoost + volumeIntensity + beatFlash);

      const w = this.canvas.width;
      const h = this.canvas.height;
      const gy = this.groundY;

      // Pulsing gradients (smooth, not aggressive)
      const gradientPulse = 0.15 + 0.25 * intensity;
      const grad = this.ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, `rgba(138, 43, 226, ${gradientPulse * 0.4})`);
      grad.addColorStop(0.5, `rgba(75, 0, 130, ${gradientPulse * 0.3})`);
      grad.addColorStop(1, `rgba(255, 20, 147, ${gradientPulse * 0.25})`);
      this.ctx.fillStyle = grad;
      this.ctx.globalAlpha = 0.5 + 0.3 * Math.sin(audioTime * bpmFactor * 0.5);
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.globalAlpha = 1;

      // Diagonal lines (soft lasers) — intensity by beat/drop
      const lineCount = 5;
      for (let i = 0; i < lineCount; i++) {
          const phase = (i / lineCount) * Math.PI * 0.4 + audioTime * 0.3;
          const x1 = -20 + (w + 40) * (i / (lineCount + 1)) + Math.sin(phase) * 30;
          const y1 = 0;
          const x2 = x1 + w * 0.4 + Math.cos(phase) * 40;
          const y2 = h;
          this.ctx.strokeStyle = `rgba(200, 100, 255, ${0.12 + intensity * 0.2})`;
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.moveTo(x1, y1);
          this.ctx.lineTo(x2, y2);
          this.ctx.stroke();
      }

      // Strobes suaves (flashes no beat/drop)
      if (this.onBeat || (isDrop && intensity > 0.6)) {
          const flashAlpha = Math.min(0.25, 0.08 + beatFlash * 0.2);
          this.ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
          this.ctx.fillRect(0, 0, w, h);
      }

      // Pulsing horizontal bars (above ground)
      const barY = gy - 40;
      const barH = 8;
      for (let i = 0; i < 8; i++) {
          const phase = audioTime * bpmFactor + i * 0.8;
          const segW = w / 8;
          const x = i * segW + 4;
          const barW = segW * (0.3 + 0.4 * (0.5 + 0.5 * Math.sin(phase)));
          this.ctx.fillStyle = `rgba(255, 105, 180, ${0.2 + intensity * 0.25})`;
          this.ctx.fillRect(x, barY, Math.max(10, barW), barH);
      }
  },

  // 🌊 SEA SPECTRUM - Ocean breathes with the music (Cala Saladeta ONLY)
  drawSeaSpectrum() {
      if (this.currentZoneIndex === 2) {
          throw new Error('Waves are not allowed in club zone');
      }
      const seaHeight = 60;
      const seaY = this.groundY - seaHeight;
      const waveCount = 32;
      const segmentWidth = this.canvas.width / waveCount;

      // Behaviour based on current section
      const section = this.currentSection || this.sections[0];
      const isCalm = section.seaCalm;
      const isHook = section.type === 'hook';
      const isChorus = section.type === 'chorus';

      // Get frequency data if available
      let freqData = new Uint8Array(waveCount);
      if (this.analyser && this.spectrumData) {
          this.analyser.getByteFrequencyData(this.spectrumData);
          for (let i = 0; i < waveCount; i++) {
              const idx = Math.floor(i * (this.spectrumData.length / waveCount));
              freqData[i] = this.spectrumData[idx] || 0;
          }
      }

      // Ocean dynamic colours based on section vibe
      let colorTop, colorMid, colorDeep;

      if (this.zenMode) {
          // 🌸 Zen Mode: Calm, Warm, Sunset Colors override everything
          colorTop = 'rgba(255, 182, 193, 0.7)'; // Light Pink
          colorMid = 'rgba(255, 160, 122, 0.5)'; // Light Salmon
          colorDeep = 'rgba(219, 112, 147, 0.3)'; // Pale Violet Red
      } else if (isHook) {
          // Hook: Mirror/transcendent — lighter, ethereal
          colorTop = 'rgba(200, 230, 255, 0.7)';
          colorMid = 'rgba(150, 200, 255, 0.5)';
          colorDeep = 'rgba(100, 180, 255, 0.3)';
      } else if (isCalm) {
          // Bridge/Outro: Calm — soft blues
          colorTop = 'rgba(0, 198, 251, 0.6)';
          colorMid = 'rgba(0, 119, 182, 0.4)';
          colorDeep = 'rgba(2, 62, 138, 0.3)';
      } else if (isChorus) {
          // Chorus: Active — vibrant, intense
          colorTop = 'rgba(0, 220, 255, 0.9)';
          colorMid = 'rgba(0, 150, 220, 0.7)';
          colorDeep = 'rgba(0, 80, 160, 0.6)';
      } else {
          // Default: Normal blues
          colorTop = 'rgba(0, 198, 251, 0.8)';
          colorMid = 'rgba(0, 119, 182, 0.55)';
          colorDeep = 'rgba(2, 62, 138, 0.3)';
      }

      // Wave amplitude modifier based on section
      const ampModifier = isCalm ? 0.3 : (isChorus ? 1.5 : 1.0);

      // Draw wave layers (3 layers for depth)
      for (let layer = 0; layer < 3; layer++) {
          const layerOffset = layer * 15;
          const layerY = seaY + layerOffset;

          this.ctx.beginPath();
          this.ctx.moveTo(0, this.groundY);
          this.ctx.lineTo(0, layerY);

          for (let i = 0; i <= waveCount; i++) {
              const x = i * segmentWidth;
              const freq = freqData[i % waveCount] || 0;

              // Wave amplitude with section modifier
              const timeOffset = Math.sin(this.frame * 0.03 + i * 0.5 + layer) * 5;
              const freqOffset = (freq / 255) * (20 - layer * 5) * ampModifier;
              const waveY = layerY + timeOffset - freqOffset;

              if (i === 0) {
                  this.ctx.lineTo(x, waveY);
              } else {
                  const prevX = (i - 1) * segmentWidth;
                  const cpX = prevX + segmentWidth / 2;
                  this.ctx.quadraticCurveTo(cpX, waveY - 3, x, waveY);
              }
          }

          this.ctx.lineTo(this.canvas.width, this.groundY);
          this.ctx.closePath();

          // Layer coloring
          if (layer === 0) this.ctx.fillStyle = colorDeep;
          else if (layer === 1) this.ctx.fillStyle = colorMid;
          else this.ctx.fillStyle = colorTop;

          this.ctx.fill();
      }

      // Hook: Add mirror/sparkle effect
      if (isHook) {
          const sparkleCount = 8;
          for (let i = 0; i < sparkleCount; i++) {
              const sx = Math.random() * this.canvas.width;
              const sy = seaY + Math.random() * 30;
              const size = 1 + Math.random() * 3;
              const alpha = 0.4 + Math.random() * 0.4;

              this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
              this.ctx.beginPath();
              this.ctx.arc(sx, sy, size, 0, Math.PI * 2);
              this.ctx.fill();
          }
      }

      // Beat foam (but less in calm sections)
      if (this.onBeat && !isCalm) {
          const foamCount = isChorus ? 8 : 5;
          for (let i = 0; i < foamCount; i++) {
              const foamX = Math.random() * this.canvas.width;
              const foamY = seaY + Math.random() * 20;
              const foamSize = 2 + Math.random() * 4;

              this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              this.ctx.beginPath();
              this.ctx.arc(foamX, foamY, foamSize, 0, Math.PI * 2);
              this.ctx.fill();
          }
      }
  }
};

window.FlappyGame = FlappyGame;
