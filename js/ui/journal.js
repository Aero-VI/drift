export class Journal {
    constructor() {
        this.entries = [];
        this.isOpen = false;
        this.container = null;
        this.createUI();
    }

    createUI() {
        this.container = document.createElement('div');
        this.container.id = 'journal-panel';
        this.container.className = 'hidden';
        this.container.innerHTML = `
            <div class="panel-header">
                <span>DISCOVERY LOG</span>
                <button id="journal-close">[X]</button>
            </div>
            <div id="journal-stats"></div>
            <div id="journal-entries"></div>
        `;
        document.getElementById('ui-overlay').appendChild(this.container);

        const style = document.createElement('style');
        style.textContent = `
            #journal-panel {
                position: absolute;
                top: 50%;
                right: 30px;
                transform: translateY(-50%);
                width: 320px;
                max-height: 70vh;
                background: rgba(0, 5, 15, 0.95);
                border: 1px solid rgba(100, 180, 255, 0.3);
                padding: 20px;
                pointer-events: auto;
                overflow-y: auto;
            }
            #journal-stats {
                font-size: 11px;
                letter-spacing: 3px;
                color: rgba(100, 180, 255, 0.5);
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(100, 180, 255, 0.1);
            }
            .journal-entry {
                padding: 10px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            .journal-entry-name {
                font-size: 13px;
                color: rgba(100, 180, 255, 0.8);
                letter-spacing: 2px;
            }
            .journal-entry-detail {
                font-size: 10px;
                color: rgba(255, 255, 255, 0.35);
                letter-spacing: 1px;
                margin-top: 3px;
                line-height: 1.5;
            }
            .journal-entry-time {
                font-size: 9px;
                color: rgba(255, 255, 255, 0.15);
                letter-spacing: 2px;
                margin-top: 2px;
            }
        `;
        document.head.appendChild(style);

        document.getElementById('journal-close').addEventListener('click', () => this.close());
    }

    addEntry(system) {
        const entry = {
            name: system.name,
            starClass: system.starClass,
            planets: system.planets.length,
            timestamp: Date.now(),
        };
        this.entries.unshift(entry); // newest first
    }

    open() {
        this.isOpen = true;
        this.container.classList.remove('hidden');
        this.render();
    }

    close() {
        this.isOpen = false;
        this.container.classList.add('hidden');
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    render() {
        const stats = document.getElementById('journal-stats');
        stats.textContent = `${this.entries.length} SYSTEMS DISCOVERED`;

        const container = document.getElementById('journal-entries');
        container.innerHTML = '';

        for (const entry of this.entries) {
            const div = document.createElement('div');
            div.className = 'journal-entry';

            const elapsed = Math.floor((Date.now() - entry.timestamp) / 1000);
            let timeStr;
            if (elapsed < 60) timeStr = `${elapsed}s ago`;
            else if (elapsed < 3600) timeStr = `${Math.floor(elapsed / 60)}m ago`;
            else timeStr = `${Math.floor(elapsed / 3600)}h ago`;

            div.innerHTML = `
                <div class="journal-entry-name">✦ ${entry.name}</div>
                <div class="journal-entry-detail">
                    ${entry.starClass.type}-class ${entry.starClass.desc} | ${entry.planets} planet${entry.planets !== 1 ? 's' : ''}
                </div>
                <div class="journal-entry-time">${timeStr}</div>
            `;
            container.appendChild(div);
        }
    }
}
