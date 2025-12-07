class AudioController {
    constructor() {
        this.ctx = null
        this.tensionInterval = null
        this.isMuted = false
        this.tempo = 600 // ms per beat
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext
            this.ctx = new AudioContext()
        }
    }

    startTension() {
        this.init()
        if (this.ctx.state === 'suspended') {
            this.ctx.resume()
        }
        this.stopTension()

        this.tempo = 500 // Start tempo

        const playLoop = () => {
            if (!this.ctx) return
            const t = this.ctx.currentTime

            // Kick Drum (on beat 1 and 3)
            this.playKick(t)

            // Hi-hat (on every beat)
            this.playHiHat(t + this.tempo / 2000) // Off-beat

            // Accelerate
            this.tempo = Math.max(200, this.tempo * 0.98)
            this.tensionInterval = setTimeout(playLoop, this.tempo)
        }

        playLoop()
    }

    playKick(t) {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.connect(gain)
        gain.connect(this.ctx.destination)

        osc.frequency.setValueAtTime(150, t)
        osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5)

        gain.gain.setValueAtTime(0.5, t)
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5)

        osc.start(t)
        osc.stop(t + 0.5)
    }

    playHiHat(t) {
        const bufferSize = this.ctx.sampleRate * 0.05 // Short burst
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1
        }

        const noise = this.ctx.createBufferSource()
        noise.buffer = buffer

        // High pass filter
        const filter = this.ctx.createBiquadFilter()
        filter.type = 'highpass'
        filter.frequency.value = 5000

        const gain = this.ctx.createGain()
        gain.gain.setValueAtTime(0.1, t)
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05)

        noise.connect(filter)
        filter.connect(gain)
        gain.connect(this.ctx.destination)

        noise.start(t)
    }

    stopTension() {
        if (this.tensionInterval) {
            clearTimeout(this.tensionInterval)
            this.tensionInterval = null
        }
    }

    playStart() {
        this.init()
        const t = this.ctx.currentTime
        // Simple "Ready, Set, Go" tones could be added here, but keeping it simple
        this.playKick(t)
    }

    playWin() {
        this.stopTension()
        this.init()
        const t = this.ctx.currentTime

        // Smooth Major Chord Arpeggio (C Major 7)
        // C4, E4, G4, B4, C5
        const notes = [261.63, 329.63, 392.00, 493.88, 523.25]

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator()
            const gain = this.ctx.createGain()

            osc.type = 'sine' // Smoother than square
            osc.connect(gain)
            gain.connect(this.ctx.destination)

            osc.frequency.value = freq

            // Staggered start
            const startTime = t + (i * 0.1)

            // Gentle envelope
            gain.gain.setValueAtTime(0, startTime)
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.1) // Attack
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 2) // Decay

            osc.start(startTime)
            osc.stop(startTime + 2)
        })
    }
    playCheer() {
        this.init()
        const t = this.ctx.currentTime
        // Quick ascending slide
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.connect(gain)
        gain.connect(this.ctx.destination)

        osc.frequency.setValueAtTime(400, t)
        osc.frequency.linearRampToValueAtTime(800, t + 0.2)

        gain.gain.setValueAtTime(0.1, t)
        gain.gain.linearRampToValueAtTime(0, t + 0.2)

        osc.start(t)
        osc.stop(t + 0.2)
    }

    playSound(type) {
        switch (type) {
            case 'start': this.playStart(); break;
            case 'win': this.playWin(); break;
            case 'cheer': this.playCheer(); break;
        }
    }
}

export default new AudioController()
