import * as THREE from 'three';

export class WarpTunnel {
    constructor(scene) {
        this.scene = scene;
        this.tunnel = null;
        this.active = false;
        this.opacity = 0;
        this.create();
    }

    create() {
        const geometry = new THREE.CylinderGeometry(15, 15, 200, 32, 20, true);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                opacity: { value: 0 },
                color1: { value: new THREE.Color(0.2, 0.4, 1.0) },
                color2: { value: new THREE.Color(0.6, 0.2, 1.0) },
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPos;
                void main() {
                    vUv = uv;
                    vPos = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float opacity;
                uniform vec3 color1;
                uniform vec3 color2;
                varying vec2 vUv;
                varying vec3 vPos;

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }

                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    return mix(
                        mix(hash(i), hash(i + vec2(1,0)), f.x),
                        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
                        f.y
                    );
                }

                void main() {
                    // Scrolling streaks along the tunnel
                    float streak = noise(vec2(vUv.x * 20.0, vUv.y * 2.0 - time * 5.0));
                    streak = pow(streak, 3.0);

                    // Color gradient
                    vec3 col = mix(color1, color2, vUv.y + sin(time * 2.0) * 0.3);
                    col += streak * 0.5;

                    // Edge glow (stronger at the cylinder edges)
                    float edgeFade = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);

                    // Flicker
                    float flicker = 0.8 + 0.2 * sin(time * 10.0 + vUv.x * 30.0);

                    float alpha = streak * edgeFade * flicker * opacity * 0.4;

                    gl_FragColor = vec4(col, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
        });

        this.tunnel = new THREE.Mesh(geometry, material);
        this.tunnel.rotation.x = Math.PI / 2; // align with forward direction
        this.tunnel.visible = false;
        this.scene.add(this.tunnel);
    }

    update(camera, warping, time, delta) {
        if (!this.tunnel) return;

        // Fade in/out
        const targetOpacity = warping ? 1.0 : 0.0;
        this.opacity += (targetOpacity - this.opacity) * 5 * delta;

        if (this.opacity < 0.01) {
            this.tunnel.visible = false;
            return;
        }

        this.tunnel.visible = true;
        this.tunnel.position.copy(camera.position);
        this.tunnel.quaternion.copy(camera.quaternion);
        // Offset forward
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        this.tunnel.position.addScaledVector(forward, 50);
        this.tunnel.rotateX(Math.PI / 2);

        this.tunnel.material.uniforms.time.value = time;
        this.tunnel.material.uniforms.opacity.value = this.opacity;
    }
}
