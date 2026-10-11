// platform/dom/answer-marking.js
// `inside: true` parents the badge on the control: a wrapper around a grid button would become the grid item and collapse its width.
// `inside: false` wraps the control in `.answer-field`, reserving room for the badge so text inputs keep their layout.

const WRAPPER_CLASS = 'answer-field';
const BADGE_CLASS = 'answer-badge';
const NOTE_CLASS = 'answer-note';
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

function setNote(parent, text, state) {
  const existing = childOf(parent, NOTE_CLASS);
  if (!text) {
    existing?.remove();
    return;
  }

  const note = existing ?? parent.appendChild(document.createElement('span'));
  note.className = NOTE_CLASS;
  note.dataset.answerState = state;
  note.textContent = text;
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

// A correct control gets the badge only (the panel already lists the answers); `note: false` suppresses the note.
export function markControl(control, { ok, expected = '', inside = false, note } = {}) {
  if (!control) return;

  const host = inside ? control : wrapControl(control);
  control.dataset.answerState = ok ? 'correct' : 'wrong';
  control.setAttribute('aria-invalid', String(!ok));
  setBadge(inside ? control : host, ok);

  if (note === false) {
    setNote(host, null, ok);
    return;
  }
  setNote(host, note ?? (ok ? null : expected || '—'), ok ? 'correct' : 'wrong');
}

export function clearAnswerMarks(root) {
  if (!root) return;

  // Unwrap first, so the badges and notes leave with the wrapper they hang on.
  root.querySelectorAll(`.${WRAPPER_CLASS}`).forEach((wrapper) => {
    const control = wrapper.querySelector(CONTROL_SELECTOR);
    if (control) wrapper.replaceWith(control);
    else wrapper.remove();
  });

  root.querySelectorAll('.answer-badge, .answer-note').forEach((node) => node.remove());
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
