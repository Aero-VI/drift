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
import { HUD } from './ui/hud.js';
import { Scanner } from './ui/scanner.js';
import { Minimap } from './ui/minimap.js';
import { GalaxyMap } from './ui/galaxymap.js';
import { TargetingSystem } from './ui/targeting.js';
import { Journal } from './ui/journal.js';

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
        this.targeting = null;
        this.journal = null;
        this.speedLines = null;
        this.dustParticles = null;
        this.warpTunnel = null;

        this.clock = new THREE.Clock();
        this.time = 0;
        this.lastDiscoveryCheck = 0;
        this.audioInitialized = false;
        this.fpsCounter = { frames: 0, lastTime: 0, fps: 0 };

        this.init();
    }

    async init() {
        const loadingBar = document.getElementById('loader-bar');
        const loadingStatus = document.getElementById('loader-status');

        try {
            loadingStatus.textContent = 'Initializing engine...';
            loadingBar.style.width = '10%';
            const canvas = document.getElementById('game-canvas');
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
            this.setupInteractions();
            await this.sleep(150);

            loadingStatus.textContent = 'Ready. Click to enter.';
            loadingBar.style.width = '100%';
            this.camera.lock(canvas);

            await new Promise(resolve => {
                const handler = () => {
                    canvas.removeEventListener('click', handler);
                    resolve();
                };
                canvas.addEventListener('click', handler);
            });

            const loadingScreen = document.getElementById('loading-screen');
            loadingScreen.classList.add('fade-out');
            setTimeout(() => { loadingScreen.style.display = 'none'; }, 1500);

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
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    loop() {
        requestAnimationFrame(() => this.loop());

        const delta = Math.min(this.clock.getDelta(), 0.05);
        this.time += delta;

        // FPS
        this.fpsCounter.frames++;
        if (this.time - this.fpsCounter.lastTime >= 1) {
            this.fpsCounter.fps = this.fpsCounter.frames;
            this.fpsCounter.frames = 0;
            this.fpsCounter.lastTime = this.time;
        }

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

        // Update effects
        this.speedLines.update(this.camera.camera, this.player.speed, this.player.boosting || this.player.warping, delta);
        this.dustParticles.update(this.player.position, this.time);
        this.warpTunnel.update(this.camera.camera, this.player.warping, this.time, delta);

        // Update targeting
        this.targeting.update(this.camera.camera, this.player);

        // Discovery check
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
                }
            }
        }

        const nearbySystems = this.systemManager.scanNearby(this.player.position, 5000);
        const nearestSystem = this.systemManager.getNearestSystem(this.player.position);

        this.hud.update(this.player, sector, nearestSystem);
        this.minimap.update(this.player.position, nearbySystems, this.camera.getDirection());

        // Key actions
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

        if (this.input.wasPressed('Escape')) {
            this.scanner.close();
            this.galaxyMap.close();
            this.journal.close();
            this.player.clearTarget();
        }

        if (this.input.wasPressed('KeyF') && this.player.lockedTarget) {
            const started = this.player.startWarp();
            if (started) {
                this.audio.playBoost();
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
            }
        }

        if (this.player.boosting && this.input.wasPressed('ShiftLeft')) {
            this.audio.playBoost();
        }

        this.renderer.render(this.camera.camera);
        this.input.endFrame();
    }
}

new Game();
