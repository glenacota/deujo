// platform/dom/answer-marking.js
// `inside: true` parents the badge on the control: a wrapper around a grid button would become the grid item and collapse its width.
// `inside: false` wraps the control in `.answer-field`, which draws the badge inside the input's right edge.
// Corrections are never drawn here: the verdict panel is the only place a wanted answer appears.

const WRAPPER_CLASS = 'answer-field';
const BADGE_CLASS = 'answer-badge';
const CONTROL_SELECTOR = '.answer-field > [data-answer-state]';

function childOf(parent, className) {
  return Array.from(parent.children).find((child) => child.classList.contains(className)) ?? null;
}

function wrapControl(control) {
  const existing = control.parentElement;
  if (existing?.classList.contains(WRAPPER_CLASS)) return existing;

  const wrapper = document.createElement('span');
  wrapper.className = WRAPPER_CLASS;
  control.before(wrapper);
  wrapper.appendChild(control);
  return wrapper;
}

// app.css owns `.answer-badge` and its tighter `button > .answer-badge` offset, so an `inside` badge must land in a <button>.
function setBadge(parent, ok) {
  const existing = childOf(parent, BADGE_CLASS);
  const badge = existing ?? document.createElement('span');
  badge.className = BADGE_CLASS;
  badge.textContent = ok ? '✅' : '❌';
  // Always last, so a re-mark keeps the badge after the label.
  parent.appendChild(badge);
}

export function markControl(control, { ok, inside = false } = {}) {
  if (!control) return;

  control.dataset.answerState = ok ? 'correct' : 'wrong';
  control.setAttribute('aria-invalid', String(!ok));
  setBadge(inside ? control : wrapControl(control), ok);
}

export function clearAnswerMarks(root) {
  if (!root) return;

  // Unwrap first, so the badges leave with the wrapper they hang on.
  root.querySelectorAll(`.${WRAPPER_CLASS}`).forEach((wrapper) => {
    const control = wrapper.querySelector(CONTROL_SELECTOR);
    if (control) wrapper.replaceWith(control);
    else wrapper.remove();
  });

  root.querySelectorAll('.answer-badge').forEach((node) => node.remove());
  root.querySelectorAll('[data-answer-state]').forEach((control) => {
    delete control.dataset.answerState;
    control.removeAttribute('aria-invalid');
  });
}

// readOnly, not disabled: iOS greys disabled fields, and per-item disabled state (a noun with no plural) must survive the lock.
// Takes the section, not a container: every kata is mounted from boot.
export function setSectionLocked(section, locked) {
  if (!section) return;

  section.classList.toggle('pointer-events-none', locked);
  section.inert = locked;
  section.querySelectorAll('input, textarea').forEach((control) => {
    control.readOnly = locked;
  });
}
