// Service Worker - 支持离线使用
const CACHE_NAME = 'fund-exam-v1';
const urlsToCache = [
  '.',
  'index.html',
  'styles.css',
  'app.js',
  'exam_database.js'
];

// 安装时缓存核心资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

// 拦截请求，优先使用缓存
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 缓存命中，直接返回
        if (response) {
          return response;
        }
        // 否则发起网络请求
        return fetch(event.request);
      })
  );
});
