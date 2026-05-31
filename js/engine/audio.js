export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.initialized = false;
        this.ambientNodes = [];
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
            this.startAmbient();
        } catch (e) {
            console.warn('Audio not available:', e);
        }
    }

    startAmbient() {
        if (!this.initialized) return;

        // Deep space drone
        const drone = this.ctx.createOscillator();
        const droneGain = this.ctx.createGain();
        drone.type = 'sine';
        drone.frequency.value = 40;
        droneGain.gain.value = 0.08;
        drone.connect(droneGain);
        droneGain.connect(this.masterGain);
        drone.start();

        // Subtle high shimmer
        const shimmer = this.ctx.createOscillator();
        const shimmerGain = this.ctx.createGain();
        shimmer.type = 'sine';
        shimmer.frequency.value = 880;
        shimmerGain.gain.value = 0.01;
        shimmer.connect(shimmerGain);
        shimmerGain.connect(this.masterGain);
        shimmer.start();

        // LFO for shimmer
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        lfoGain.gain.value = 0.008;
        lfo.connect(lfoGain);
        lfoGain.connect(shimmerGain.gain);
        lfo.start();

        this.ambientNodes.push(drone, shimmer, lfo);
    }

    playDiscovery() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        // Discovery chime: ascending notes
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now + i * 0.15);
            gain.gain.linearRampToValueAtTime(0.1, now + i * 0.15 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.6);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.8);
        });
    }

    playBoost() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.linearRampToValueAtTime(200, now + 0.3);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.5);
    }

    playScan() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 1200 + i * 200;
            gain.gain.setValueAtTime(0, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.06, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.4);
        }
    }
}
