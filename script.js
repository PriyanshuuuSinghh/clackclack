/* ======================================================
   ZONE 1: DOM ELEMENTS (Declared FIRST)
   ====================================================== */
//    import { updateMyRunner, updateOpponentRunner } from './raceUI.js';
import {
    updateMyRunner,
    updateOpponentRunner,
    showWinner,
    hideWinner
} from './raceUI.js';
const typingInput = document.getElementById('typing-input');
const wordsWrapper = document.getElementById('words-wrapper');
const resetButton = document.getElementById('reset-test');
const caret = document.getElementById('caret');
const timerDisplay = document.getElementById('timer-display');
const timeOptions = document.querySelectorAll('.time-option');
const punctuationToggle = document.getElementById('punctuation-toggle');
const numbersToggle = document.getElementById('numbers-toggle');
const soundToggle = document.getElementById('sound-toggle');

const roomInput = document.getElementById('room-input');

if (roomInput) {
    roomInput.addEventListener('focus', () => {
        typingInput.blur();
    });
}

/* ======================================================
   ZONE 2: WORD LISTS
   ====================================================== */
const baseWords = [
  "the","be","to","of","and","a","in","that","have","it",
  "for","not","on","with","he","as","you","do","at","this",
  "but","his","by","from","they","we","say","her","she","or",
  "an","will","my","one","all","would","there","their","what",
  "so","up","out","if","about","who","get","which","go","me",
  "when","make","can","like","time","no","just","him","know",
  "take","people","into","year","your","good","some","could",
  "them","see","other","than","then","now","look","only","come",
  "its","over","think","also","back","after","use","two","how",
  "our","work","first","well","way","even","new","want","because",
  "any","these","give","day","most","us","great","between","need",
  "large","often","hand","high","place","hold","turn","were","does",
  "set","put","end","why","again","off","talk","stand","own","such",
  "move","live","never","before","find","real","while","each","tell",
  "last","keep","children","side","begin","got","walk","example","ease",
  "paper","group","always","music","those","both","mark","book","letter",
  "until","mile","river","car","feet","care","second","enough","plain",
  "girl","usual","young","ready","above","ever","red","list","though",
  "feel","talk","bird","soon","body","dog","family","direct","pose",
  "leave","song","measure","door","product","black","short","numeral",
  "class","wind","question","happen","complete","ship","area","half",
  "rock","order","fire","south","problem","piece","told","knew","pass",
  "since","top","whole","king","space","heard","best","hour","better",
  "true","during","hundred","five","remember","step","early","hold",
  "west","ground","interest","reach","fast","verb","sing","listen",
  "draw","cold","voice","power","town","fine","drive","plan","table",
  "north","create","open","seem","together","next","white","light",
  "house","picture","animal","father","mother","world","still","learn",
  "plant","cover","food","sun","four","thought","let","eye","run"
];

const punctuationWords = ["hello,","world.","yes,","no.","wait!","really?","okay,","sure."];
const numberWords = ["123","456","789","2023","100","50","25"];

/* ======================================================
   ZONE 3: SOCKET & MULTIPLAYER STATE
   ====================================================== */
let raceFinished = false;
const socket = io();
let currentRoomId = null;
let isMultiplayer = false;

/* ======================================================
   ZONE 4: GAME STATE
   ====================================================== */
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
let gameState="waiting";



/* ======================================================
   ZONE 5: SOUND EFFECTS
   ====================================================== */
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (!soundEnabled) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'correct') {
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === 'error') {
        oscillator.frequency.value = 200;
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
    }
}

/* ======================================================
   ZONE 6: PERSONAL BEST
   ====================================================== */
function getPersonalBest(duration) {
    const pb = localStorage.getItem(`pb_${duration}`);
    return pb ? parseInt(pb) : null;
}

function savePersonalBest(duration, wpm) {
    const currentPB = getPersonalBest(duration);
    if (!currentPB || wpm > currentPB) {
        localStorage.setItem(`pb_${duration}`, wpm);
        return true;
    }
    return false;
}

function updatePBDisplay() {
    const pb = getPersonalBest(testDuration);
    const pbEl = document.getElementById('personal-best');
    if (pbEl) pbEl.innerText = pb ? pb : '–';
}

/* ======================================================
   ZONE 7: TEST INITIALIZATION
   ====================================================== */
function initTest() {
    clearInterval(timerInterval);
    typingInput.disabled = false;
    wordsWrapper.innerHTML = "";
    
    currentWordIndex = 0;
    currentCharIndex = 0;
    testActive = false;
    correctChars = 0;
    incorrectChars = 0;
    totalTyped = 0;
    timeLeft = testDuration;
    
    timerDisplay.innerText = timeLeft;
    timerDisplay.classList.remove('urgent');

    let wordPool = [...baseWords];
    if (includePunctuation) wordPool = wordPool.concat(punctuationWords);
    if (includeNumbers) wordPool = wordPool.concat(numberWords);

    const sessionWords = wordPool.sort(() => Math.random() - 0.5).slice(0, 60);

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

    wordsWrapper.style.transform = 'translateY(0)';
    updateCaret();
    typingInput.value = '';
    typingInput.focus();
    updatePBDisplay();
    updateLiveStats();
}

