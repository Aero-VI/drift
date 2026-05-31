import * as THREE from 'three';

export class Player {
    constructor(camera) {
        this.camera = camera;
        this.velocity = new THREE.Vector3();
        this.position = camera.camera.position;

        this.baseSpeed = 50;
        this.maxSpeed = 200;
        this.boostSpeed = 600;
        this.currentMaxSpeed = this.maxSpeed;
        this.acceleration = 80;
        this.deceleration = 30;
        this.speedMultiplier = 1.0;

        this.fuel = 100;
        this.maxFuel = 100;
        this.fuelRegenRate = 2; // per second
        this.boostFuelCost = 15; // per second
        this.shield = 100;

        this.boosting = false;
        this.speed = 0;

        this.lockedTarget = null;
        this.lockedPosition = null;
    }

    update(input, delta) {
        const forward = this.camera.getDirection();
        const right = this.camera.getRight();
        const up = this.camera.getUp();

        // Speed adjustment via scroll
        const scroll = input.consumeScroll();
        if (scroll !== 0) {
            this.speedMultiplier = Math.max(0.1, Math.min(5.0, this.speedMultiplier - scroll * 0.001));
        }

        // Movement input
        let moveDir = new THREE.Vector3();
        if (input.isDown('KeyW') || input.isDown('ArrowUp')) moveDir.add(forward);
        if (input.isDown('KeyS') || input.isDown('ArrowDown')) moveDir.sub(forward);
        if (input.isDown('KeyA') || input.isDown('ArrowLeft')) moveDir.sub(right);
        if (input.isDown('KeyD') || input.isDown('ArrowRight')) moveDir.add(right);
        if (input.isDown('Space')) moveDir.add(up);
        if (input.isDown('ControlLeft') || input.isDown('ControlRight')) moveDir.sub(up);

        // Boost
        this.boosting = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
        if (this.boosting && this.fuel > 0) {
            this.currentMaxSpeed = this.boostSpeed * this.speedMultiplier;
            this.fuel = Math.max(0, this.fuel - this.boostFuelCost * delta);
        } else {
            this.currentMaxSpeed = this.maxSpeed * this.speedMultiplier;
            this.boosting = false;
        }

        // Fuel regen
        if (!this.boosting) {
            this.fuel = Math.min(this.maxFuel, this.fuel + this.fuelRegenRate * delta);
        }

        // Apply acceleration
        if (moveDir.lengthSq() > 0) {
            moveDir.normalize();
            this.velocity.lerp(moveDir.multiplyScalar(this.currentMaxSpeed), this.acceleration * delta / this.currentMaxSpeed);
        } else {
            // Deceleration
            this.velocity.multiplyScalar(1 - this.deceleration * delta / this.currentMaxSpeed);
            if (this.velocity.length() < 0.1) this.velocity.set(0, 0, 0);
        }

        // Clamp velocity
        if (this.velocity.length() > this.currentMaxSpeed) {
            this.velocity.normalize().multiplyScalar(this.currentMaxSpeed);
        }

        // Move
        this.position.addScaledVector(this.velocity, delta);
        this.speed = this.velocity.length();

        // Auto-pilot toward locked target
        if (this.lockedPosition) {
            const dir = this.lockedPosition.clone().sub(this.position);
            const dist = dir.length();
            if (dist < 20) {
                this.lockedTarget = null;
                this.lockedPosition = null;
            }
        }
    }

    lockTarget(system, worldPos) {
        this.lockedTarget = system;
        this.lockedPosition = worldPos.clone();
    }

    clearTarget() {
        this.lockedTarget = null;
        this.lockedPosition = null;
    }
}
