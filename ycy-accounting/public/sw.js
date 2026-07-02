// ycy记账 — Service Worker（离线缓存）
// 让应用在没有网络时也能正常打开

const CACHE_NAME = 'ycy-accounting-v1';

// 需要缓存的文件列表（会在首次访问时自动缓存）
const PRE_CACHE_URLS = [
  './',
  './index.html',
];

// 安装：预缓存核心文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRE_CACHE_URLS);
    }).then(() => {
      return self.skipWaiting(); // 立即激活
    })
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim(); // 立即控制所有页面
    })
  );
});

// 请求拦截：缓存策略
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 有缓存就用缓存，同时后台更新
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // 缓存成功的网络请求
          if (networkResponse && networkResponse.status === 200) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cloned);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // 网络失败，如果有缓存就用缓存
        });

      return cachedResponse || fetchPromise;
    })
  );
});
