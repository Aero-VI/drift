// Seeded random and procedural generation utilities

export class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    next() {
        this.seed = (this.seed * 16807 + 0) % 2147483647;
        return this.seed / 2147483647;
    }

    range(min, max) {
        return min + this.next() * (max - min);
    }

    int(min, max) {
        return Math.floor(this.range(min, max + 1));
    }

    pick(arr) {
        return arr[Math.floor(this.next() * arr.length)];
    }
}

// Name generation
const PREFIXES = [
    'Ald', 'Bel', 'Cor', 'Dra', 'Eth', 'Fal', 'Gal', 'Hel', 'Iri', 'Jov',
    'Kep', 'Lyr', 'Mav', 'Neb', 'Ori', 'Pol', 'Qua', 'Rig', 'Sol', 'Tau',
    'Umi', 'Veg', 'Wol', 'Xen', 'Ygg', 'Zan', 'Aqu', 'Bor', 'Cen', 'Dem',
    'Eph', 'For', 'Gem', 'Hyp', 'Ion', 'Jup', 'Kro', 'Lum', 'Mer', 'Nyx',
    'Oph', 'Per', 'Rho', 'Sig', 'Thr', 'Umb', 'Vul', 'Zer', 'Arc', 'Cas'
];

const SUFFIXES = [
    'ara', 'eon', 'ius', 'ora', 'ux', 'ane', 'ith', 'on', 'us', 'ar',
    'iel', 'oph', 'ari', 'ean', 'ix', 'os', 'um', 'ax', 'en', 'is',
    'orn', 'ur', 'alis', 'eon', 'ian', 'oid', 'une', 'aya', 'era', 'ina',
    'oma', 'ura', 'aia', 'ella', 'isa', 'ola', 'una'
];

const STAR_CLASSES = [
    { type: 'O', color: [0.6, 0.7, 1.0], temp: '30,000K+', desc: 'Blue supergiant', sizeMin: 8, sizeMax: 20, rarity: 0.02 },
    { type: 'B', color: [0.7, 0.8, 1.0], temp: '10,000-30,000K', desc: 'Blue-white giant', sizeMin: 5, sizeMax: 12, rarity: 0.05 },
    { type: 'A', color: [0.9, 0.92, 1.0], temp: '7,500-10,000K', desc: 'White star', sizeMin: 3, sizeMax: 6, rarity: 0.1 },
    { type: 'F', color: [1.0, 0.98, 0.9], temp: '6,000-7,500K', desc: 'Yellow-white star', sizeMin: 2, sizeMax: 4, rarity: 0.15 },
    { type: 'G', color: [1.0, 0.95, 0.7], temp: '5,200-6,000K', desc: 'Yellow star (Sol-like)', sizeMin: 1.5, sizeMax: 3, rarity: 0.2 },
    { type: 'K', color: [1.0, 0.8, 0.5], temp: '3,700-5,200K', desc: 'Orange dwarf', sizeMin: 1, sizeMax: 2, rarity: 0.25 },
    { type: 'M', color: [1.0, 0.5, 0.3], temp: '2,400-3,700K', desc: 'Red dwarf', sizeMin: 0.5, sizeMax: 1.5, rarity: 0.23 },
];

const PLANET_TYPES = [
    { name: 'Terrestrial', colors: [[0.4, 0.5, 0.3], [0.6, 0.5, 0.35], [0.3, 0.4, 0.5]], hasAtmo: true, desc: 'Rocky world with thin atmosphere' },
    { name: 'Ocean', colors: [[0.1, 0.3, 0.6], [0.15, 0.35, 0.55], [0.2, 0.4, 0.7]], hasAtmo: true, desc: 'Water world, 90%+ ocean coverage' },
    { name: 'Gas Giant', colors: [[0.7, 0.5, 0.3], [0.5, 0.4, 0.6], [0.6, 0.55, 0.4]], hasAtmo: false, desc: 'Massive hydrogen-helium atmosphere' },
    { name: 'Ice Giant', colors: [[0.4, 0.6, 0.8], [0.3, 0.5, 0.7], [0.5, 0.7, 0.9]], hasAtmo: false, desc: 'Methane-ice outer world' },
    { name: 'Desert', colors: [[0.8, 0.6, 0.3], [0.7, 0.5, 0.25], [0.9, 0.7, 0.4]], hasAtmo: true, desc: 'Arid world, iron oxide surface' },
    { name: 'Volcanic', colors: [[0.6, 0.2, 0.1], [0.8, 0.3, 0.1], [0.5, 0.15, 0.05]], hasAtmo: true, desc: 'Tectonically active, magma oceans' },
    { name: 'Frozen', colors: [[0.8, 0.85, 0.9], [0.7, 0.75, 0.85], [0.9, 0.92, 0.95]], hasAtmo: false, desc: 'Permanently frozen, sub-zero' },
    { name: 'Toxic', colors: [[0.5, 0.6, 0.2], [0.4, 0.5, 0.15], [0.6, 0.55, 0.1]], hasAtmo: true, desc: 'Dense toxic atmosphere, acid rain' },
];

