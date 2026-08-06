import {
    updateMyRunner,
    updateOpponentRunner,
    showWinner,
    hideWinner,
} from "./raceUI.js";

// SANITIZATION HELPER (XSS PREVENTION)
function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// WORD DICTIONARIES
const baseWords = [
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "it",
    "for", "not", "on", "with", "he", "as", "you", "do", "at", "this",
    "but", "his", "by", "from", "they", "we", "say", "her", "she", "or",
    "an", "will", "my", "one", "all", "would", "there", "their", "what", "so",
    "up", "out", "if", "about", "who", "get", "which", "go", "me", "when",
    "make", "can", "like", "time", "no", "just", "him", "know", "take", "people",
    "into", "year", "your", "good", "some", "could", "them", "see", "other", "than",
    "then", "now", "look", "only", "come", "its", "over", "think", "also", "back",
    "after", "use", "two", "how", "our", "work", "first", "well", "way", "even",
    "new", "want", "because", "any", "these", "give", "day", "most", "us", "great",
    "between", "need", "large", "often", "hand", "high", "place", "hold", "turn", "were",
    "does", "set", "put", "end", "why", "again", "off", "talk", "stand", "own",
    "such", "move", "live", "never", "before", "find", "real", "while", "each", "tell",
    "last", "keep", "children", "side", "begin", "got", "walk", "example", "ease", "paper",
    "group", "always", "music", "those", "both", "mark", "book", "letter", "until", "mile",
    "river", "car", "feet", "care", "second", "enough", "plain", "girl", "usual", "young",
    "ready", "above", "ever", "red", "list", "though", "feel", "talk", "bird", "soon"
];

const punctuationWords = [
    "hello,", "world.", "yes,", "no.", "wait!", "really?", "okay,", "sure.",
    "system;", "code:", "data=", "matrix,", "velocity!", "cyber."
];
const numberWords = ["123", "456", "789", "2026", "100", "50", "25", "99"];

// PRACTICE DRILL DICTIONARIES
const practiceDrills = {
    trigrams: [
        "the", "and", "ing", "her", "hat", "his", "tha", "ere", "for", "ent", "ion", "ter", "was", "you", "ith", "ver", "all", "wit", "thi", "tio"
    ],
    weak: [
        "pinky: p q z a ; ring: o w s x middle: i e d c index: u y r f v t g b"
    ],
    code: [
        "const calculateVelocity = (dist, time) => dist / time; if (status === 200) { return response.json(); }"
    ],
    symbols: [
        "!@#$%^&*()_+-=[]{}|;:'\",.<>/?~`"
    ]
};

// SOCKET & MULTIPLAYER COMPETITIVE ENGINE STATE
const socket = io();
let currentRoomId = null;
let isMultiplayer = false;
let raceFinished = false;
let gameState = "waiting";
let botInterval = null;

// MULTIPLAYER COMPETITIVE STAGE STATE
let mpUsername = escapeHTML(localStorage.getItem("vk_pilot_name") || "Priyanshu");
let opponentUsername = "Alex";
let mpRaceDuration = 60;
let mpP1Ready = false;
let mpP2Ready = false;
let isBotMatch = false;

// MULTIPLAYER RACE TYPING TELEMETRY
let mpWordIdx = 0;
let mpCharIdx = 0;
let mpCorrect = 0;
let mpIncorrect = 0;
let mpTotalTyped = 0;
let mpStartTime = null;
let mpTimerInterval = null;
let mpTimeLeft = 60;
let p2Progress = 0;
let p2Wpm = 0;

// SOLO ENGINE STATE
let currentWordIndex = 0;
let currentCharIndex = 0;
let testActive = false;
let testDuration = 15;
let timeLeft = 15;
let timerInterval = null;
let correctChars = 0;
let incorrectChars = 0;
let totalTyped = 0;
let includePunctuation = false;
let includeNumbers = false;
let soundEnabled = true;
let currentTheme = localStorage.getItem("vk_theme") || "cyber-green";
let wpmHistory = [];

// PRACTICE STATE
let currentDrillType = "trigrams";
let practiceWordIdx = 0;
let practiceCharIdx = 0;
let practiceCorrect = 0;
let practiceIncorrect = 0;
let practiceTotalTyped = 0;
let practiceStartTime = null;

// DOM ELEMENTS
const typingInput = document.getElementById("typing-input");
const wordsWrapper = document.getElementById("words-wrapper");
const caret = document.getElementById("caret");
const arenaCard = document.getElementById("typing-arena-card");

const liveWpmEl = document.getElementById("live-wpm");
const liveAccuracyEl = document.getElementById("live-accuracy");
const liveTimerEl = document.getElementById("live-timer");
const personalBestEl = document.getElementById("personal-best");

const punctuationToggle = document.getElementById("punctuation-toggle");
const numbersToggle = document.getElementById("numbers-toggle");
const timeOptions = document.querySelectorAll(".time-option");
const resetTestBtn = document.getElementById("reset-test-btn");

const roomInput = document.getElementById("room-input");
const joinBtn = document.getElementById("join-btn");
const createBtn = document.getElementById("create-btn");
const lobbyStatus = document.getElementById("lobby-status");
const lobbyStatusText = document.getElementById("lobby-status-text");
const startBotMatchBtn = document.getElementById("start-bot-match-btn");

const soundToggleBtn = document.getElementById("sound-toggle-btn");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const soundBtnLabel = document.getElementById("sound-btn-label");
const themeBtnLabel = document.getElementById("theme-btn-label");

// LOCAL STORAGE REAL RACE HISTORY MANAGER
function getRaceHistory() {
    try {
        const raw = localStorage.getItem("vk_race_history");
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveRaceHistory(entry) {
    const history = getRaceHistory();
    history.unshift(entry);
    localStorage.setItem("vk_race_history", JSON.stringify(history.slice(0, 100)));
}

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
    initTheme(currentTheme);
    initBootLoader();
    initCanvasAnimation();
    initNavigationRouter();
    initTest();
    initPracticeEngine();
    initCompetitiveMultiplayer();
    renderStatisticsPage();
    renderLeaderboardPage();
    renderProfilePage();

    window.addEventListener("resize", () => {
        updateCaret();
        updatePracticeCaret();
        updateMpCaret();
    });
});

// THEME SYSTEM
function initTheme(themeName) {
    currentTheme = themeName;
    document.documentElement.setAttribute("data-theme", themeName);
    localStorage.setItem("vk_theme", themeName);

    if (themeBtnLabel) {
        if (themeName === "cyber-green") themeBtnLabel.innerText = "THEME: GREEN";
        else if (themeName === "midnight-bw") themeBtnLabel.innerText = "THEME: MONO";
        else if (themeName === "electric-blue") themeBtnLabel.innerText = "THEME: BLUE";
    }

    document.querySelectorAll("[id^='theme-opt-']").forEach(opt => opt.classList.remove("active"));
    if (themeName === "cyber-green") document.getElementById("theme-opt-green")?.classList.add("active");
    if (themeName === "midnight-bw") document.getElementById("theme-opt-bw")?.classList.add("active");
    if (themeName === "electric-blue") document.getElementById("theme-opt-blue")?.classList.add("active");
}

