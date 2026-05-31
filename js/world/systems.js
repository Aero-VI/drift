import * as THREE from 'three';
import { generateSector } from './procedural.js';

const SECTOR_SIZE = 2000;

export class StarSystemManager {
    constructor(scene) {
        this.scene = scene;
        this.sectors = new Map();
        this.starMeshes = new Map();
        this.planetMeshes = [];
        this.activeSystem = null;
        this.viewRange = 2; // sectors in each direction
        this.discoveries = new Set();
        this.totalDiscoveries = 0;

        // Shared geometries
        this.starGeometry = new THREE.SphereGeometry(1, 32, 32);
        this.planetGeometry = new THREE.SphereGeometry(1, 24, 24);
        this.ringGeometry = new THREE.RingGeometry(1.5, 2.5, 48);
        this.orbitGeometry = null; // created per orbit
    }

    getSectorKey(x, y, z) {
        return `${x},${y},${z}`;
    }

    getPlayerSector(position) {
        return {
            x: Math.floor(position.x / SECTOR_SIZE),
            y: Math.floor(position.y / SECTOR_SIZE),
            z: Math.floor(position.z / SECTOR_SIZE)
        };
    }

    update(playerPosition, time) {
        const sector = this.getPlayerSector(playerPosition);

        // Load nearby sectors
        for (let dx = -this.viewRange; dx <= this.viewRange; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -this.viewRange; dz <= this.viewRange; dz++) {
                    const sx = sector.x + dx;
                    const sy = sector.y + dy;
                    const sz = sector.z + dz;
                    const key = this.getSectorKey(sx, sy, sz);

                    if (!this.sectors.has(key)) {
                        this.loadSector(sx, sy, sz);
                    }
                }
            }
        }

        // Unload distant sectors
        for (const [key, sectorData] of this.sectors) {
            const [sx, sy, sz] = key.split(',').map(Number);
            if (Math.abs(sx - sector.x) > this.viewRange + 1 ||
                Math.abs(sy - sector.y) > 2 ||
                Math.abs(sz - sector.z) > this.viewRange + 1) {
                this.unloadSector(key, sectorData);
            }
        }

        // Update planet orbits
        this.updateOrbits(time);

        return sector;
    }

    loadSector(sx, sy, sz) {
        const key = this.getSectorKey(sx, sy, sz);
        const sectorData = generateSector(sx, sy, sz);
        const meshes = [];

        const offsetX = sx * SECTOR_SIZE;
        const offsetY = sy * SECTOR_SIZE;
        const offsetZ = sz * SECTOR_SIZE;

        for (const system of sectorData.systems) {
            const worldX = offsetX + system.position.x;
            const worldY = offsetY + system.position.y;
            const worldZ = offsetZ + system.position.z;

            // Star
            const starColor = new THREE.Color(system.color[0], system.color[1], system.color[2]);
            const starMaterial = new THREE.MeshBasicMaterial({
                color: starColor,
            });
            const star = new THREE.Mesh(this.starGeometry, starMaterial);
            star.position.set(worldX, worldY, worldZ);
            star.scale.setScalar(system.starSize);
            star.userData = { type: 'star', system, sectorKey: key };
            this.scene.add(star);
            meshes.push(star);

            // Star glow
            const glowMaterial = new THREE.SpriteMaterial({
                map: this.createGlowTexture(starColor),
                color: starColor,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const glow = new THREE.Sprite(glowMaterial);
            glow.position.copy(star.position);
            glow.scale.setScalar(system.starSize * 8);
            this.scene.add(glow);
            meshes.push(glow);

            // Star light
            const light = new THREE.PointLight(starColor, system.starSize * 2, system.starSize * 200);
            light.position.copy(star.position);
            this.scene.add(light);
            meshes.push(light);

            // Planets
            for (const planet of system.planets) {
                const planetColor = new THREE.Color(planet.color[0], planet.color[1], planet.color[2]);
                const planetMat = new THREE.MeshStandardMaterial({
                    color: planetColor,
                    roughness: 0.8,
                    metalness: 0.1,
                });
                const planetMesh = new THREE.Mesh(this.planetGeometry, planetMat);
                planetMesh.scale.setScalar(planet.size);
                planetMesh.userData = {
                    type: 'planet',
                    planet,
                    system,
                    starPos: new THREE.Vector3(worldX, worldY, worldZ),
                    sectorKey: key
                };
                this.scene.add(planetMesh);
                meshes.push(planetMesh);
                this.planetMeshes.push(planetMesh);

                // Orbit line
                const orbitPoints = [];
                for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.1) {
                    orbitPoints.push(new THREE.Vector3(
                        worldX + Math.cos(a) * planet.orbitRadius,
                        worldY,
                        worldZ + Math.sin(a) * planet.orbitRadius
                    ));
                }
                const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
                const orbitLine = new THREE.Line(orbitGeo, new THREE.LineBasicMaterial({
                    color: 0x222244,
                    transparent: true,
                    opacity: 0.2
                }));
                this.scene.add(orbitLine);
                meshes.push(orbitLine);

                // Rings
                if (planet.hasRings) {
                    const ringMat = new THREE.MeshBasicMaterial({
                        color: planetColor.clone().lerp(new THREE.Color(1, 1, 1), 0.3),
                        transparent: true,
                        opacity: 0.3,
                        side: THREE.DoubleSide,
                        depthWrite: false,
                    });
                    const ring = new THREE.Mesh(this.ringGeometry, ringMat);
                    ring.scale.setScalar(planet.size);
                    ring.rotation.x = Math.PI / 2 + 0.3;
                    ring.userData = { parentPlanet: planetMesh };
                    this.scene.add(ring);
                    meshes.push(ring);
                    this.planetMeshes.push(ring); // so it updates position
                }

                // Atmosphere glow
                if (planet.type.hasAtmo) {
                    const atmoMat = new THREE.ShaderMaterial({
                        uniforms: {
                            glowColor: { value: planetColor.clone().lerp(new THREE.Color(0.5, 0.7, 1.0), 0.5) },
                        },
                        vertexShader: `
                            varying vec3 vNormal;
                            void main() {
                                vNormal = normalize(normalMatrix * normal);
                                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                            }
                        `,
                        fragmentShader: `
                            uniform vec3 glowColor;
                            varying vec3 vNormal;
                            void main() {
                                float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
                                gl_FragColor = vec4(glowColor, intensity * 0.4);
                            }
                        `,
                        transparent: true,
                        depthWrite: false,
                        side: THREE.BackSide,
                        blending: THREE.AdditiveBlending,
                    });
                    const atmo = new THREE.Mesh(this.planetGeometry, atmoMat);
                    atmo.scale.setScalar(planet.size * 1.15);
                    atmo.userData = { parentPlanet: planetMesh };
                    this.scene.add(atmo);
                    meshes.push(atmo);
                    this.planetMeshes.push(atmo);
                }
            }

            this.starMeshes.set(system.name, star);
        }

        sectorData.meshes = meshes;
        this.sectors.set(key, sectorData);
    }

    unloadSector(key, sectorData) {
        for (const mesh of sectorData.meshes) {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (mesh.material.map) mesh.material.map.dispose();
                mesh.material.dispose();
            }
            // Remove from planetMeshes
            const idx = this.planetMeshes.indexOf(mesh);
            if (idx !== -1) this.planetMeshes.splice(idx, 1);
        }
        this.sectors.delete(key);
    }

    updateOrbits(time) {
        for (const mesh of this.planetMeshes) {
            if (mesh.userData.planet) {
                const { planet, starPos } = mesh.userData;
                const angle = time * planet.orbitSpeed + planet.orbitPhase;
                mesh.position.set(
                    starPos.x + Math.cos(angle) * planet.orbitRadius,
                    starPos.y,
                    starPos.z + Math.sin(angle) * planet.orbitRadius
                );
                mesh.rotation.y = time * 0.5;
            } else if (mesh.userData.parentPlanet) {
                // Rings, atmosphere follow their parent
                mesh.position.copy(mesh.userData.parentPlanet.position);
            }
        }
    }

    createGlowTexture(color) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, `rgba(255, 255, 255, 0.6)`);
        gradient.addColorStop(0.2, `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.3)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    getNearestSystem(position, maxDistance = 500) {
        let nearest = null;
        let nearestDist = maxDistance;

        for (const [key, sector] of this.sectors) {
            const [sx, sy, sz] = key.split(',').map(Number);
            for (const system of sector.systems) {
                const worldX = sx * SECTOR_SIZE + system.position.x;
                const worldY = sy * SECTOR_SIZE + system.position.y;
                const worldZ = sz * SECTOR_SIZE + system.position.z;
                const dist = position.distanceTo(new THREE.Vector3(worldX, worldY, worldZ));
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = { system, distance: dist, sectorKey: key };
                }
            }
        }
        return nearest;
    }

    scanNearby(position, range = 2000) {
        const results = [];
        for (const [key, sector] of this.sectors) {
            const [sx, sy, sz] = key.split(',').map(Number);
            for (const system of sector.systems) {
                const worldX = sx * SECTOR_SIZE + system.position.x;
                const worldY = sy * SECTOR_SIZE + system.position.y;
                const worldZ = sz * SECTOR_SIZE + system.position.z;
                const dist = position.distanceTo(new THREE.Vector3(worldX, worldY, worldZ));
                if (dist < range) {
                    results.push({
                        system,
                        distance: dist,
                        worldPos: new THREE.Vector3(worldX, worldY, worldZ)
                    });
                }
            }
        }
        results.sort((a, b) => a.distance - b.distance);
        return results;
    }

    discover(systemName) {
        if (!this.discoveries.has(systemName)) {
            this.discoveries.add(systemName);
            this.totalDiscoveries++;
            return true;
        }
        return false;
    }
}