/* ======================================================
   ZONE 8: CARET & SCROLL
   ====================================================== */
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
        if (lastChar) {
            caret.style.top = lastChar.offsetTop + 'px';
            caret.style.left = (lastChar.offsetLeft + lastChar.offsetWidth) + 'px';
        }
    }
}

function scrollWordsIfNeeded() {
    const activeWord = document.querySelectorAll('.word')[currentWordIndex];
    if (!activeWord) return;
    
    const clipHeight = document.getElementById('words-clip').offsetHeight;
    const activeTop = activeWord.offsetTop;
    
    if (activeTop >= clipHeight) {
        wordsWrapper.style.transform = `translateY(-${activeTop - (clipHeight / 2)}px)`;
    }
}

/* ======================================================
   ZONE 9: TIMER & END TEST
   ====================================================== */
function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = timeLeft;
        
        if (timeLeft <= 10 && timeLeft > 0) {
            timerDisplay.classList.add('urgent');
        }
        
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
    const rawWPM = Math.round(((correctChars + incorrectChars) / 5) / minutes);
    const finalAccuracy = totalTyped > 0 ? Math.round((correctChars / totalTyped) * 100) : 100;

    const isNewPB = savePersonalBest(testDuration, finalWPM);
    
    document.getElementById('final-wpm').innerText = finalWPM;
    document.getElementById('final-accuracy').innerText = finalAccuracy + '%';
    document.getElementById('final-correct').innerText = correctChars;
    document.getElementById('final-incorrect').innerText = incorrectChars;
    document.getElementById('final-time').innerText = testDuration + 's';
    document.getElementById('final-raw').innerText = rawWPM;
    document.getElementById('result-mode-label').innerText = testDuration;

    if (isNewPB) {
        document.getElementById('new-pb-badge').classList.remove('hidden');
    } else {
        document.getElementById('new-pb-badge').classList.add('hidden');
    }

    document.querySelector('.typing-test-container').style.display = 'none';
    document.querySelector('.live-stats-bar').style.display = 'none';
    document.querySelector('.footer').style.display = 'none';
    document.getElementById('result-screen').classList.remove('hidden');
}

function updateLiveStats() {
    const minutesPassed = (testDuration - timeLeft) / 60;
    let wpm = minutesPassed > 0 ? Math.round((correctChars / 5) / minutesPassed) : 0;
    const accuracy = totalTyped > 0 ? Math.round((correctChars / totalTyped) * 100) : 100;
    
    const wpmEl = document.getElementById("live-wpm");
    const accEl = document.getElementById("live-accuracy");
    
    if (wpmEl) wpmEl.innerText = minutesPassed > 0 ? wpm : '–';
    if (accEl) accEl.innerText = minutesPassed > 0 ? accuracy + '%' : '–';
}

/* ======================================================
   ZONE 10: CORE TYPING LOGIC (Single listener)
   ====================================================== */

   function beginRace() {

    testActive = true;

    gameState = "racing";

    startTimer();

    typingInput.disabled = false;

    typingInput.focus();
}

typingInput.addEventListener('keydown', (e) => {

    /* BLOCK MULTIPLAYER INPUT UNTIL RACE STARTS */
    if (isMultiplayer && gameState !== "racing") {
        return;
    }

    /* PREVENT TYPING WHEN ROOM INPUT ACTIVE */
    if (document.activeElement.id === 'room-input') {
        return;
    }

    /* SOLO MODE START */
    if (
        !isMultiplayer &&
        !testActive &&
        e.key.length === 1
    ) {

        testActive = true;

        gameState = "racing";

        startTimer();
    }

    const wordElements = document.querySelectorAll('.word');

    const currentWordEl = wordElements[currentWordIndex];

    if (!currentWordEl) return;
    const charElements = currentWordEl.querySelectorAll('.char');

    if (e.key === 'Backspace') {
        if (currentCharIndex > 0) {
            currentCharIndex--;
            charElements[currentCharIndex].classList.remove('correct', 'incorrect');
        } else if (currentWordIndex > 0) {
            currentWordEl.classList.remove('active-word');
            currentWordIndex--;
            const prevWord = wordElements[currentWordIndex];
            prevWord.classList.add('active-word');
            currentCharIndex = prevWord.querySelectorAll('.char').length;
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
            
            scrollWordsIfNeeded();
        }
    } 
    else if (e.key.length === 1) {
        if (currentCharIndex < charElements.length) {
            const isCorrect = e.key === charElements[currentCharIndex].innerText;
            
            charElements[currentCharIndex].classList.add(isCorrect ? 'correct' : 'incorrect');
            
            if (isCorrect) {
                correctChars++;
                playSound('correct');
            } else {
                incorrectChars++;
                playSound('error');
            }
            
            totalTyped++;
            currentCharIndex++;
            updateLiveStats();
        }
    }

    updateCaret();

    if (isMultiplayer && currentRoomId && testActive) {
    const totalCharsInTest = document.querySelectorAll('.char').length;
    const progressPercent = (correctChars / totalCharsInTest) * 100;

    socket.emit('update-progress', { 
        roomId: currentRoomId, 
        progress: progressPercent 
    });

    const myGhost = document.getElementById('p1-ghost');

    updateMyRunner(progressPercent);

if (myGhost) {
    myGhost.innerText = `YOU: ${Math.round(progressPercent)}%`;
}

    
    if (!raceFinished && progressPercent >= 100) {
        raceFinished = true;
        socket.emit('player-finished', currentRoomId);
    }
}
});


