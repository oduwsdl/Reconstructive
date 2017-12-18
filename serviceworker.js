console.log('ServiceWorker downloaded');

importScripts('reconstructive.js');

reconstructive.init({
  urimPattern: self.location.href.substring(0, self.location.href.lastIndexOf('/')) + '/archived/<datetime>/<urir>'
});

self.addEventListener("install", function(event) {
  console.log('ServiceWorker installed');
});

self.addEventListener("activate", function(event) {
  console.log('ServiceWorker Activated');
});

self.addEventListener("fetch", function(event) {
  console.log('A fetch event triggered:', event);
  reconstructive.reroute(event);
});
