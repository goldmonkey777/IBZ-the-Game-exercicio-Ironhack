# IBZ the GAME — Survival Season

**IBZ the GAME** is a browser-based endless runner set on the island of Ibiza. You play as Miranda, a worker crossing the island’s zones: beach, hippie north, club, and town. The game is driven by the soundtrack (*Benediction*), with lyrics, difficulty, and visuals synced to the music.

---

## Why the game was created

The project was developed as a **final exercise for the Ironhack Web Development Bootcamp (Module 2 — Frontend with React)**. The goals were to practice:

- **DOM manipulation** and **state management** with vanilla JavaScript  
- **Game loops**, **collision detection**, and **entity spawning**  
- **Canvas 2D** for pixel-art style graphics  
- **Web Audio API** for beat detection and music-driven gameplay  
- **Responsive layout** and **screen flow** (menus, game, game over)

The theme (Ibiza, nightlife, satire) was chosen to make the exercise fun and to explore a music-synced, zone-based endless runner.

---

## What the game is

- **Genre:** 2D endless runner (Flappy Bird–style run and jump).  
- **Setting:** Ibiza — four zones that change as your score increases.  
- **Music:** One track (*Benediction.mp3*); speed, obstacles, and lyrics sync to the song.  
- **Goal:** Survive as long as possible, collect items, avoid hazards, and complete the Chica event on the beach.

---

## How to play

### Getting started

1. Open the game in a modern browser (Chrome, Firefox, Safari, Edge).  
2. Pass the **age gate** (18+).  
3. From the **main menu**, choose **“Start Season (Survival)”** to go straight to the runner, or **“About Island & Game”** to read the rules.  
4. On the game screen, **tap or press Space / Up Arrow** to start. The music begins and the character starts running.

### Controls

| Action   | PC / Keyboard | Mobile / Touch |
|----------|----------------|----------------|
| Start    | Space or ↑     | Tap screen     |
| Jump     | Space or ↑     | Tap screen     |
| Duck     | Down Arrow ↓   | —              |

- **Jump:** Avoid obstacles and reach collectibles. Timing with the beat is helpful.  
- **Duck:** Slide under some obstacles (when implemented).  
- **Music:** Use the **“🔇 Music”** button (bottom-right) to mute or unmute the soundtrack.

### HUD (during the game)

- **Top centre:** **PTS** (points) and **⚡** (energy).  
- **Top left:** Mini-map of the island and **hearts** (lives).  
- **Centre:** Current zone name (e.g. **Cala Saladeta**).  
- **Bottom right:** Music on/off button.

### Zones (in order as score increases)

1. **Cala Saladeta (Beach)**  
   - **Chica:** Collide with her to start a short event: she asks for a mojito; you “deliver”; you gain points, life, and energy.  
   - **Birds:** Decorative; different colours, no collision.  

2. **North / Hippie**  
   - **Hippie:** Gives a flower (life, protection, or music effect).  
   - **Flowers** and **drinks** to collect.  

3. **Universo (Club)**  
   - **Gold Digger:** Unpredictable (can take resources or give a bonus).  
   - **Drinks** to collect.  
   - Background pulses with the music.  

4. **Ibiza Town**  
   - **Police:** Avoid them or you get “Busted by Police!” and game over.  
   - **Entry 60€** is shown in the HUD when in this zone.  
   - **Drones** as additional hazards.

### Winning and losing

- **Game over** if:  
  - You hit an obstacle (e.g. police, drone, or other hazard).  
  - You run out of lives (hearts).  
- **“You survived the season!”** can appear when reaching a certain survival milestone.  
- **Try Again** restarts the run; **Main Menu** returns to the start screen.

---

## Construction (tech stack)

The game is built with **HTML5**, **CSS3**, and **vanilla JavaScript** (no frameworks). No build step is required.

### Main parts

- **`index.html`**  
  - Age gate, main menu, info screen, map screen, flappy (runner) screen.  
  - Single `<audio>` for *Benediction.mp3*.  
  - Buttons and overlays for navigation and game over.

- **`style.css`**  
  - Layout and responsiveness.  
  - Styling for screens, buttons, map, HUD, overlays, and the mute button.

- **`js/main.js`**  
  - Screen flow (which section is visible).  
  - Age gate and localStorage.  
  - Wiring for: Start Season, About, Back to Menu, Restart, **Mute/Unmute music**.

- **`js/flappy.js`**  
  - Core game logic:  
    - Canvas setup, game loop, physics (gravity, jump, duck).  
    - Entity spawn (obstacles, Chica, birds, hippie, gold digger, police, drones, collectibles).  
    - Zone progression by score (Cala Saladeta → North → Universo → Ibiza Town).  
    - Collision detection and events (e.g. Chica dialogue, rewards, game over).  
  - **Web Audio API:** `AudioContext`, `createMediaElementSource`, `AnalyserNode` for beat/spectrum (used for visuals and future mechanics).  
  - **Lyrics:** Timed lines synced to the song and shown in a speech bubble.  
  - **Drawing:** Pixel-art style characters (Miranda, Chica, Hippie, Gold Digger, Police), birds, FX, HUD, mini-map.

- **`js/game.js`**  
  - Logic for the **map screen** (clickable zones, markers, etc.) if the player enters the game from the map.

### Assets

- **`Benediction.mp3`** — Background music.  
- **`assets/images/`** — Map image, sprites (e.g. money), FX assets.  
- **`LYRICS_TIMELINE.md`** — Reference for lyric timings.

### How to run

1. Clone or download the project.  
2. Serve the folder with a local server (e.g. `npx serve .`, or open `index.html` directly — some features may require a server for audio).  
3. Open the URL in the browser and accept the age gate to play.

---

## Credits

- **Created by:** Goldmonkey · Goldmonkey Studio  
- **All rights reserved.**  
- **Educational project:** Ironhack Web Development Bootcamp — Module 2 (Frontend).  
- **Content:** 18+; satirical and fictional; not affiliated with any real venues or persons.