themeToggleBtn?.addEventListener("click", () => {
    const themes = ["cyber-green", "midnight-bw", "electric-blue"];
    const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
    initTheme(nextTheme);
    showToast(`Switched theme to ${nextTheme.toUpperCase()}`);
});

document.getElementById("theme-opt-green")?.addEventListener("click", () => initTheme("cyber-green"));
document.getElementById("theme-opt-bw")?.addEventListener("click", () => initTheme("midnight-bw"));
document.getElementById("theme-opt-blue")?.addEventListener("click", () => initTheme("electric-blue"));

// BOOT LOADER
function initBootLoader() {
    const loader = document.getElementById("boot-loader");
    const fill = document.getElementById("boot-progress-fill");
    if (!loader || !fill) return;

    let progress = 0;
    const interval = setInterval(() => {
        progress += 25;
        fill.style.width = `${progress}%`;
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                loader.classList.add("loaded");
            }, 300);
        }
    }, 100);
}

// NAVIGATION ROUTER
function initNavigationRouter() {
    const navItems = document.querySelectorAll(".nav-item");
    const pageViews = document.querySelectorAll(".page-view");
    const githubBadge = document.getElementById("github-corner-badge");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetId = item.getAttribute("data-target");
            navItems.forEach(n => n.classList.remove("active"));
            pageViews.forEach(v => v.classList.remove("active"));

            item.classList.add("active");
            document.getElementById(targetId)?.classList.add("active");

            if (targetId === "multiplayer-view") {
                if (githubBadge) githubBadge.style.display = "none";
                isMultiplayer = true;
                showMpStage("mp-stage-lobby");
            } else {
                if (githubBadge) githubBadge.style.display = "flex";
            }

            if (targetId === "play-view") {
                isMultiplayer = false;
                typingInput?.focus();
                requestAnimationFrame(() => updateCaret());
            } else if (targetId === "practice-view") {
                isMultiplayer = false;
                document.getElementById("practice-typing-input")?.focus();
                requestAnimationFrame(() => updatePracticeCaret());
            } else if (targetId === "stats-view") {
                renderStatisticsPage();
            } else if (targetId === "leaderboard-view") {
                renderLeaderboardPage();
            } else if (targetId === "profile-view") {
                renderProfilePage();
            }
        });
    });
}

function navigateToPlay() {
    const githubBadge = document.getElementById("github-corner-badge");
    if (githubBadge) githubBadge.style.display = "flex";

    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.querySelectorAll(".page-view").forEach(v => v.classList.remove("active"));

    const playTab = document.querySelector(".nav-item[data-target='play-view']");
    const playView = document.getElementById("play-view");

    if (playTab) playTab.classList.add("active");
    if (playView) playView.classList.add("active");

    isMultiplayer = false;
    initTest();
}

// PURE MECHANICAL KEYBOARD SYNTHESIZER ENGINE
let audioCtx = null;
let isAudioWarmedUp = false;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function warmupAudio() {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    if (!isAudioWarmedUp && ctx.state === 'running') {
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

["pointerdown", "keydown", "focus", "mouseover", "touchstart"].forEach(evtName => {
    window.addEventListener(evtName, warmupAudio, { passive: true });
});

function playSound(type) {
    if (!soundEnabled) return;
    warmupAudio();
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

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

soundToggleBtn?.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundToggleBtn.classList.toggle("muted", !soundEnabled);
    if (soundBtnLabel) soundBtnLabel.innerText = soundEnabled ? "SOUND: ON" : "SOUND: OFF";
    showToast(soundEnabled ? "Mechanical Audio Synthesizer Enabled" : "Audio Synthesizer Muted");
});

document.getElementById("settings-sound-toggle")?.addEventListener("click", function() {
    soundEnabled = !soundEnabled;
    this.innerText = soundEnabled ? "ENABLED" : "MUTED";
    soundToggleBtn?.classList.toggle("muted", !soundEnabled);
    if (soundBtnLabel) soundBtnLabel.innerText = soundEnabled ? "SOUND: ON" : "SOUND: OFF";
    showToast(soundEnabled ? "Mechanical Audio Synthesizer Enabled" : "Audio Synthesizer Muted");
});

// PERSONAL BEST HELPERS
function getPersonalBest(duration) {
    const pb = localStorage.getItem(`vk_pb_${duration}`);
    return pb ? parseInt(pb) : null;
}

function savePersonalBest(duration, wpm) {
    const currentPB = getPersonalBest(duration);
    if (!currentPB || wpm > currentPB) {
        localStorage.setItem(`vk_pb_${duration}`, wpm);
        return true;
    }
    return false;
}

function updatePBDisplay() {
    const pb = getPersonalBest(testDuration);
    if (personalBestEl) personalBestEl.innerText = pb ? `${pb} WPM` : "--";
}

// SOLO TEST ENGINE
function initTest() {
    clearInterval(timerInterval);
    if (typingInput) typingInput.disabled = false;
    if (wordsWrapper) wordsWrapper.innerHTML = "";

    currentWordIndex = 0;
    currentCharIndex = 0;
    testActive = false;
    correctChars = 0;
    incorrectChars = 0;
    totalTyped = 0;
    timeLeft = testDuration;
    wpmHistory = [];

    if (liveTimerEl) liveTimerEl.innerText = timeLeft;
    document.getElementById("result-screen").style.display = "none";
    document.getElementById("play-view").querySelectorAll(".arena-header, .typing-arena-card, .arena-controls").forEach(el => el.style.display = "");

    let wordPool = [...baseWords];
    if (includePunctuation) wordPool = wordPool.concat(punctuationWords);
    if (includeNumbers) wordPool = wordPool.concat(numberWords);

    const sessionWords = wordPool.sort(() => Math.random() - 0.5).slice(0, 80);

    sessionWords.forEach((wordText, index) => {
        const wordDiv = document.createElement("div");
        wordDiv.className = "word" + (index === 0 ? " active-word" : "");
        wordText.split("").forEach(char => {
            const span = document.createElement("span");
            span.className = "char";
            span.innerText = char;
            wordDiv.appendChild(span);
        });
        wordsWrapper.appendChild(wordDiv);
    });

    if (wordsWrapper) wordsWrapper.style.transform = "translateY(0)";
    
    requestAnimationFrame(() => {
        updateCaret();
    });

    if (typingInput) {
        typingInput.value = "";
        typingInput.focus();
    }
    updatePBDisplay();
    updateLiveStats();
}

function updateCaret() {
    const clip = document.getElementById("words-clip");
    const wordElements = document.querySelectorAll(".word");
    const activeWord = wordElements[currentWordIndex];
    if (!activeWord || !caret || !clip) return;

    const clipRect = clip.getBoundingClientRect();
    const charElements = activeWord.querySelectorAll(".char");
    const activeChar = charElements[currentCharIndex];

    if (activeChar) {
        const charRect = activeChar.getBoundingClientRect();
        caret.style.top = `${charRect.top - clipRect.top}px`;
        caret.style.left = `${charRect.left - clipRect.left}px`;
        caret.style.height = `${charRect.height}px`;
    } else {
        const lastChar = activeWord.lastElementChild;
        if (lastChar) {
            const lastRect = lastChar.getBoundingClientRect();
            caret.style.top = `${lastRect.top - clipRect.top}px`;
            caret.style.left = `${lastRect.right - clipRect.left}px`;
            caret.style.height = `${lastRect.height}px`;
        }
    }
}

function scrollWordsIfNeeded() {
    const activeWord = document.querySelectorAll(".word")[currentWordIndex];
    const clip = document.getElementById("words-clip");
    if (!activeWord || !clip || !wordsWrapper) return;

    const clipHeight = clip.offsetHeight;
    const activeTop = activeWord.offsetTop;

    if (activeTop >= clipHeight) {
        wordsWrapper.style.transform = `translateY(-${activeTop - clipHeight / 3}px)`;
    }
}

function startTimer() {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timeLeft--;
        if (liveTimerEl) liveTimerEl.innerText = timeLeft;

        updateLiveStats();

        const minutesPassed = (testDuration - timeLeft) / 60;
        const currentWpm = minutesPassed > 0 ? Math.round(correctChars / 5 / minutesPassed) : 0;
        wpmHistory.push(currentWpm);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            endTest();
        }
    }, 1000);
}

