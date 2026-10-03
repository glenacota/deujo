// tests/helpers/parse-css.js
// Turns a stylesheet into `selector -> declarations`, recursing into @media and
// @supports so a rule inside a media query is keyed by its full condition.
//
// This exists so style assertions can ask "does this selector set `align-items`?"
// instead of regexing the source text. Source-text matching pins formatting:
// reindenting a rule, reordering declarations, or rewriting a shorthand would
// break the test without any behaviour changing.

/** Strips comments and normalises whitespace, so parsing is not thrown off. */
const clean = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');

/**
 * @param {string} css stylesheet source
 * @returns {Map<string, Record<string, string>>} keyed by full selector,
 *   including any enclosing at-rule prefix. Grouped selectors get one entry each.
 */
export function parseCss(css) {
  const rules = new Map();
  const source = clean(css);

  const walk = (body, prefix) => {
    let i = 0;
    while (i < body.length) {
      const brace = body.indexOf('{', i);
      if (brace < 0) break;
      const selector = body.slice(i, brace).trim();

      // Find the matching close brace, ignoring braces inside strings.
      let depth = 1;
      let j = brace + 1;
      while (j < body.length && depth > 0) {
        if (body[j] === '"' || body[j] === "'") {
          const quote = body[j];
          j += 1;
          while (j < body.length && body[j] !== quote) j += body[j] === '\\' ? 2 : 1;
        } else if (body[j] === '{') depth += 1;
        else if (body[j] === '}') depth -= 1;
        j += 1;
      }
      const inner = body.slice(brace + 1, j - 1);

      // Conditional and grouping at-rules wrap further rules, so recurse and keep
      // the condition as part of the key. @keyframes, @font-face and friends hold
      // declarations or percentage stops rather than selectors, so skip them.
      if (/^@(media|supports|container|layer)\b/.test(selector)) {
        walk(inner, selector);
      } else if (selector.startsWith('@')) {
        // Not a selector-bearing rule.
      } else {
        const declarations = {};
        for (const part of inner.split(';')) {
          const colon = part.indexOf(':');
          if (colon < 0) continue;
          declarations[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
        }
        for (const one of selector.split(',')) {
          const key = prefix ? `${prefix} ${one.trim()}` : one.trim();
          rules.set(key, Object.assign(rules.get(key) ?? {}, declarations));
        }
      }
      i = j;
    }
  };

  walk(source, '');
  return rules;
}

/** The declarations for one selector, or `{}` when the rule is absent. */
export const declsFor = (rules, selector) => rules.get(selector) ?? {};