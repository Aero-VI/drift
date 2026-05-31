export class Scanner {
    constructor() {
        this.panel = document.getElementById('scan-panel');
        this.content = document.getElementById('scan-content');
        this.closeBtn = document.getElementById('scan-close');
        this.isOpen = false;

        this.closeBtn.addEventListener('click', () => this.close());
        this.onSelect = null; // callback
    }

    open(results, playerPos) {
        this.isOpen = true;
        this.panel.classList.remove('hidden');
        this.content.innerHTML = '';

        if (results.length === 0) {
            this.content.innerHTML = '<p style="color: rgba(255,255,255,0.3);">No systems detected in range.</p>';
            return;
        }

        for (const result of results.slice(0, 15)) {
            const item = document.createElement('div');
            item.className = 'scan-item';

            const dist = Math.floor(result.distance);
            const sys = result.system;
            const planetText = sys.planets.length === 1 ? '1 planet' : `${sys.planets.length} planets`;
            const discovered = sys.discovered ? '✓ DISCOVERED' : '○ UNDISCOVERED';

            item.innerHTML = `
                <div class="scan-name">${sys.name}</div>
                <div class="scan-detail">
                    ${sys.starClass.type}-CLASS ${sys.starClass.desc.toUpperCase()} | ${planetText} | ${dist}u
                </div>
                <div class="scan-detail" style="color: ${sys.discovered ? 'rgba(100,255,180,0.5)' : 'rgba(255,200,50,0.5)'}">
                    ${discovered}
                </div>
            `;

            item.addEventListener('click', () => {
                if (this.onSelect) {
                    this.onSelect(result);
                }
                this.close();
            });

            this.content.appendChild(item);
        }
    }

    close() {
        this.isOpen = false;
        this.panel.classList.add('hidden');
    }

    toggle(results, playerPos) {
        if (this.isOpen) {
            this.close();
        } else {
            this.open(results, playerPos);
        }
    }
}