function endTest() {
    if (typingInput) typingInput.disabled = true;

    const minutes = testDuration / 60;
    const finalWPM = Math.round(correctChars / 5 / minutes);
    const rawWPM = Math.round((correctChars + incorrectChars) / 5 / minutes);
    const finalAccuracy = totalTyped > 0 ? Math.round((correctChars / totalTyped) * 100) : 100;

    const isNewPB = savePersonalBest(testDuration, finalWPM);

    saveRaceHistory({
        id: Date.now(),
        wpm: finalWPM,
        accuracy: finalAccuracy,
        time: testDuration,
        mode: `${testDuration}s`,
        date: new Date().toLocaleDateString(),
        correct: correctChars,
        incorrect: incorrectChars,
        isWin: true
    });

    document.getElementById("final-wpm").innerText = finalWPM;
    document.getElementById("final-accuracy").innerText = `${finalAccuracy}%`;
    document.getElementById("final-correct").innerText = correctChars;
    document.getElementById("final-raw").innerText = `${rawWPM} WPM`;

    const pbBadge = document.getElementById("new-pb-badge");
    if (pbBadge) pbBadge.style.display = isNewPB ? "inline-block" : "none";

    document.getElementById("play-view").querySelectorAll(".arena-header, .typing-arena-card, .arena-controls").forEach(el => el.style.display = "none");
    document.getElementById("result-screen").style.display = "flex";

    renderResultChart();
    playSound("victory");
}

function updateLiveStats() {
    const minutesPassed = (testDuration - timeLeft) / 60;
    const wpm = minutesPassed > 0 ? Math.round(correctChars / 5 / minutesPassed) : 0;
    const accuracy = totalTyped > 0 ? Math.round((correctChars / totalTyped) * 100) : 100;

    if (liveWpmEl) liveWpmEl.innerText = minutesPassed > 0 ? wpm : "--";
    if (liveAccuracyEl) liveAccuracyEl.innerText = minutesPassed > 0 ? `${accuracy}%` : "--";
}

// SOLO TYPING INPUT LISTENERS
arenaCard?.addEventListener("click", () => typingInput?.focus());

typingInput?.addEventListener("keydown", (e) => {
    if (isMultiplayer) return;

    if (!testActive && e.key.length === 1) {
        testActive = true;
        gameState = "racing";
        startTimer();
    }

    const wordElements = document.querySelectorAll(".word");
    const currentWordEl = wordElements[currentWordIndex];
    if (!currentWordEl) return;
    const charElements = currentWordEl.querySelectorAll(".char");

    if (e.key === "Backspace") {
        if (currentCharIndex > 0) {
            currentCharIndex--;
            charElements[currentCharIndex].classList.remove("correct", "incorrect");
        } else if (currentWordIndex > 0) {
            currentWordEl.classList.remove("active-word");
            currentWordIndex--;
            const prevWord = wordElements[currentWordIndex];
            prevWord.classList.add("active-word");
            currentCharIndex = prevWord.querySelectorAll(".char").length;
        }
        playSound("backspace");
    } else if (e.key === "Enter") {
        playSound("enter");
    } else if (e.key === " ") {
        e.preventDefault();
        if (currentCharIndex > 0) {
            currentWordEl.classList.remove("active-word");
            currentWordIndex++;
            currentCharIndex = 0;

            if (wordElements[currentWordIndex]) {
                wordElements[currentWordIndex].classList.add("active-word");
            }
            scrollWordsIfNeeded();
            playSound("space");
        }
    } else if (e.key.length === 1) {
        if (currentCharIndex < charElements.length) {
            const isCorrect = e.key === charElements[currentCharIndex].innerText;

            charElements[currentCharIndex].classList.add(isCorrect ? "correct" : "incorrect");

            if (isCorrect) {
                correctChars++;
                playSound("click");
            } else {
                incorrectChars++;
                playSound("error");
            }

            totalTyped++;
            currentCharIndex++;
            updateLiveStats();
        }
    }

    requestAnimationFrame(() => updateCaret());
});

// PRACTICE MODE ENGINE
function initPracticeEngine() {
    const categoryOptions = document.querySelectorAll("#practice-category-group .config-option");
    const practiceInput = document.getElementById("practice-typing-input");
    const practiceCard = document.getElementById("practice-arena-card");
    const restartBtn = document.getElementById("practice-restart-btn");

    categoryOptions.forEach(opt => {
        opt.addEventListener("click", () => {
            categoryOptions.forEach(o => o.classList.remove("active"));
            opt.classList.add("active");
            currentDrillType = opt.getAttribute("data-drill");
            loadPracticeDrill();
        });
    });

    practiceCard?.addEventListener("click", () => practiceInput?.focus());
    restartBtn?.addEventListener("click", () => loadPracticeDrill());

    practiceInput?.addEventListener("keydown", (e) => {
        const wordElements = document.querySelectorAll("#practice-words-wrapper .word");
        const currentWordEl = wordElements[practiceWordIdx];
        if (!currentWordEl) return;
        const charElements = currentWordEl.querySelectorAll(".char");

        if (!practiceStartTime) practiceStartTime = Date.now();

        if (e.key === "Backspace") {
            if (practiceCharIdx > 0) {
                practiceCharIdx--;
                charElements[practiceCharIdx].classList.remove("correct", "incorrect");
            } else if (practiceWordIdx > 0) {
                currentWordEl.classList.remove("active-word");
                practiceWordIdx--;
                const prevWord = wordElements[practiceWordIdx];
                prevWord.classList.add("active-word");
                practiceCharIdx = prevWord.querySelectorAll(".char").length;
            }
            playSound("backspace");
        } else if (e.key === " ") {
            e.preventDefault();
            if (practiceCharIdx > 0) {
                currentWordEl.classList.remove("active-word");
                practiceWordIdx++;
                practiceCharIdx = 0;

                if (wordElements[practiceWordIdx]) {
                    wordElements[practiceWordIdx].classList.add("active-word");
                }
                scrollPracticeWordsIfNeeded();
                playSound("space");
            }
        } else if (e.key.length === 1) {
            if (practiceCharIdx < charElements.length) {
                const isCorrect = e.key === charElements[practiceCharIdx].innerText;

                charElements[practiceCharIdx].classList.add(isCorrect ? "correct" : "incorrect");

                if (isCorrect) {
                    practiceCorrect++;
                    playSound("click");
                } else {
                    practiceIncorrect++;
                    playSound("error");
                }

                practiceTotalTyped++;
                practiceCharIdx++;
                updatePracticeStats();
            }
        }

        requestAnimationFrame(() => updatePracticeCaret());

        if (practiceWordIdx >= wordElements.length - 1 && practiceCharIdx >= charElements.length) {
            showToast("🎯 DRILL COMPLETED!");
            playSound("victory");
        }
    });

    loadPracticeDrill();
}

