import * as THREE from 'three';

// Generate a procedural planet texture on a canvas
export function generatePlanetTexture(type, baseColor, seed) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Seeded noise
    const s = seed || Math.random() * 10000;

    function hash(x, y) {
        return ((Math.sin(x * 12.9898 + y * 78.233 + s) * 43758.5453) % 1 + 1) % 1;
    }

    function noise(x, y) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const fx = x - ix;
        const fy = y - iy;
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);

        const a = hash(ix, iy);
        const b = hash(ix + 1, iy);
        const c = hash(ix, iy + 1);
        const d = hash(ix + 1, iy + 1);

        return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }

    function fbm(x, y, octaves) {
        let v = 0, a = 0.5, freq = 1;
        for (let i = 0; i < octaves; i++) {
            v += a * noise(x * freq, y * freq);
            freq *= 2;
            a *= 0.5;
        }
        return v;
    }

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    const r = Math.floor(baseColor[0] * 255);
    const g = Math.floor(baseColor[1] * 255);
    const b = Math.floor(baseColor[2] * 255);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const nx = x / size * 8;
            const ny = y / size * 8;

            let n;

            switch (type) {
                case 'Gas Giant':
                    // Horizontal bands with turbulence
                    n = fbm(nx * 0.5, ny * 3, 5);
                    const band = Math.sin(ny * 6 + n * 2) * 0.5 + 0.5;
                    data[idx] = Math.floor(r * (0.6 + band * 0.4));
                    data[idx + 1] = Math.floor(g * (0.6 + band * 0.4));
                    data[idx + 2] = Math.floor(b * (0.7 + band * 0.3));
                    break;

                case 'Ocean':
                    n = fbm(nx, ny, 6);
                    const isLand = n > 0.55;
                    if (isLand) {
                        data[idx] = Math.floor(60 + n * 80);
                        data[idx + 1] = Math.floor(100 + n * 60);
                        data[idx + 2] = Math.floor(40 + n * 30);
                    } else {
                        const depth = (0.55 - n) / 0.55;
                        data[idx] = Math.floor(20 + (1 - depth) * 40);
                        data[idx + 1] = Math.floor(60 + (1 - depth) * 80);
                        data[idx + 2] = Math.floor(120 + (1 - depth) * 80);
                    }
                    break;

                case 'Volcanic':
                    n = fbm(nx, ny, 5);
                    const lava = n > 0.6 ? (n - 0.6) * 5 : 0;
                    data[idx] = Math.floor(r * 0.3 + lava * 255);
                    data[idx + 1] = Math.floor(g * 0.2 + lava * 100);
                    data[idx + 2] = Math.floor(b * 0.2);
                    break;

                case 'Ice Giant':
                    n = fbm(nx * 0.5, ny * 2, 4);
                    const swirl = Math.sin(ny * 4 + n * 3) * 0.5 + 0.5;
                    data[idx] = Math.floor(r * (0.7 + swirl * 0.3));
                    data[idx + 1] = Math.floor(g * (0.7 + swirl * 0.3));
                    data[idx + 2] = Math.floor(b * (0.8 + swirl * 0.2));
                    break;

                case 'Desert':
                    n = fbm(nx * 1.5, ny * 1.5, 5);
                    const dune = Math.sin(nx * 4 + n * 2) * 0.15;
                    data[idx] = Math.floor(r * (0.7 + n * 0.3 + dune));
                    data[idx + 1] = Math.floor(g * (0.7 + n * 0.3 + dune));
                    data[idx + 2] = Math.floor(b * (0.7 + n * 0.2));
                    break;

                case 'Frozen':
                    n = fbm(nx, ny, 5);
                    const crack = Math.abs(Math.sin(nx * 8 + n * 4) * Math.sin(ny * 8 + n * 4));
                    const ice = crack < 0.1 ? 0.6 : 1.0;
                    data[idx] = Math.floor(200 * ice + n * 40);
                    data[idx + 1] = Math.floor(210 * ice + n * 30);
                    data[idx + 2] = Math.floor(230 * ice + n * 20);
                    break;

                case 'Toxic':
                    n = fbm(nx, ny, 5);
                    const cloud = fbm(nx * 2 + 100, ny * 2 + 100, 3);
                    data[idx] = Math.floor(r * (0.5 + n * 0.5));
                    data[idx + 1] = Math.floor(g * (0.6 + cloud * 0.4));
                    data[idx + 2] = Math.floor(b * (0.3 + n * 0.3));
                    break;

                default: // Terrestrial
                    n = fbm(nx, ny, 6);
                    if (n > 0.52) {
                        // Land
                        const elev = (n - 0.52) * 5;
                        data[idx] = Math.floor(80 + elev * 60);
                        data[idx + 1] = Math.floor(120 + elev * 40 - elev * elev * 30);
                        data[idx + 2] = Math.floor(60 + elev * 20);
                    } else {
                        // Water
                        data[idx] = Math.floor(30 + n * 40);
                        data[idx + 1] = Math.floor(50 + n * 80);
                        data[idx + 2] = Math.floor(100 + n * 100);
                    }
                    break;
            }

            data[idx + 3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}
