import {
    updateMyRunner,
    updateOpponentRunner,
} from "../raceUI.js";
import { baseWords } from "../core/words.js";
import { escapeHTML } from "../core/sanitize.js";
import { saveRaceHistory, getStoredPilotName, saveStoredPilotName } from "../core/storage.js";
import { playSound } from "../core/audio.js";
import { showToast } from "../core/feedback.js";
import { appState } from "../core/appState.js";
// SOCKET & MULTIPLAYER COMPETITIVE ENGINE STATE
const socket = io();
let currentRoomId = null;
let raceFinished = false;
let botInterval = null;
let testActive = false;

// MULTIPLAYER COMPETITIVE STAGE STATE
let mpUsername = escapeHTML(getStoredPilotName() || "Priyanshu");
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

const roomInput = document.getElementById("room-input");
const joinBtn = document.getElementById("join-btn");
const createBtn = document.getElementById("create-btn");
const lobbyStatusText = document.getElementById("lobby-status-text");
const startBotMatchBtn = document.getElementById("start-bot-match-btn");
// COMPETITIVE 4-STAGE MULTIPLAYER ENGINE
export function showMpStage(stageId) {
    const stages = document.querySelectorAll(".mp-stage");
    stages.forEach(s => s.classList.remove("active"));
    const target = document.getElementById(stageId);
    if (target) target.classList.add("active");
}

export function initCompetitiveMultiplayer(navigateToPlay) {
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
            saveStoredPilotName(mpUsername);
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
        if (!appState.isMultiplayer || appState.gameState !== "racing") return;

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

    initReplayControls(navigateToPlay);
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
            appState.gameState = "racing";
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
        if (appState.gameState !== "racing") {
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
    appState.gameState = "finished";
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

function initReplayControls(navigateToPlay) {
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

export { updateMpCaret };

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

