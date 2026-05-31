import * as THREE from 'three';
import { SeededRandom } from './procedural.js';

export class AsteroidBelt {
    constructor(scene) {
        this.scene = scene;
        this.belts = new Map();
        this.geometry = null;
        this.createGeometry();
    }

    createGeometry() {
        // Irregular asteroid shape
        this.geometry = new THREE.DodecahedronGeometry(1, 0);
        const pos = this.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const vertex = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
            vertex.multiplyScalar(0.7 + Math.random() * 0.6);
            pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        this.geometry.computeVertexNormals();
    }

    addBelt(starPos, starKey, orbitRadius, count, rng) {
        if (this.belts.has(starKey)) return;

        const asteroids = new THREE.InstancedMesh(
            this.geometry,
            new THREE.MeshStandardMaterial({
                color: 0x665544,
                roughness: 0.9,
                metalness: 0.2,
                flatShading: true,
            }),
            count
        );

        const dummy = new THREE.Object3D();
        const matrix = new THREE.Matrix4();

        for (let i = 0; i < count; i++) {
            const angle = rng.range(0, Math.PI * 2);
            const radiusOffset = rng.range(-5, 5);
            const r = orbitRadius + radiusOffset;
            const y = rng.range(-2, 2);

            dummy.position.set(
                starPos.x + Math.cos(angle) * r,
                starPos.y + y,
                starPos.z + Math.sin(angle) * r
            );
            dummy.rotation.set(
                rng.range(0, Math.PI * 2),
                rng.range(0, Math.PI * 2),
                rng.range(0, Math.PI * 2)
            );
            const scale = rng.range(0.2, 1.2);
            dummy.scale.setScalar(scale);
            dummy.updateMatrix();
            asteroids.setMatrixAt(i, dummy.matrix);
        }

        asteroids.instanceMatrix.needsUpdate = true;
        asteroids.userData = {
            starPos: starPos.clone(),
            orbitRadius,
            orbitSpeed: 0.02 / Math.sqrt(orbitRadius),
            key: starKey
        };

        this.scene.add(asteroids);
        this.belts.set(starKey, asteroids);
    }

    update(time) {
        for (const [key, mesh] of this.belts) {
            mesh.rotation.y = time * mesh.userData.orbitSpeed;
        }
    }

    removeBelt(key) {
        const mesh = this.belts.get(key);
        if (mesh) {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
            this.belts.delete(key);
        }
    }

    cleanup(activeSectorKeys) {
        for (const [key, mesh] of this.belts) {
            if (!activeSectorKeys.has(key)) {
                this.removeBelt(key);
            }
        }
    }
}
