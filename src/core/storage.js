const RACE_HISTORY_KEY = "vk_race_history";
const THEME_KEY = "vk_theme";
const PILOT_NAME_KEY = "vk_pilot_name";

export function getRaceHistory() {
    try {
        const raw = localStorage.getItem(RACE_HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

export function saveRaceHistory(entry) {
    const history = getRaceHistory();
    history.unshift(entry);
    localStorage.setItem(RACE_HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
}

export function getPersonalBest(duration) {
    const pb = localStorage.getItem(`vk_pb_${duration}`);
    return pb ? parseInt(pb) : null;
}

export function savePersonalBest(duration, wpm) {
    const currentPB = getPersonalBest(duration);
    if (!currentPB || wpm > currentPB) {
        localStorage.setItem(`vk_pb_${duration}`, wpm);
        return true;
    }
    return false;
}

export function getStoredTheme() {
    return localStorage.getItem(THEME_KEY);
}

export function saveStoredTheme(themeName) {
    localStorage.setItem(THEME_KEY, themeName);
}

export function getStoredPilotName() {
    return localStorage.getItem(PILOT_NAME_KEY);
}

export function saveStoredPilotName(pilotName) {
    localStorage.setItem(PILOT_NAME_KEY, pilotName);
}
