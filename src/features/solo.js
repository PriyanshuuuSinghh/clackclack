import { baseWords, numberWords, punctuationWords } from "../core/words.js";
import { getPersonalBest, savePersonalBest, saveRaceHistory } from "../core/storage.js";
import { playSound } from "../core/audio.js";
import { appState } from "../core/appState.js";
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
let wpmHistory = [];

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
    if (appState.isMultiplayer) return;

    if (!testActive && e.key.length === 1) {
        testActive = true;
        appState.gameState = "racing";
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


export function focusSoloInput() {
    typingInput?.focus();
}

export { initTest, updateCaret };
