console.log('ServiceWorker downloaded');

// This makes a module available named "reconstructive"
importScripts('reconstructive.js');

// Customize configs
// reconstructive.init({
//   id: `${NAME}:${VERSION}`,
//   debug: false,
//   urimPattern: `${self.location.origin}/memento/<datetime>/<urir>`,
//   showBanner: false
// });
let currentPath = self.location.href.substring(0, self.location.href.lastIndexOf('/'));
Reconstructive.init({
  debug: true,
  showBanner: true,
  bannerElementLocation: `${currentPath}/reconstructive-banner.js`,
  urimPattern: `${currentPath}/archived/<datetime>/<urir>`
});

// Add any custom exclusions or modify or delete default ones
//> reconstructive.exclusions;
//< {
//<   notGet: f (event, config) => boolean,
//<   localResource: f (event, config) => boolean
//< }

// Pass a custom function to generate banner markup
// reconstructive.bannerCreator(f (event, response, config) => HTMLString);
// Or update the rewriting logic
// reconstructive.updateRewriter(f (event, response, config) => Response);

// This is not necessary, but can be useful for debugging or in future
self.addEventListener('install', function(event) {
  console.log('ServiceWorker installed');
});

// This is not necessary, but can be useful for debugging or in future
self.addEventListener('activate', function(event) {
  console.log('ServiceWorker Activated');
});

self.addEventListener('fetch', function(event) {
  // Add any custom logic here to conditionally call the reroute function
  Reconstructive.reroute(event);
});
