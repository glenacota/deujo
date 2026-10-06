// tests/unit/module-boundaries.test.js
// The layering, checked against the source instead of trusted in a comment.
//
// `katas/` and `ui/` are peers that both sit above `platform/`, so neither may
// import sideways into the other, and `services/` sits below both.
//
// A boundary nobody checks is a comment. These read the real import graph, so
// an import that crosses a line fails here instead of quietly reshaping the
// architecture.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ROOT = fileURLToPath(new URL('../../assets/js/', import.meta.url));

/** Every module under assets/js, sorted so a failure is reproducible. */
function walk(dir) {
  return readdirSync(dir)
    .flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return walk(full);
      return full.endsWith('.js') ? [full] : [];
    })
    .sort();
}

const FILES = walk(ROOT);
const PATHS = new Set(FILES);

/** Top-level directory a module belongs to: `ui`, `katas`, `services`, ... */
function layerOf(file) {
  return relative(ROOT, file).split('/')[0];
}

/**
 * Static relative specifiers only. Bare `import './x.js'`, re-exports and
 * multi-line imports are all covered; a dynamic `import()` is not, which is
 * fine because the app has none.
 */
function importsOf(file) {
  const source = readFileSync(file, 'utf8');
  const specifiers = [
    ...source.matchAll(/^\s*import\s+[^'"]*from\s*'([^']+)'/gm),
    ...source.matchAll(/^\s*import\s*'([^']+)'/gm),
    ...source.matchAll(/^\s*export\s+[^'"]*from\s*'([^']+)'/gm),
  ].map(([, specifier]) => specifier);

  return specifiers
    .filter((specifier) => specifier.startsWith('.'))
    .map((specifier) => resolve(dirname(file), specifier));
}

/** Import edges, kept only where the target is a real module. */
const GRAPH = new Map(FILES.map((file) => [file, importsOf(file).filter((to) => PATHS.has(to))]));

/** Which layers a module may not import from, by the layer doing the importing. */
const FORBIDDEN = {
  // Peers: katas and ui both render into the DOM and must not reach sideways.
  katas: ['ui'],
  ui: ['katas'],
  // Pure domain, and therefore the bottom of the graph.
  services: ['ui', 'katas', 'platform'],
  // Host adapters sit above services and below the peers.
  platform: ['ui', 'katas'],
};

test('no module imports sideways or upward across a layer boundary', () => {
  const crossings = [];

  for (const [file, targets] of GRAPH) {
    const from = layerOf(file);
    for (const target of targets) {
      const to = layerOf(target);
      if (!FORBIDDEN[from]?.includes(to)) continue;
      crossings.push(
        `  ${relative(ROOT, file)}\n    -> ${relative(ROOT, target)}`,
      );
    }
  }

  assert.deepEqual(crossings, [], `layer boundary crossings:\n${crossings.join('\n')}`);
});

test('the import graph has no cycles', () => {
  // A cycle would make the modules unusable in any order and defeat tree
  // shaking; there is none today, and one arriving later is a bug, not a style.
  const UNVISITED = 0;
  const ON_STACK = 1;
  const DONE = 2;
  const state = new Map();
  const stack = [];
  let found = null;

  const visit = (node) => {
    if (found) return;
    state.set(node, ON_STACK);
    stack.push(node);
    for (const next of GRAPH.get(node) ?? []) {
      if (state.get(next) === ON_STACK) {
        found = [...stack.slice(stack.indexOf(next)), next].map((f) => relative(ROOT, f));
        return;
      }
      if ((state.get(next) ?? UNVISITED) === UNVISITED) visit(next);
    }
    stack.pop();
    state.set(node, DONE);
  };

  for (const file of FILES) {
    if ((state.get(file) ?? UNVISITED) === UNVISITED) visit(file);
  }

  assert.equal(found, null, `import cycle:\n  ${found?.join('\n  ')}`);
});

test('every relative import resolves to a real module', () => {
  // A typo in a specifier is not a load-time error in a bundler-less app: it is
  // a 404 on the module graph, which only shows up in the browser console.
  const missing = [];

  for (const file of FILES) {
    for (const specifier of importsOf(file)) {
      if (!PATHS.has(specifier)) missing.push(`  ${relative(ROOT, file)} -> ${specifier}`);
    }
  }

  assert.deepEqual(missing, [], `unresolved imports:\n${missing.join('\n')}`);
});

test('every module keeps its own header comment naming the file it lives in', () => {
  // The header names the path, so a file that moves without its header
  // advertising the move reads as if it never moved.
  const mismatched = FILES
    .filter((file) => {
      const first = readFileSync(file, 'utf8').split('\n', 1)[0];
      const expected = relative(ROOT, file).replace(/\.js$/, '');
      return !first.includes(expected);
    })
    .map((file) => `  ${relative(ROOT, file)}: ${readFileSync(file, 'utf8').split('\n', 1)[0]}`);

  assert.deepEqual(mismatched, [], `headers naming the wrong path:\n${mismatched.join('\n')}`);
});

/**
 * The host globals a DOM-free module has no business naming. Everything that
 * legitimately reaches one of these lives in `platform/`.
 */
const HOST_GLOBALS = [
  'document', 'window', 'localStorage', 'sessionStorage', 'navigator',
  'matchMedia', 'requestAnimationFrame', 'AudioContext', 'customElements',
  'DocumentFragment', 'HTMLInputElement', 'HTMLTextAreaElement',
];

/** Blanks out comments, keeping line structure so a hit still has a line number. */
function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (match) => ' '.repeat(match.length));
}

test('no module under services/ names a host global', () => {
  // AGENTS.md calls services "DOM-free and pure", and this is the half of that
  // the import graph cannot see: the modules below services/ are pure, but
  // nothing stopped one from growing a `document.querySelector`.
  //
  // A lexical check over comment-stripped source, not a parser: it assumes no
  // `//` inside a string literal under services/, which holds today. If you add
  // one, this test will report a false positive and this is where to fix it.
  const offenders = [];

  for (const file of FILES.filter((f) => layerOf(f) === 'services')) {
    const source = withoutComments(readFileSync(file, 'utf8'));
    for (const [index, line] of source.split('\n').entries()) {
      for (const name of HOST_GLOBALS) {
        if (!new RegExp(`\\b${name}\\b`).test(line)) continue;
        offenders.push(`  ${relative(ROOT, file)}:${index + 1}  ${name}  |  ${line.trim()}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `services/ must stay DOM-free; host adapters belong in platform/:\n${offenders.join('\n')}`,
  );
});

test('every module that names a host global is somewhere allowed to', () => {
  // The complement of the check above: it keeps that rule directional.
  // `katas/` and `ui/` render into the DOM by design, `platform/` is where the
  // adapters live, and `app.js` is the composition root that wires them
  // together. Everything else -- services/, and the root modules -- stays clean.
  const ALLOWED_LAYERS = ['platform', 'ui', 'katas'];
  const ALLOWED_ROOT_FILES = ['app.js'];

  const misplaced = FILES
    .filter((file) => {
      const layer = layerOf(file);
      const name = file.slice(ROOT.length);
      const allowed = ALLOWED_LAYERS.includes(layer) || ALLOWED_ROOT_FILES.includes(name);
      if (allowed) return false;
      return HOST_GLOBALS.some((host) =>
        new RegExp(`\\b${host}\\b`).test(withoutComments(readFileSync(file, 'utf8'))));
    })
    .map((file) => `  ${relative(ROOT, file)}`);

  assert.deepEqual(
    misplaced,
    [],
    `host globals outside platform/, ui/, katas/ or app.js:\n${misplaced.join('\n')}`,
  );
});