function loadPracticeDrill() {
    const wrapper = document.getElementById("practice-words-wrapper");
    const input = document.getElementById("practice-typing-input");
    if (!wrapper) return;

    wrapper.innerHTML = "";
    practiceWordIdx = 0;
    practiceCharIdx = 0;
    practiceCorrect = 0;
    practiceIncorrect = 0;
    practiceTotalTyped = 0;
    practiceStartTime = null;

    const list = practiceDrills[currentDrillType] || practiceDrills.trigrams;
    const drillText = list.sort(() => Math.random() - 0.5).join(" ");

    drillText.split(" ").forEach((wordText, index) => {
        const wordDiv = document.createElement("div");
        wordDiv.className = "word" + (index === 0 ? " active-word" : "");
        wordText.split("").forEach(char => {
            const span = document.createElement("span");
            span.className = "char";
            span.innerText = char;
            wordDiv.appendChild(span);
        });
        wrapper.appendChild(wordDiv);
    });

    wrapper.style.transform = "translateY(0)";
    requestAnimationFrame(() => updatePracticeCaret());
    if (input) {
        input.value = "";
        input.focus();
    }
    updatePracticeStats();
}

function updatePracticeCaret() {
    const clip = document.getElementById("practice-words-clip");
    const caretEl = document.getElementById("practice-caret");
    const wordElements = document.querySelectorAll("#practice-words-wrapper .word");
    const activeWord = wordElements[practiceWordIdx];
    if (!activeWord || !caretEl || !clip) return;

    const clipRect = clip.getBoundingClientRect();
    const charElements = activeWord.querySelectorAll(".char");
    const activeChar = charElements[practiceCharIdx];

    if (activeChar) {
        const charRect = activeChar.getBoundingClientRect();
        caretEl.style.top = `${charRect.top - clipRect.top}px`;
        caretEl.style.left = `${charRect.left - clipRect.left}px`;
        caretEl.style.height = `${charRect.height}px`;
    } else {
        const lastChar = activeWord.lastElementChild;
        if (lastChar) {
            const lastRect = lastChar.getBoundingClientRect();
            caretEl.style.top = `${lastRect.top - clipRect.top}px`;
            caretEl.style.left = `${lastRect.right - clipRect.left}px`;
            caretEl.style.height = `${lastRect.height}px`;
        }
    }
}

function scrollPracticeWordsIfNeeded() {
    const activeWord = document.querySelectorAll("#practice-words-wrapper .word")[practiceWordIdx];
    const clip = document.getElementById("practice-words-clip");
    const wrapper = document.getElementById("practice-words-wrapper");
    if (!activeWord || !clip || !wrapper) return;

    const clipHeight = clip.offsetHeight;
    const activeTop = activeWord.offsetTop;

    if (activeTop >= clipHeight) {
        wrapper.style.transform = `translateY(-${activeTop - clipHeight / 3}px)`;
    }
}

function updatePracticeStats() {
    const wpmEl = document.getElementById("practice-wpm");
    const accEl = document.getElementById("practice-accuracy");
    const errEl = document.getElementById("practice-errors");

    const elapsedMinutes = practiceStartTime ? (Date.now() - practiceStartTime) / 60000 : 0;
    const wpm = elapsedMinutes > 0 ? Math.round(practiceCorrect / 5 / elapsedMinutes) : 0;
    const acc = practiceTotalTyped > 0 ? Math.round((practiceCorrect / practiceTotalTyped) * 100) : 100;

    if (wpmEl) wpmEl.innerText = elapsedMinutes > 0 ? wpm : "--";
    if (accEl) accEl.innerText = practiceTotalTyped > 0 ? `${acc}%` : "--";
    if (errEl) errEl.innerText = practiceIncorrect;
}

// COMPETITIVE 4-STAGE MULTIPLAYER ENGINE
function showMpStage(stageId) {
    const stages = document.querySelectorAll(".mp-stage");
    stages.forEach(s => s.classList.remove("active"));
    const target = document.getElementById(stageId);
    if (target) target.classList.add("active");
}

