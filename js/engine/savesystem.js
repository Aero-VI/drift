// localStorage Save/Load System for DRIFT
// Auto-saves every 30 seconds, restores state on page load

const SAVE_KEY = 'drift-save-v1';
const SAVE_INTERVAL = 30000; // 30 seconds

export class SaveSystem {
    constructor() {
        this.saveTimer = null;
        this.lastSave = 0;
    }

    startAutoSave(game) {
        this.saveTimer = setInterval(() => {
            this.save(game);
        }, SAVE_INTERVAL);

        // Also save on page unload
        window.addEventListener('beforeunload', () => {
            this.save(game);
        });
    }

    save(game) {
        try {
            const data = {
                version: 1,
                timestamp: Date.now(),
                player: {
                    position: {
                        x: game.player.position.x,
                        y: game.player.position.y,
                        z: game.player.position.z
                    },
                    velocity: {
                        x: game.player.velocity.x,
                        y: game.player.velocity.y,
                        z: game.player.velocity.z
                    },
                    fuel: game.player.fuel,
                    shield: game.player.shield,
                    speedMultiplier: game.player.speedMultiplier,
                    maxSpeed: game.player.maxSpeed,
                    boostSpeed: game.player.boostSpeed,
                    warpSpeed: game.player.warpSpeed,
                    maxFuel: game.player.maxFuel,
                    fuelRegenRate: game.player.fuelRegenRate,
                    sensorRange: game.player.sensorRange || 500,
                },
                camera: {
                    eulerX: game.camera.euler.x,
                    eulerY: game.camera.euler.y,
                },
                discoveries: Array.from(game.systemManager.discoveries),
                totalDiscoveries: game.systemManager.totalDiscoveries,
                journal: game.journal.entries,
                stats: {
                    distanceTraveled: game.stats.distanceTraveled,
                    maxSpeed: game.stats.maxSpeed,
                    warpsCompleted: game.stats.warpsCompleted,
                    systemsDiscovered: game.stats.systemsDiscovered,
                    planetsLanded: game.stats.planetsLanded || 0,
                    anomaliesFound: game.stats.anomaliesFound || 0,
                    totalPlayTime: (game.stats.totalPlayTime || 0) + (Date.now() - game.stats.sessionStartTime),
                },
                objectives: game.objectives ? game.objectives.serialize() : null,
            };

            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
            this.lastSave = Date.now();
            return true;
        } catch (e) {
            console.warn('Save failed:', e);
            return false;
        }
    }

    load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return null;

            const data = JSON.parse(raw);
            if (data.version !== 1) return null;

            return data;
        } catch (e) {
            console.warn('Load failed:', e);
            return null;
        }
    }

    restore(game, data) {
        if (!data) return false;

        try {
            // Restore player position
            if (data.player) {
                game.player.position.set(
                    data.player.position.x,
                    data.player.position.y,
                    data.player.position.z
                );
                game.player.velocity.set(
                    data.player.velocity.x,
                    data.player.velocity.y,
                    data.player.velocity.z
                );
                game.player.fuel = data.player.fuel;
                game.player.shield = data.player.shield;
                game.player.speedMultiplier = data.player.speedMultiplier;

                // Restore upgrades
                if (data.player.maxSpeed) game.player.maxSpeed = data.player.maxSpeed;
                if (data.player.boostSpeed) game.player.boostSpeed = data.player.boostSpeed;
                if (data.player.warpSpeed) game.player.warpSpeed = data.player.warpSpeed;
                if (data.player.maxFuel) game.player.maxFuel = data.player.maxFuel;
                if (data.player.fuelRegenRate) game.player.fuelRegenRate = data.player.fuelRegenRate;
                if (data.player.sensorRange) game.player.sensorRange = data.player.sensorRange;
            }

            // Restore camera orientation
            if (data.camera) {
                game.camera.euler.x = data.camera.eulerX;
                game.camera.euler.y = data.camera.eulerY;
                game.camera.camera.quaternion.setFromEuler(game.camera.euler);
            }

            // Restore discoveries
            if (data.discoveries) {
                game.systemManager.discoveries = new Set(data.discoveries);
                game.systemManager.totalDiscoveries = data.totalDiscoveries || data.discoveries.length;
            }

            // Restore journal
            if (data.journal) {
                game.journal.entries = data.journal;
            }

            // Restore stats
            if (data.stats) {
                game.stats.distanceTraveled = data.stats.distanceTraveled || 0;
                game.stats.maxSpeed = data.stats.maxSpeed || 0;
                game.stats.warpsCompleted = data.stats.warpsCompleted || 0;
                game.stats.systemsDiscovered = data.stats.systemsDiscovered || 0;
                game.stats.planetsLanded = data.stats.planetsLanded || 0;
                game.stats.anomaliesFound = data.stats.anomaliesFound || 0;
                game.stats.totalPlayTime = data.stats.totalPlayTime || 0;
                game.stats.sessionStartTime = Date.now();
            }

            // Restore objectives
            if (data.objectives && game.objectives) {
                game.objectives.deserialize(data.objectives);
            }

            return true;
        } catch (e) {
            console.warn('Restore failed:', e);
            return false;
        }
    }

    hasSave() {
        return localStorage.getItem(SAVE_KEY) !== null;
    }

    deleteSave() {
        localStorage.removeItem(SAVE_KEY);
    }

    destroy() {
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
            this.saveTimer = null;
        }
    }
}
