import { escapeHTML } from "./sanitize.js";

export function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span style="color: var(--accent-primary);">//</span> ${escapeHTML(message)}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}
