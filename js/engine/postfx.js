import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Custom vignette + chromatic aberration shader
export const SpaceShader = {
    uniforms: {
        tDiffuse: { value: null },
        vignetteStrength: { value: 0.4 },
        chromaticAberration: { value: 0.0 },
        time: { value: 0 },
        warpIntensity: { value: 0 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float vignetteStrength;
        uniform float chromaticAberration;
        uniform float time;
        uniform float warpIntensity;
        varying vec2 vUv;

        void main() {
            vec2 uv = vUv;

            // Chromatic aberration (shifts RGB channels)
            float ca = chromaticAberration + warpIntensity * 0.008;
            vec2 dir = uv - vec2(0.5);
            float dist = length(dir);

            vec4 color;
            if (ca > 0.0) {
                float r = texture2D(tDiffuse, uv + dir * ca * dist).r;
                float g = texture2D(tDiffuse, uv).g;
                float b = texture2D(tDiffuse, uv - dir * ca * dist).b;
                color = vec4(r, g, b, 1.0);
            } else {
                color = texture2D(tDiffuse, uv);
            }

            // Vignette
            float vignette = 1.0 - smoothstep(0.4, 1.4, dist * (1.0 + vignetteStrength));
            color.rgb *= vignette;

            // Warp screen distortion
            if (warpIntensity > 0.0) {
                // Subtle scan lines during warp
                float scanline = sin(uv.y * 800.0 + time * 20.0) * 0.02 * warpIntensity;
                color.rgb += scanline;

                // Blue tint during warp
                color.rgb = mix(color.rgb, color.rgb * vec3(0.8, 0.9, 1.3), warpIntensity * 0.3);
            }

            // Film grain (subtle)
            float grain = fract(sin(dot(uv + fract(time), vec2(12.9898, 78.233))) * 43758.5453);
            color.rgb += (grain - 0.5) * 0.015;

            gl_FragColor = color;
        }
    `,
};

export function createSpacePass() {
    return new ShaderPass(SpaceShader);
}
