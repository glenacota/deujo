// platform/dom/template.js
// Turns a kata's own markup string into a live element.

/** Parses a kata's own markup string into a live element (its root `[data-role="section"]`). */
export function createSectionFromTemplate(templateHtml) {
    const template = document.createElement('template');
    template.innerHTML = templateHtml.trim();
    return template.content.querySelector('[data-role="section"]');
}