import { initializeAudio } from "./core/audio.js";
import { appState } from "./core/appState.js";
import { showToast } from "./core/feedback.js";
import { initializeTheme } from "./core/preferences.js";
import { initializeBackgroundCanvas } from "./effects/backgroundCanvas.js";
import { focusSoloInput, initTest, updateCaret } from "./features/solo.js";
import { initPracticeEngine, updatePracticeCaret } from "./features/practice.js";
import { initCompetitiveMultiplayer, showMpStage, updateMpCaret } from "./features/multiplayer.js";
import {
    renderLeaderboardPage,
    renderProfilePage,
    renderStatisticsPage,
} from "./features/dashboards.js";

document.addEventListener("DOMContentLoaded", () => {
    initializeTheme(showToast);
    initializeAudio(showToast);
    initBootLoader();
    initializeBackgroundCanvas();
    initTest();
    initPracticeEngine();
    initCompetitiveMultiplayer(navigateToPlay);
    initNavigationRouter();
    renderStatisticsPage(navigateToPlay);
    renderLeaderboardPage(navigateToPlay);
    renderProfilePage();

    window.addEventListener("resize", () => {
        updateCaret();
        updatePracticeCaret();
        updateMpCaret();
    });
});

function initBootLoader() {
    const loader = document.getElementById("boot-loader");
    const fill = document.getElementById("boot-progress-fill");
    if (!loader || !fill) return;

    let progress = 0;
    const interval = setInterval(() => {
        progress += 25;
        fill.style.width = `${progress}%`;
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                loader.classList.add("loaded");
            }, 300);
        }
    }, 100);
}

function initNavigationRouter() {
    const navItems = document.querySelectorAll(".nav-item");
    const pageViews = document.querySelectorAll(".page-view");
    const githubBadge = document.getElementById("github-corner-badge");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetId = item.getAttribute("data-target");
            navItems.forEach(navItem => navItem.classList.remove("active"));
            pageViews.forEach(view => view.classList.remove("active"));

            item.classList.add("active");
            document.getElementById(targetId)?.classList.add("active");

            if (targetId === "multiplayer-view") {
                if (githubBadge) githubBadge.style.display = "none";
                appState.isMultiplayer = true;
                showMpStage("mp-stage-lobby");
            } else if (githubBadge) {
                githubBadge.style.display = "flex";
            }

            if (targetId === "play-view") {
                appState.isMultiplayer = false;
                focusSoloInput();
                requestAnimationFrame(updateCaret);
            } else if (targetId === "practice-view") {
                appState.isMultiplayer = false;
                document.getElementById("practice-typing-input")?.focus();
                requestAnimationFrame(updatePracticeCaret);
            } else if (targetId === "stats-view") {
                renderStatisticsPage(navigateToPlay);
            } else if (targetId === "leaderboard-view") {
                renderLeaderboardPage(navigateToPlay);
            } else if (targetId === "profile-view") {
                renderProfilePage();
            }
        });
    });
}

function navigateToPlay() {
    const githubBadge = document.getElementById("github-corner-badge");
    if (githubBadge) githubBadge.style.display = "flex";

    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    document.querySelectorAll(".page-view").forEach(view => view.classList.remove("active"));

    const playTab = document.querySelector(".nav-item[data-target='play-view']");
    const playView = document.getElementById("play-view");

    if (playTab) playTab.classList.add("active");
    if (playView) playView.classList.add("active");

    appState.isMultiplayer = false;
    initTest();
}