function initCompetitiveMultiplayer() {
    const usernameInput = document.getElementById("mp-username-input");
    const timeOptions = document.querySelectorAll(".mp-time-opt");
    const readyToggleBtn = document.getElementById("ready-toggle-btn");
    const cancelMatchBtn = document.getElementById("cancel-match-btn");
    const mpInput = document.getElementById("mp-typing-input");
    const mpCard = document.getElementById("mp-arena-card");

    if (usernameInput) {
        usernameInput.value = mpUsername;
        usernameInput.addEventListener("input", (e) => {
            mpUsername = escapeHTML(e.target.value.trim() || "Priyanshu");
            localStorage.setItem("vk_pilot_name", mpUsername);
        });
    }

    timeOptions.forEach(opt => {
        opt.addEventListener("click", () => {
            timeOptions.forEach(o => o.classList.remove("active"));
            opt.classList.add("active");
            mpRaceDuration = parseInt(opt.dataset.time);
        });
    });

    createBtn?.addEventListener("click", () => {
        if (!mpUsername) {
            showToast("⚠️ Please enter a pilot username first!");
            usernameInput?.focus();
            return;
        }
        socket.emit("create-room");
    });

    joinBtn?.addEventListener("click", () => {
        if (!mpUsername) {
            showToast("⚠️ Please enter a pilot username first!");
            usernameInput?.focus();
            return;
        }
        const code = roomInput?.value.trim();
        if (code) {
            currentRoomId = code;
            socket.emit("join-room", code);
        }
    });

    readyToggleBtn?.addEventListener("click", () => {
        mpP1Ready = !mpP1Ready;
        readyToggleBtn.innerHTML = mpP1Ready ? "<span>READY ✓</span>" : "<span>I'M READY ✓</span>";
        document.getElementById("p1-ready-badge").innerText = mpP1Ready ? "READY ✓" : "NOT READY";
        
        if (isBotMatch && mpP1Ready) {
            mpP2Ready = true;
            document.getElementById("p2-ready-badge").innerText = "READY ✓";
            launchMatchVS();
        }
    });

    cancelMatchBtn?.addEventListener("click", () => {
        document.getElementById("mp-waiting-room").style.display = "none";
        if (lobbyStatusText) lobbyStatusText.innerText = "STATUS: Match cancelled. Ready for new connection.";
        isBotMatch = false;
        mpP1Ready = false;
        mpP2Ready = false;
    });

    startBotMatchBtn?.addEventListener("click", () => {
        if (!mpUsername) mpUsername = "Priyanshu";
        isBotMatch = true;
        opponentUsername = "Alex (AI Bot)";
        setupWaitingRoom();
    });

    mpCard?.addEventListener("click", () => mpInput?.focus());

    mpInput?.addEventListener("keydown", (e) => {
        if (!isMultiplayer || gameState !== "racing") return;

        const wordElements = document.querySelectorAll("#mp-words-wrapper .word");
        const currentWordEl = wordElements[mpWordIdx];
        if (!currentWordEl) return;
        const charElements = currentWordEl.querySelectorAll(".char");

        if (!mpStartTime) mpStartTime = Date.now();

        if (e.key === "Backspace") {
            if (mpCharIdx > 0) {
                mpCharIdx--;
                charElements[mpCharIdx].classList.remove("correct", "incorrect");
            } else if (mpWordIdx > 0) {
                currentWordEl.classList.remove("active-word");
                mpWordIdx--;
                const prevWord = wordElements[mpWordIdx];
                prevWord.classList.add("active-word");
                mpCharIdx = prevWord.querySelectorAll(".char").length;
            }
            playSound("backspace");
        } else if (e.key === " ") {
            e.preventDefault();
            if (mpCharIdx > 0) {
                currentWordEl.classList.remove("active-word");
                mpWordIdx++;
                mpCharIdx = 0;

                if (wordElements[mpWordIdx]) {
                    wordElements[mpWordIdx].classList.add("active-word");
                }
                scrollMpWordsIfNeeded();
                playSound("space");
            }
        } else if (e.key.length === 1) {
            if (mpCharIdx < charElements.length) {
                const isCorrect = e.key === charElements[mpCharIdx].innerText;

                charElements[mpCharIdx].classList.add(isCorrect ? "correct" : "incorrect");

                if (isCorrect) {
                    mpCorrect++;
                    playSound("click");
                } else {
                    mpIncorrect++;
                    playSound("error");
                }

                mpTotalTyped++;
                mpCharIdx++;
            }
        }

        requestAnimationFrame(() => updateMpCaret());

        const totalCharsInRace = document.querySelectorAll("#mp-words-wrapper .char").length;
        const progressPercent = totalCharsInRace > 0 ? (mpCorrect / totalCharsInRace) * 100 : 0;
        const elapsedMinutes = mpStartTime ? (Date.now() - mpStartTime) / 60000 : 0.01;
        const currentWpm = elapsedMinutes > 0 ? Math.round(mpCorrect / 5 / elapsedMinutes) : 0;
        const currentAcc = mpTotalTyped > 0 ? Math.round((mpCorrect / mpTotalTyped) * 100) : 100;

        document.getElementById("mp-live-wpm").innerText = `${currentWpm} WPM`;
        document.getElementById("mp-live-accuracy").innerText = `${currentAcc}%`;

        if (currentRoomId) {
            socket.emit("update-progress", {
                roomId: currentRoomId,
                progress: progressPercent,
            });
        }

        updateMyRunner(progressPercent, currentWpm);
        updateLiveRankBadge(progressPercent);

        if (!raceFinished && progressPercent >= 100) {
            raceFinished = true;
            endMultiplayerRace(true, currentWpm, currentAcc);
        }
    });

    initReplayControls();
}

function setupWaitingRoom() {
    const room = document.getElementById("mp-waiting-room");
    if (!room) return;

    room.style.display = "flex";
    document.getElementById("p1-name-display").innerText = mpUsername;
    document.getElementById("p2-name-display").innerText = opponentUsername;
    if (lobbyStatusText) lobbyStatusText.innerText = `STATUS: Pilot ${mpUsername} connected. Click I'M READY to begin!`;
}

function launchMatchVS() {
    showMpStage("mp-stage-vs");
    document.getElementById("vs-p1-name").innerText = mpUsername;
    document.getElementById("vs-p2-name").innerText = opponentUsername;
    document.getElementById("vs-time-display").innerText = `Race Time: ${mpRaceDuration} Seconds`;

    setTimeout(() => {
        startCompetitiveCountdown();
    }, 1800);
}

function startCompetitiveCountdown() {
    let count = 3;
    const overlay = document.getElementById("countdown-overlay");
    const numEl = document.getElementById("countdown-num");

    overlay?.classList.add("active");
    if (numEl) numEl.innerText = count;

    const timer = setInterval(() => {
        count--;
        if (numEl) numEl.innerText = count > 0 ? count : "GO!";
        playSound("click");

        if (count <= 0) {
            clearInterval(timer);
            setTimeout(() => overlay?.classList.remove("active"), 500);

            showMpStage("mp-stage-race");
            gameState = "racing";
            testActive = true;
            raceFinished = false;
            p2Progress = 0;
            p2Wpm = 0;

            loadMpRaceWords();
            startMpTimer();

            if (isBotMatch) {
                startBotOpponent();
            }
        }
    }, 1000);
}

function startMpTimer() {
    clearInterval(mpTimerInterval);
    mpTimeLeft = mpRaceDuration;
    document.getElementById("mp-live-timer").innerText = `${mpTimeLeft}s`;

    mpTimerInterval = setInterval(() => {
        mpTimeLeft--;
        document.getElementById("mp-live-timer").innerText = `${mpTimeLeft}s`;

        if (mpTimeLeft <= 0) {
            clearInterval(mpTimerInterval);
            const elapsed = mpRaceDuration / 60;
            const wpm = Math.round(mpCorrect / 5 / elapsed);
            const acc = mpTotalTyped > 0 ? Math.round((mpCorrect / mpTotalTyped) * 100) : 100;
            endMultiplayerRace(mpCorrect > p2Progress, wpm, acc);
        }
    }, 1000);
}

function startBotOpponent() {
    clearInterval(botInterval);
    const maxBotWpm = 35;

    botInterval = setInterval(() => {
        if (gameState !== "racing") {
            clearInterval(botInterval);
            return;
        }
        
        const totalChars = document.querySelectorAll("#mp-words-wrapper .char").length || 200;
        const incPercent = (1.45 / totalChars) * 100;

        p2Progress += incPercent + (Math.random() * 0.1 - 0.05);
        p2Wpm = Math.min(maxBotWpm, Math.round(28 + Math.random() * 7));

        updateOpponentRunner(p2Progress, p2Wpm);
        updateLiveRankBadge((mpCorrect / totalChars || 0) * 100);

        if (p2Progress >= 100 && !raceFinished) {
            raceFinished = true;
            clearInterval(botInterval);
            const elapsed = (mpRaceDuration - mpTimeLeft) / 60 || 0.5;
            const wpm = Math.round(mpCorrect / 5 / elapsed);
            const acc = mpTotalTyped > 0 ? Math.round((mpCorrect / mpTotalTyped) * 100) : 100;
            endMultiplayerRace(false, wpm, acc);
        }
    }, 500);
}

