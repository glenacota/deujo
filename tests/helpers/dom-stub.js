// tests/helpers/dom-stub.js
// Enough element surface for a kata to mount, render its inputs, and grade them.
// Not a DOM: only the handful of members the katas actually touch.
//
// Installs `document.createElement` immediately rather than in a `beforeEach`,
// because callers construct katas at module scope (`tests/unit/katas.test.js`).
// Extends whatever `installBrowserStub` left behind rather than replacing it,
// so `localStorage` and the listener registry survive.

/**
 * A classList with the DOMList methods the app calls, not just Set's. Shared by
 * every test fake: pass an array of names, never a string, since Set would
 * iterate a string one character at a time.
 */
export class StubClassList extends Set {
  contains(name) { return this.has(name); }
  add(...names) { super.add(...names); }
  remove(...names) { names.forEach((name) => this.delete(name)); }
  toggle(name, force) {
    const on = force ?? !this.has(name);
    if (on) this.add(name);
    else this.delete(name);
    return on;
  }
}

class StubElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.classList = new StubClassList();
    this.dataset = {};
    this.attributes = {};
    this.textContent = '';
    this.value = '';
    this.disabled = false;
    this.listeners = {};
  }

  get className() { return [...this.classList].join(' '); }
  set className(value) { this.classList = new StubClassList(value.split(/\s+/).filter(Boolean)); }

  appendChild(child) {
    if (child instanceof StubFragment) {
      // Copy first: moving a node reparents it, which empties `child.children`
      // mid-iteration and would silently drop the rest of the fragment.
      const nodes = [...child.children];
      nodes.forEach((node) => this.appendChild(node));
      return child;
    }
    child.remove();
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  before(node) { this.parentElement?.insertBefore(node, this); }

  insertBefore(node, ref) {
    node.remove();
    node.parentElement = this;
    const index = ref ? this.children.indexOf(ref) : this.children.length;
    this.children.splice(index < 0 ? this.children.length : index, 0, node);
    return node;
  }

  remove() {
    if (!this.parentElement) return;
    const siblings = this.parentElement.children;
    siblings.splice(siblings.indexOf(this), 1);
    this.parentElement = null;
  }

  replaceWith(node) {
    const parent = this.parentElement;
    if (!parent) return;
    parent.children[parent.children.indexOf(this)] = node;
    node.parentElement = parent;
    this.parentElement = null;
  }

  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }

  /** The noun and Perfekt katas wire click listeners on their choice buttons. */
  addEventListener(type, handler) { (this.listeners[type] ??= []).push(handler); }
  removeEventListener(type, handler) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((h) => h !== handler);
  }

  /** Fires the click handlers this element was given. */
  click() { (this.listeners.click ?? []).forEach((handler) => handler()); }

  matchesTag(tag) { return this.tagName === tag.toUpperCase(); }

  descendants() { return this.children.flatMap((child) => [child, ...child.descendants()]); }

  /** Handles the tag lists, single classes, and `.class > [attr]` shapes used here. */
  querySelectorAll(selector) {
    const [combinator, rest] = selector.trim().includes('>')
      ? selector.split('>').map((part) => part.trim())
      : [null, selector.trim()];
    // An unsupported shape must fail loudly rather than quietly match nothing.
    if (combinator && !combinator.startsWith('.')) {
      throw new Error(`StubElement.querySelectorAll only handles a leading class before ">", got "${combinator}"`);
    }
    const scope = combinator ? this.children : this.descendants();
    return scope.filter((el) => rest.split(',').map((part) => part.trim()).some((part) => {
      if (part.startsWith('.')) return el.classList.has(part.slice(1));
      // `[data-answer-state]` is a presence test; `[data-role="x"]` is a match.
      if (part === '[data-answer-state]') return 'answerState' in el.dataset;
      if (part.startsWith('[')) return el.dataset.role === part.match(/="([^"]+)"/)?.[1];
      return el.matchesTag(part);
    }));
  }

  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

class StubFragment extends StubElement {}

/**
 * A template only has to hand back the one `[data-role="section"]` element its
 * markup contains, so the parser tracks only that tag and its nesting. Anything
 * else is skipped, which is enough for a kata to mount and find its own nodes.
 */
class StubTemplate extends StubElement {
  set innerHTML(html) {
    const open = /<([a-zA-Z][\w-]*)(\s[^>]*?)?>/g;
    const stack = [];
    let match;
    while ((match = open.exec(html)) !== null) {
      const [tag, name, attrs = ''] = match;
      const selfClosing = tag.endsWith('/>');
      const element = new StubElement(name);
      for (const attr of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) {
        // `data-*` attributes land in `dataset`, camelCased, as in the real DOM.
        const key = attr[1].startsWith('data-')
          ? attr[1].slice(5).replace(/-(\w)/g, (_, letter) => letter.toUpperCase())
          : null;
        if (key) element.dataset[key] = attr[2];
        else element.setAttribute(attr[1], attr[2]);
      }
      (stack.at(-1) ?? this.content).appendChild(element);
      if (!selfClosing) stack.push(element);
    }
  }
}

/** Adds `createElement` / `createDocumentFragment` / `createTextNode` to `document`. Idempotent. */
export function installDomStub() {
  const existing = globalThis.document ?? {};
  globalThis.document = {
    ...existing,
    createElement: (tag) => {
      if (tag === 'template') {
        const template = new StubTemplate();
        template.content = new StubFragment();
        return template;
      }
      return new StubElement(tag);
    },
    createDocumentFragment: () => new StubFragment(),
    createTextNode: (text) => {
      const node = new StubElement('#text');
      node.textContent = text;
      return node;
    },
  };
}