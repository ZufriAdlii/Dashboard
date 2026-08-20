/* Utara Infra Dashboard Hub — service worker
   Bump CACHE_VERSION whenever you publish updated dashboard files. */
var CACHE_VERSION = 'uisb-v1';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './UISB_NEW.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function(c){
      // addAll fails the whole install if any single file 404s,
      // so add them individually and tolerate misses
      return Promise.all(SHELL.map(function(u){
        return c.add(u).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE_VERSION) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;

  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  // Pages: network first so a redeploy is picked up straight away,
  // falling back to cache when offline.
  var isPage = req.mode === 'navigate' || url.pathname.endsWith('.html');
  if(isPage){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE_VERSION).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Everything else (images, icons): cache first.
  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE_VERSION).then(function(c){ c.put(req, copy); });
        return res;
      });
    })
  );
});

self.addEventListener('message', function(e){
  if(e.data === 'skipWaiting') self.skipWaiting();
});
