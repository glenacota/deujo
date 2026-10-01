// tests/e2e/server.mjs
// Minimal static server for the E2E layer. The app fetches its datasets from
// the site root, so the tests need real HTTP - but no test dependency beyond
// Node itself, matching the no-bundler, no-backend rule.

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const PORT = Number(process.env.PORT ?? 4173);

const MIME = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
};

/** @returns {string|null} an absolute path inside ROOT, or null when it escapes */
function resolvePath(urlPath) {
    const decoded = decodeURIComponent(urlPath.split('?')[0]);
    const relative = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
    const target = join(ROOT, relative === '/' ? 'index.html' : relative);
    return target.startsWith(ROOT) ? target : null;
}

const server = createServer(async (req, res) => {
    const target = resolvePath(req.url ?? '/');
    if (!target) {
        res.writeHead(403).end('Forbidden');
        return;
    }

    try {
        const info = await stat(target);
        const filePath = info.isDirectory() ? join(target, 'index.html') : target;
        const fileInfo = info.isDirectory() ? await stat(filePath) : info;
        res.writeHead(200, {
            'content-type': MIME[extname(filePath)] ?? 'application/octet-stream',
            'content-length': fileInfo.size,
            'cache-control': 'no-store',
        });
        createReadStream(filePath).pipe(res);
    } catch {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`deujo e2e server on http://localhost:${PORT}`);
});