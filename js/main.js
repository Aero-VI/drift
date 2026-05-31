import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { GameCamera } from './engine/camera.js';
import { Input } from './engine/input.js';
import { AudioEngine } from './engine/audio.js';
import { SpeedLines, DustParticles } from './engine/effects.js';
import { WarpTunnel } from './engine/warptunnel.js';
import { Starfield } from './world/starfield.js';
import { StarSystemManager } from './world/systems.js';
import { Player } from './entities/player.js';
import { EngineExhaust } from './entities/exhaust.js';
import { HUD } from './ui/hud.js';
import { Scanner } from './ui/scanner.js';
import { Minimap } from './ui/minimap.js';
import { GalaxyMap } from './ui/galaxymap.js';
import { TargetingSystem } from './ui/targeting.js';
import { Journal } from './ui/journal.js';
import { NotificationSystem } from './ui/notifications.js';
import { StatsTracker } from './ui/stats.js';

class Game {
    constructor() {
        this.clock = new THREE.Clock();
        this.time = 0;
        this.lastDiscoveryCheck = 0;
        this.audioInitialized = false;
        this.wasWarping = false;
        this.init();
    }

    async init() {
        const loadingBar = document.getElementById('loader-bar');
        const loadingStatus = document.getElementById('loader-status');
        const loadingScreen = document.getElementById('loading-screen');
        const canvas = document.getElementById('game-canvas');

        try {
            loadingStatus.textContent = 'Initializing engine...';
            loadingBar.style.width = '10%';
            this.renderer = new Renderer(canvas);
            this.camera = new GameCamera();
            this.input = new Input();
            this.audio = new AudioEngine();
            await this.sleep(150);

            loadingStatus.textContent = 'Generating starfield...';
            loadingBar.style.width = '25%';
            this.starfield = new Starfield(this.renderer.scene);
            await this.sleep(150);

            loadingStatus.textContent = 'Building star systems...';
            loadingBar.style.width = '45%';
            this.systemManager = new StarSystemManager(this.renderer.scene);
            await this.sleep(150);

            loadingStatus.textContent = 'Loading effects...';
            loadingBar.style.width = '55%';
            this.speedLines = new SpeedLines(this.renderer.scene);
            this.dustParticles = new DustParticles(this.renderer.scene);
            this.warpTunnel = new WarpTunnel(this.renderer.scene);
            this.exhaust = new EngineExhaust(this.renderer.scene);
            await this.sleep(100);

            loadingStatus.textContent = 'Calibrating ship systems...';
            loadingBar.style.width = '70%';
            this.player = new Player(this.camera);
            this.player.position.set(100, 50, 100);
            this.renderer.setupPostProcessing(this.camera.camera);
            await this.sleep(150);

            loadingStatus.textContent = 'Loading interface...';
            loadingBar.style.width = '85%';
            this.hud = new HUD();
            this.scanner = new Scanner();
            this.minimap = new Minimap();
            this.galaxyMap = new GalaxyMap();
            this.targeting = new TargetingSystem();
            this.journal = new Journal();
            this.notifications = new NotificationSystem();
            this.stats = new StatsTracker();
            this.setupInteractions();
            await this.sleep(150);

            loadingStatus.textContent = 'Ready. Click to enter.';
            loadingBar.style.width = '100%';
            loadingScreen.style.cursor = 'pointer';

            // Wait for click on the LOADING SCREEN (not canvas, which is behind it)
            await new Promise(resolve => {
                const handler = (e) => {
                    e.preventDefault();
                    loadingScreen.removeEventListener('click', handler);
                    loadingScreen.removeEventListener('touchstart', handler);
                    resolve();
                };
                loadingScreen.addEventListener('click', handler);
                loadingScreen.addEventListener('touchstart', handler);
            });

            // NOW set up pointer lock (after loading screen is being dismissed)
            this.camera.lock(canvas);

            // Request pointer lock on desktop (mobile will just work without it)
            if (document.pointerLockElement === undefined) {
                // Pointer lock not supported (mobile), that's fine
            } else {
                try {
                    await canvas.requestPointerLock();
                } catch (e) {
                    // Pointer lock denied or not supported, continue anyway
                }
            }

            // Fade out loading screen
            loadingScreen.classList.add('fade-out');
            setTimeout(() => { loadingScreen.style.display = 'none'; }, 1500);

            this.notifications.show('SYSTEMS ONLINE', 'success', 2000);
            setTimeout(() => {
                this.notifications.show('Press E to scan nearby systems', 'info', 4000);
            }, 2500);

            this.loop();

        } catch (err) {
            console.error('Init failed:', err);
            loadingStatus.textContent = `Error: ${err.message}`;
            loadingBar.style.width = '100%';
            loadingBar.style.background = 'rgba(255, 50, 50, 0.8)';
        }
    }

