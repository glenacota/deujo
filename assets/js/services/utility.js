// js/services/utility.js

export function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

/** Parses a kata's own markup string into a live element (its root `[data-role="section"]`). */
export function createSectionFromTemplate(templateHtml) {
    const template = document.createElement('template');
    template.innerHTML = templateHtml.trim();
    return template.content.querySelector('[data-role="section"]');
}

