// Service Worker - RESET MODE
// Bu sürüm tüm eski cache'leri siler ve sadece network kullanır.
// Sorun çözüldükten sonra normal PWA moduna dönülebilir.

const CACHE_NAME = 'kalite-kontrol-reset-v3';

// Install - Hemen aktif ol
self.addEventListener('install', (event) => {
  console.log('SW: Reset mode installing...');
  self.skipWaiting();
});

// Activate - TÜM eski cache'leri temizle
self.addEventListener('activate', (event) => {
  console.log('SW: Reset mode activating, clearing all caches...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('SW: Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  // Sayfaların kontrolünü hemen ele al
  self.clients.claim();
});

// Fetch - Sadece Network (Önbellek YOK - Network Only)
self.addEventListener('fetch', (event) => {
  // Hiçbir şeye müdahale etme, tarayıcı direkt internete çıksın
  // Bu sayede "Bağlantı Hatası" cache'den kaynaklanıyorsa çözülür
  return;
});
