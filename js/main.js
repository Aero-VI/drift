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
import { SaveSystem } from './engine/savesystem.js';
import { ObjectivesSystem } from './engine/objectives.js';
import { LandingSystem } from './engine/landing.js';
import { UpgradesUI } from './ui/upgrades.js';

class Game {
    constructor() {
        this.clock = new THREE.Clock();
        this.time = 0;
        this.lastDiscoveryCheck = 0;
        this.lastSectorCheck = { x: null, y: null, z: null };
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
            loadingBar.style.width = '80%';
            this.hud = new HUD();
            this.scanner = new Scanner();
            this.minimap = new Minimap();
            this.galaxyMap = new GalaxyMap();
            this.targeting = new TargetingSystem();
            this.journal = new Journal();
            this.notifications = new NotificationSystem();
            this.stats = new StatsTracker();
            this.objectives = new ObjectivesSystem();
            this.objectives.setNotifications(this.notifications);
            this.landing = new LandingSystem(this.renderer.scene, this.camera, this.renderer);
            this.upgradesUI = new UpgradesUI();
            this.saveSystem = new SaveSystem();
            this.setupInteractions();
            await this.sleep(100);

            // Load saved game
            loadingStatus.textContent = 'Loading save data...';
            loadingBar.style.width = '90%';
            const saveData = this.saveSystem.load();
            if (saveData) {
                this.saveSystem.restore(this, saveData);
                loadingStatus.textContent = 'Save restored. Click to enter.';
            } else {
                loadingStatus.textContent = 'Ready. Click to enter.';
            }
            loadingBar.style.width = '100%';
            loadingScreen.style.cursor = 'pointer';

            // Wait for click on the LOADING SCREEN
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

            // NOW set up pointer lock
            this.camera.lock(canvas);
            if (document.pointerLockElement !== undefined) {
                try {
                    await canvas.requestPointerLock();
                } catch (e) { /* ok */ }
            }

            // Fade out loading screen
            loadingScreen.classList.add('fade-out');
            setTimeout(() => { loadingScreen.style.display = 'none'; }, 1500);

            this.notifications.show('SYSTEMS ONLINE', 'success', 2000);
            setTimeout(() => {
                this.notifications.show('Press E to scan | U for upgrades | G to land on planets', 'info', 5000);
            }, 2500);

            // Start auto-save
            this.saveSystem.startAutoSave(this);

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

    isAnyUIOpen() {
        return this.scanner.isOpen || this.galaxyMap.isOpen ||
               this.journal.isOpen || this.stats.isOpen || this.upgradesUI.isOpen;
    }

    openUI(panel, ...args) {
        this.camera.releasePointerLock();
        if (panel === 'scanner') this.scanner.open(...args);
        else if (panel === 'galaxyMap') this.galaxyMap.open(...args);
        else if (panel === 'journal') this.journal.open();
        else if (panel === 'stats') this.stats.open();
        else if (panel === 'upgrades') this.upgradesUI.open(this.objectives, this.player);
    }

    closeUI(panel) {
        if (panel === 'scanner') this.scanner.close();
        else if (panel === 'galaxyMap') this.galaxyMap.close();
        else if (panel === 'journal') this.journal.close();
        else if (panel === 'stats') this.stats.close();
        else if (panel === 'upgrades') this.upgradesUI.close();

        if (!this.isAnyUIOpen()) {
            this.camera.reacquirePointerLock();
        }
    }

    closeAllUI() {
        this.scanner.close();
        this.galaxyMap.close();
        this.journal.close();
        this.stats.close();
        this.upgradesUI.close();
        this.camera.reacquirePointerLock();
    }

    toggleUI(panel, ...args) {
        const isOpen = (panel === 'scanner') ? this.scanner.isOpen :
                       (panel === 'galaxyMap') ? this.galaxyMap.isOpen :
                       (panel === 'journal') ? this.journal.isOpen :
                       (panel === 'stats') ? this.stats.isOpen :
                       (panel === 'upgrades') ? this.upgradesUI.isOpen : false;

        if (isOpen) {
            this.closeUI(panel);
        } else {
            // Close other panels first
            if (panel !== 'scanner') this.scanner.close();
            if (panel !== 'galaxyMap') this.galaxyMap.close();
            if (panel !== 'journal') this.journal.close();
            if (panel !== 'stats') this.stats.close();
            if (panel !== 'upgrades') this.upgradesUI.close();
            this.openUI(panel, ...args);
        }
    }

    loop() {
        requestAnimationFrame(() => this.loop());

        const delta = Math.min(this.clock.getDelta(), 0.05);
        this.time += delta;

        if (!this.audioInitialized && (this.input.isDown('KeyW') || this.input.mouseDown)) {
            this.audio.init();
            this.audioInitialized = true;
        }

        const uiOpen = this.isAnyUIOpen();

        // If landed, use walking mode
        if (this.landing.isLanded) {
            this.updateLandedMode(delta, uiOpen);
            this.renderer.render(this.camera.camera);
            this.input.endFrame();
            return;
        }

        // --- SPACE MODE ---

        // Update player (skip movement input when UI is open)
        if (!uiOpen) {
            this.player.update(this.input, delta);
        } else {
            this.player.updatePhysics(delta);
        }
        this.stats.update(this.player.position, this.player.speed);

        // Warp state transitions
        if (this.player.warping && !this.wasWarping) {
            this.notifications.show('WARP DRIVE ENGAGED', 'success', 2000);
        }
        if (!this.player.warping && this.wasWarping) {
            this.notifications.show('WARP COMPLETE', 'success', 2000);
            this.stats.addWarp();
            this.objectives.onWarp();
        }
        this.wasWarping = this.player.warping;

        // Update world
        const sector = this.systemManager.update(this.player.position, this.time);
        this.starfield.update(this.time);

        // Check for sector change (objectives/anomalies)
        if (sector && (sector.x !== this.lastSectorCheck.x || sector.y !== this.lastSectorCheck.y || sector.z !== this.lastSectorCheck.z)) {
            this.lastSectorCheck = { x: sector.x, y: sector.y, z: sector.z };
            this.objectives.onSectorEnter(sector.x, sector.y, sector.z, this.player.position);
        }

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
                    this.objectives.onDiscovery(nearest.system.name);
                    this.objectives.checkMilestones(this.stats);
                }
            }
        }

        // Planet landing check
        if (!uiOpen) {
            const landable = this.landing.canLand(this.player.position, this.systemManager.planetMeshes);
            if (landable) {
                this.landing.showLandPrompt();
                if (this.input.wasPressed('KeyG')) {
                    this.landing.land(landable.planet, landable.system, this.player.position, {
                        x: this.camera.euler.x,
                        y: this.camera.euler.y
                    });
                    this.stats.planetsLanded = (this.stats.planetsLanded || 0) + 1;
                    this.objectives.onLanding();
                    this.objectives.checkMilestones(this.stats);
                    this.notifications.show(`LANDING: ${landable.planet.name}`, 'success', 3000);
                }
            } else {
                this.landing.hideLandPrompt();
            }
        }

        const nearbySystems = this.systemManager.scanNearby(this.player.position, 5000);
        const nearestSystem = this.systemManager.getNearestSystem(this.player.position);

        this.hud.update(this.player, sector, nearestSystem);
        this.minimap.update(this.player.position, nearbySystems, this.camera.getDirection());

        // Keys
        if (this.input.wasPressed('KeyE')) {
            const scanResults = this.systemManager.scanNearby(this.player.position, 5000);
            this.toggleUI('scanner', scanResults, this.player.position);
            this.audio.playScan();
        }

        if (this.input.wasPressed('Tab')) {
            this.toggleUI('galaxyMap', this.player.position, this.systemManager);
        }

        if (this.input.wasPressed('KeyJ')) {
            this.toggleUI('journal');
        }

        if (this.input.wasPressed('KeyL')) {
            this.toggleUI('stats');
        }

        if (this.input.wasPressed('KeyU')) {
            this.toggleUI('upgrades', this.objectives, this.player);
        }

        if (this.input.wasPressed('Escape')) {
            this.closeAllUI();
            this.player.clearTarget();
        }

        if (!uiOpen) {
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
        }

        this.renderer.updateEffects(this.time, this.player.warping ? 1.0 : 0.0);
        this.renderer.render(this.camera.camera);
        this.input.endFrame();
    }

    updateLandedMode(delta, uiOpen) {
        // Walking on planet surface
        if (!uiOpen) {
            this.landing.updateWalking(this.input, delta, this.camera);
        }

        // Launch back to orbit via keyboard shortcut too
        if (this.input.wasPressed('KeyG') && !uiOpen) {
            this.doLaunch();
        }

        // Upgrades still accessible
        if (this.input.wasPressed('KeyU')) {
            this.toggleUI('upgrades', this.objectives, this.player);
        }

        if (this.input.wasPressed('KeyJ')) {
            this.toggleUI('journal');
        }

        if (this.input.wasPressed('KeyL')) {
            this.toggleUI('stats');
        }

        if (this.input.wasPressed('Escape')) {
            this.closeAllUI();
        }

        this.input.endFrame();
    }

    doLaunch() {
        const restoreData = this.landing.launchToOrbit();
        if (restoreData) {
            // Restore space position
            this.player.position.copy(restoreData.position);
            this.player.velocity.set(0, 0, 0);
            this.player.speed = 0;

            // Restore camera
            if (restoreData.euler) {
                this.camera.euler.x = restoreData.euler.x;
                this.camera.euler.y = restoreData.euler.y;
                this.camera.camera.quaternion.setFromEuler(this.camera.euler);
            }

            this.notifications.show('LAUNCH SUCCESSFUL', 'success', 2000);
        }
    }
}

new Game();
