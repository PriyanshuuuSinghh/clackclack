export function updateMyRunner(progress, wpm = 0) {
    const fill = document.getElementById('p1-progress-fill');
    const label = document.getElementById('p1-stats-label');

    const roundedProgress = Math.min(100, Math.max(0, Math.round(progress)));

    if (fill) {
        fill.style.width = `${roundedProgress}%`;
    }

    if (label) {
        label.innerText = `${roundedProgress}% | ${wpm} WPM`;
    }
}

export function updateOpponentRunner(progress, wpm = 0) {
    const fill = document.getElementById('p2-progress-fill');
    const label = document.getElementById('p2-stats-label');

    const roundedProgress = Math.min(100, Math.max(0, Math.round(progress)));

    if (fill) {
        fill.style.width = `${roundedProgress}%`;
    }

    if (label) {
        label.innerText = `${roundedProgress}% | ${wpm} WPM`;
    }
}

export function showWinner(text, summary = "") {
    const overlay = document.getElementById('winner-overlay');
    const winnerText = document.getElementById('winner-text');
    const winnerSummary = document.getElementById('winner-stats-summary');

    if (!overlay || !winnerText) return;

    winnerText.innerText = text;
    
    if (winnerSummary && summary) {
        winnerSummary.innerText = summary;
    }

    overlay.classList.add('active');
}

export function hideWinner() {
    const overlay = document.getElementById('winner-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}