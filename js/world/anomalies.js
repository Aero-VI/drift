import * as THREE from 'three';

export class AnomalySystem {
    constructor(scene) {
        this.scene = scene;
        this.anomalies = new Map();
        this.blackHoleMaterial = null;
        this.createMaterials();
    }

    createMaterials() {
        this.blackHoleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vWorldPos;
                void main() {
                    vUv = uv;
                    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                varying vec2 vUv;

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }

                void main() {
                    vec2 uv = vUv - 0.5;
                    float dist = length(uv);

                    // Event horizon: pure black center
                    float horizon = smoothstep(0.15, 0.12, dist);

                    // Accretion disk: swirling hot gas
                    float angle = atan(uv.y, uv.x);
                    float spiral = sin(angle * 3.0 - time * 2.0 + dist * 20.0) * 0.5 + 0.5;
                    float diskMask = smoothstep(0.1, 0.2, dist) * smoothstep(0.5, 0.3, dist);
                    float disk = spiral * diskMask;

                    // Gravitational lensing ring
                    float ring = exp(-pow((dist - 0.18) * 30.0, 2.0)) * 2.0;

                    // Colors
                    vec3 diskColor = mix(
                        vec3(1.0, 0.4, 0.1),  // Hot orange
                        vec3(0.8, 0.2, 1.0),  // Purple
                        spiral
                    );

                    vec3 ringColor = vec3(0.8, 0.9, 1.0); // White-blue photon ring

                    vec3 color = diskColor * disk + ringColor * ring;

                    // Black hole center absorbs everything
                    color *= (1.0 - horizon);

                    float alpha = max(disk * 0.6, ring * 0.8);
                    alpha = max(alpha, horizon * 0.95); // Opaque black center

                    if (horizon > 0.5) {
                        color = vec3(0.0);
                        alpha = 0.95;
                    }

                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending,
        });
    }

    addBlackHole(position, key, size) {
        if (this.anomalies.has(key)) return;

        const group = new THREE.Group();
        group.position.copy(position);

        // Main disk (face-on and tilted)
        const diskGeo = new THREE.PlaneGeometry(size * 2, size * 2);

        const disk1 = new THREE.Mesh(diskGeo, this.blackHoleMaterial.clone());
        disk1.rotation.x = -Math.PI / 6;
        group.add(disk1);

        // Gravitational lensing glow
        const glowMat = new THREE.SpriteMaterial({
            color: new THREE.Color(0.3, 0.1, 0.5),
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
        });
        const glow = new THREE.Sprite(glowMat);
        glow.scale.setScalar(size * 6);
        group.add(glow);

        // Distortion light (purple point light)
        const light = new THREE.PointLight(0x6600cc, size * 3, size * 50);
        group.add(light);

        this.scene.add(group);
        this.anomalies.set(key, { group, materials: [disk1.material] });
    }

    update(time) {
        for (const [key, anomaly] of this.anomalies) {
            for (const mat of anomaly.materials) {
                mat.uniforms.time.value = time;
            }
            anomaly.group.rotation.y = time * 0.1;
        }
    }

    remove(key) {
        const anomaly = this.anomalies.get(key);
        if (anomaly) {
            this.scene.remove(anomaly.group);
            this.anomalies.delete(key);
        }
    }
}
