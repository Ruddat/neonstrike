# 🚀 NEON STRIKE

**A Katakis-style retro HTML5 Canvas space shooter** — no installation, no dependencies, no framework. Pure JavaScript, one canvas, zero compromises.

Play it. Shoot things. Combo everything. Warp to the next stage. Die trying.

---

## 🎮 Play Now

Just open `index.html` in any modern browser. That's it. No build step, no server, no nonsense.

```
git clone https://github.com/Ruddat/neonstrike.git
cd neonstrike
open index.html   # or just double-click it
```

---

## ✨ Features

### Weapon System (Katakis-Style Leveling)
Your ship starts with a basic laser and powers up through **5 weapon levels**. Collect powerups to switch weapons — your level carries over.

| Weapon | Behavior | Max Level Bonus |
|--------|----------|-----------------|
| **Laser** | Standard — more streams at higher levels | 6 parallel beams + rear shot |
| **Spread** | Fan of projectiles — more streams at higher levels | 7-way fan shot |
| **Plasma** | Heavy energy orbs — tracking orbs at Lv3+ | Triple orbs with homing |
| **Railgun** | Piercing beam — cuts through multiple enemies | Triple rail beams |

Death costs you one weapon level. Stay alive, stay lethal.

### Combo System
Chain kills within a 2-second window to build combos:

| Combo Kills | Multiplier |
|-------------|------------|
| 5+ | x2 |
| 10+ | x3 |
| 15+ | x4 |
| 20+ | x5 |

Every multiplier threshold also grants a **bomb fragment**. Getting hit resets your combo.

### 6 Enemy Formations
Enemies don't just trickle in — they arrive in coordinated formations:

- **V-Formation** — Classic arrowhead pattern
- **Line** — Side-by-side wall of drones
- **Circle** — Encircling ring with heavy units
- **Flanker Pair** — Two fast attackers from above and below
- **Kamikaze Wave** — Suicide ramming ships that track the player
- **Sniper Team** — Precision shooters with aimed fire

### 4 Enemy Types
- **Drone** — Standard unit, sinusoidal movement
- **Heavy** — Triple-shot, high HP, slow
- **Kamikaze** — Accelerating ram attack, no ranged fire
- **Flanker** — High-speed vertical weaving
- **Sniper** — Aimed shots directly at the player

### 3-Phase Boss Fights
After enough kills per stage (starts at 25, scales +3 per stage, max 45), a boss appears:

- **Phase 1** — Gentle movement, fan shots and aimed bursts
- **Phase 2** — Target tracking, ring/spiral bullet patterns, spawns minions
- **Phase 3** — Aggressive pursuit, homing missiles, double ring attacks, cross patterns

Boss HP scales with stage progression. Minions respawn during Phases 2 and 3.

### Hyperspace Jump
When a boss goes down, the screen explodes into a **3.5-second hyperspace warp transition** — 150 streaking stars, central glow, tunnel vignette, and a white flash before arriving at the next stage.

### Bomb System with Replenishment
- Start with 3 bombs (max 5)
- Bombs clear all enemies and bullets on screen
- **Bomb Fragments**: Collect 3 fragments from drops or combo rewards = 1 new bomb
- Guaranteed bomb drop after every boss kill

### 10 Stages
Each stage has a unique parallax background, color palette, and boss:

| Stage | Name | Boss |
|-------|------|------|
| 1 | Orbital Frontier | Dread Cruiser |
| 2 | Asteroid Graveyard | Titan Miner |
| 3 | Cyber Grid | Neon Overlord |
| 4 | Ruined Station | Station Warden |
| 5 | Nebula Rift | Mist Serpent |
| 6 | Alien Hive | Hive Queen |
| 7 | Machine Core | Core Sentinel |
| 8 | Solar Inferno | Solar Reaper |
| 9 | Void Sector | Void Phantom |
| 10 | Omega Citadel | Omega Prime |

Stages loop with increasing difficulty after Stage 10.

### Powerup System
Powerups drift across the screen and are **magnetically attracted** to the player when nearby:

| Type | Label | Effect |
|------|-------|--------|
| Weapon Up | UP | +1 weapon level |
| Spread | S | Switch to spread weapon (16s) |
| Plasma | P | Switch to plasma weapon (12s) |
| Railgun | G | Switch to railgun weapon (8s) |
| Rapid Fire | R | Double fire rate (10s) |
| Shield | D | Absorbs one hit (8s) |
| Extra Life | + | +1 life (max 5) |
| Bomb | B | +1 bomb fragment (3 = 1 bomb) |

### Retro Demo-Scene Intro
A proper Amiga-era intro sequence with:
- Scrolling starfield with plasma orbs
- Perspective grid floor
- Wave-animated logo letters
- Scrolling credit text ("THE FOX — FOUNDER OF CROSSBONES — INTRO MAKER OF FUZION CREW FRANCE")
- CRT scanlines and vignette effect

---

## 🕹️ Controls

### Desktop
| Input | Action |
|-------|--------|
| WASD / Arrow Keys | Move |
| Space / J | Fire |
| K | Bomb |
| P | Pause |
| F | Fullscreen |
| Mouse Move | Ship follows cursor |
| Left Click | Fire |
| Right Click | Bomb |

### Mobile / Touch
| Input | Action |
|-------|--------|
| Left half of screen (drag) | Virtual joystick |
| FIRE button (bottom right) | Fire |
| BOMB button (above fire) | Bomb |
| PAUSE button (top right) | Pause |

Touch is auto-detected — the game switches to touch mode when a touchscreen is present.