export function generateStarName(rng) {
    return rng.pick(PREFIXES) + rng.pick(SUFFIXES);
}

export function generatePlanetName(starName, index, rng) {
    const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    // Sometimes give it a unique name, sometimes just a numeral
    if (rng.next() < 0.3) {
        return generateStarName(rng);
    }
    return `${starName} ${numerals[index] || (index + 1)}`;
}

export function generateStarSystem(sectorX, sectorY, sectorZ, index) {
    const seed = ((sectorX * 73856093) ^ (sectorY * 19349663) ^ (sectorZ * 83492791) ^ (index * 39916801)) & 0x7FFFFFFF;
    const rng = new SeededRandom(seed);

    // Pick star class based on rarity
    let roll = rng.next();
    let starClass = STAR_CLASSES[STAR_CLASSES.length - 1];
    let cumulative = 0;
    for (const sc of STAR_CLASSES) {
        cumulative += sc.rarity;
        if (roll <= cumulative) {
            starClass = sc;
            break;
        }
    }

    const name = generateStarName(rng);
    const starSize = rng.range(starClass.sizeMin, starClass.sizeMax);

    // Position within sector (sector is 2000 units)
    const localX = rng.range(-800, 800);
    const localY = rng.range(-400, 400);
    const localZ = rng.range(-800, 800);

    // Generate planets
    const planetCount = rng.int(0, 8);
    const planets = [];
    for (let i = 0; i < planetCount; i++) {
        const pType = rng.pick(PLANET_TYPES);
        const pColor = rng.pick(pType.colors);
        const orbitRadius = 30 + i * rng.range(15, 40) + rng.range(0, 10);
        const pSize = pType.name === 'Gas Giant' ? rng.range(3, 8) :
                      pType.name === 'Ice Giant' ? rng.range(2, 5) :
                      rng.range(0.5, 2.5);
        const orbitSpeed = 0.1 / (orbitRadius * 0.05);
        const orbitPhase = rng.range(0, Math.PI * 2);
        const hasMoons = rng.next() < 0.3;
        const moonCount = hasMoons ? rng.int(1, 4) : 0;

        planets.push({
            name: generatePlanetName(name, i, rng),
            type: pType,
            color: pColor,
            orbitRadius,
            size: pSize,
            orbitSpeed,
            orbitPhase,
            moonCount,
            hasRings: (pType.name === 'Gas Giant' || pType.name === 'Ice Giant') && rng.next() < 0.4,
        });
    }

    return {
        name,
        seed,
        starClass,
        starSize,
        color: starClass.color,
        position: { x: localX, y: localY, z: localZ },
        planets,
        discovered: false,
    };
}

export function generateSector(sectorX, sectorY, sectorZ) {
    const seed = ((sectorX * 73856093) ^ (sectorY * 19349663) ^ (sectorZ * 83492791)) & 0x7FFFFFFF;
    const rng = new SeededRandom(seed);
    const systemCount = rng.int(3, 12);
    const systems = [];

    for (let i = 0; i < systemCount; i++) {
        systems.push(generateStarSystem(sectorX, sectorY, sectorZ, i));
    }

    return {
        x: sectorX,
        y: sectorY,
        z: sectorZ,
        systems,
    };
}
