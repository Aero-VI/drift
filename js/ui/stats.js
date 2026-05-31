export class StatsTracker {
    constructor() {
        this.distanceTraveled = 0;
        this.maxSpeed = 0;
        this.warpsCompleted = 0;
        this.systemsDiscovered = 0;
        this.planetsLanded = 0;
        this.anomaliesFound = 0;
        this.sessionStartTime = Date.now();
        this.totalPlayTime = 0;
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
                background: rgba(2, 8, 24, 0.97);
                border: 1px solid rgba(80, 160, 240, 0.35);
                padding: 20px;
                pointer-events: auto;
                border-radius: 4px;
                box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
            }
            .stat-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                font-size: 12px;
            }
            .stat-label {
                color: rgba(235, 240, 255, 0.55);
                letter-spacing: 2px;
            }
            .stat-value {
                color: rgba(140, 210, 255, 0.9);
                letter-spacing: 1px;
                font-weight: bold;
            }
            .stat-section-header {
                font-size: 10px;
                letter-spacing: 3px;
                color: rgba(100, 180, 255, 0.5);
                margin-top: 12px;
                margin-bottom: 4px;
                text-transform: uppercase;
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

    getSessionTime() {
        return Date.now() - this.sessionStartTime;
    }

    getTotalTime() {
        return this.totalPlayTime + this.getSessionTime();
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
        const totalMs = this.getTotalTime();
        const totalSeconds = Math.floor(totalMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let timeStr;
        if (hours > 0) {
            timeStr = `${hours}h ${minutes}m ${seconds.toString().padStart(2, '0')}s`;
        } else {
            timeStr = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
        }

        const sessionSec = Math.floor(this.getSessionTime() / 1000);
        const sessionMin = Math.floor(sessionSec / 60);
        const sessionStr = `${sessionMin}m ${(sessionSec % 60).toString().padStart(2, '0')}s`;

        const content = document.getElementById('stats-content');
        content.innerHTML = `
            <div class="stat-section-header">Time</div>
            <div class="stat-row">
                <span class="stat-label">TOTAL PLAY TIME</span>
                <span class="stat-value">${timeStr}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">THIS SESSION</span>
                <span class="stat-value">${sessionStr}</span>
            </div>

            <div class="stat-section-header">Exploration</div>
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

            <div class="stat-section-header">Navigation</div>
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
        `;
    }

    formatDist(d) {
        if (d < 1000) return `${Math.floor(d)} u`;
        if (d < 1000000) return `${(d / 1000).toFixed(1)}K u`;
        return `${(d / 1000000).toFixed(2)}M u`;
    }
}
