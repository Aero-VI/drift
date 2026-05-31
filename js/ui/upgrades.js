// Upgrades Shop UI for DRIFT

export class UpgradesUI {
    constructor() {
        this.isOpen = false;
        this.container = null;
        this.objectives = null;
        this.player = null;
        this.createUI();
    }

    createUI() {
        this.container = document.createElement('div');
        this.container.id = 'upgrades-panel';
        this.container.className = 'hidden';
        this.container.innerHTML = `
            <div class="panel-header">
                <span>SHIP UPGRADES</span>
                <button id="upgrades-close">[X]</button>
            </div>
            <div id="credits-display"></div>
            <div id="upgrades-list"></div>
            <div id="completion-display"></div>
        `;
        document.getElementById('ui-overlay').appendChild(this.container);

        const style = document.createElement('style');
        style.textContent = `
            #upgrades-panel {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 420px;
                max-height: 70vh;
                background: rgba(0, 5, 15, 0.95);
                border: 1px solid rgba(100, 180, 255, 0.3);
                padding: 20px;
                pointer-events: auto;
                overflow-y: auto;
                cursor: default;
            }
            #credits-display {
                font-size: 14px;
                letter-spacing: 3px;
                color: rgba(255, 220, 100, 0.8);
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(100, 180, 255, 0.1);
            }
            .upgrade-item {
                padding: 10px;
                margin-bottom: 8px;
                border: 1px solid rgba(100, 180, 255, 0.15);
                background: rgba(0, 10, 30, 0.5);
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .upgrade-item:hover:not(.purchased):not(.locked) {
                border-color: rgba(100, 180, 255, 0.4);
                background: rgba(10, 30, 60, 0.5);
            }
            .upgrade-item.purchased {
                border-color: rgba(100, 255, 150, 0.3);
                opacity: 0.6;
                cursor: default;
            }
            .upgrade-item.locked {
                border-color: rgba(255, 100, 100, 0.2);
                opacity: 0.5;
                cursor: not-allowed;
            }
            .upgrade-item.affordable {
                border-color: rgba(100, 255, 150, 0.3);
            }
            .upgrade-name {
                font-size: 13px;
                color: rgba(100, 180, 255, 0.9);
                letter-spacing: 2px;
                margin-bottom: 4px;
            }
            .upgrade-desc {
                font-size: 10px;
                color: rgba(255, 255, 255, 0.4);
                letter-spacing: 1px;
                margin-bottom: 4px;
            }
            .upgrade-cost {
                font-size: 11px;
                color: rgba(255, 220, 100, 0.7);
                letter-spacing: 1px;
            }
            .upgrade-status {
                font-size: 10px;
                color: rgba(100, 255, 150, 0.7);
                letter-spacing: 2px;
                float: right;
            }
            #completion-display {
                margin-top: 15px;
                padding-top: 10px;
                border-top: 1px solid rgba(100, 180, 255, 0.1);
                font-size: 11px;
                letter-spacing: 2px;
                color: rgba(100, 180, 255, 0.5);
            }
            .completion-bar {
                width: 100%;
                height: 6px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(100, 180, 255, 0.2);
                margin-top: 8px;
            }
            .completion-fill {
                height: 100%;
                background: linear-gradient(90deg, rgba(100, 180, 255, 0.6), rgba(180, 100, 255, 0.8));
                transition: width 0.5s ease;
            }
        `;
        document.head.appendChild(style);

        document.getElementById('upgrades-close').addEventListener('click', () => this.close());
    }

    open(objectives, player) {
        this.objectives = objectives;
        this.player = player;
        this.isOpen = true;
        this.container.classList.remove('hidden');
        this.render();
    }

    close() {
        this.isOpen = false;
        this.container.classList.add('hidden');
    }

    toggle(objectives, player) {
        if (this.isOpen) this.close();
        else this.open(objectives, player);
    }

    render() {
        if (!this.objectives) return;

        document.getElementById('credits-display').textContent =
            `CREDITS: ${this.objectives.credits}`;

        const list = document.getElementById('upgrades-list');
        list.innerHTML = '';

        for (const [id, upgrade] of Object.entries(this.objectives.upgrades)) {
            const div = document.createElement('div');
            div.className = 'upgrade-item';

            if (upgrade.applied) {
                div.classList.add('purchased');
            } else if (upgrade.requires && !this.objectives.upgrades[upgrade.requires].applied) {
                div.classList.add('locked');
            } else if (this.objectives.credits >= upgrade.cost) {
                div.classList.add('affordable');
            }

            let statusText = '';
            if (upgrade.applied) {
                statusText = 'INSTALLED';
            } else if (upgrade.requires && !this.objectives.upgrades[upgrade.requires].applied) {
                statusText = `REQUIRES: ${this.objectives.upgrades[upgrade.requires].name}`;
            } else if (this.objectives.credits < upgrade.cost) {
                statusText = 'INSUFFICIENT CREDITS';
            }

            div.innerHTML = `
                <div class="upgrade-name">${upgrade.name} ${statusText ? `<span class="upgrade-status">${statusText}</span>` : ''}</div>
                <div class="upgrade-desc">${upgrade.desc}</div>
                ${!upgrade.applied ? `<div class="upgrade-cost">${upgrade.cost} credits</div>` : ''}
            `;

            if (!upgrade.applied && !(upgrade.requires && !this.objectives.upgrades[upgrade.requires].applied)) {
                div.addEventListener('click', () => {
                    const result = this.objectives.purchaseUpgrade(id, this.player);
                    if (result.success) {
                        this.render();
                    }
                });
            }

            list.appendChild(div);
        }

        // Completion display
        const completion = document.getElementById('completion-display');
        this.objectives.updateCompletion();
        completion.innerHTML = `
            JOURNEY COMPLETION: ${this.objectives.completionPercent}%
            <div class="completion-bar">
                <div class="completion-fill" style="width: ${this.objectives.completionPercent}%"></div>
            </div>
        `;
    }
}
