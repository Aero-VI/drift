export class NotificationSystem {
    constructor() {
        this.container = null;
        this.queue = [];
        this.activeCount = 0;
        this.maxActive = 3;
        this.create();
    }

    create() {
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        document.getElementById('ui-overlay').appendChild(this.container);

        const style = document.createElement('style');
        style.textContent = `
            #notification-container {
                position: absolute;
                top: 70px;
                right: 20px;
                display: flex;
                flex-direction: column;
                gap: 6px;
                pointer-events: none;
                z-index: 20;
            }
            .notification {
                padding: 8px 16px;
                background: rgba(0, 5, 15, 0.85);
                border-left: 2px solid rgba(100, 180, 255, 0.6);
                font-size: 11px;
                letter-spacing: 2px;
                color: rgba(255, 255, 255, 0.6);
                animation: notif-in 0.3s ease;
                transition: opacity 0.5s ease;
                max-width: 300px;
            }
            .notification.warning {
                border-left-color: rgba(255, 200, 50, 0.6);
                color: rgba(255, 200, 50, 0.7);
            }
            .notification.error {
                border-left-color: rgba(255, 80, 80, 0.6);
                color: rgba(255, 80, 80, 0.7);
            }
            .notification.success {
                border-left-color: rgba(100, 255, 180, 0.6);
                color: rgba(100, 255, 180, 0.7);
            }
            .notification.discovery {
                border-left-color: rgba(255, 200, 50, 0.8);
                color: rgba(255, 220, 100, 0.9);
                background: rgba(20, 15, 0, 0.9);
                border-left-width: 3px;
            }
            .notification.fade-out {
                opacity: 0;
            }
            @keyframes notif-in {
                from { transform: translateX(20px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    show(message, type = 'info', duration = 3000) {
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.textContent = message;
        this.container.appendChild(notif);

        setTimeout(() => {
            notif.classList.add('fade-out');
            setTimeout(() => {
                notif.remove();
            }, 500);
        }, duration);
    }
}
