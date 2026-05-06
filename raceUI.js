function moveRunner(containerId, runnerId, progress) {

    const container = document.getElementById(containerId);
    const runner = document.getElementById(runnerId);

    const track = document.querySelector('.race-track');

    if (!container || !runner || !track) return;

    const maxDistance = track.offsetWidth - 120;

    const moveX = (progress / 100) * maxDistance;

    container.style.transform = `translateX(${moveX}px)`;

    runner.classList.add('running');

    clearTimeout(runner.stopTimer);

    runner.stopTimer = setTimeout(() => {
        runner.classList.remove('running');
    }, 120);
}

export function updateMyRunner(progress) {
    moveRunner('p1-container', 'p1-runner', progress);
}

export function updateOpponentRunner(progress) {
    moveRunner('p2-container', 'p2-runner', progress);
}

export function showWinner(text) {

    const overlay = document.getElementById('winner-overlay');
    const winnerText = document.getElementById('winner-text');

    if (!overlay || !winnerText) return;

    winnerText.innerText = text;

    overlay.classList.remove('hidden');
}

export function hideWinner() {

    const overlay = document.getElementById('winner-overlay');

    if (!overlay) return;

    overlay.classList.add('hidden');
}