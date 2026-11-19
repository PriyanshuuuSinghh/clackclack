import { getRaceHistory } from "../core/storage.js";
import { escapeHTML } from "../core/sanitize.js";
// RENDER DYNAMIC REAL STATISTICS PAGE
export function renderStatisticsPage(navigateToPlay) {
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
export function renderLeaderboardPage(navigateToPlay) {
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
export function renderProfilePage() {
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

