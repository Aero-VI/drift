// Gameplay Loop / Objectives System for DRIFT
// Discovery milestones, rare anomalies, ship upgrades, completion %, "find the origin system" final objective

export class ObjectivesSystem {
    constructor() {
        this.milestones = {
            firstDiscovery: false,
            fiveDiscoveries: false,
            tenDiscoveries: false,
            twentyFiveDiscoveries: false,
            fiftyDiscoveries: false,
            hundredDiscoveries: false,
            firstWarp: false,
            tenWarps: false,
            firstAnomaly: false,
            fiveAnomalies: false,
            firstLanding: false,
            tenLandings: false,
            maxSpeed: false,
            longDistance: false,
            originFound: false,
        };

        this.anomaliesFound = [];
        this.totalAnomalies = 0;
        this.completionPercent = 0;
        this.credits = 0;

        // The Origin System - final objective
        // Seeded at a fixed far location so it's always the same
        this.originSector = { x: 42, y: 0, z: -37 };
        this.originSystemName = 'Solara Prime';
        this.originHintDistance = Infinity;
        this.originDiscovered = false;

        // Upgrades catalog
        this.upgrades = {
            engineMk2: { name: 'Engine Mk.II', desc: 'Max speed +50%', cost: 500, applied: false, stat: 'maxSpeed', mult: 1.5 },
            engineMk3: { name: 'Engine Mk.III', desc: 'Max speed +100%', cost: 1500, applied: false, stat: 'maxSpeed', mult: 2.0, requires: 'engineMk2' },
            boosterMk2: { name: 'Booster Mk.II', desc: 'Boost speed +50%', cost: 600, applied: false, stat: 'boostSpeed', mult: 1.5 },
            warpDrive2: { name: 'Warp Drive II', desc: 'Warp speed +100%', cost: 1200, applied: false, stat: 'warpSpeed', mult: 2.0 },
            fuelTank: { name: 'Extended Fuel Tank', desc: 'Max fuel +50%', cost: 400, applied: false, stat: 'maxFuel', mult: 1.5 },
            fuelRegen: { name: 'Fuel Regenerator', desc: 'Regen rate +100%', cost: 800, applied: false, stat: 'fuelRegenRate', mult: 2.0 },
            sensors: { name: 'Advanced Sensors', desc: 'Scan range +100%', cost: 700, applied: false, stat: 'sensorRange', mult: 2.0 },
            shieldMk2: { name: 'Shield Mk.II', desc: 'Shield capacity +50%', cost: 500, applied: false, stat: 'shield', mult: 1.5 },
        };

        // Rare anomaly types
        this.rareAnomalyTypes = [
            { id: 'ancient_beacon', name: 'Ancient Beacon', desc: 'A signal from a long-dead civilization', reward: 300, hint: 'Points toward Origin' },
            { id: 'quantum_rift', name: 'Quantum Rift', desc: 'A tear in spacetime leaking exotic particles', reward: 200 },
            { id: 'ghost_ship', name: 'Ghost Ship', desc: 'Derelict vessel from an unknown era', reward: 250 },
            { id: 'nebula_heart', name: 'Nebula Heart', desc: 'Ultra-dense stellar nursery core', reward: 150 },
            { id: 'void_crystal', name: 'Void Crystal', desc: 'Crystallized dark energy formation', reward: 350 },
            { id: 'temporal_echo', name: 'Temporal Echo', desc: 'A loop in time playing on repeat', reward: 400 },
            { id: 'origin_signal', name: 'Origin Signal', desc: 'THE signal. It leads home.', reward: 1000, hint: 'Final clue to Origin' },
        ];

        this.ui = null;
        this.isOpen = false;
        this.notifications = null;
    }

    setNotifications(notifications) {
        this.notifications = notifications;
    }

    // Check if a sector has a rare anomaly (deterministic from seed)
    checkSectorForAnomaly(sx, sy, sz) {
        const seed = ((sx * 73856093) ^ (sy * 19349663) ^ (sz * 83492791) ^ 12345) & 0x7FFFFFFF;
        const chance = (seed % 1000) / 1000;
        // ~5% chance per sector to have a rare anomaly
        if (chance < 0.05) {
            const typeIndex = seed % this.rareAnomalyTypes.length;
            return this.rareAnomalyTypes[typeIndex];
        }
        return null;
    }