function updateLiveRankBadge(p1Prog) {
    const badge = document.getElementById("mp-live-rank-badge");
    if (!badge) return;
    if (p1Prog >= p2Progress) {
        badge.innerText = "🥇 1ST PLACE";
        badge.style.color = "#FFD700";
    } else {
        badge.innerText = "🥈 2ND PLACE";
        badge.style.color = "#C0C0C0";
    }
}

function endMultiplayerRace(isWin, wpm, acc) {
    gameState = "finished";
    clearInterval(mpTimerInterval);
    clearInterval(botInterval);

    const mpInput = document.getElementById("mp-typing-input");
    if (mpInput) mpInput.disabled = true;

    saveRaceHistory({
        id: Date.now(),
        wpm: wpm,
        accuracy: acc,
        time: mpRaceDuration,
        mode: `Multiplayer ${mpRaceDuration}s`,
        date: new Date().toLocaleDateString(),
        correct: mpCorrect,
        incorrect: mpIncorrect,
        isWin: isWin
    });

    showMpStage("mp-stage-results");

    document.getElementById("res-time-val").innerText = `${mpRaceDuration}s`;
    document.getElementById("res-chars-val").innerText = mpTotalTyped;
    document.getElementById("res-errors-val").innerText = mpIncorrect;
    document.getElementById("res-status-val").innerText = isWin ? "VICTORY" : "DEFEAT";

    if (isWin) {
        document.getElementById("podium-w-name").innerText = mpUsername;
        document.getElementById("podium-w-wpm").innerText = `${wpm} WPM`;
        document.getElementById("podium-w-acc").innerText = `Accuracy: ${acc}%`;

        document.getElementById("podium-l-name").innerText = opponentUsername;
        document.getElementById("podium-l-wpm").innerText = `${p2Wpm} WPM`;
        document.getElementById("podium-l-acc").innerText = `Accuracy: 95%`;

        playSound("victory");
    } else {
        document.getElementById("podium-w-name").innerText = opponentUsername;
        document.getElementById("podium-w-wpm").innerText = `${p2Wpm || 35} WPM`;
        document.getElementById("podium-w-acc").innerText = `Accuracy: 98%`;

        document.getElementById("podium-l-name").innerText = mpUsername;
        document.getElementById("podium-l-wpm").innerText = `${wpm} WPM`;
        document.getElementById("podium-l-acc").innerText = `Accuracy: ${acc}%`;
    }

    playCartoonWinnerAnimation(isWin);
}

function playCartoonWinnerAnimation(userWon) {
    const winnerChar = document.getElementById("cartoon-winner");
    const loserChar = document.getElementById("cartoon-loser");
    const prop = document.getElementById("cartoon-prop");
    const stage = document.getElementById("cartoon-stage");

    if (!winnerChar || !loserChar || !stage) return;

    winnerChar.style.animation = "";
    loserChar.style.animation = "";
    prop.style.animation = "";
    prop.style.opacity = "0";

    winnerChar.innerText = userWon ? "🏆" : "🤖";
    loserChar.innerText = userWon ? "🤖" : "💀";

    const options = ["slap", "kick", "slip", "laugh"];
    const chosen = options[Math.floor(Math.random() * options.length)];

    if (chosen === "slap") {
        winnerChar.style.animation = "animSlapWinner 1.5s ease forwards";
        loserChar.style.animation = "animSlapLoser 1.5s ease forwards";
        setTimeout(() => playSound("slap"), 600);
    } else if (chosen === "kick") {
        loserChar.style.animation = "animKickLoser 1.5s ease forwards";
        setTimeout(() => playSound("boing"), 400);
    } else if (chosen === "slip") {
        if (prop) {
            prop.innerText = "🍌";
            prop.style.opacity = "1";
            prop.style.right = "32%";
            prop.style.top = "60%";
        }
        loserChar.style.animation = "animSlipLoser 1.8s ease forwards";
        setTimeout(() => playSound("slap"), 700);
    } else {
        winnerChar.innerText = userWon ? "🤣" : "🤖";
        loserChar.style.animation = "animKickLoser 1.5s ease forwards";
    }
}

document.getElementById("skip-cartoon-btn")?.addEventListener("click", () => {
    const winnerChar = document.getElementById("cartoon-winner");
    const loserChar = document.getElementById("cartoon-loser");
    if (winnerChar) winnerChar.style.animation = "none";
    if (loserChar) loserChar.style.animation = "none";
});

function initReplayControls() {
    document.getElementById("mp-play-again-btn")?.addEventListener("click", () => {
        setupWaitingRoom();
        showMpStage("mp-stage-lobby");
    });

    document.getElementById("mp-new-opponent-btn")?.addEventListener("click", () => {
        isBotMatch = false;
        opponentUsername = "Opponent";
        document.getElementById("mp-waiting-room").style.display = "none";
        showMpStage("mp-stage-lobby");
    });

    document.getElementById("mp-change-time-btn")?.addEventListener("click", () => {
        showMpStage("mp-stage-lobby");
    });

    document.getElementById("mp-return-home-btn")?.addEventListener("click", () => {
        navigateToPlay();
    });
}

function loadMpRaceWords() {
    const wrapper = document.getElementById("mp-words-wrapper");
    const input = document.getElementById("mp-typing-input");
    if (!wrapper) return;

    wrapper.innerHTML = "";
    mpWordIdx = 0;
    mpCharIdx = 0;
    mpCorrect = 0;
    mpIncorrect = 0;
    mpTotalTyped = 0;
    mpStartTime = null;

    const sessionWords = [...baseWords].sort(() => Math.random() - 0.5).slice(0, 60);

    sessionWords.forEach((wordText, index) => {
        const wordDiv = document.createElement("div");
        wordDiv.className = "word" + (index === 0 ? " active-word" : "");
        wordText.split("").forEach(char => {
            const span = document.createElement("span");
            span.className = "char";
            span.innerText = char;
            wordDiv.appendChild(span);
        });
        wrapper.appendChild(wordDiv);
    });

    wrapper.style.transform = "translateY(0)";
    requestAnimationFrame(() => updateMpCaret());

    if (input) {
        input.value = "";
        input.disabled = false;
        input.focus();
    }
}

