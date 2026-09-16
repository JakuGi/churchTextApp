// Server aplikácie: vydáva súbory a zároveň prepája tablet s obrazovkami
// na iných zariadeniach (televízor, notebook) – bez Chromecastu.
//
// Spustenie: npm start
//
// Ovládanie na tablete posiela stav na POST /api/state, obrazovky ho počúvajú
// cez GET /api/stream (Server-Sent Events), takže text naskočí okamžite.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json; charset=utf-8',
};

/** Otvorené obrazovky (SSE spojenia) a posledný známy stav. */
const screens = new Set();
let lastState = null;

function localAddresses() {
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const item of list || []) {
      if (item.family === 'IPv4' && !item.internal) out.push(item.address);
    }
  }
  return out;
}

function sendJson(response, data, status = 200) {
  const body = JSON.stringify(data);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function broadcast(state) {
  const payload = `data: ${JSON.stringify(state)}\n\n`;
  for (const screen of screens) {
    try {
      screen.write(payload);
    } catch {
      screens.delete(screen);
    }
  }
}

function openStream(request, response) {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  response.write('retry: 2000\n\n');
  if (lastState) response.write(`data: ${JSON.stringify(lastState)}\n\n`);
  screens.add(response);

  // Udržiavacia správa, aby spojenie neuspalo Wi-Fi ani prehliadač na TV.
  const keepAlive = setInterval(() => {
    try {
      response.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 15000);

  const close = () => {
    clearInterval(keepAlive);
    screens.delete(response);
  };
  request.on('close', close);
  request.on('error', close);
}

function readBody(request, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('príliš veľká správa'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

/**
 * Sprostredkovanie stránky liturgického kalendára.
 * Prehliadač si ju nemôže stiahnuť sám (cudzia doména), server áno.
 */
async function handleLiturgy(request, response, url) {
  const day = (url.searchParams.get('den') || '').replace(/\D/g, '');
  const target = day.length === 8 ? `https://lc.kbs.sk/?den=${day}` : 'https://lc.kbs.sk/';
  try {
    const page = await fetch(target, {
      headers: { 'User-Agent': 'Organista/1.1 (+https://github.com/JakuGi/churchTextApp)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!page.ok) {
      sendJson(response, { ok: false, error: `Kalendár odpovedal ${page.status}` }, 502);
      return;
    }
    const html = await page.text();
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(html);
  } catch (error) {
    sendJson(response, { ok: false, error: 'Kalendár sa nepodarilo načítať.' }, 502);
  }
}

async function handleApi(request, response, path, url) {
  if (path === '/api/status') {
    sendJson(response, {
      app: 'organista',
      screens: screens.size,
      addresses: localAddresses(),
      port: PORT,
    });
    return true;
  }
  if (path === '/api/stream') {
    openStream(request, response);
    return true;
  }
  if (path === '/api/liturgia') {
    await handleLiturgy(request, response, url);
    return true;
  }
  if (path === '/api/state' && request.method === 'POST') {
    try {
      const state = JSON.parse(await readBody(request));
      lastState = state;
      broadcast(state);
      sendJson(response, { ok: true, screens: screens.size });
    } catch (error) {
      sendJson(response, { ok: false, error: 'neplatný stav' }, 400);
    }
    return true;
  }
  return false;
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const path = decodeURIComponent(url.pathname);

  if (path.startsWith('/api/')) {
    if (await handleApi(request, response, path, url)) return;
    sendJson(response, { error: 'neznáme volanie' }, 404);
    return;
  }

  try {
    const target = join(ROOT, normalize(path === '/' ? '/index.html' : path).replace(/^(\.\.[/\\])+/, ''));
    if (!target.startsWith(ROOT)) {
      response.writeHead(403).end('Zakázané');
      return;
    }
    const info = await stat(target);
    if (info.isDirectory()) throw new Error('adresár');
    const body = await readFile(target);
    response.writeHead(200, {
      'Content-Type': TYPES[extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Nenájdené');
  }
}).listen(PORT, () => {
  const addresses = localAddresses();
  console.log('Organista beží.');
  console.log(`  Ovládanie (tablet):   http://${addresses[0] || 'localhost'}:${PORT}`);
  console.log(`  Obrazovka (TV/PC):    http://${addresses[0] || 'localhost'}:${PORT}/display.html`);
  if (addresses.length > 1) {
    console.log(`  Ďalšie adresy: ${addresses.slice(1).map((a) => `http://${a}:${PORT}`).join(', ')}`);
  }
});
