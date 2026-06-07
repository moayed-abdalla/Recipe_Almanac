/*
 * Recipe Almanac service worker (hand-rolled).
 *
 * Strategies:
 *  - HTML navigations: network-first, fall back to cache, then the /offline page.
 *  - /_next/static/* and other static assets: cache-first.
 *  - Supabase auth/data/realtime requests: bypassed entirely (never cached).
 *  - Supabase Storage recipe-image objects: cache-first with a 30-day expiry.
 *  - PRECACHE_RECIPES message: stores favourite recipe pages + images for offline use.
 */

const STATIC_CACHE = 'static-v1';
const HTML_CACHE = 'html-v1';
const IMAGE_CACHE = 'images-v1';
const RECIPE_CACHE = 'recipes-v1';

const OFFLINE_URL = '/offline';
const PRECACHE_URLS = [OFFLINE_URL];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const CACHED_AT_HEADER = 'x-sw-cached-at';

const MANAGED_CACHES = [STATIC_CACHE, HTML_CACHE, IMAGE_CACHE, RECIPE_CACHE];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !MANAGED_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Supabase Storage public object URL for the recipe-image bucket. */
function isRecipeImage(url) {
  return (
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.includes('/storage/v1/object/public/recipe-image/')
  );
}

/** Next.js image optimisation proxy (/_next/image?url=...). Cache these like recipe images. */
function isNextImageOptimised(url) {
  return url.origin === self.location.origin && url.pathname === '/_next/image';
}

/** Any other Supabase request (auth, rest, realtime, functions, non-recipe storage). */
function isSupabaseApi(url) {
  return url.hostname.endsWith('.supabase.co') && !isRecipeImage(url);
}

function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:css|js|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname)
  );
}

/** Store a response in `cache` alongside a timestamp header so we can expire it later. */
async function putWithTimestamp(cache, request, response) {
  const body = await response.clone().blob();
  const headers = new Headers(response.headers);
  headers.set(CACHED_AT_HEADER, Date.now().toString());
  const stamped = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  await cache.put(request, stamped);
}

function isExpired(response) {
  const ts = response.headers.get(CACHED_AT_HEADER);
  if (!ts) return false;
  return Date.now() - Number(ts) > THIRTY_DAYS_MS;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.status === 200) {
    cache.put(request, response.clone());
  }
  return response;
}

async function cacheFirstImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached && !isExpired(cached)) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      await putWithTimestamp(cache, request, response);
    }
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(HTML_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const recipeMatch = await caches.match(request, { cacheName: RECIPE_CACHE });
    if (recipeMatch) return recipeMatch;
    const htmlMatch = await caches.match(request);
    if (htmlMatch) return htmlMatch;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache or intercept Supabase auth/data — always hit the network for fresh data.
  if (isSupabaseApi(url)) return;

  if (isRecipeImage(url)) {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  // Cache Next.js optimised card images (/_next/image) the same way as raw
  // recipe images so they survive offline without re-downloading full originals.
  if (isNextImageOptimised(url)) {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  const isNavigation =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
});

/** Pre-cache favourite recipe pages + images sent from the app. */
async function precacheRecipes(urls) {
  if (!Array.isArray(urls)) return;
  const recipeCache = await caches.open(RECIPE_CACHE);
  const imageCache = await caches.open(IMAGE_CACHE);

  await Promise.all(
    urls.map(async (rawUrl) => {
      try {
        const url = new URL(rawUrl, self.location.origin);
        const request = new Request(url.href, { credentials: 'same-origin' });
        const response = await fetch(request);
        if (!response || response.status !== 200) return;

        if (isRecipeImage(url)) {
          await putWithTimestamp(imageCache, request, response);
        } else {
          await recipeCache.put(request, response.clone());
        }
      } catch (error) {
        // Ignore individual failures so one bad URL does not abort the batch.
      }
    })
  );
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'PRECACHE_RECIPES') {
    event.waitUntil(precacheRecipes(data.urls));
  }

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
