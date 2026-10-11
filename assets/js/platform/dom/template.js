// platform/dom/template.js

export function createSectionFromTemplate(templateHtml) {
    const template = document.createElement('template');
    template.innerHTML = templateHtml.trim();
    return template.content.querySelector('[data-role="section"]');
}