function updateMpCaret() {
    const clip = document.getElementById("mp-words-clip");
    const caretEl = document.getElementById("mp-caret");
    const wordElements = document.querySelectorAll("#mp-words-wrapper .word");
    const activeWord = wordElements[mpWordIdx];
    if (!activeWord || !caretEl || !clip) return;

    const clipRect = clip.getBoundingClientRect();
    const charElements = activeWord.querySelectorAll(".char");
    const activeChar = charElements[mpCharIdx];

    if (activeChar) {
        const charRect = activeChar.getBoundingClientRect();
        caretEl.style.top = `${charRect.top - clipRect.top}px`;
        caretEl.style.left = `${charRect.left - clipRect.left}px`;
        caretEl.style.height = `${charRect.height}px`;
    } else {
        const lastChar = activeWord.lastElementChild;
        if (lastChar) {
            const lastRect = lastChar.getBoundingClientRect();
            caretEl.style.top = `${lastRect.top - clipRect.top}px`;
            caretEl.style.left = `${lastRect.right - clipRect.left}px`;
            caretEl.style.height = `${lastRect.height}px`;
        }
    }
}

function scrollMpWordsIfNeeded() {
    const activeWord = document.querySelectorAll("#mp-words-wrapper .word")[mpWordIdx];
    const clip = document.getElementById("mp-words-clip");
    const wrapper = document.getElementById("mp-words-wrapper");
    if (!activeWord || !clip || !wrapper) return;

    const clipHeight = clip.offsetHeight;
    const activeTop = activeWord.offsetTop;

    if (activeTop >= clipHeight) {
        wrapper.style.transform = `translateY(-${activeTop - clipHeight / 3}px)`;
    }
}

// MULTIPLAYER SOCKET EVENT LISTENERS
socket.on("room-created", (roomId) => {
    currentRoomId = roomId;
    if (roomInput) roomInput.value = roomId;
    setupWaitingRoom();
    showToast(`Room Created: ${roomId}`);
});

socket.on("update-ghosts", (players) => {
    players.forEach(player => {
        if (player.id !== socket.id) {
            p2Progress = player.progress;
            updateOpponentRunner(player.progress);
        }
    });
});

socket.on("countdown", (num) => {
    const overlay = document.getElementById("countdown-overlay");
    const numEl = document.getElementById("countdown-num");
    if (overlay && numEl) {
        overlay.classList.add("active");
        numEl.innerText = num;
    }
});

socket.on("race-begin", () => {
    launchMatchVS();
});

socket.on("race-ended", (winnerId) => {
    const isWinner = winnerId === socket.id;
    const elapsed = (mpRaceDuration - mpTimeLeft) / 60 || 0.5;
    const wpm = Math.round(mpCorrect / 5 / elapsed);
    const acc = mpTotalTyped > 0 ? Math.round((mpCorrect / mpTotalTyped) * 100) : 100;
    endMultiplayerRace(isWinner, wpm, acc);
});

