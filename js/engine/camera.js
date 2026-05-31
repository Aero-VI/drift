import * as THREE from 'three';

export class GameCamera {
    constructor() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            50000
        );
        this.camera.position.set(0, 0, 0);

        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.sensitivity = 0.002;
        this.locked = false;
        this.canvas = null;
        this.uiOpen = false;

        window.addEventListener('resize', () => this.onResize());
    }

    lock(canvas) {
        this.canvas = canvas;

        canvas.addEventListener('click', () => {
            if (!this.uiOpen && !document.pointerLockElement) {
                canvas.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.locked = !!document.pointerLockElement;
            if (this.locked) {
                document.body.classList.add('pointer-locked');
            } else {
                document.body.classList.remove('pointer-locked');
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.locked || this.uiOpen) return;
            this.euler.y -= e.movementX * this.sensitivity;
            this.euler.x -= e.movementY * this.sensitivity;
            this.euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.euler.x));
            this.camera.quaternion.setFromEuler(this.euler);
        });
    }

    releasePointerLock() {
        this.uiOpen = true;
        document.body.classList.add('ui-open');
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    reacquirePointerLock() {
        this.uiOpen = false;
        document.body.classList.remove('ui-open');
        // Don't force re-lock; user clicks the canvas to re-lock
    }

    getDirection() {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(this.camera.quaternion);
        return dir;
    }

    getRight() {
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.camera.quaternion);
        return right;
    }

    getUp() {
        const up = new THREE.Vector3(0, 1, 0);
        up.applyQuaternion(this.camera.quaternion);
        return up;
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}
