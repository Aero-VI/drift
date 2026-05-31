// Planet Landing System for DRIFT
// Procedural terrain surface generation, first-person walking, launch back to orbit

import * as THREE from 'three';

export class LandingSystem {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.isLanded = false;
        this.landedPlanet = null;
        this.landedSystem = null;

        // Surface scene elements
        this.terrain = null;
        this.surfaceObjects = [];
        this.surfaceLights = [];
        this.skybox = null;

        // Walking state
        this.walkPosition = new THREE.Vector3(0, 2, 0);
        this.walkVelocity = new THREE.Vector3();
        this.walkSpeed = 8;
        this.walkSprintSpeed = 16;
        this.gravity = -20;
        this.jumpForce = 10;
        this.onGround = true;

        // Original space state (to restore on launch)
        this.savedSpacePosition = null;
        this.savedCameraEuler = null;

        // UI
        this.launchButton = null;
        this.surfaceHUD = null;
        this.createUI();
    }

    createUI() {
        // Launch button
        this.launchButton = document.createElement('div');
        this.launchButton.id = 'launch-button';
        this.launchButton.className = 'hidden';
        this.launchButton.innerHTML = `
            <button id="launch-btn">
                <span class="launch-icon">▲</span>
                <span>LAUNCH TO ORBIT</span>
            </button>
        `;
        document.getElementById('ui-overlay').appendChild(this.launchButton);

        // Surface HUD
        this.surfaceHUD = document.createElement('div');
        this.surfaceHUD.id = 'surface-hud';
        this.surfaceHUD.className = 'hidden';
        this.surfaceHUD.innerHTML = `
            <div class="surface-info">
                <span id="surface-planet-name">---</span>
                <span id="surface-planet-type">---</span>
            </div>
        `;
        document.getElementById('ui-overlay').appendChild(this.surfaceHUD);

        // Landing prompt
        this.landPrompt = document.createElement('div');
        this.landPrompt.id = 'land-prompt';
        this.landPrompt.className = 'hidden';
        this.landPrompt.innerHTML = `<span>Press <b>G</b> to land</span>`;
        document.getElementById('ui-overlay').appendChild(this.landPrompt);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #launch-button {
                position: absolute;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                pointer-events: auto;
                z-index: 20;
            }
            #launch-btn {
                background: rgba(10, 30, 60, 0.9);
                border: 1px solid rgba(100, 180, 255, 0.5);
                color: rgba(200, 230, 255, 0.9);
                font-family: 'Courier New', monospace;
                font-size: 14px;
                padding: 12px 28px;
                cursor: pointer;
                letter-spacing: 3px;
                text-transform: uppercase;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: all 0.2s ease;
            }
            #launch-btn:hover {
                background: rgba(20, 50, 100, 0.95);
                border-color: rgba(100, 180, 255, 0.8);
                box-shadow: 0 0 20px rgba(100, 180, 255, 0.3);
            }
            .launch-icon {
                font-size: 18px;
                animation: launch-pulse 1.5s infinite;
            }
            @keyframes launch-pulse {
                0%, 100% { opacity: 0.6; transform: translateY(0); }
                50% { opacity: 1; transform: translateY(-2px); }
            }
            #surface-hud {
                position: absolute;
                top: 20px;
                left: 20px;
                pointer-events: none;
            }
            .surface-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            #surface-planet-name {
                font-size: 16px;
                letter-spacing: 4px;
                color: rgba(100, 180, 255, 0.8);
                text-transform: uppercase;
            }
            #surface-planet-type {
                font-size: 11px;
                letter-spacing: 2px;
                color: rgba(255, 255, 255, 0.4);
            }
            #land-prompt {
                position: absolute;
                bottom: 120px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 13px;
                letter-spacing: 2px;
                color: rgba(100, 180, 255, 0.7);
                background: rgba(0, 10, 30, 0.8);
                padding: 8px 20px;
                border: 1px solid rgba(100, 180, 255, 0.3);
                pointer-events: none;
                animation: prompt-fade 2s infinite;
            }
            @keyframes prompt-fade {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; }
            }
            #land-prompt b {
                color: rgba(150, 210, 255, 1);
            }
        `;
        document.head.appendChild(style);

        // Launch button click
        document.getElementById('launch-btn').addEventListener('click', () => {
            this.launchToOrbit();
        });
    }

    // Check if player is close enough to a planet to land
    canLand(playerPosition, planetMeshes) {
        for (const mesh of planetMeshes) {
            if (!mesh.userData.planet) continue;
            const dist = playerPosition.distanceTo(mesh.position);
            const landingDist = mesh.userData.planet.size * 3 + 10;
            if (dist < landingDist) {
                return { planet: mesh.userData.planet, system: mesh.userData.system, position: mesh.position.clone() };
            }
        }
        return null;
    }

    showLandPrompt() {
        this.landPrompt.classList.remove('hidden');
    }

    hideLandPrompt() {
        this.landPrompt.classList.add('hidden');
    }

    // Initiate landing
    land(planet, system, spacePosition, cameraEuler) {
        this.isLanded = true;
        this.landedPlanet = planet;
        this.landedSystem = system;
        this.savedSpacePosition = spacePosition.clone();
        this.savedCameraEuler = { x: cameraEuler.x, y: cameraEuler.y };

        // Generate terrain
        this.generateTerrain(planet);

        // Update UI
        document.getElementById('surface-planet-name').textContent = planet.name;
        document.getElementById('surface-planet-type').textContent = `${planet.type.name} - ${planet.type.desc}`;
        this.launchButton.classList.remove('hidden');
        this.surfaceHUD.classList.remove('hidden');
        this.hideLandPrompt();

        // Reset walk position
        this.walkPosition.set(0, 5, 0);
        this.walkVelocity.set(0, 0, 0);
        this.onGround = false;

        return true;
    }

    generateTerrain(planet) {
        // Clear old terrain
        this.clearSurface();

        const seed = this.hashString(planet.name);
        const rng = this.seededRandom(seed);

        // Determine terrain characteristics based on planet type
        const terrainConfig = this.getTerrainConfig(planet.type.name, rng);

        // Generate terrain mesh
        const size = 200;
        const segments = 80;
        const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
        geometry.rotateX(-Math.PI / 2);

        const positions = geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            positions[i + 1] = this.getTerrainHeight(x, z, terrainConfig, seed);
        }
        geometry.computeVertexNormals();

        // Terrain material based on planet type
        const color = new THREE.Color(planet.color[0], planet.color[1], planet.color[2]);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: terrainConfig.roughness,
            metalness: terrainConfig.metalness,
            flatShading: true,
        });

        this.terrain = new THREE.Mesh(geometry, material);
        this.scene.add(this.terrain);
        this.surfaceObjects.push(this.terrain);

        // Add environmental objects
        this.generateSurfaceObjects(planet, terrainConfig, rng);

        // Lighting
        this.setupSurfaceLighting(planet, terrainConfig);

        // Sky color/fog
        this.setupSurfaceSky(planet, terrainConfig);
    }

    getTerrainConfig(typeName, rng) {
        const configs = {
            'Terrestrial': { amplitude: 8, frequency: 0.03, octaves: 4, roughness: 0.9, metalness: 0.0, objectType: 'rocks', fog: 0.008 },
            'Ocean': { amplitude: 2, frequency: 0.02, octaves: 3, roughness: 0.3, metalness: 0.0, objectType: 'water', fog: 0.012 },
            'Gas Giant': { amplitude: 3, frequency: 0.05, octaves: 2, roughness: 0.5, metalness: 0.2, objectType: 'clouds', fog: 0.02 },
            'Ice Giant': { amplitude: 5, frequency: 0.04, octaves: 3, roughness: 0.4, metalness: 0.3, objectType: 'ice', fog: 0.015 },
            'Desert': { amplitude: 6, frequency: 0.025, octaves: 3, roughness: 0.95, metalness: 0.0, objectType: 'dunes', fog: 0.005 },
            'Volcanic': { amplitude: 12, frequency: 0.04, octaves: 5, roughness: 0.8, metalness: 0.2, objectType: 'lava', fog: 0.018 },
            'Frozen': { amplitude: 4, frequency: 0.03, octaves: 3, roughness: 0.3, metalness: 0.1, objectType: 'ice', fog: 0.01 },
            'Toxic': { amplitude: 5, frequency: 0.035, octaves: 4, roughness: 0.7, metalness: 0.1, objectType: 'toxic', fog: 0.025 },
        };
        return configs[typeName] || configs['Terrestrial'];
    }

    getTerrainHeight(x, z, config, seed) {
        let height = 0;
        let amp = config.amplitude;
        let freq = config.frequency;

        for (let o = 0; o < config.octaves; o++) {
            height += this.noise2D(x * freq + seed * 0.1, z * freq + seed * 0.2) * amp;
            amp *= 0.5;
            freq *= 2.0;
        }
        return height;
    }

    // Simple 2D noise (value noise)
    noise2D(x, y) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const fx = x - ix;
        const fy = y - iy;

        const a = this.hash2D(ix, iy);
        const b = this.hash2D(ix + 1, iy);
        const c = this.hash2D(ix, iy + 1);
        const d = this.hash2D(ix + 1, iy + 1);

        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);

        return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    }

    hash2D(x, y) {
        let n = x * 374761393 + y * 668265263;
        n = (n ^ (n >> 13)) * 1274126177;
        n = n ^ (n >> 16);
        return (n & 0x7FFFFFFF) / 0x7FFFFFFF * 2 - 1;
    }

    generateSurfaceObjects(planet, config, rng) {
        const objCount = 30 + Math.floor(rng() * 40);
        const geo = config.objectType === 'ice' ?
            new THREE.OctahedronGeometry(1, 0) :
            config.objectType === 'dunes' ?
            new THREE.ConeGeometry(1, 2, 5) :
            new THREE.DodecahedronGeometry(1, 0);

        for (let i = 0; i < objCount; i++) {
            const x = (rng() - 0.5) * 160;
            const z = (rng() - 0.5) * 160;
            const y = this.getTerrainHeight(x, z, config, this.hashString(planet.name));

            const scale = 0.3 + rng() * 1.5;
            const color = new THREE.Color(
                planet.color[0] * (0.5 + rng() * 0.5),
                planet.color[1] * (0.5 + rng() * 0.5),
                planet.color[2] * (0.5 + rng() * 0.5)
            );

            const mat = new THREE.MeshStandardMaterial({
                color,
                roughness: 0.8,
                metalness: config.metalness + rng() * 0.1,
                flatShading: true,
            });

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y + scale * 0.5, z);
            mesh.scale.setScalar(scale);
            mesh.rotation.set(rng() * 0.5, rng() * Math.PI * 2, rng() * 0.5);
            this.scene.add(mesh);
            this.surfaceObjects.push(mesh);
        }
    }

    setupSurfaceLighting(planet, config) {
        // Clear existing lights? No, we add our own tagged ones
        // Ambient for the surface
        const ambColor = new THREE.Color(planet.color[0] * 0.2, planet.color[1] * 0.2, planet.color[2] * 0.2);
        const ambient = new THREE.AmbientLight(ambColor, 0.4);
        this.scene.add(ambient);
        this.surfaceLights.push(ambient);

        // Directional "sun"
        const sunColor = new THREE.Color(1.0, 0.95, 0.85);
        const directional = new THREE.DirectionalLight(sunColor, 1.2);
        directional.position.set(50, 80, 30);
        this.scene.add(directional);
        this.surfaceLights.push(directional);

        // Hemisphere for sky bounce
        const hemi = new THREE.HemisphereLight(
            new THREE.Color(0.4, 0.5, 0.7),
            new THREE.Color(planet.color[0] * 0.3, planet.color[1] * 0.3, planet.color[2] * 0.3),
            0.3
        );
        this.scene.add(hemi);
        this.surfaceLights.push(hemi);
    }

    setupSurfaceSky(planet, config) {
        // Simple sky sphere
        const skyGeo = new THREE.SphereGeometry(500, 32, 32);
        const skyColor = new THREE.Color(
            planet.color[0] * 0.15 + 0.02,
            planet.color[1] * 0.15 + 0.02,
            planet.color[2] * 0.15 + 0.05
        );
        const skyMat = new THREE.MeshBasicMaterial({
            color: skyColor,
            side: THREE.BackSide,
        });
        this.skybox = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(this.skybox);
        this.surfaceObjects.push(this.skybox);

        // Add some stars in the sky
        const starCount = 200;
        const starGeo = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.5; // upper hemisphere only
            const r = 480;
            starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            starPositions[i * 3 + 1] = r * Math.cos(phi);
            starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false });
        const stars = new THREE.Points(starGeo, starMat);
        this.scene.add(stars);
        this.surfaceObjects.push(stars);
    }

    updateWalking(input, delta, cameraObj) {
        if (!this.isLanded) return;

        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        cameraObj.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        // Movement
        const sprinting = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
        const speed = sprinting ? this.walkSprintSpeed : this.walkSpeed;
        let moveDir = new THREE.Vector3();

        if (input.isDown('KeyW') || input.isDown('ArrowUp')) moveDir.add(forward);
        if (input.isDown('KeyS') || input.isDown('ArrowDown')) moveDir.sub(forward);
        if (input.isDown('KeyA') || input.isDown('ArrowLeft')) moveDir.sub(right);
        if (input.isDown('KeyD') || input.isDown('ArrowRight')) moveDir.add(right);

        if (moveDir.lengthSq() > 0) {
            moveDir.normalize().multiplyScalar(speed);
            this.walkVelocity.x = moveDir.x;
            this.walkVelocity.z = moveDir.z;
        } else {
            this.walkVelocity.x *= 0.85;
            this.walkVelocity.z *= 0.85;
        }

        // Jump
        if (input.wasPressed('Space') && this.onGround) {
            this.walkVelocity.y = this.jumpForce;
            this.onGround = false;
        }

        // Gravity
        this.walkVelocity.y += this.gravity * delta;

        // Apply
        this.walkPosition.addScaledVector(this.walkVelocity, delta);

        // Terrain collision
        const terrainConfig = this.getTerrainConfig(this.landedPlanet.type.name, () => 0.5);
        const groundHeight = this.getTerrainHeight(
            this.walkPosition.x, this.walkPosition.z,
            terrainConfig, this.hashString(this.landedPlanet.name)
        ) + 2.0; // Eye height

        if (this.walkPosition.y <= groundHeight) {
            this.walkPosition.y = groundHeight;
            this.walkVelocity.y = 0;
            this.onGround = true;
        }

        // Boundary clamp
        const bounds = 90;
        this.walkPosition.x = Math.max(-bounds, Math.min(bounds, this.walkPosition.x));
        this.walkPosition.z = Math.max(-bounds, Math.min(bounds, this.walkPosition.z));

        // Update camera position
        cameraObj.camera.position.copy(this.walkPosition);

        // Skybox follows camera
        if (this.skybox) {
            this.skybox.position.copy(this.walkPosition);
        }
    }

    launchToOrbit() {
        if (!this.isLanded) return;

        this.isLanded = false;
        this.clearSurface();

        // Hide surface UI
        this.launchButton.classList.add('hidden');
        this.surfaceHUD.classList.add('hidden');

        // Return position and camera data for the game to restore
        return {
            position: this.savedSpacePosition,
            euler: this.savedCameraEuler,
        };
    }

    clearSurface() {
        for (const obj of this.surfaceObjects) {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (obj.material.map) obj.material.map.dispose();
                obj.material.dispose();
            }
        }
        for (const light of this.surfaceLights) {
            this.scene.remove(light);
        }
        this.surfaceObjects = [];
        this.surfaceLights = [];
        this.terrain = null;
        this.skybox = null;
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return Math.abs(hash);
    }

    seededRandom(seed) {
        let s = seed;
        return function () {
            s = (s * 16807 + 0) % 2147483647;
            return s / 2147483647;
        };
    }
}
