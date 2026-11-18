import { triggerConfetti } from "../effects/confetti.js";

let audioCtx = null;
let isAudioWarmedUp = false;
let soundEnabled = true;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass({ latencyHint: "interactive" });
        }
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    return audioCtx;
}

function warmupAudio() {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
        ctx.resume();
    }

    if (!isAudioWarmedUp && ctx.state === "running") {
        try {
            const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            isAudioWarmedUp = true;
        } catch (e) {}
    }
}

export function initializeAudio(showToast) {
    ["pointerdown", "keydown", "focus", "mouseover", "touchstart"].forEach(evtName => {
        window.addEventListener(evtName, warmupAudio, { passive: true });
    });

    const soundToggleBtn = document.getElementById("sound-toggle-btn");
    const soundBtnLabel = document.getElementById("sound-btn-label");
    const updateSoundDisplay = () => {
        soundToggleBtn?.classList.toggle("muted", !soundEnabled);
        if (soundBtnLabel) soundBtnLabel.innerText = soundEnabled ? "SOUND: ON" : "SOUND: OFF";
    };
    const toggleSound = () => {
        soundEnabled = !soundEnabled;
        updateSoundDisplay();
        showToast(soundEnabled ? "Mechanical Audio Synthesizer Enabled" : "Audio Synthesizer Muted");
    };

    soundToggleBtn?.addEventListener("click", toggleSound);
    document.getElementById("settings-sound-toggle")?.addEventListener("click", function() {
        soundEnabled = !soundEnabled;
        this.innerText = soundEnabled ? "ENABLED" : "MUTED";
        updateSoundDisplay();
        showToast(soundEnabled ? "Mechanical Audio Synthesizer Enabled" : "Audio Synthesizer Muted");
    });
}

export function playSound(type) {
    if (!soundEnabled) return;
    warmupAudio();
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== "running") return;

    try {
        const now = ctx.currentTime;
        const pitchVariance = (Math.random() - 0.5) * 0.15;

        if (type === "click" || type === "space" || type === "backspace" || type === "enter") {
            const isSpace = type === "space";
            const isBackspace = type === "backspace";
            const isEnter = type === "enter";

            const clickBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
            const output = clickBuffer.getChannelData(0);
            for (let i = 0; i < clickBuffer.length; i++) {
                output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.003));
            }
            const whiteNoise = ctx.createBufferSource();
            whiteNoise.buffer = clickBuffer;

            const filter = ctx.createBiquadFilter();
            filter.type = "highpass";
            filter.frequency.setValueAtTime((isSpace ? 1100 : isBackspace ? 3000 : isEnter ? 900 : 2500) * (1 + pitchVariance), now);

            const clickGain = ctx.createGain();
            clickGain.gain.setValueAtTime(isSpace || isEnter ? 0.38 : 0.28, now);
            clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

            whiteNoise.connect(filter);
            filter.connect(clickGain);
            clickGain.connect(ctx.destination);
            whiteNoise.start(now);

            const thudOsc = ctx.createOscillator();
            const thudGain = ctx.createGain();
            thudOsc.type = "sine";
            thudOsc.frequency.setValueAtTime((isSpace ? 100 : isEnter ? 90 : 150) * (1 + pitchVariance), now);
            thudOsc.frequency.exponentialRampToValueAtTime(40, now + 0.045);

            thudGain.gain.setValueAtTime(isSpace || isEnter ? 0.42 : 0.3, now);
            thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

            thudOsc.connect(thudGain);
            thudGain.connect(ctx.destination);
            thudOsc.start(now);
            thudOsc.stop(now + 0.045);

        } else if (type === "error") {
            const errOsc = ctx.createOscillator();
            const errGain = ctx.createGain();
            errOsc.type = "sawtooth";
            errOsc.frequency.setValueAtTime(140, now);
            errOsc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

            errGain.gain.setValueAtTime(0.35, now);
            errGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            errOsc.connect(errGain);
            errGain.connect(ctx.destination);
            errOsc.start(now);
            errOsc.stop(now + 0.1);
        } else if (type === "victory") {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "triangle";
                osc.frequency.setValueAtTime(freq, now + i * 0.08);
                gain.gain.setValueAtTime(0.25, now + i * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.08);
                osc.stop(now + i * 0.08 + 0.3);
            });
            triggerConfetti();
        } else if (type === "slap") {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === "boing") {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        }
    } catch (e) {}
}
