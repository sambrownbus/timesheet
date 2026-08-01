/* TIMESHEET—01 · offline app shell
   The app document is network-first with a short timeout: online you always
   get the current version on the very next launch, offline you get the cached
   copy essentially instantly. Icons and manifest stay cache-first since they
   rarely change. Bump CACHE when the shell changes. */
const CACHE = "ts01-v8";
const NET_TIMEOUT = 1500;
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

function store(req, res) {
  if (res && res.ok && res.type === "basic") {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
}

/* the app itself: try the network briefly, fall back to cache.
   guarantees an update is never more than one launch behind, and that a dead
   or slow connection still opens the app immediately. */
function documentFirst(req) {
  return caches.match(req, { ignoreSearch: true }).then(hit => {
    let settled = false;
    return new Promise(resolve => {
      const done = r => { if (!settled) { settled = true; resolve(r); } };
      const fallback = setTimeout(() => { if (hit) done(hit); }, NET_TIMEOUT);
      fetch(req)
        .then(res => { clearTimeout(fallback); done(store(req, res)); })
        .catch(() => {
          clearTimeout(fallback);
          done(hit || caches.match("./index.html"));
        });
    });
  });
}

/* everything else: cache-first, refreshed quietly in the background */
function assetFirst(req) {
  return caches.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => store(req, res))
      .catch(() => hit || caches.match("./index.html"));
    if (hit) { net.catch(() => {}); return hit; }
    return net;
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  const isDoc = req.mode === "navigate" ||
                (req.destination === "document") ||
                /\/$|\.html$/.test(url.pathname);
  e.respondWith(isDoc ? documentFirst(req) : assetFirst(req));
});
