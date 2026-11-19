import { practiceDrills } from "../core/words.js";
import { playSound } from "../core/audio.js";
import { showToast } from "../core/feedback.js";
// PRACTICE STATE
let currentDrillType = "trigrams";
let practiceWordIdx = 0;
let practiceCharIdx = 0;
let practiceCorrect = 0;
let practiceIncorrect = 0;
let practiceTotalTyped = 0;
let practiceStartTime = null;


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

export { initPracticeEngine, updatePracticeCaret };

