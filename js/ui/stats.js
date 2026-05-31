export class StatsTracker {
    constructor() {
        this.distanceTraveled = 0;
        this.maxSpeed = 0;
        this.warpsCompleted = 0;
        this.systemsDiscovered = 0;
        this.planetsLanded = 0;
        this.anomaliesFound = 0;
        this.totalPlayTime = 0;
        this.sessionStartTime = Date.now();
        this.lastPosition = null;

        this.display = null;
        this.isOpen = false;
        this.create();
    }

    create() {
        this.display = document.createElement('div');
        this.display.id = 'stats-panel';
        this.display.className = 'hidden';
        this.display.innerHTML = `
            <div class="panel-header">
                <span>FLIGHT LOG</span>
                <button id="stats-close">[X]</button>
            </div>
            <div id="stats-content"></div>
        `;
        document.getElementById('ui-overlay').appendChild(this.display);

        const style = document.createElement('style');
        style.textContent = `
            #stats-panel {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 380px;
                background: rgba(3, 10, 28, 0.96);
                border: 1px solid rgba(80, 160, 240, 0.35);
                padding: 20px;
                pointer-events: auto;
            }
            .stat-row {
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                font-size: 12px;
            }
            .stat-label {
                color: rgba(200, 215, 240, 0.55);
                letter-spacing: 2px;
            }
            .stat-value {
                color: rgba(130, 200, 255, 0.9);
                letter-spacing: 1px;
            }
            .stat-section {
                font-size: 10px;
                letter-spacing: 3px;
                color: rgba(100, 180, 255, 0.4);
                margin-top: 12px;
                margin-bottom: 4px;
                padding-bottom: 4px;
                border-bottom: 1px solid rgba(100, 180, 255, 0.1);
            }
        `;
        document.head.appendChild(style);

        document.getElementById('stats-close').addEventListener('click', () => this.close());
    }

    update(position, speed) {
        if (this.lastPosition) {
            this.distanceTraveled += position.distanceTo(this.lastPosition);
        }
        this.lastPosition = position.clone();

        if (speed > this.maxSpeed) {
            this.maxSpeed = speed;
        }
    }

    addWarp() {
        this.warpsCompleted++;
    }

    addDiscovery() {
        this.systemsDiscovered++;
    }

    open() {
        this.isOpen = true;
        this.display.classList.remove('hidden');
        this.render();
    }

    close() {
        this.isOpen = false;
        this.display.classList.add('hidden');
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    render() {
        const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        const totalSeconds = Math.floor(this.totalPlayTime / 1000) + elapsed;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const timeStr = hours > 0 ?
            `${hours}h ${minutes}m ${seconds.toString().padStart(2, '0')}s` :
            `${minutes}m ${seconds.toString().padStart(2, '0')}s`;

        const sessionElapsed = Math.floor(elapsed / 60);
        const sessionStr = `${sessionElapsed}m ${(elapsed % 60).toString().padStart(2, '0')}s`;

        const content = document.getElementById('stats-content');
        content.innerHTML = `
            <div class="stat-section">NAVIGATION</div>
            <div class="stat-row">
                <span class="stat-label">DISTANCE TRAVELED</span>
                <span class="stat-value">${this.formatDist(this.distanceTraveled)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">MAX VELOCITY</span>
                <span class="stat-value">${Math.floor(this.maxSpeed)} u/s</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">WARP JUMPS</span>
                <span class="stat-value">${this.warpsCompleted}</span>
            </div>

            <div class="stat-section">EXPLORATION</div>
            <div class="stat-row">
                <span class="stat-label">SYSTEMS DISCOVERED</span>
                <span class="stat-value">${this.systemsDiscovered}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">PLANETS LANDED</span>
                <span class="stat-value">${this.planetsLanded}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">ANOMALIES FOUND</span>
                <span class="stat-value">${this.anomaliesFound}</span>
            </div>

            <div class="stat-section">TIME</div>
            <div class="stat-row">
                <span class="stat-label">TOTAL PLAY TIME</span>
                <span class="stat-value">${timeStr}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">THIS SESSION</span>
                <span class="stat-value">${sessionStr}</span>
            </div>
        `;
    }

    formatDist(d) {
        if (d < 1000) return `${Math.floor(d)} u`;
        if (d < 1000000) return `${(d / 1000).toFixed(1)}K u`;
        return `${(d / 1000000).toFixed(2)}M u`;
    }
}
