export class GalaxyMap {
    constructor() {
        this.container = document.getElementById('galaxy-map');
        this.canvas = document.getElementById('map-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.closeBtn = document.getElementById('map-close');
        this.mapStats = document.getElementById('map-stats');
        this.isOpen = false;

        this.closeBtn.addEventListener('click', () => this.close());
    }

    open(playerPos, systemManager) {
        this.isOpen = true;
        this.container.classList.remove('hidden');
        this.render(playerPos, systemManager);
    }

    close() {
        this.isOpen = false;
        this.container.classList.add('hidden');
    }

    toggle(playerPos, systemManager) {
        if (this.isOpen) {
            this.close();
        } else {
            this.open(playerPos, systemManager);
        }
    }

    render(playerPos, systemManager) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Dark background
        ctx.fillStyle = '#000510';
        ctx.fillRect(0, 0, w, h);

        // Grid
        const gridSize = 40;
        ctx.strokeStyle = 'rgba(100, 180, 255, 0.04)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Scale: 1 pixel = 50 units
        const scale = 1 / 50;
        const cx = w / 2;
        const cy = h / 2;

        let totalSystems = 0;
        let discoveredCount = systemManager.totalDiscoveries;

        // Draw all loaded systems
        for (const [key, sector] of systemManager.sectors) {
            const [sx, sy, sz] = key.split(',').map(Number);
            for (const system of sector.systems) {
                const worldX = sx * 2000 + system.position.x;
                const worldZ = sz * 2000 + system.position.z;

                const mapX = cx + (worldX - playerPos.x) * scale;
                const mapY = cy + (worldZ - playerPos.z) * scale;

                if (mapX < -10 || mapX > w + 10 || mapY < -10 || mapY > h + 10) continue;

                totalSystems++;

                const r = Math.floor(system.color[0] * 255);
                const g = Math.floor(system.color[1] * 255);
                const b = Math.floor(system.color[2] * 255);

                // Glow
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.1)`;
                ctx.beginPath();
                ctx.arc(mapX, mapY, 8, 0, Math.PI * 2);
                ctx.fill();

                // Star dot
                const dotSize = Math.max(1.5, system.starSize * 0.3);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
                ctx.beginPath();
                ctx.arc(mapX, mapY, dotSize, 0, Math.PI * 2);
                ctx.fill();

                // Label for discovered
                if (system.discovered) {
                    ctx.strokeStyle = 'rgba(100, 255, 180, 0.3)';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.arc(mapX, mapY, dotSize + 3, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.font = '8px Courier New';
                    ctx.fillText(system.name, mapX + dotSize + 4, mapY + 3);
                }
            }
        }

        // Player position
        ctx.fillStyle = 'rgba(100, 180, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Player marker rings
        ctx.strokeStyle = 'rgba(100, 180, 255, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.stroke();

        // "YOU" label
        ctx.fillStyle = 'rgba(100, 180, 255, 0.6)';
        ctx.font = '9px Courier New';
        ctx.fillText('YOU', cx + 8, cy + 3);

        // Stats
        this.mapStats.textContent = `SYSTEMS IN RANGE: ${totalSystems} | DISCOVERED: ${discoveredCount}`;
    }
}
