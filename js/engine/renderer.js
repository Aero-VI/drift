import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createSpacePass } from './postfx.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000008, 0.00008);

        this.composer = null;
        this.bloomPass = null;
        this.spacePass = null;

        window.addEventListener('resize', () => this.onResize());
    }

    setupPostProcessing(camera) {
        try {
            this.composer = new EffectComposer(this.renderer);

            const renderPass = new RenderPass(this.scene, camera);
            this.composer.addPass(renderPass);

            this.bloomPass = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                0.8, 0.4, 0.85
            );
            this.composer.addPass(this.bloomPass);

            this.spacePass = createSpacePass();
            this.composer.addPass(this.spacePass);
        } catch (e) {
            console.warn('Post-processing not available:', e);
            this.composer = null;
        }
    }

    updateEffects(time, warpIntensity) {
        if (this.spacePass) {
            this.spacePass.uniforms.time.value = time;
            this.spacePass.uniforms.warpIntensity.value = warpIntensity;
        }
    }

    render(camera) {
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, camera);
        }
    }

    onResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.composer) {
            this.composer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    get domElement() {
        return this.renderer.domElement;
    }
}
