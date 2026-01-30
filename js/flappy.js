
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

  // Zones: Cala Saladeta (beach), North/Hippie, Universo (club), Ibiza Town
  zones: ['Cala Saladeta', 'North / Hippie', 'Universo', 'Ibiza Town'],
  currentZoneIndex: 0,

  // Lyrics - Complete structure with ~2s intervals
  lyricsLines: [
      // Intro (0:40)
      { time: 40, text: "Yeah!" },

      // Verse 1 - anchors: 60s, 64s
      { time: 48, text: "Feel it coming on" },
      { time: 52, text: "I waited for so long" },
      { time: 56, text: "..." },
      { time: 60, text: "Feel it come my way" },
      { time: 64, text: "Each and every day" },

      // Pre-chorus 1 - anchor: 68s
      { time: 68, text: "By the time I put on my shoes" },
      { time: 72, text: "Already have the groove" },
      { time: 76, text: "Benediction in the morning time" },
      { time: 80, text: "Everybody riding on and on" },

      // Chorus 1 - anchor: 84s
      { time: 84, text: "Keep on riding on and on" },
      { time: 88, text: "Keep on riding on and on" },
      { time: 92, text: "Keep on riding on and on" },
      { time: 96, text: "Keep on riding on" },

      // Verse 2 (1:32)
      { time: 92, text: "Feel it coming on" },
      { time: 96, text: "I waited for so long" },
      { time: 100, text: "Feel it come my way, yeah" },
      { time: 104, text: "Each and every day" },

      // Pre-chorus 2 (1:48)
      { time: 108, text: "There's nothing that I can do" },
      { time: 112, text: "Feel it true" },
      { time: 116, text: "Benediction in the morning time" },
      { time: 120, text: "Everybody riding on and on" },

      // Chorus 2 (2:04)
      { time: 124, text: "Keep on riding on and on" },
      { time: 128, text: "Keep on riding on and on" },
      { time: 132, text: "Keep on riding on and on" },
      { time: 136, text: "Keep on riding on and on" },

      // Bridge 1 - anchor: 164s (2:44)
      { time: 164, text: "I feel like our love has found a home" },
      { time: 172, text: "In this place I know that I belong" },

      // Hook 1 - anchor: 190s (3:10)
      { time: 190, text: "Benediction in my mind" },
      { time: 194, text: "Benediction in my heart and soul" },
      { time: 198, text: "Benediction in my mind" },
      { time: 202, text: "Benediction in my heart and soul" },

      // Bridge 2 (~3:26 = 206s)
      { time: 206, text: "I feel like our love has found a home" },
      { time: 214, text: "In this place I know that I belong" },

      // Hook 2 (~3:42 = 222s)
      { time: 222, text: "Benediction in my mind" },
      { time: 226, text: "Benediction in my heart and soul" },
      { time: 230, text: "Benediction in my mind" },
      { time: 234, text: "Benediction in my heart and soul" },

      // Outro (~4:00+)
      { time: 250, text: "..." }
  ],

  // Obstacle Timeline (seconds) - Calibrated from verified timestamps
  // Reference: 40s="Hey", 51s="Feeling", 116s="Wait" → confirms ~120 BPM
  // 1 beat = 0.5s, 1 bar (4 beats) = 2s
  // First bar starts at 0s (music start)
  obstacleTimeline: [],
  currentObstacleIndex: 0,

  // BPM Configuration - REAL 121 BPM (house standard)
  bpm: 121,
  barDuration: 1.983, // seconds per bar (4 beats at 121 BPM = 60/121*4)
  firstBarOffset: 0,

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

  // Generate timeline with PROGRESSIVE DIFFICULTY
  // SUPER EASY: 0-4 min (obstacles every 10s - let the player SING!)
  // Medium: 4-5 min (every 4s)
  // Hard: 5-6:39 (every 2s)
  generateObstacleTimeline() {
      this.obstacleTimeline = [];
      const musicDuration = 399; // 6:39

      // Phase 1: SUPER EASY (0-240s = 4 minutes) - Every 10 seconds
      // Just enough to keep it interesting, focus on singing!
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

      console.log(`Timeline: ${this.obstacleTimeline.length} obstacles (SuperEasy→Medium→Hard)`);
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
        this.jump();
    });
    this.canvas.addEventListener('touchstart', (e) => {
        if(this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
        e.preventDefault();
        this.jump();
    });

    this.reset();
    this.draw();
  },

  handleInput(e) {
      if (this.state !== 'PLAYING') {
          if (e.code === 'Space' || e.code === 'Enter') this.action();
          return;
      }

      if (e.code === 'ArrowUp' || e.code === 'Space') {
          this.jump();
      }
      if (e.code === 'ArrowDown') {
          this.duck(true);
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

    // Play Music & Setup Spectrum Analyser (unless user muted)
    const music = document.getElementById('bgMusic');
    if (music) {
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

    // Event State (Chica - Zone 0)
    // Steps: 0=None, 1=Approach, 2=Talk, 3=Action, 4=Reward/Leave
    this.eventStep = 0;
    this.eventTimer = 0;
    this.eventTarget = null; // Reference to event NPC

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
    if (this.state !== 'PLAYING' && this.state !== 'EVENT') return;
    this.update();
    this.draw();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  },

  update() {
    this.frame++;

    // ** STATE MANAGEMENT: EVENT **
    if (this.state === 'EVENT') {
        this.updateEvent();
        return; // Skip normal physics/update
    }

    // Zen Mode Timer
    if (this.zenTimer > 0) {
        this.zenTimer--;
        this.zenMode = true;
    } else {
        this.zenMode = false;
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

        // Apply section-based speed (smooth transition)
        const targetSpeed = this.currentSection.speed;
        if (this.speed < targetSpeed) {
            this.speed += 0.05; // Gradual acceleration
        } else if (this.speed > targetSpeed) {
            this.speed -= 0.05; // Gradual deceleration
        }
    }

    // Lives & Speed Boost Milestone (Every €100)
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

    // Progressão de Zonas (Baseada na Pontuação)
    // Transições mais rápidas conforme solicitado
    if (this.score < 10) this.currentZoneIndex = 0;      // Cala Saladeta
    else if (this.score < 20) this.currentZoneIndex = 1; // North / Hippie
    else if (this.score < 30) this.currentZoneIndex = 2; // Universo
    else this.currentZoneIndex = 3;                     // Ibiza Town

    // -- Física do Jogador --
    this.player.dy += this.gravity;
    this.player.y += this.player.dy;

    // Colisão com o chão
    if (this.player.y + this.player.h > this.groundY) {
        this.player.y = this.groundY - this.player.h;
        this.player.dy = 0;
    }

    // -- Spawning (Linha do tempo sincronizada com áudio) --
    // A música é o MACRO CLOCK.
    if (music && !music.paused) {
        const t = music.currentTime;
        if (
            this.currentObstacleIndex < this.obstacleTimeline.length &&
            t >= this.obstacleTimeline[this.currentObstacleIndex]
        ) {
            this.spawnEntity();
            this.currentObstacleIndex++;
        }
    }

    // -- Entidades --
    for (let i = 0; i < this.entities.length; i++) {
        let e = this.entities[i];
        e.x -= this.speed;

        // Omitindo a lógica de colisão para brevidade, ela permanece inalterada...
        // ... (lógica de colisão mantida) ...

        // Check Collision (Skip DECOR type)
        if (e.type !== 'DECOR' &&
            this.player.x < e.x + e.w &&
            this.player.x + this.player.w > e.x &&
            this.player.y < e.y + e.h &&
            this.player.y + this.player.h > e.y
        ) {
             if (e.type === 'GOOD') {
                if (e.name === 'Sunbather') {
                    // 💋 Social Boost: +1 Life
                    if (this.lives < 5) this.lives++;
                    this.playSound('score');
                    this.spawnFX('heart', e.x, e.y);
                } else if (e.name === 'Chica' || e.name === 'ChicaSilhouette') {
                    // Chica: pause and talk 5 seconds — do not set passed so she stays visible
                    this.state = 'EVENT';
                    this.eventStep = 1;
                    this.eventTimer = 0;
                    this.eventTarget = e;
                    e.isEventChica = true; // do not remove until event ends
                    this.playSound('score');
                } else if (e.name === 'Flower' || e.name === 'Hippie') {
                    this.score += e.value || 10;
                    this.playSound('score');
                    this.spawnFX('flower', e.x, e.y);
                    const flowerRoll = Math.random();
                    if (flowerRoll < 0.33) {
                        if (this.lives < 5) this.lives++;
                    } else if (flowerRoll < 0.66) {
                        this.zenTimer = 300;
                        this.invulnerable = true;
                        this.invulnerableTimer = 90;
                    } else {
                        this.zenTimer = 200;
                        this.musicAlterTimer = 180;
                    }
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
                    // 🪩 Club Risk: Money Drain
                    this.money = Math.max(0, this.money - 10);
                    this.energy = Math.max(0, this.energy - 5);
                    this.spawnFX('score', e.x, e.y);
                } else if (e.name === 'Police') {
                    // 🚓 Ibiza Risk: Life Drain
                    if (!this.invulnerable) {
                        this.lives--;
                        this.playSound('crash');
                        if (this.lives <= 0) {
                             this.gameOver('Busted by Police!');
                        } else {
                             this.invulnerable = true;
                             this.invulnerableTimer = 60;
                        }
                    }
                } else {
                     // Standard Obstacle
                     if (!this.invulnerable) {
                        this.lives--;
                        this.playSound('crash');
                        this.spawnFX('collision', this.player.x, this.player.y);
                        if (this.lives <= 0) {
                            this.gameOver('Game Over');
                        } else {
                            this.invulnerable = true;
                            this.invulnerableTimer = 60;
                        }
                     }
                }
                e.passed = true;
            }
        }


        if (e.x + e.w < 0 || (e.passed && !e.isEventChica)) {
            this.entities.splice(i, 1);
            i--;
        }
    }

    // Checar Fim da Música (Condição de Vitória)
    if (music && music.ended && this.state === 'PLAYING') {
        this.gameOver('You survived the season! 🎉');
        return;
    }

    // -- Atualização de FX --
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

  // 🐯 EVENT UPDATE LOOP
  updateEvent() {
      // Keep rendering (handled by loop calling draw), but control logic here
      this.eventTimer++;

      if (this.eventStep === 1) {
          // Step 1: Approach & Freeze (0-60 frames)
          // Player stops, Sea calms
          if (this.eventTimer > 30) {
              this.eventStep = 2;
              this.eventTimer = 0;
          }
      } else if (this.eventStep === 2) {
           // Step 2: Dialogue — 5 seconds total (300 frames @ 60fps)
           if (this.eventTimer > 300) {
               this.eventStep = 3;
               this.eventTimer = 0;
               // Auto Give Mojito Logic
               this.playSound('score'); // 'Clink' sound ideally
               this.spawnFX('mojito', this.player.x + 20, this.player.y - 40);
           }
      } else if (this.eventStep === 3) {
           // Step 3: Action/Animation (Mojito flying) (0-60 frames)
           if (this.eventTimer > 60) {
               // Apply Reward: Money +5, Life +1, Energy +10
               if (this.lives < 5) this.lives++;
               this.money += 5;
               this.energy += 10;
               // this.score += 50; // Bonus Score (Removed to match exact spec?) Spec says "money + vida +"
               this.eventStep = 4;
               this.eventTimer = 0;
           }
      } else if (this.eventStep === 4) {
           // Step 4: Leave (Resume) — remove Chica from entities
            if (this.eventTimer > 30) {
                if (this.eventTarget) {
                    this.eventTarget.isEventChica = false;
                    this.eventTarget.passed = true;
                    this.entities = this.entities.filter(ent => ent !== this.eventTarget);
                }
                this.state = 'PLAYING';
                this.eventStep = 0;
                this.eventTarget = null;
            }
      }
  },

  draw() {
    // 1. Fundo (Baseado na Zona)
    const zonesColors = [
        ['#FF5E62', '#FF9966'], // Sant Antoni (Sunset)
        ['#1abc9c', '#27ae60'], // Hippie (Nature)
        ['#8e44ad', '#c0392b'], // Disco (Night)
        ['#2980b9', '#ecf0f1'], // Town (White/Blue)
    ];

    // Gradiente de Fundo
    if (this.currentZoneIndex === 0) {
        // Sant Antoni: Céu Azul
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#4facfe');
        gradient.addColorStop(1, '#00f2fe');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

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

        // Colinas
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY);
        this.ctx.bezierCurveTo(100, this.groundY - 50, 200, this.groundY - 20, 320, this.groundY);
        this.ctx.fill();

    } else if (this.currentZoneIndex === 2) {
        // Disco: Noite
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Lasers
        this.ctx.strokeStyle = `hsl(${this.frame % 360}, 100%, 50%)`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(this.canvas.width, Math.sin(this.frame * 0.1) * 100 + 100);
        this.ctx.stroke();

    } else {
        // Ibiza Town (Dalt Vila)
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#2980b9');
        gradient.addColorStop(1, '#6dd5fa');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Silhueta Dalt Vila
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.fillRect(50, this.groundY - 60, 40, 60);
        this.ctx.fillRect(80, this.groundY - 80, 50, 80);
        this.ctx.fillRect(150, this.groundY - 50, 60, 50);

        // Janelas que piscam com o beat (Solicitação do usuário)
        // Color by beat: if onBeat, yellow/white; else dark gray
        const windowColor = this.onBeat ?
            `rgba(255, 255, 100, ${0.5 + Math.random() * 0.5})` : // Piscando
            '#2c3e50'; // Apagado

        this.ctx.fillStyle = windowColor;
        this.ctx.fillRect(60, this.groundY - 40, 10, 10);
        this.ctx.fillRect(100, this.groundY - 60, 10, 10);
        this.ctx.fillRect(110, this.groundY - 30, 10, 10);
        this.ctx.fillRect(160, this.groundY - 30, 10, 10);
        this.ctx.fillRect(180, this.groundY - 40, 10, 10);
    }

    // 🌊 SEA SPECTRUM - Persistente em TODAS as fases agora!
    // As ondas sonoras aparecem independente da zona
    this.drawSeaSpectrum();

    // Texto da Zona
    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
    this.ctx.font = 'bold 30px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.zones[this.currentZoneIndex], this.canvas.width/2, 160);

    // 2. Chão
    // Aplicação de cores do chão por zona...
    if (this.currentZoneIndex === 2) this.ctx.fillStyle = '#333';
    else if (this.currentZoneIndex === 1) this.ctx.fillStyle = '#27ae60';
    else if (this.currentZoneIndex === 3) this.ctx.fillStyle = '#95a5a6';
    else this.ctx.fillStyle = '#e8d5b7'; /* Beach: light sand */

    this.ctx.fillRect(0, this.groundY, this.canvas.width, 20);

    // 3. Jogador (Pixel Art Programático)
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



    // -- Lyrics Speech Bubble --
    const music = document.getElementById('bgMusic');
    if (music && !music.paused) {
        const currentTime = music.currentTime;
        // Find active lyric (lasts 3.5 seconds)
        const activeLyric = this.lyricsLines.find(l => currentTime >= l.time && currentTime < l.time + 3.5);

        if (activeLyric) {
            this.drawLyricsBubble(this.player.x + 20, this.player.y - 10, activeLyric.text);
        }
    }

    // 4. Entities (only Money/Drink use money sprite; Chica, Sunbather, Flower = drawEntity)
    for (let e of this.entities) {
        // During EVENT, Chica is drawn at fixed position — skip drawing her again here
        if (this.state === 'EVENT' && this.eventTarget && e === this.eventTarget) continue;
        if (e.type === 'GOOD' && (e.name === 'Money' || e.name === 'Drink') && this.assets.money.complete && this.assets.money.naturalWidth > 0) {
            this.ctx.drawImage(this.assets.money, e.x, e.y, e.w, e.h);
        } else {
            this.drawEntity(e);
        }
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

    // EVENT: Chica next to player + 5s conversation
    if (this.state === 'EVENT' && this.eventTarget) {
      const chicaX = this.player.x + this.player.w + 12;
      const chicaY = this.groundY - 60;
      this.drawChica(chicaX, chicaY, 40, 60);
      if (this.eventStep === 2) {
        const half = 150; // first 2.5s Chica, then 2.5s player
        if (this.eventTimer < half) {
          this.drawSpeechBubble(chicaX + 20, chicaY - 15, "Hey Miranda, give me a mojito.");
        } else {
          this.drawSpeechBubble(this.player.x + 20, this.player.y - 25, "Sure! Here you go.");
        }
      }
    }

    // 6. Real-time Map HUD
    this.drawHUD();
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
      // Cabelo
      this.ctx.fillStyle = '#f4d03f';
      this.ctx.fillRect(x + 6, y - 4, 28, 14);
      this.ctx.fillRect(x + 4, y, 6, 12);
      this.ctx.fillRect(x + w - 10, y, 6, 12);
      // Rosto (pele)
      this.ctx.fillStyle = '#ffefd5';
      this.ctx.fillRect(x + 6, y, 28, 22);
      this.ctx.fillStyle = '#1a1a1a';
      this.ctx.fillRect(x + 12, y + 6, 22, 6);
      this.ctx.fillStyle = '#2c3e50';
      this.ctx.fillRect(x + 14, y + 7, 8, 4);
      this.ctx.fillRect(x + 24, y + 7, 8, 4);
      // Torso topless — ombros/estômago em pele normal; seios em tom mais claro para destacar
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

  drawSpeechBubble(x, y, text) {
      if (!text) return;
      this.ctx.font = 'bold 12px Arial';
      const width = this.ctx.measureText(text).width + 20;
      const height = 30;

      // Bubble Body
      this.ctx.fillStyle = 'white';
      this.ctx.beginPath();
      // Use standard roundRect
      if (this.ctx.roundRect) {
         this.ctx.roundRect(x, y - height - 10, width, height, 10);
      } else {
         this.ctx.rect(x, y - height - 10, width, height);
      }
      this.ctx.fill();

      // Triangle Tail
      this.ctx.beginPath();
      this.ctx.moveTo(x + 10, y - 10);
      this.ctx.lineTo(x + 20, y);
      this.ctx.lineTo(x + 30, y - 10);
      this.ctx.fill();

      // Text
      this.ctx.fillStyle = 'black';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(text, x + 10, y - height + 10);
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

    // Stats: tudo no centro superior (entre mapa e sol) — PTS e energia
    const centerX = this.canvas.width / 2;
    const topY = 28;
    this.ctx.font = 'bold 24px Courier New';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText('PTS: ' + this.score, centerX, topY);
    this.ctx.fillStyle = '#f1c40f';
    this.ctx.fillText('⚡ ' + this.energy, centerX, topY + 30);

    // Map Config
      const mapSize = 70; // Reduced to 70px for better spacing
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

          // Define Geographical Route Points (Based on User Feedback)
          // 1. Sant Antoni (Left/West)
          // 2. Hippie Markets (Top/North)
          // 3. Clubs/Disco (Center)
          // 4. Ibiza Town (South-East)
          const points = [
              {x: 0.2, y: 0.6},  // Start: Sant Antoni (Left)
              {x: 0.5, y: 0.2},  // Zone 1: Hippie (Top)
              {x: 0.5, y: 0.5},  // Zone 2: Clubs (Center)
              {x: 0.8, y: 0.8},  // Zone 3: Ibiza Town (South-East)
              {x: 0.2, y: 0.6}   // Loop back
          ];

          // Draw Route Lines (Static)
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.moveTo(mapX + points[0].x*mapSize, mapY + points[0].y*mapSize);
          for (let i = 1; i < points.length; i++) {
              this.ctx.lineTo(mapX + points[i].x*mapSize, mapY + points[i].y*mapSize);
          }
          this.ctx.stroke();

          // Interpolate Position
          // Max Score for loop = 120
          const maxScore = 120;
          const progress = Math.min(this.score / maxScore, 0.99); // 0.0 to 1.0

          // Determine Segment (4 segments total)
          const totalSegments = points.length - 1; // 4
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

          // Ibiza Town only: Entry 60€ (zone name shown only in main HUD — big text)
          if (this.currentZoneIndex === 3) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.fillText('Entry 60€', mapX, mapY + mapSize + 64);
          }
      }
  },



    spawnEntity() {
      // 🎯 STRICT ZONE-BASED SPAWNING
      // No more generic "isBad" check at the top level.
      // Logic must flow from the Current Zone Index.

      const rand = Math.random();
      let type, name, value, w, h, y, color;

      // Default safe entity (can be overridden)
      type = 'GOOD';
      name = 'Drink';
      value = 10;
      w = 20; h = 20;
      color = '#f1c40f';
      y = this.groundY - 50 - (Math.random() * 50);

      if (this.currentZoneIndex === 0) {
          // ZONE 0: BEACH — Chica (collision) and seagulls in the sky (decor)
          if (rand < 0.25) {
              name = 'ChicaSilhouette';
              w = 40; h = 50;
              y = this.groundY - 50;
              value = 50;
              color = '#e67e22';
              type = 'GOOD';
          } else {
               name = 'Seagull';
               w = 40; h = 20;
               y = this.groundY - 150 - (Math.random() * 120);
               value = 0;
               color = ['#fff', '#dfe6e9', '#ffeaa7', '#fd79a8', '#81ecec', '#a29bfe', '#fab1a0', '#74b9ff'][Math.floor(Math.random() * 8)];
               type = 'DECOR';
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
          // 🪩 ZONE 2: CLUB
          // Spawns: Gold Digger (Bad), Drinks

          if (rand < 0.5) {
                // Gold Digger (Bad)
                name = 'GoldDigger';
                w = 35; h = 50;
                y = this.groundY - 50;
                value = 0;
                color = '#d4af37';
                type = 'BAD';
          } else {
               // Drinks/Party items
               name = 'Drink';
          }

      } else if (this.currentZoneIndex === 3) {
          // 🚓 ZONE 3: IBIZA TOWN (Dalt Vila)
          // Spawns: Police (Bad), Drones (Bad - if valid here)

          if (rand < 0.5) {
              // Police Car
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
              // High risk zone, fewer goods
              name = 'Drink';
          }
      }

      // Final Push
      this.entities.push({
          type: type,
          name: name,
          value: value,
          x: this.canvas.width,
          y: y,
          w: w,
          h: h,
          color: color
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
           // Bird (multiple colors)
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

      } else if (e.name === 'Money' && this.assets.money.complete) {
            this.ctx.drawImage(this.assets.money, e.x, e.y, e.w, e.h);
      } else if (e.name === 'Drink') {
           this.ctx.fillStyle = '#9b59b6'; // Purple Drink
           this.ctx.fillRect(e.x + 10, e.y, 10, 30); // Glass
           this.ctx.fillStyle = '#e74c3c'; // Umbrella
           this.ctx.beginPath();
           this.ctx.arc(e.x + 15, e.y, 15, Math.PI, 0);
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
        // Show Start Screen in Overlay
        if (overlay) overlay.style.display = 'flex';
        if (overlayContent) overlayContent.style.display = 'block';
        if (msgEl) msgEl.innerText = "Start Season!";
        if (statsEl) statsEl.style.display = 'none';

        // Hide HUD Score
        if (hudScoreEl) hudScoreEl.style.display = 'none';

        if (restartBtn) restartBtn.style.display = 'none';
        if (menuBtn) menuBtn.style.display = 'block';

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

        if (restartBtn) restartBtn.style.display = 'block';
        if (menuBtn) menuBtn.style.display = 'block';

        // Hide HUD Score so it doesn't overlap
        if (hudScoreEl) hudScoreEl.style.display = 'none';
    }
  },

  stop() {
     document.removeEventListener('keydown', this.handleInput);
     document.removeEventListener('keyup', this.handleStopInput);
     if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
     this.state = 'START';
  },

  drawLyricsBubble(x, y, text) {
      if (!text) return;
      this.ctx.font = 'bold 12px Arial';
      const width = this.ctx.measureText(text).width + 20;
      const height = 30;

      // Bubble Body
      this.ctx.fillStyle = 'white';
      this.ctx.beginPath();
      if (this.ctx.roundRect) {
         this.ctx.roundRect(x, y - height - 10, width, height, 10);
      } else {
         this.ctx.rect(x, y - height - 10, width, height);
      }
      this.ctx.fill();

      // Triangle Tail
      this.ctx.beginPath();
      this.ctx.moveTo(x + 10, y - 10);
      this.ctx.lineTo(x + 20, y);
      this.ctx.lineTo(x + 30, y - 10);
      this.ctx.fill();

      // Texto
      this.ctx.fillStyle = 'black';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(text, x + 10, y - height + 10);
  },

  // 🌊 SEA SPECTRUM - O oceano respira com a música
  drawSeaSpectrum() {
      const seaHeight = 60;
      const seaY = this.groundY - seaHeight;
      const waveCount = 32;
      const segmentWidth = this.canvas.width / waveCount;

      // Comportamento baseado na seção atual
      const section = this.currentSection || this.sections[0];
      const isCalm = section.seaCalm;
      const isHook = section.type === 'hook';
      const isChorus = section.type === 'chorus';

      // Obter dados de frequência se disponíveis
      let freqData = new Uint8Array(waveCount);
      if (this.analyser && this.spectrumData) {
          this.analyser.getByteFrequencyData(this.spectrumData);
          for (let i = 0; i < waveCount; i++) {
              const idx = Math.floor(i * (this.spectrumData.length / waveCount));
              freqData[i] = this.spectrumData[idx] || 0;
          }
      }

      // Cores dinâmicas do oceano baseadas na vibe da seção
      let colorTop, colorMid, colorDeep;

      if (this.zenMode) {
          // 🌸 Zen Mode: Calm, Warm, Sunset Colors override everything
          colorTop = 'rgba(255, 182, 193, 0.7)'; // Light Pink
          colorMid = 'rgba(255, 160, 122, 0.5)'; // Light Salmon
          colorDeep = 'rgba(219, 112, 147, 0.3)'; // Pale Violet Red
      } else if (isHook) {
          // Hook: Espelho/transcendente - mais claro, etéreo
          colorTop = 'rgba(200, 230, 255, 0.7)';
          colorMid = 'rgba(150, 200, 255, 0.5)';
          colorDeep = 'rgba(100, 180, 255, 0.3)';
      } else if (isCalm) {
          // Bridge/Outro: Calmo - azuis suaves
          colorTop = 'rgba(0, 198, 251, 0.6)';
          colorMid = 'rgba(0, 119, 182, 0.4)';
          colorDeep = 'rgba(2, 62, 138, 0.3)';
      } else if (isChorus) {
          // Chorus: Ativo - vibrante, intenso
          colorTop = 'rgba(0, 220, 255, 0.9)';
          colorMid = 'rgba(0, 150, 220, 0.7)';
          colorDeep = 'rgba(0, 80, 160, 0.6)';
      } else {
          // Padrão: Azuis normais
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