    setupInteractions() {
        this.scanner.onSelect = (result) => {
            this.player.lockTarget(result.system, result.worldPos);
            this.notifications.show(`TARGET: ${result.system.name}`, 'info', 2000);
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    loop() {
        requestAnimationFrame(() => this.loop());

        const delta = Math.min(this.clock.getDelta(), 0.05);
        this.time += delta;

        if (!this.audioInitialized && (this.input.isDown('KeyW') || this.input.mouseDown)) {
            this.audio.init();
            this.audioInitialized = true;
        }

        // Update player
        this.player.update(this.input, delta);
        this.stats.update(this.player.position, this.player.speed);

        // Warp state transitions
        if (this.player.warping && !this.wasWarping) {
            this.notifications.show('WARP DRIVE ENGAGED', 'success', 2000);
        }
        if (!this.player.warping && this.wasWarping) {
            this.notifications.show('WARP COMPLETE', 'success', 2000);
            this.stats.addWarp();
        }
        this.wasWarping = this.player.warping;

        // Update world
        const sector = this.systemManager.update(this.player.position, this.time);
        this.starfield.update(this.time);

        // Update effects
        this.speedLines.update(this.camera.camera, this.player.speed, this.player.boosting || this.player.warping, delta);
        this.dustParticles.update(this.player.position, this.time);
        this.warpTunnel.update(this.camera.camera, this.player.warping, this.time, delta);
        this.exhaust.update(
            this.player.position,
            this.camera.getDirection(),
            this.player.speed,
            this.player.boosting,
            delta
        );

        // Targeting
        this.targeting.update(this.camera.camera, this.player);

        // Discovery
        if (this.time - this.lastDiscoveryCheck > 0.5) {
            this.lastDiscoveryCheck = this.time;
            const nearest = this.systemManager.getNearestSystem(this.player.position, 100);
            if (nearest) {
                const discovered = this.systemManager.discover(nearest.system.name);
                if (discovered) {
                    nearest.system.discovered = true;
                    this.hud.showDiscovery(nearest.system.name);
                    this.audio.playDiscovery();
                    this.journal.addEntry(nearest.system);
                    this.stats.addDiscovery();
                }
            }
        }

        const nearbySystems = this.systemManager.scanNearby(this.player.position, 5000);
        const nearestSystem = this.systemManager.getNearestSystem(this.player.position);

        this.hud.update(this.player, sector, nearestSystem);
        this.minimap.update(this.player.position, nearbySystems, this.camera.getDirection());

        // Keys
        if (this.input.wasPressed('KeyE')) {
            const scanResults = this.systemManager.scanNearby(this.player.position, 5000);
            this.scanner.toggle(scanResults, this.player.position);
            this.audio.playScan();
        }

        if (this.input.wasPressed('Tab')) {
            this.galaxyMap.toggle(this.player.position, this.systemManager);
        }

        if (this.input.wasPressed('KeyJ')) {
            this.journal.toggle();
        }

        if (this.input.wasPressed('KeyL')) {
            this.stats.toggle();
        }

        if (this.input.wasPressed('Escape')) {
            this.scanner.close();
            this.galaxyMap.close();
            this.journal.close();
            this.stats.close();
            this.player.clearTarget();
        }

        if (this.input.wasPressed('KeyF') && this.player.lockedTarget) {
            const started = this.player.startWarp();
            if (started) {
                this.audio.playBoost();
            } else if (this.player.fuel < 30) {
                this.notifications.show('INSUFFICIENT FUEL FOR WARP', 'warning', 2000);
            }
        }

        if (this.input.wasPressed('KeyQ')) {
            const nearest = this.systemManager.getNearestSystem(this.player.position, 3000);
            if (nearest) {
                const [sx, sy, sz] = nearest.sectorKey.split(',').map(Number);
                const worldPos = new THREE.Vector3(
                    sx * 2000 + nearest.system.position.x,
                    sy * 2000 + nearest.system.position.y,
                    sz * 2000 + nearest.system.position.z
                );
                this.player.lockTarget(nearest.system, worldPos);
                this.notifications.show(`LOCKED: ${nearest.system.name} (${Math.floor(nearest.distance)}u)`, 'info', 2000);
            } else {
                this.notifications.show('NO SYSTEMS IN RANGE', 'warning', 2000);
            }
        }

        if (this.player.boosting && this.input.wasPressed('ShiftLeft')) {
            this.audio.playBoost();
        }

        this.renderer.updateEffects(this.time, this.player.warping ? 1.0 : 0.0);
        this.renderer.render(this.camera.camera);
        this.input.endFrame();
    }
}

new Game();
