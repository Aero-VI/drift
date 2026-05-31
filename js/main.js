import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { GameCamera } from './engine/camera.js';
import { Input } from './engine/input.js';
import { AudioEngine } from './engine/audio.js';
import { Starfield } from './world/starfield.js';
import { StarSystemManager } from './world/systems.js';
import { Player } from './entities/player.js';
import { HUD } from './ui/hud.js';
import { Scanner } from './ui/scanner.js';
import { Minimap } from './ui/minimap.js';
import { GalaxyMap } from './ui/galaxymap.js';

class Game {
    constructor() {
        this.renderer = null;
        this.camera = null;
        this.input = null;
        this.audio = null;
        this.starfield = null;
        this.systemManager = null;
        this.player = null;
        this.hud = null;
        this.scanner = null;
        this.minimap = null;
        this.galaxyMap = null;

        this.clock = new THREE.Clock();
        this.time = 0;
        this.lastDiscoveryCheck = 0;
        this.audioInitialized = false;

        this.init();
    }

    async init() {
        const loadingBar = document.getElementById('loader-bar');
        const loadingStatus = document.getElementById('loader-status');

        try {
            // Phase 1: Engine
            loadingStatus.textContent = 'Initializing engine...';
            loadingBar.style.width = '10%';

            const canvas = document.getElementById('game-canvas');
            this.renderer = new Renderer(canvas);
            this.camera = new GameCamera();
            this.input = new Input();
            this.audio = new AudioEngine();

            await this.sleep(200);

            // Phase 2: Stars
            loadingStatus.textContent = 'Generating starfield...';
            loadingBar.style.width = '30%';

            this.starfield = new Starfield(this.renderer.scene);
            await this.sleep(200);

            // Phase 3: Systems
            loadingStatus.textContent = 'Building star systems...';
            loadingBar.style.width = '50%';

            this.systemManager = new StarSystemManager(this.renderer.scene);
            await this.sleep(200);

            // Phase 4: Player
            loadingStatus.textContent = 'Calibrating ship systems...';
            loadingBar.style.width = '70%';

            this.player = new Player(this.camera);
            // Start near a system
            this.player.position.set(100, 50, 100);

            this.renderer.setupPostProcessing(this.camera.camera);
            await this.sleep(200);

            // Phase 5: UI
            loadingStatus.textContent = 'Loading interface...';
            loadingBar.style.width = '85%';

            this.hud = new HUD();
            this.scanner = new Scanner();
            this.minimap = new Minimap();
            this.galaxyMap = new GalaxyMap();

            this.setupInteractions();
            await this.sleep(200);

            // Phase 6: Camera lock
            loadingStatus.textContent = 'Ready. Click to enter.';
            loadingBar.style.width = '100%';

            this.camera.lock(canvas);

            // Wait for click
            await new Promise(resolve => {
                const handler = () => {
                    canvas.removeEventListener('click', handler);
                    resolve();
                };
                canvas.addEventListener('click', handler);
            });

            // Fade out loading screen
            const loadingScreen = document.getElementById('loading-screen');
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 1500);

            // Start
            this.loop();

        } catch (err) {
            console.error('Init failed:', err);
            loadingStatus.textContent = `Error: ${err.message}`;
            loadingBar.style.width = '100%';
            loadingBar.style.background = 'rgba(255, 50, 50, 0.8)';
        }
    }

    setupInteractions() {
        // Scanner select callback
        this.scanner.onSelect = (result) => {
            this.player.lockTarget(result.system, result.worldPos);
        };

        // Keyboard shortcuts (handled in update via input.wasPressed)
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    loop() {
        requestAnimationFrame(() => this.loop());

        const delta = Math.min(this.clock.getDelta(), 0.05); // cap delta
        this.time += delta;

        // Init audio on first input
        if (!this.audioInitialized && (this.input.isDown('KeyW') || this.input.mouseDown)) {
            this.audio.init();
            this.audioInitialized = true;
        }

        // Update player
        this.player.update(this.input, delta);

        // Update world
        const sector = this.systemManager.update(this.player.position, this.time);
        this.starfield.update(this.time);

        // Move starfield with player (parallax: stars are far away)
        // Stars stay put, they're far enough away

        // Discovery check (every 0.5s)
        if (this.time - this.lastDiscoveryCheck > 0.5) {
            this.lastDiscoveryCheck = this.time;
            const nearest = this.systemManager.getNearestSystem(this.player.position, 100);
            if (nearest) {
                const discovered = this.systemManager.discover(nearest.system.name);
                if (discovered) {
                    nearest.system.discovered = true;
                    this.hud.showDiscovery(nearest.system.name);
                    this.audio.playDiscovery();
                }
            }
        }

        // Get scan data for minimap
        const nearbySystems = this.systemManager.scanNearby(this.player.position, 5000);
        const nearestSystem = this.systemManager.getNearestSystem(this.player.position);

        // UI updates
        this.hud.update(this.player, sector, nearestSystem);
        this.minimap.update(
            this.player.position,
            nearbySystems,
            this.camera.getDirection()
        );

        // Key actions
        if (this.input.wasPressed('KeyE')) {
            const scanResults = this.systemManager.scanNearby(this.player.position, 5000);
            this.scanner.toggle(scanResults, this.player.position);
            this.audio.playScan();
        }

        if (this.input.wasPressed('Tab')) {
            this.galaxyMap.toggle(this.player.position, this.systemManager);
        }

        if (this.input.wasPressed('Escape')) {
            this.scanner.close();
            this.galaxyMap.close();
        }

        // Boost sound
        if (this.player.boosting && this.input.wasPressed('ShiftLeft')) {
            this.audio.playBoost();
        }

        // Render
        this.renderer.render(this.camera.camera);

        // End frame
        this.input.endFrame();
    }
}

// Start
new Game();
