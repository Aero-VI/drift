import * as THREE from 'three';

export class SpeedLines {
    constructor(scene) {
        this.scene = scene;
        this.lineCount = 200;
        this.lines = null;
        this.velocities = [];
        this.active = false;

        this.create();
    }

    create() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.lineCount * 6); // 2 vertices per line
        const colors = new Float32Array(this.lineCount * 6);

        for (let i = 0; i < this.lineCount; i++) {
            const i6 = i * 6;
            // Random position around the camera
            const x = (Math.random() - 0.5) * 40;
            const y = (Math.random() - 0.5) * 40;
            const z = -Math.random() * 100 - 10;

            positions[i6] = x;
            positions[i6 + 1] = y;
            positions[i6 + 2] = z;
            positions[i6 + 3] = x;
            positions[i6 + 4] = y;
            positions[i6 + 5] = z - 2;

            colors[i6] = 0.4;
            colors[i6 + 1] = 0.7;
            colors[i6 + 2] = 1.0;
            colors[i6 + 3] = 0.4;
            colors[i6 + 4] = 0.7;
            colors[i6 + 5] = 1.0;

            this.velocities.push(50 + Math.random() * 100);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.lines = new THREE.LineSegments(geometry, material);
        this.scene.add(this.lines);
    }

    update(camera, speed, boosting, delta) {
        if (!this.lines) return;

        // Attach to camera
        this.lines.position.copy(camera.position);
        this.lines.quaternion.copy(camera.quaternion);

        // Fade in/out based on speed
        const targetOpacity = boosting ? Math.min(speed / 300, 0.8) : Math.min(speed / 500, 0.3);
        this.lines.material.opacity += (targetOpacity - this.lines.material.opacity) * 3 * delta;

        // Animate lines
        const positions = this.lines.geometry.attributes.position.array;
        for (let i = 0; i < this.lineCount; i++) {
            const i6 = i * 6;
            const vel = this.velocities[i] * (boosting ? 3 : 1);

            positions[i6 + 2] += vel * delta;
            positions[i6 + 5] += vel * delta;

            // Reset when past camera
            if (positions[i6 + 2] > 10) {
                positions[i6] = (Math.random() - 0.5) * 40;
                positions[i6 + 1] = (Math.random() - 0.5) * 40;
                positions[i6 + 2] = -80 - Math.random() * 40;
                positions[i6 + 3] = positions[i6];
                positions[i6 + 4] = positions[i6 + 1];

                const lineLength = boosting ? 4 + Math.random() * 6 : 1 + Math.random() * 2;
                positions[i6 + 5] = positions[i6 + 2] - lineLength;
            }
        }
        this.lines.geometry.attributes.position.needsUpdate = true;
    }
}

export class DustParticles {
    constructor(scene) {
        this.scene = scene;
        this.count = 500;
        this.particles = null;
        this.create();
    }

    create() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3);
        const sizes = new Float32Array(this.count);

        for (let i = 0; i < this.count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
            sizes[i] = 0.5 + Math.random() * 1.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                playerPos: { value: new THREE.Vector3() },
            },
            vertexShader: `
                attribute float size;
                uniform float time;
                uniform vec3 playerPos;
                varying float vAlpha;
                void main() {
                    vec3 pos = position + playerPos;
                    // Wrap around player
                    pos = mod(pos + 100.0, 200.0) - 100.0 + playerPos;
                    float dist = length(pos - cameraPosition);
                    vAlpha = smoothstep(100.0, 20.0, dist) * 0.3;
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (50.0 / -mvPosition.z);
                    gl_PointSize = clamp(gl_PointSize, 0.5, 3.0);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying float vAlpha;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
                    gl_FragColor = vec4(0.6, 0.7, 0.8, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    update(playerPos, time) {
        if (!this.particles) return;
        this.particles.material.uniforms.playerPos.value.copy(playerPos);
        this.particles.material.uniforms.time.value = time;
    }
}
