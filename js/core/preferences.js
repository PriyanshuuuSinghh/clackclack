import { getStoredTheme, saveStoredTheme } from "./storage.js";

const themes = ["cyber-green", "midnight-bw", "electric-blue"];
let currentTheme = getStoredTheme() || "cyber-green";

function applyTheme(themeName) {
    currentTheme = themeName;
    document.documentElement.setAttribute("data-theme", themeName);
    saveStoredTheme(themeName);

    const themeBtnLabel = document.getElementById("theme-btn-label");
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

export function initializeTheme(showToast) {
    applyTheme(currentTheme);

    document.getElementById("theme-toggle-btn")?.addEventListener("click", () => {
        const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
        applyTheme(nextTheme);
        showToast(`Switched theme to ${nextTheme.toUpperCase()}`);
    });

    document.getElementById("theme-opt-green")?.addEventListener("click", () => applyTheme("cyber-green"));
    document.getElementById("theme-opt-bw")?.addEventListener("click", () => applyTheme("midnight-bw"));
    document.getElementById("theme-opt-blue")?.addEventListener("click", () => applyTheme("electric-blue"));
}
