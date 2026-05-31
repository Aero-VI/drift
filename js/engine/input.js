export class Input {
    constructor() {
        this.keys = {};
        this.mouseDown = false;
        this.scrollDelta = 0;
        this.justPressed = {};

        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) {
                this.justPressed[e.code] = true;
            }
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('mousedown', () => {
            this.mouseDown = true;
        });

        window.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });

        window.addEventListener('wheel', (e) => {
            this.scrollDelta += e.deltaY;
        });
    }

    isDown(code) {
        return !!this.keys[code];
    }

    wasPressed(code) {
        return !!this.justPressed[code];
    }

    consumeScroll() {
        const d = this.scrollDelta;
        this.scrollDelta = 0;
        return d;
    }

    endFrame() {
        this.justPressed = {};
    }
}