---

## 🏗️ Architecture

Pure vanilla JavaScript with ES modules. No build tools, no bundler, no npm. Just files.

```
neonstrike/
├── index.html              # Entry point, viewport + PWA metas
├── css/
│   └── game.css            # Responsive layout, mobile, fullscreen
├── js/
│   ├── main.js             # Game loop, render pipeline, HUD, hyperspace, touch drawing
│   ├── config.js           # Canvas dimensions, storage key
│   ├── state.js            # Global game state (player, enemies, bullets, particles)
│   ├── player.js           # Player movement, weapons, bombs, bullet rendering
│   ├── enemies.js          # Enemy types, formations, AI, spawning
│   ├── boss.js             # Boss phases, patterns, minions, kill sequence
│   ├── collisions.js       # Collision detection, combo system, damage handling
│   ├── effects.js          # Particle system (explosions, debris, thrust, sparks, combo text)
│   ├── background.js       # Multi-layer parallax stars, nebula clouds, stage decorations
│   ├── powerups.js         # Powerup drops, magnet pickup, timed effects
│   ├── stages.js           # 10 stage definitions (colors, enemy speed, boss names)
│   ├── input.js            # Keyboard, mouse, touch input, virtual joystick
│   ├── audio.js            # Music and SFX management
│   ├── assets.js           # Sprite/image loader
│   ├── intro.js            # Demo-scene intro sequence
│   ├── highscore.js        # localStorage highscore
│   └── utils.js            # Clamp helper
├── assets/
│   ├── sprites/            # Player, enemies, bosses, bullets, FX
│   └── audio/              # Menu theme, ingame theme, boss theme, SFX
```

### Render Pipeline (per frame)
1. **Background** — Cached static gradient + parallax star layers (deep → mid → near) + nebula clouds + foreground objects
2. **Stage Transition Overlay** — Stage name display during transitions
3. **HUD** — Score, hi-score, combo, lives, bombs, weapon level, timers
4. **Boss HUD** — Warning text, HP bar with phase indicator
5. **Bullets** — Player and enemy projectiles
6. **Enemies** — Type-specific rendering with glow effects
7. **Boss** — Multi-phase sprite animation with damage flash
8. **Effects** — Particle system (explosions, debris, thrust, sparks, combo text)
9. **Powerups** — Rotating diamond pickups with pulsing glow
10. **Player** — Ship sprite with shield and weapon-level glow
11. **Hyperspace Warp** — 150 star streaks, central glow, tunnel vignette, text, flash
12. **Screen Flash** — White overlay for impacts and events
13. **Touch Controls** — Virtual joystick, FIRE/BOMB/PAUSE buttons (mobile only)

### Performance Optimizations
- **Background caching**: Static stage gradients and decorations rendered once to an offscreen canvas
- **No shadowBlur**: All glow effects use semi-transparent shapes instead of expensive canvas shadows
- **fillRect over arc**: Stars and small particles use rectangles for faster rendering
- **Delta-time game loop**: Frame-rate independent with capped dt (33ms max)
- **Efficient collision**: Circle-rect and rect-rect checks with early exits
- **Particle cleanup**: Expired particles spliced immediately from arrays

---

## 🎨 Visual Style

Neon Strike channels the spirit of classic Amiga shooters like **Katakis** and **R-Type**:

- Dark space backgrounds with layered parallax scrolling
- Neon cyan (#38bdf8) and orange (#f97316) color palette
- Explosion sprite animations (6-frame sequence)
- Engine thrust particles behind the player ship
- Combo multiplier text floating from kills
- Screen shake and flash on impacts
- CRT-style scanlines in the intro
- Boss damage flash with screen composite blending

---

## 📱 Mobile Support

The game is fully playable on phones and tablets:

- **Responsive canvas**: Scales to fill the viewport with correct aspect ratio
- **Virtual joystick**: Touch and drag on the left half of the screen
- **Touch buttons**: FIRE (bottom right), BOMB (above fire), PAUSE (top right)
- **PWA-ready**: Apple mobile web app meta tags, theme color, viewport fit
- **No scroll/bounce**: `overscroll-behavior: none`, `touch-action: none`
- **Fullscreen**: CSS adapts automatically — no border, no shadow on mobile

---

## 🔊 Audio

- **Menu theme** — Looping background music on the title screen
- **Ingame theme** — Action music during gameplay
- **Boss theme** — Intense music during boss encounters
- **SFX**: Shoot, explosion, powerup pickup, hit, bomb, boss warning

All audio uses the Web Audio API via standard `Audio` elements with cloneNode for overlapping SFX.

---

## 💾 Persistence

Highscores are stored in `localStorage` under the key `neonStrikeHighscore`. No server, no accounts, just your browser.

---

## 🛠️ Tech Stack

- **HTML5 Canvas** — All rendering on a single 1280x720 canvas
- **Vanilla JavaScript** — ES modules, no dependencies
- **CSS** — Responsive layout, fullscreen support, mobile optimization
- **Zero dependencies** — No npm, no bundler, no framework

Runs in any modern browser: Chrome, Firefox, Safari, Edge. Also works on mobile Chrome/Safari.

---

## 📜 Credits

- **Code & Design**: Ingo Ruddat (The Fox)
- **Inspiration**: Katakis (Rainbow Arts, 1988), R-Type (Irem, 1987)
- **Scene**: Crossbones · Fuzion Crew France

---

## 📄 License

This project is open source. Feel free to fork, modify, and share.

---

*NEON STRIKE — An old school HTML5 shooter*