    // Called when player enters a sector
    onSectorEnter(sx, sy, sz, playerPosition) {
        const anomaly = this.checkSectorForAnomaly(sx, sy, sz);
        const sectorKey = `${sx},${sy},${sz}`;

        if (anomaly && !this.anomaliesFound.includes(sectorKey)) {
            // Check if player is close enough to "find" it (within 500 units of sector center)
            const sectorCenter = { x: sx * 2000 + 1000, y: sy * 2000, z: sz * 2000 + 1000 };
            const dx = playerPosition.x - sectorCenter.x;
            const dy = playerPosition.y - sectorCenter.y;
            const dz = playerPosition.z - sectorCenter.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < 800) {
                this.anomaliesFound.push(sectorKey);
                this.totalAnomalies++;
                this.credits += anomaly.reward;

                if (this.notifications) {
                    this.notifications.show(`ANOMALY: ${anomaly.name}`, 'discovery', 4000);
                    setTimeout(() => {
                        this.notifications.show(`+${anomaly.reward} credits`, 'success', 2000);
                    }, 1500);

                    if (anomaly.hint) {
                        setTimeout(() => {
                            this.notifications.show(anomaly.hint, 'info', 5000);
                        }, 3500);
                    }
                }

                this.checkMilestones();
                return anomaly;
            }
        }

        // Check distance to origin for hints
        const originDist = Math.sqrt(
            Math.pow((sx - this.originSector.x) * 2000, 2) +
            Math.pow((sy - this.originSector.y) * 2000, 2) +
            Math.pow((sz - this.originSector.z) * 2000, 2)
        );

        if (originDist < this.originHintDistance - 5000 && originDist < 50000) {
            this.originHintDistance = originDist;
            if (this.notifications && this.totalAnomalies >= 3) {
                if (originDist < 10000) {
                    this.notifications.show('ORIGIN SIGNAL: VERY STRONG', 'discovery', 3000);
                } else if (originDist < 25000) {
                    this.notifications.show('Origin signal growing stronger...', 'info', 3000);
                } else {
                    this.notifications.show('Faint signal detected from unknown source...', 'info', 3000);
                }
            }
        }

        // Check if we found the origin
        if (sx === this.originSector.x && sy === this.originSector.y && sz === this.originSector.z) {
            if (!this.originDiscovered) {
                this.originDiscovered = true;
                this.milestones.originFound = true;
                this.credits += 5000;
                if (this.notifications) {
                    this.notifications.show('*** ORIGIN SYSTEM FOUND ***', 'discovery', 8000);
                    setTimeout(() => {
                        this.notifications.show('You found where it all began. The first star.', 'info', 6000);
                    }, 3000);
                    setTimeout(() => {
                        this.notifications.show('+5000 credits - Journey complete!', 'success', 4000);
                    }, 6000);
                }
            }
        }

