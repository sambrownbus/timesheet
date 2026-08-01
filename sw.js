/* TIMESHEET—01 · offline app shell
   Cache-first with a background refresh. Once installed the app opens with
   no network at all; a new version is picked up silently on the next launch.
   Bump CACHE when the shell changes. */
const CACHE = "ts01-v3";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll is atomic — one bad entry fails the whole install, so add
      // individually and tolerate a miss (e.g. an icon not deployed yet)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit || caches.match("./index.html"));

      // serve from cache instantly, let the network update it in the background
      if (hit) { net.catch(() => {}); return hit; }
      return net;
    })
  );
});
