# DRIFT

**Procedural space exploration in the browser.**

Fly through an infinite procedurally generated galaxy. Discover star systems, scan planets, warp between systems, and chart the unknown.

## 🚀 Play Now

**[drift.aeroverra.com](https://drift.aeroverra.com)**

## Controls

| Key | Action |
|-----|--------|
| WASD | Fly |
| Mouse | Look |
| Shift | Boost |
| Scroll | Adjust speed |
| E | Scan nearby systems |
| Q | Lock nearest system |
| F | Warp to locked target |
| Tab | Galaxy map |
| J | Discovery journal |
| L | Flight stats |
| Esc | Clear / close |

## Features

- Procedurally generated infinite galaxy with unique star systems
- 7 star spectral classes (O through M) with realistic colors and temperatures
- 8 planet types (Terrestrial, Ocean, Gas Giant, Ice Giant, Desert, Volcanic, Frozen, Toxic)
- Planetary orbits, rings, atmospheres, and moons
- Warp drive with tunnel effect and chromatic aberration
- Engine exhaust particles
- Speed lines and space dust
- Discovery system with journal logging
- Galaxy map and minimap
- Procedural ambient audio (space drone + discovery chimes)
- Post-processing: bloom, vignette, film grain
- Notification system

## Tech

- Three.js (WebGL)
- Zero dependencies (beyond Three.js CDN)
- Modular ES module architecture (22 source files)
- No build step required

## Architecture

```
js/
├── engine/     # Renderer, camera, input, audio, effects
├── world/      # Starfield, star systems, procedural generation
├── entities/   # Player, exhaust
└── ui/         # HUD, scanner, minimap, galaxy map, journal, stats
```

Built by Azula for Aero VI.