/* ======================================================
   ZONE 11: MULTIPLAYER UI & SOCKET LISTENERS
   ====================================================== */
document.getElementById('multiplayer-mode-btn').addEventListener('click', function () {
    isMultiplayer = !isMultiplayer;

    document.getElementById('multiplayer-lobby').classList.toggle('hidden');
    document.getElementById('race-track-container').classList.toggle('hidden');

    this.classList.toggle('active');

    document.getElementById('mode-indicator').innerText =
        isMultiplayer ? '[MULTIPLAYER]' : '[SOLO]';

    if (isMultiplayer) {
        roomInput.focus();
    } else {
        typingInput.focus();
    }
});

document.getElementById('create-btn').addEventListener('click', () => {
    socket.emit('create-room');
});

document.getElementById('join-btn').addEventListener('click', () => {
    const code = document.getElementById('room-input').value.trim();
    if (code) {
        currentRoomId = code;
        socket.emit('join-room', code);
    }
});

socket.on('room-created', (roomId) => {
    currentRoomId = roomId;
    document.getElementById('room-input').value = roomId;
    document.getElementById('lobby-status').innerText = `ROOM CODE: ${roomId}`;
});

socket.on('update-ghosts', (players) => {
    players.forEach((player) => {
        if (player.id !== socket.id) {
            const opponentGhost = document.getElementById('p2-ghost');
            updateOpponentRunner(player.progress);

if (opponentGhost) {
    opponentGhost.innerText = `FRIEND: ${Math.round(player.progress)}%`;
}
        }
    });
});


socket.on('error-msg', (msg) => alert(msg));

socket.on('start-race', () => {

    console.log("Race Started");

    document.getElementById('lobby-status').innerText = "Get Ready...";

    initTest();

    typingInput.disabled = true;
});
/* COUNTDOWN EVENT */
socket.on('countdown', (num) => {

    const overlay = document.getElementById('countdown-overlay');

    if (!overlay) return;

    overlay.classList.remove('hidden');

    overlay.innerText = num;
});


/* RACE BEGIN EVENT */
socket.on('race-begin', () => {

    console.log("Race Begin Event Received");

    const overlay = document.getElementById('countdown-overlay');

    if (overlay) {

        overlay.innerText = "GO 🚀";

        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 700);
    }

    beginRace();
});


/* RACE END EVENT */
socket.on('race-ended', (winnerId) => {

    gameState = "finished";

    clearInterval(timerInterval);

    typingInput.disabled = true;

    if (winnerId === socket.id) {

        showWinner("🏆 YOU WIN!");

    } else {

        showWinner("💀 YOU LOST!");
    }
});
/* ======================================================
   ZONE 12: UI EVENT LISTENERS
   ====================================================== */
resetButton.addEventListener('click', () => {
    document.body.classList.add('glitch-flash');
    initTest();
    setTimeout(() => document.body.classList.remove('glitch-flash'), 200);
});

timeOptions.forEach(option => {
    option.addEventListener('click', () => {
        timeOptions.forEach(btn => btn.classList.remove('active'));
        option.classList.add('active');
        testDuration = parseInt(option.dataset.time);
        initTest();
    });
});

document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('result-screen').classList.add('hidden');
    document.querySelector('.typing-test-container').style.display = '';
    document.querySelector('.live-stats-bar').style.display = '';
    document.querySelector('.footer').style.display = '';
    initTest();
});

punctuationToggle.addEventListener('click', () => {
    includePunctuation = !includePunctuation;
    punctuationToggle.classList.toggle('active');
    initTest();
});

numbersToggle.addEventListener('click', () => { 
    includeNumbers = !includeNumbers;
    numbersToggle.classList.toggle('active');
    initTest();
});

soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.classList.toggle('muted');
});


/* ======================================================
   ZONE 13: INITIALIZE
   ====================================================== */
initTest();
document.getElementById('play-again-btn')
.addEventListener('click', () => {

    hideWinner();

    initTest();

    gameState = "waiting";
});