// RENDER DYNAMIC REAL STATISTICS PAGE
function renderStatisticsPage() {
    const container = document.getElementById("stats-content-area");
    if (!container) return;

    const history = getRaceHistory();

    if (history.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-state-icon">
                    <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" fill="none" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                </div>
                <div class="empty-state-title">No Statistics Recorded Yet</div>
                <div class="empty-state-sub">Complete your first solo typing test or multiplayer race to calculate your WPM matrix analytics.</div>
                <button class="cyber-btn" id="start-race-cta-btn" style="margin-top: 10px;">
                    <span>START FIRST RACE</span>
                </button>
            </div>
        `;
        document.getElementById("start-race-cta-btn")?.addEventListener("click", () => navigateToPlay());
        return;
    }

    const totalRaces = history.length;
    const bestWpm = Math.max(...history.map(h => h.wpm));
    const avgWpm = Math.round(history.reduce((acc, h) => acc + h.wpm, 0) / totalRaces);
    const avgAcc = Math.round(history.reduce((acc, h) => acc + h.accuracy, 0) / totalRaces);

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stats-card">
                <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">HIGHEST WPM</span>
                <span style="font-size: 2rem; font-weight: 800; color: var(--accent-primary);">${bestWpm} WPM</span>
            </div>
            <div class="stats-card">
                <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">AVERAGE WPM</span>
                <span style="font-size: 2rem; font-weight: 800; color: var(--text-primary);">${avgWpm} WPM</span>
            </div>
            <div class="stats-card">
                <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">AVERAGE ACCURACY</span>
                <span style="font-size: 2rem; font-weight: 800; color: var(--text-primary);">${avgAcc}%</span>
            </div>
            <div class="stats-card">
                <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">TOTAL RACES COMPLETED</span>
                <span style="font-size: 2rem; font-weight: 800; color: var(--accent-primary);">${totalRaces}</span>
            </div>
        </div>

        <div class="heatmap-card" id="leetcode-heatmap-card"></div>
    `;
    initHeatmap();
}

// EXACT LEETCODE-STYLE MONTH BLOCKS + STATS HEADER HEATMAP
function initHeatmap() {
    const card = document.getElementById("leetcode-heatmap-card");
    if (!card) return;

    const history = getRaceHistory();
    const today = new Date();

    const dailyTimeMap = {};
    const activeDates = new Set();

    history.forEach(entry => {
        const d = new Date(entry.id);
        const dateKey = d.toDateString();
        dailyTimeMap[dateKey] = (dailyTimeMap[dateKey] || 0) + (entry.time || 15);
        activeDates.add(dateKey);
    });

    const totalSubmissions = history.length;
    const activeDays = activeDates.size;

    let maxStreak = 0;
    let currentStreak = 0;
    for (let i = 363; i >= 0; i--) {
        const checkDate = new Date();
        checkDate.setDate(today.getDate() - i);
        if (activeDates.has(checkDate.toDateString())) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
    }

    let monthsHTML = "";

    for (let m = 11; m >= 0; m--) {
        const targetMonthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
        const monthLabel = targetMonthDate.toLocaleString('default', { month: 'short' });
        const year = targetMonthDate.getFullYear();
        const monthIndex = targetMonthDate.getMonth();

        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

        let cellsHTML = "";
        for (let day = 1; day <= daysInMonth; day++) {
            const cellDate = new Date(year, monthIndex, day);
            if (cellDate > today) break;

            const dateKey = cellDate.toDateString();
            const totalSeconds = dailyTimeMap[dateKey] || 0;
            const totalMinutes = (totalSeconds / 60).toFixed(1);

            let level = "0";
            if (totalSeconds >= 600) level = "4";
            else if (totalSeconds >= 360) level = "3";
            else if (totalSeconds >= 180) level = "2";
            else if (totalSeconds > 0) level = "1";

            cellsHTML += `<div class="heatmap-cell" data-level="${level}" title="${dateKey}: ${totalMinutes} min(s) practiced"></div>`;
        }

        monthsHTML += `
            <div class="heatmap-month-block">
                <div class="heatmap-month-grid">
                    ${cellsHTML}
                </div>
                <div class="heatmap-month-label">${monthLabel}</div>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="heatmap-header-info">
            <div class="heatmap-total-count">
                ${totalSubmissions} <span>submissions in the past one year ⓘ</span>
            </div>
            <div class="heatmap-stats-summary">
                <span>Total active days: <strong>${activeDays}</strong></span>
                <span>Max streak: <strong style="color: var(--accent-primary);">${maxStreak}</strong></span>
            </div>
        </div>

        <div class="heatmap-months-container">
            ${monthsHTML}
        </div>
    `;
}

// RENDER DYNAMIC REAL LEADERBOARD PAGE
function renderLeaderboardPage() {
    const container = document.getElementById("leaderboard-content-area");
    if (!container) return;

    const history = getRaceHistory();

    if (history.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-state-icon">
                    <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" fill="none" stroke-width="2"><path d="M6 9H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1zM14 4h-3a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zM22 13h-3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1z"></path></svg>
                </div>
                <div class="empty-state-title">No Race Scores Submitted Yet</div>
                <div class="empty-state-sub">Complete typing sessions to submit your local pilot scores to the velocity matrix leaderboard.</div>
                <button class="cyber-btn" id="leaderboard-race-cta" style="margin-top: 10px;">
                    <span>START RACE</span>
                </button>
            </div>
        `;
        document.getElementById("leaderboard-race-cta")?.addEventListener("click", () => navigateToPlay());
        return;
    }

    const rows = history.map((entry, idx) => `
        <div class="leaderboard-row">
            <span class="rank-col">#${idx + 1}</span>
            <div class="player-col"><span>Pilot_${escapeHTML(entry.id.toString().slice(-4))}</span></div>
            <span style="font-weight: 800; color: var(--accent-primary);">${entry.wpm} WPM</span>
            <span>${entry.accuracy}%</span>
            <span class="hide-mobile">${escapeHTML(entry.mode)}</span>
            <span class="hide-mobile">${escapeHTML(entry.date)}</span>
        </div>
    `).join("");

    container.innerHTML = `
        <div class="leaderboard-list">
            <div class="leaderboard-row" style="font-weight: 700; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">
                <span>RANK</span>
                <span>PILOT</span>
                <span>SPEED</span>
                <span>ACCURACY</span>
                <span class="hide-mobile">MODE</span>
                <span class="hide-mobile">DATE</span>
            </div>
            ${rows}
        </div>
    `;
}

// RENDER DYNAMIC REAL PROFILE PAGE
function renderProfilePage() {
    const container = document.getElementById("profile-content-area");
    if (!container) return;

    const history = getRaceHistory();
    const totalRaces = history.length;
    const bestWpm = totalRaces > 0 ? Math.max(...history.map(h => h.wpm)) : 0;
    const xp = totalRaces * 350;

    container.innerHTML = `
        <div class="profile-header-card">
            <div class="profile-avatar-large">VK</div>
            <div class="profile-info">
                <div style="font-size: 1.6rem; font-weight: 800;">CyberPilot_99</div>
                <div style="font-size: 0.85rem; color: var(--accent-primary); font-weight: 700;">RANK: ${bestWpm > 100 ? 'APEX RACER' : 'CYBER PILOT'}</div>
                <div class="xp-bar-container">
                    <div class="xp-bar-fill" style="width: ${Math.min(100, (xp / 10000) * 100)}%;"></div>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Level ${Math.floor(totalRaces / 2) + 1} • ${xp} XP Accumulated</div>
            </div>
        </div>

        <div style="font-size: 1.1rem; font-weight: 700; margin-top: 12px;">ACHIEVEMENT BADGES</div>
        <div class="badges-grid">
            <div class="badge-card ${bestWpm >= 80 ? 'unlocked' : ''}">
                <div class="badge-icon">⚡</div>
                <div>
                    <div style="font-weight: 700; font-size: 0.85rem;">SPEED DEMON</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Surpass 80 WPM</div>
                </div>
            </div>
            <div class="badge-card ${history.some(h => h.accuracy === 100) ? 'unlocked' : ''}">
                <div class="badge-icon">🎯</div>
                <div>
                    <div style="font-weight: 700; font-size: 0.85rem;">LASER PRECISION</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">100% Accuracy Test</div>
                </div>
            </div>
            <div class="badge-card ${totalRaces >= 5 ? 'unlocked' : ''}">
                <div class="badge-icon">🏎️</div>
                <div>
                    <div style="font-weight: 700; font-size: 0.85rem;">CYBER RACER</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Complete 5 Matrix Races</div>
                </div>
            </div>
            <div class="badge-card ${bestWpm >= 120 ? 'unlocked' : ''}">
                <div class="badge-icon" style="color: var(--text-muted);">🔒</div>
                <div>
                    <div style="font-weight: 700; font-size: 0.85rem;">LIGHTSPEED</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Reach 120 WPM</div>
                </div>
            </div>
        </div>
    `;
}

// CONTROL EVENT LISTENERS
resetTestBtn?.addEventListener("click", () => initTest());
document.getElementById("result-restart-btn")?.addEventListener("click", () => initTest());

punctuationToggle?.addEventListener("click", () => {
    includePunctuation = !includePunctuation;
    punctuationToggle.classList.toggle("active", includePunctuation);
    initTest();
});

numbersToggle?.addEventListener("click", () => {
    includeNumbers = !includeNumbers;
    numbersToggle.classList.toggle("active", includeNumbers);
    initTest();
});

timeOptions.forEach(option => {
    option.addEventListener("click", () => {
        timeOptions.forEach(btn => btn.classList.remove("active"));
        option.classList.add("active");
        testDuration = parseInt(option.dataset.time);
        initTest();
    });
});

// SVG RESULT CHART RENDERER
function renderResultChart() {
    const svg = document.getElementById("result-chart-svg");
    if (!svg || wpmHistory.length === 0) return;

    const maxWpm = Math.max(...wpmHistory, 100);
    const width = 500;
    const height = 150;
    const points = wpmHistory.map((val, idx) => {
        const x = (idx / (wpmHistory.length - 1 || 1)) * width;
        const y = height - (val / maxWpm) * (height - 20) - 10;
        return `${x},${y}`;
    }).join(" ");

    svg.innerHTML = `
        <polyline fill="none" stroke="var(--accent-primary)" stroke-width="3" points="${points}" />
    `;
}

// TOAST NOTIFICATIONS
function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span style="color: var(--accent-primary);">//</span> ${escapeHTML(message)}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// CONFETTI PARTICLE ANIMATION
function triggerConfetti() {
    const canvas = document.getElementById("confetti-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 80 }, () => ({
        x: Math.random() * canvas.width,
        y: -10,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 4 + 2,
        color: ["#00FF66", "#00E5FF", "#FFFFFF", "#FFD700"][Math.floor(Math.random() * 4)],
        size: Math.random() * 6 + 4
    }));

    let animationFrame;
    let frames = 0;

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });

        frames++;
        if (frames < 180) {
            animationFrame = requestAnimationFrame(render);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    render();
}

// CANVAS PARTICLE BACKGROUND
function initCanvasAnimation() {
    const canvas = document.getElementById("cyber-bg-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener("resize", () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = Array.from({ length: 45 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.radius * 1.5 + 0.5 || 1.5
    }));

    function animate() {
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = "rgba(0, 255, 102, 0.15)";
        ctx.strokeStyle = "rgba(0, 255, 102, 0.04)";

        particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();

            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        });

        requestAnimationFrame(animate);
    }

    animate();
}
