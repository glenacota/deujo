// services/escape-html.js
// The one escaping rule in the app: five replacements, ampersand first so it
// cannot double-escape the entities the other four produce.
//
// Pure, and deliberately the only way a dynamic string reaches innerHTML. The
// single trusted sink is `UiController#showHelpContent`, whose argument must
// already have been through here.

export function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}