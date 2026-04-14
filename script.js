// --- Configuration & State ---
const wordList = "thing new under high another real could here be leave public early still all know look other which when last should from become that long early world system access kernel root shell proxy packet protocol binary bit byte".split(" ");

const typingInput = document.getElementById('typing-input');
const wordsWrapper = document.getElementById('words-wrapper');
const resetButton = document.getElementById('reset-test');
const caret = document.getElementById('caret');

const timerDisplay = document.getElementById('timer-display');
const timeOptions = document.querySelectorAll('.time-option');

let currentWordIndex = 0;
let currentCharIndex = 0;
let testActive = false;

let testDuration = 15;
let timeLeft = 15;
let timerInterval = null;

let correctChars = 0;
let incorrectChars = 0;
let totalTyped = 0;

// --- Initialization ---
function initTest() {

    clearInterval(timerInterval);
    typingInput.disabled = false;

    wordsWrapper.innerHTML = "";
    currentWordIndex = 0;
    currentCharIndex = 0;
    testActive = false;

    // Reset stats
    correctChars = 0;
    incorrectChars = 0;
    totalTyped = 0;

    timeLeft = testDuration;
    timerDisplay.innerText = timeLeft;

    updateLiveStats();

    const sessionWords = [...wordList]
        .sort(() => Math.random() - 0.5)
        .slice(0, 25);

    sessionWords.forEach((wordText, index) => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word' + (index === 0 ? ' active-word' : '');

        wordText.split('').forEach(char => {
            const span = document.createElement('span');
            span.className = 'char';
            span.innerText = char;
            wordDiv.appendChild(span);
        });

        wordsWrapper.appendChild(wordDiv);
    });

    updateCaret();
    typingInput.value = '';
    typingInput.focus();
}

// --- Caret ---
function updateCaret() {
    const wordElements = document.querySelectorAll('.word');
    const activeWord = wordElements[currentWordIndex];
    if (!activeWord) return;

    const charElements = activeWord.querySelectorAll('.char');
    const activeChar = charElements[currentCharIndex];

    if (activeChar) {
        caret.style.top = activeChar.offsetTop + 'px';
        caret.style.left = activeChar.offsetLeft + 'px';
    } else {
        const lastChar = activeWord.lastElementChild;
        caret.style.top = lastChar.offsetTop + 'px';
        caret.style.left = (lastChar.offsetLeft + lastChar.offsetWidth) + 'px';
    }
}

// --- Timer ---
function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = timeLeft;

        updateLiveStats();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            endTest();
        }
    }, 1000);
}

function endTest() {

    typingInput.disabled = true;

    const minutes = testDuration / 60;
    const finalWPM = Math.round((correctChars / 5) / minutes);

    const finalAccuracy = totalTyped > 0
        ? Math.round((correctChars / totalTyped) * 100)
        : 100;

    document.getElementById("final-wpm").innerText = finalWPM;
    document.getElementById("final-accuracy").innerText = finalAccuracy + "%";
    document.getElementById("final-correct").innerText = correctChars;
    document.getElementById("final-incorrect").innerText = incorrectChars;

    document.getElementById("result-overlay").classList.remove("hidden");
}

// --- Live Stats ---
function updateLiveStats() {

    const minutesPassed = (testDuration - timeLeft) / 60;

    let wpm = 0;
    if (minutesPassed > 0) {
        wpm = Math.round((correctChars / 5) / minutesPassed);
    }

    const accuracy = totalTyped > 0
        ? Math.round((correctChars / totalTyped) * 100)
        : 100;

    const wpmEl = document.getElementById("live-wpm");
    const accEl = document.getElementById("live-accuracy");

    if (wpmEl) wpmEl.innerText = wpm;
    if (accEl) accEl.innerText = accuracy + "%";
}

// --- Typing Logic ---
typingInput.addEventListener('keydown', (e) => {

    if (!testActive) {
        testActive = true;
        startTimer();
    }

    const wordElements = document.querySelectorAll('.word');
    const currentWordEl = wordElements[currentWordIndex];
    if (!currentWordEl) return;

    const charElements = currentWordEl.querySelectorAll('.char');

    if (e.key === 'Backspace') {
        if (currentCharIndex > 0) {
            currentCharIndex--;
            const charToUndo = charElements[currentCharIndex];
            charToUndo.classList.remove('correct', 'incorrect');
        }
    }

    else if (e.key === ' ') {
        e.preventDefault();
        if (currentCharIndex > 0) {
            currentWordEl.classList.remove('active-word');
            currentWordIndex++;
            currentCharIndex = 0;

            if (wordElements[currentWordIndex]) {
                wordElements[currentWordIndex].classList.add('active-word');
            }
        }
    }

    else if (e.key.length === 1) {

        if (currentCharIndex < charElements.length) {

            const isCorrect = e.key === charElements[currentCharIndex].innerText;

            charElements[currentCharIndex].classList.add(
                isCorrect ? 'correct' : 'incorrect'
            );

            if (isCorrect) correctChars++;
            else incorrectChars++;

            totalTyped++;
            currentCharIndex++;

            updateLiveStats();
        }
    }

    updateCaret();
});

// --- Reset Button ---
resetButton.addEventListener('click', () => {
    document.body.classList.add('glitch-flash');
    initTest();
    setTimeout(() => {
        document.body.classList.remove('glitch-flash');
    }, 200);
});

// --- Time Buttons ---
timeOptions.forEach(option => {
    option.addEventListener('click', () => {

        timeOptions.forEach(btn => btn.classList.remove('active'));
        option.classList.add('active');

        option.style.transform = "scale(1.25)";
        setTimeout(() => option.style.transform = "scale(1)", 120);

        testDuration = parseInt(option.dataset.time);
        initTest();
    });
});
document.getElementById("restart-btn").addEventListener("click", () => {
    document.getElementById("result-overlay").classList.add("hidden");
    initTest();
});


// Initialize
initTest();