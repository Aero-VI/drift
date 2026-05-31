export class Minimap {
    constructor() {
        this.canvas = document.getElementById('minimap-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.size = 180;
        this.range = 3000; // units visible on minimap
    }

    update(playerPos, systems, playerDir) {
        const ctx = this.ctx;
        const cx = this.size / 2;
        const cy = this.size / 2;

        // Clear
        ctx.fillStyle = 'rgba(0, 5, 15, 0.9)';
        ctx.fillRect(0, 0, this.size, this.size);

        // Grid
        ctx.strokeStyle = 'rgba(100, 180, 255, 0.06)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < this.size; i += 30) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, this.size);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(this.size, i);
            ctx.stroke();
        }

        // Range rings
        ctx.strokeStyle = 'rgba(100, 180, 255, 0.08)';
        for (let r = 30; r < cx; r += 30) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw nearby systems as dots
        const scale = this.size / (this.range * 2);
        for (const result of systems) {
            const dx = (result.worldPos.x - playerPos.x) * scale;
            const dz = (result.worldPos.z - playerPos.z) * scale;
            const sx = cx + dx;
            const sy = cy + dz;

            if (sx < 2 || sx > this.size - 2 || sy < 2 || sy > this.size - 2) continue;

            const sys = result.system;
            const r = Math.floor(sys.color[0] * 255);
            const g = Math.floor(sys.color[1] * 255);
            const b = Math.floor(sys.color[2] * 255);

            // Glow
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
            ctx.beginPath();
            ctx.arc(sx, sy, 5, 0, Math.PI * 2);
            ctx.fill();

            // Dot
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
            ctx.beginPath();
            ctx.arc(sx, sy, 2, 0, Math.PI * 2);
            ctx.fill();

            // Discovered marker
            if (sys.discovered) {
                ctx.strokeStyle = 'rgba(100, 255, 180, 0.3)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.arc(sx, sy, 4, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Player direction indicator
        const dirAngle = Math.atan2(playerDir.x, playerDir.z);
        const arrowLen = 10;
        const px = cx + Math.sin(dirAngle) * arrowLen;
        const py = cy + Math.cos(dirAngle) * arrowLen;

        ctx.strokeStyle = 'rgba(100, 180, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.stroke();

        // Player dot
        ctx.fillStyle = 'rgba(100, 180, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(100, 180, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, this.size, this.size);
    }
}
