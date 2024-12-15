class AudioManager {
    constructor() {
        this.audioContext = null;
        this.initAudioContext();
    }

    initAudioContext() {
        // Initialize on first user interaction to comply with browser policies
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }
    }

    playRifleShot() {
        if (!this.audioContext) return;

        // Create audio nodes
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();

        // Configure rifle shot sound
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.1);

        // Configure filter for more realistic gunshot sound
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        filterNode.Q.setValueAtTime(10, this.audioContext.currentTime);

        // Configure volume envelope
        gainNode.gain.setValueAtTime(0.8, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

        // Connect nodes
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Play sound
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }

    playBirdDestruction() {
        if (!this.audioContext) return;

        // Create audio nodes
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();

        // Configure scratching sound
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);

        // Configure filter for scratchy effect
        filterNode.type = 'bandpass';
        filterNode.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        filterNode.Q.setValueAtTime(5, this.audioContext.currentTime);

        // Configure volume envelope
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        // Connect nodes
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Play sound
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }
}

export default AudioManager;
