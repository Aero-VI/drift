import * as THREE from 'three';

export class TargetingSystem {
    constructor() {
        this.targetIndicator = null;
        this.targetInfo = null;
        this.createOverlay();
    }

    createOverlay() {
        // Target bracket indicator (follows target on screen)
        this.targetIndicator = document.createElement('div');
        this.targetIndicator.id = 'target-indicator';
        this.targetIndicator.className = 'hidden';
        this.targetIndicator.innerHTML = `
            <div class="target-bracket tl"></div>
            <div class="target-bracket tr"></div>
            <div class="target-bracket bl"></div>
            <div class="target-bracket br"></div>
            <div class="target-label" id="target-label"></div>
            <div class="target-dist" id="target-dist"></div>
        `;
        document.getElementById('ui-overlay').appendChild(this.targetIndicator);

        // Target info panel (bottom left)
        this.targetInfo = document.createElement('div');
        this.targetInfo.id = 'target-info';
        this.targetInfo.className = 'hidden';
        this.targetInfo.innerHTML = `
            <div class="target-info-header">
                <span class="target-info-label">TARGET LOCK</span>
            </div>
            <div class="target-info-name" id="target-info-name"></div>
            <div class="target-info-class" id="target-info-class"></div>
            <div class="target-info-planets" id="target-info-planets"></div>
            <div class="target-info-action">
                <span style="color: rgba(100,180,255,0.5)">F</span> WARP TO TARGET
            </div>
        `;
        document.getElementById('ui-overlay').appendChild(this.targetInfo);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #target-indicator {
                position: absolute;
                width: 60px;
                height: 60px;
                pointer-events: none;
                transition: left 0.1s, top 0.1s;
            }
            .target-bracket {
                position: absolute;
                width: 12px;
                height: 12px;
                border-color: rgba(100, 180, 255, 0.7);
                border-style: solid;
                border-width: 0;
            }
            .target-bracket.tl { top: 0; left: 0; border-top-width: 2px; border-left-width: 2px; }
            .target-bracket.tr { top: 0; right: 0; border-top-width: 2px; border-right-width: 2px; }
            .target-bracket.bl { bottom: 0; left: 0; border-bottom-width: 2px; border-left-width: 2px; }
            .target-bracket.br { bottom: 0; right: 0; border-bottom-width: 2px; border-right-width: 2px; }

            .target-label {
                position: absolute;
                top: -18px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 10px;
                letter-spacing: 2px;
                color: rgba(100, 180, 255, 0.8);
                white-space: nowrap;
            }
            .target-dist {
                position: absolute;
                bottom: -16px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 9px;
                letter-spacing: 2px;
                color: rgba(255, 255, 255, 0.4);
                white-space: nowrap;
            }

            #target-info {
                position: absolute;
                left: 20px;
                bottom: 140px;
                padding: 10px 15px;
                background: rgba(0, 5, 15, 0.7);
                border: 1px solid rgba(100, 180, 255, 0.2);
                font-size: 11px;
                line-height: 1.6;
                pointer-events: none;
            }
            .target-info-header {
                margin-bottom: 5px;
            }
            .target-info-label {
                font-size: 9px;
                letter-spacing: 3px;
                color: rgba(100, 180, 255, 0.5);
            }
            .target-info-name {
                font-size: 14px;
                color: rgba(100, 180, 255, 0.9);
                letter-spacing: 2px;
            }
            .target-info-class, .target-info-planets {
                font-size: 10px;
                color: rgba(255, 255, 255, 0.4);
                letter-spacing: 2px;
            }
            .target-info-action {
                margin-top: 8px;
                font-size: 10px;
                color: rgba(255, 255, 255, 0.3);
                letter-spacing: 2px;
            }

            @keyframes target-pulse {
                0%, 100% { border-color: rgba(100, 180, 255, 0.7); }
                50% { border-color: rgba(100, 180, 255, 0.3); }
            }
            .target-bracket {
                animation: target-pulse 2s ease-in-out infinite;
            }
        `;
        document.head.appendChild(style);
    }

    update(camera, player) {
        if (!player.lockedTarget || !player.lockedPosition) {
            this.targetIndicator.classList.add('hidden');
            this.targetInfo.classList.add('hidden');
            return;
        }

        // Show info panel
        this.targetInfo.classList.remove('hidden');
        document.getElementById('target-info-name').textContent = player.lockedTarget.name;
        document.getElementById('target-info-class').textContent =
            `${player.lockedTarget.starClass.type}-CLASS | ${player.lockedTarget.starClass.temp}`;
        document.getElementById('target-info-planets').textContent =
            `${player.lockedTarget.planets.length} PLANET${player.lockedTarget.planets.length !== 1 ? 'S' : ''}`;

        // Project target position to screen
        const screenPos = player.lockedPosition.clone().project(camera);
        const dist = player.position.distanceTo(player.lockedPosition);

        // Check if target is in front of camera
        if (screenPos.z > 1) {
            // Behind camera
            this.targetIndicator.classList.add('hidden');
            return;
        }

        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

        // Clamp to screen edges
        const margin = 40;
        const clampedX = Math.max(margin, Math.min(window.innerWidth - margin, x));
        const clampedY = Math.max(margin, Math.min(window.innerHeight - margin, y));

        this.targetIndicator.classList.remove('hidden');
        this.targetIndicator.style.left = (clampedX - 30) + 'px';
        this.targetIndicator.style.top = (clampedY - 30) + 'px';

        document.getElementById('target-label').textContent = player.lockedTarget.name;
        document.getElementById('target-dist').textContent = `${Math.floor(dist)}u`;
    }
}
