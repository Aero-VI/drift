import * as THREE from 'three';

export class EngineExhaust {
    constructor(scene) {
        this.scene = scene;
        this.particles = null;
        this.count = 100;
        this.lifetimes = new Float32Array(this.count);
        this.velocities = [];
        this.create();
    }

    create() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3);
        const colors = new Float32Array(this.count * 3);
        const sizes = new Float32Array(this.count);

        for (let i = 0; i < this.count; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            colors[i * 3] = 0.4;
            colors[i * 3 + 1] = 0.7;
            colors[i * 3 + 2] = 1.0;
            sizes[i] = 0;
            this.lifetimes[i] = 0;
            this.velocities.push(new THREE.Vector3());
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (100.0 / -mvPosition.z);
                    gl_PointSize = clamp(gl_PointSize, 0.0, 8.0);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    float alpha = smoothstep(0.5, 0.0, d);
                    gl_FragColor = vec4(vColor, alpha * 0.6);
                }
            `,
            vertexColors: true,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    update(cameraPos, cameraDir, speed, boosting, delta) {
        if (!this.particles) return;

        const positions = this.particles.geometry.attributes.position.array;
        const colors = this.particles.geometry.attributes.color.array;
        const sizes = this.particles.geometry.attributes.size.array;

        const spawnRate = boosting ? 5 : (speed > 10 ? 2 : 0);
        let spawned = 0;

        // Engine position: slightly behind and below camera
        const enginePos = cameraPos.clone();
        const back = cameraDir.clone().multiplyScalar(-2);
        enginePos.add(back);
        enginePos.y -= 0.5;

        for (let i = 0; i < this.count; i++) {
            if (this.lifetimes[i] <= 0) {
                // Dead particle: maybe respawn
                if (spawned < spawnRate && speed > 5) {
                    const i3 = i * 3;
                    positions[i3] = enginePos.x + (Math.random() - 0.5) * 0.5;
                    positions[i3 + 1] = enginePos.y + (Math.random() - 0.5) * 0.3;
                    positions[i3 + 2] = enginePos.z + (Math.random() - 0.5) * 0.5;

                    const vel = cameraDir.clone().multiplyScalar(-speed * 0.5);
                    vel.x += (Math.random() - 0.5) * 5;
                    vel.y += (Math.random() - 0.5) * 5;
                    vel.z += (Math.random() - 0.5) * 5;
                    this.velocities[i].copy(vel);

                    this.lifetimes[i] = 0.3 + Math.random() * 0.5;

                    if (boosting) {
                        colors[i3] = 0.8;
                        colors[i3 + 1] = 0.5;
                        colors[i3 + 2] = 0.2;
                    } else {
                        colors[i3] = 0.3;
                        colors[i3 + 1] = 0.6;
                        colors[i3 + 2] = 1.0;
                    }

                    sizes[i] = 1.0 + Math.random() * 1.5;
                    spawned++;
                } else {
                    sizes[i] = 0;
                }
                continue;
            }

            // Update living particle
            this.lifetimes[i] -= delta;
            const i3 = i * 3;
            positions[i3] += this.velocities[i].x * delta;
            positions[i3 + 1] += this.velocities[i].y * delta;
            positions[i3 + 2] += this.velocities[i].z * delta;

            const lifeRatio = Math.max(0, this.lifetimes[i] / 0.8);
            sizes[i] = lifeRatio * 2;

            // Fade color
            colors[i3] *= 0.98;
            colors[i3 + 1] *= 0.98;
            colors[i3 + 2] *= 0.99;
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.geometry.attributes.color.needsUpdate = true;
        this.particles.geometry.attributes.size.needsUpdate = true;
    }
}
