// ui/answer-view.js
// Inline marking of a kata's own controls: colour plus emoji, right where the
// learner is looking.
//
// Two shapes, because controls sit in two different layouts:
//
//   inside: true  -> the badge becomes a child of the control itself. Used for
//                    buttons in a grid, where a wrapper would become the grid
//                    item and collapse the button's width.
//   inside: false -> the control is wrapped in an `.answer-field` span that
//                    reserves room for an absolutely positioned badge. Used for
//                    text inputs, which must keep their exact layout.

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

/**
 * A wrapper hangs the badge to the right of the control; a button gets it
 * appended after its label. The badge carries no Tailwind classes: app.css
 * owns `.answer-badge`, and the tighter `button > .answer-badge` variant, so
 * an `inside` badge must land in a <button> to pick up its offset.
 */
function setBadge(parent, ok) {
  const existing = childOf(parent, BADGE_CLASS);
  const badge = existing ?? document.createElement('span');
  badge.className = BADGE_CLASS;
  badge.textContent = ok ? '✅' : '❌';
  // Always last, so a re-mark never lands between a label and its badge.
  parent.appendChild(badge);
}

/**
 * Marks one control as right or wrong.
 *
 * A wrong control carries its expected value as a note next to it, so the
 * correction is readable in place. A correct one gets the badge only: six green
 * ticks with repeated text is noise, and the panel already lists the answers.
 *
 * @param options `note: false` suppresses the note entirely
 */
export function markControl(control, { ok, expected = '', inside = false, note } = {}) {
  if (!control) return;

  // A button takes its badge as a child; an input gets a wrapper to hang it on.
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

/** Removes every mark and unwraps the controls again, ready for the next item. */
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

/**
 * Freezes one kata section while the verdict is on screen. `inert` blocks
 * focus and taps; `readOnly` keeps text fields out of iOS's disabled greying.
 * `disabled` is never touched, so a kata's own per-item rules (a noun with no
 * plural) survive the lock and the call is idempotent.
 *
 * Takes the section itself, not a container: every kata is mounted from boot,
 * so locking a container would freeze the katas the learner is not looking at.
 */
export function setSectionLocked(section, locked) {
  if (!section) return;

  section.classList.toggle('pointer-events-none', locked);
  section.inert = locked;
  section.querySelectorAll('input, textarea').forEach((control) => {
    control.readOnly = locked;
  });
}