        return null;
    }

    // Award credits for discoveries
    onDiscovery(systemName) {
        this.credits += 25; // Base discovery reward
    }

    onWarp() {
        // Small warp reward
        this.credits += 10;
    }

    onLanding() {
        this.credits += 50;
    }

    checkMilestones(stats) {
        if (!stats) return;

        const changed = [];

        if (stats.systemsDiscovered >= 1 && !this.milestones.firstDiscovery) {
            this.milestones.firstDiscovery = true;
            changed.push('First Discovery!');
            this.credits += 50;
        }
        if (stats.systemsDiscovered >= 5 && !this.milestones.fiveDiscoveries) {
            this.milestones.fiveDiscoveries = true;
            changed.push('5 Systems Discovered!');
            this.credits += 100;
        }
        if (stats.systemsDiscovered >= 10 && !this.milestones.tenDiscoveries) {
            this.milestones.tenDiscoveries = true;
            changed.push('Explorer - 10 Systems!');
            this.credits += 200;
        }
        if (stats.systemsDiscovered >= 25 && !this.milestones.twentyFiveDiscoveries) {
            this.milestones.twentyFiveDiscoveries = true;
            changed.push('Pathfinder - 25 Systems!');
            this.credits += 500;
        }
        if (stats.systemsDiscovered >= 50 && !this.milestones.fiftyDiscoveries) {
            this.milestones.fiftyDiscoveries = true;
            changed.push('Cartographer - 50 Systems!');
            this.credits += 1000;
        }
        if (stats.systemsDiscovered >= 100 && !this.milestones.hundredDiscoveries) {
            this.milestones.hundredDiscoveries = true;
            changed.push('Master Explorer - 100 Systems!');
            this.credits += 2000;
        }
        if (stats.warpsCompleted >= 1 && !this.milestones.firstWarp) {
            this.milestones.firstWarp = true;
            changed.push('First Warp Jump!');
            this.credits += 50;
        }
        if (stats.warpsCompleted >= 10 && !this.milestones.tenWarps) {
            this.milestones.tenWarps = true;
            changed.push('Warp Veteran - 10 Jumps!');
            this.credits += 200;
        }
        if (this.totalAnomalies >= 1 && !this.milestones.firstAnomaly) {
            this.milestones.firstAnomaly = true;
            changed.push('First Anomaly Found!');
            this.credits += 100;
        }
        if (this.totalAnomalies >= 5 && !this.milestones.fiveAnomalies) {
            this.milestones.fiveAnomalies = true;
            changed.push('Anomaly Hunter - 5 Found!');
            this.credits += 500;
        }
        if ((stats.planetsLanded || 0) >= 1 && !this.milestones.firstLanding) {
            this.milestones.firstLanding = true;
            changed.push('First Landing!');
            this.credits += 100;
        }
        if ((stats.planetsLanded || 0) >= 10 && !this.milestones.tenLandings) {
            this.milestones.tenLandings = true;
            changed.push('Frequent Lander - 10 Landings!');
            this.credits += 300;
        }
        if (stats.maxSpeed >= 5000 && !this.milestones.maxSpeed) {
            this.milestones.maxSpeed = true;
            changed.push('Speed Demon - 5000 u/s!');
            this.credits += 200;
        }
        if (stats.distanceTraveled >= 1000000 && !this.milestones.longDistance) {
            this.milestones.longDistance = true;
            changed.push('Long Haul - 1M units!');
            this.credits += 500;
        }

        for (const msg of changed) {
            if (this.notifications) {
                this.notifications.show(`MILESTONE: ${msg}`, 'discovery', 4000);
            }
        }

        this.updateCompletion();
    }

    updateCompletion() {
        const total = Object.keys(this.milestones).length;
        const done = Object.values(this.milestones).filter(v => v).length;
        this.completionPercent = Math.floor((done / total) * 100);
    }

    purchaseUpgrade(upgradeId, player) {
        const upgrade = this.upgrades[upgradeId];
        if (!upgrade) return { success: false, reason: 'Unknown upgrade' };
        if (upgrade.applied) return { success: false, reason: 'Already purchased' };
        if (upgrade.requires && !this.upgrades[upgrade.requires].applied) {
            return { success: false, reason: `Requires ${this.upgrades[upgrade.requires].name}` };
        }
        if (this.credits < upgrade.cost) return { success: false, reason: 'Insufficient credits' };

        this.credits -= upgrade.cost;
        upgrade.applied = true;

        // Apply the stat upgrade to player
        if (upgrade.stat === 'maxSpeed') player.maxSpeed *= upgrade.mult;
        if (upgrade.stat === 'boostSpeed') player.boostSpeed *= upgrade.mult;
        if (upgrade.stat === 'warpSpeed') player.warpSpeed *= upgrade.mult;
        if (upgrade.stat === 'maxFuel') player.maxFuel *= upgrade.mult;
        if (upgrade.stat === 'fuelRegenRate') player.fuelRegenRate *= upgrade.mult;
        if (upgrade.stat === 'sensorRange') player.sensorRange = (player.sensorRange || 500) * upgrade.mult;
        if (upgrade.stat === 'shield') player.shield = Math.min(player.shield * upgrade.mult, 200);

        return { success: true };
    }

    serialize() {
        return {
            milestones: { ...this.milestones },
            anomaliesFound: [...this.anomaliesFound],
            totalAnomalies: this.totalAnomalies,
            credits: this.credits,
            originDiscovered: this.originDiscovered,
            originHintDistance: this.originHintDistance,
            upgrades: Object.fromEntries(
                Object.entries(this.upgrades).map(([k, v]) => [k, v.applied])
            ),
            completionPercent: this.completionPercent,
        };
    }

    deserialize(data) {
        if (!data) return;
        if (data.milestones) Object.assign(this.milestones, data.milestones);
        if (data.anomaliesFound) this.anomaliesFound = data.anomaliesFound;
        if (data.totalAnomalies !== undefined) this.totalAnomalies = data.totalAnomalies;
        if (data.credits !== undefined) this.credits = data.credits;
        if (data.originDiscovered !== undefined) this.originDiscovered = data.originDiscovered;
        if (data.originHintDistance !== undefined) this.originHintDistance = data.originHintDistance;
        if (data.upgrades) {
            for (const [k, applied] of Object.entries(data.upgrades)) {
                if (this.upgrades[k]) this.upgrades[k].applied = applied;
            }
        }
        if (data.completionPercent !== undefined) this.completionPercent = data.completionPercent;
    }
}
