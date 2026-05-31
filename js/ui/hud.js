export class HUD {
    constructor() {
        this.speedValue = document.getElementById('speed-value');
        this.sectorName = document.getElementById('sector-name');
        this.systemName = document.getElementById('system-name');
        this.fuelBar = document.getElementById('fuel-bar');
        this.shieldBar = document.getElementById('shield-bar');
        this.compassDir = document.getElementById('compass-dir');
        this.crosshair = document.getElementById('crosshair');

        this.discoveryPopup = document.getElementById('discovery-popup');
        this.discoveryName = document.getElementById('discovery-name');
        this.discoveryTimeout = null;
    }

    update(player, sector, nearestSystem) {
        // Speed
        this.speedValue.textContent = Math.floor(player.speed);

        // Sector
        this.sectorName.textContent = `SECTOR ${sector.x}.${sector.y}.${sector.z}`;

        // Nearest system
        if (nearestSystem && nearestSystem.distance < 500) {
            this.systemName.textContent = `${nearestSystem.system.name} - ${nearestSystem.system.starClass.type}-class ${nearestSystem.system.starClass.desc}`;
        } else if (nearestSystem) {
            this.systemName.textContent = `Nearest: ${nearestSystem.system.name} (${Math.floor(nearestSystem.distance)}u)`;
        } else {
            this.systemName.textContent = 'Deep space';
        }

        // Fuel
        const fuelPct = (player.fuel / player.maxFuel) * 100;
        this.fuelBar.style.width = fuelPct + '%';
        if (fuelPct < 25) {
            this.fuelBar.classList.add('low');
        } else {
            this.fuelBar.classList.remove('low');
        }

        // Shield
        this.shieldBar.style.width = player.shield + '%';

        // Compass
        const dir = player.camera.getDirection();
        const angle = Math.atan2(dir.x, dir.z) * (180 / Math.PI);
        let compass = 'N';
        if (angle > -22.5 && angle <= 22.5) compass = 'N';
        else if (angle > 22.5 && angle <= 67.5) compass = 'NE';
        else if (angle > 67.5 && angle <= 112.5) compass = 'E';
        else if (angle > 112.5 && angle <= 157.5) compass = 'SE';
        else if (angle > 157.5 || angle <= -157.5) compass = 'S';
        else if (angle > -157.5 && angle <= -112.5) compass = 'SW';
        else if (angle > -112.5 && angle <= -67.5) compass = 'W';
        else if (angle > -67.5 && angle <= -22.5) compass = 'NW';
        this.compassDir.textContent = compass;

        // Crosshair color
        if (player.boosting) {
            this.crosshair.style.color = 'rgba(255, 150, 50, 0.8)';
            this.crosshair.style.textShadow = '0 0 15px rgba(255, 150, 50, 0.5)';
        } else {
            this.crosshair.style.color = 'rgba(100, 180, 255, 0.5)';
            this.crosshair.style.textShadow = '0 0 10px rgba(100, 180, 255, 0.3)';
        }
    }

    showDiscovery(name) {
        this.discoveryName.textContent = name;
        this.discoveryPopup.classList.remove('hidden');

        if (this.discoveryTimeout) clearTimeout(this.discoveryTimeout);
        this.discoveryTimeout = setTimeout(() => {
            this.discoveryPopup.classList.add('hidden');
        }, 3000);
    }
}
