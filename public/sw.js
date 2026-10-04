/* Real Book PWA service worker.
   Caches the app shell + the song index so the app opens without the network,
   and caches page images the first time you view them.
   NOTE: iOS Safari only enables service workers over https or localhost, so on a
   plain http:// LAN address the app still installs and runs, it just falls back
   to the network for everything. */
const SHELL = 'rbk-shell-v1';
const PAGES = 'rbk-pages-v1';
const SHELL_FILES = ['./realbook.html', './realbook.json', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== SHELL && k !== PAGES).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // page images: cache-first, they never change
  if (url.pathname.indexOf('/pages/') >= 0) {
    e.respondWith(
      caches.open(PAGES).then(c => c.match(e.request).then(hit =>
        hit || fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; })
      ))
    );
    return;
  }

  // app shell: network-first so updates land, cache as fallback
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) caches.open(SHELL).then(c => c.put(e.request, res.clone()));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
