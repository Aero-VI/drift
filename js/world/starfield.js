import * as THREE from 'three';

export class Starfield {
    constructor(scene) {
        this.scene = scene;
        this.layers = [];
        this.createStarLayers();
        this.createNebulae();
    }

    createStarLayers() {
        // Layer 1: Dense far stars (tiny, white/blue)
        this.addStarLayer(15000, 40000, 0.3, [
            new THREE.Color(0.9, 0.9, 1.0),
            new THREE.Color(0.8, 0.85, 1.0),
            new THREE.Color(1.0, 0.95, 0.9),
            new THREE.Color(0.7, 0.8, 1.0)
        ]);

        // Layer 2: Medium stars
        this.addStarLayer(5000, 25000, 0.6, [
            new THREE.Color(1.0, 0.8, 0.5),
            new THREE.Color(0.5, 0.7, 1.0),
            new THREE.Color(1.0, 0.6, 0.4),
            new THREE.Color(0.8, 0.9, 1.0)
        ]);

        // Layer 3: Bright near stars
        this.addStarLayer(1000, 15000, 1.2, [
            new THREE.Color(1.0, 1.0, 1.0),
            new THREE.Color(0.6, 0.8, 1.0),
            new THREE.Color(1.0, 0.9, 0.7)
        ]);
    }

    addStarLayer(count, spread, size, colors) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colorData = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            // Distribute in a sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = spread * (0.3 + Math.random() * 0.7);

            positions[i3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = r * Math.cos(phi);

            const color = colors[Math.floor(Math.random() * colors.length)];
            colorData[i3] = color.r;
            colorData[i3 + 1] = color.g;
            colorData[i3 + 2] = color.b;

            sizes[i] = size * (0.5 + Math.random() * 1.5);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colorData, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                varying float vSize;
                uniform float time;
                void main() {
                    vColor = color;
                    vSize = size;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float twinkle = 0.7 + 0.3 * sin(time * 0.5 + position.x * 0.01 + position.y * 0.013);
                    gl_PointSize = size * twinkle * (300.0 / -mvPosition.z);
                    gl_PointSize = clamp(gl_PointSize, 0.5, 6.0);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vSize;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    float alpha = smoothstep(0.5, 0.0, d);
                    float glow = exp(-d * 4.0) * 0.5;
                    gl_FragColor = vec4(vColor * (1.0 + glow), alpha);
                }
            `,
            vertexColors: true,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);
        this.layers.push({ points, material });
    }

    createNebulae() {
        // Create volumetric nebula clouds using transparent planes
        const nebulaColors = [
            [0.2, 0.1, 0.5],  // Purple
            [0.1, 0.2, 0.5],  // Blue
            [0.5, 0.1, 0.2],  // Red
            [0.1, 0.4, 0.3],  // Teal
        ];

        for (let i = 0; i < 8; i++) {
            const color = nebulaColors[i % nebulaColors.length];
            const size = 3000 + Math.random() * 5000;

            const geometry = new THREE.PlaneGeometry(size, size);
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    baseColor: { value: new THREE.Vector3(color[0], color[1], color[2]) },
                    seed: { value: Math.random() * 100 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 baseColor;
                    uniform float seed;
                    varying vec2 vUv;

                    // Simple noise
                    float hash(vec2 p) {
                        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                    }

                    float noise(vec2 p) {
                        vec2 i = floor(p);
                        vec2 f = fract(p);
                        f = f * f * (3.0 - 2.0 * f);
                        float a = hash(i);
                        float b = hash(i + vec2(1.0, 0.0));
                        float c = hash(i + vec2(0.0, 1.0));
                        float d = hash(i + vec2(1.0, 1.0));
                        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
                    }

                    float fbm(vec2 p) {
                        float v = 0.0;
                        float a = 0.5;
                        for (int i = 0; i < 5; i++) {
                            v += a * noise(p);
                            p *= 2.0;
                            a *= 0.5;
                        }
                        return v;
                    }

                    void main() {
                        vec2 uv = vUv - 0.5;
                        float dist = length(uv);

                        float n = fbm(uv * 3.0 + seed + time * 0.01);
                        float alpha = n * smoothstep(0.5, 0.1, dist) * 0.15;

                        gl_FragColor = vec4(baseColor * (0.5 + n * 0.5), alpha);
                    }
                `,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });

            const mesh = new THREE.Mesh(geometry, material);
            const angle = (i / 8) * Math.PI * 2;
            const dist = 8000 + Math.random() * 12000;
            mesh.position.set(
                Math.cos(angle) * dist,
                (Math.random() - 0.5) * 6000,
                Math.sin(angle) * dist
            );
            mesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            this.scene.add(mesh);
            this.layers.push({ mesh, material });
        }
    }

    update(time) {
        for (const layer of this.layers) {
            if (layer.material.uniforms && layer.material.uniforms.time) {
                layer.material.uniforms.time.value = time;
            }
        }
    }
}
