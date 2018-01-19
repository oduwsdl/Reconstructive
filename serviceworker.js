console.log('ServiceWorker downloaded');

// This makes a module available named "reconstructive"
importScripts('reconstructive.js');

// Customize configs
// reconstructive.init({
//   id: `${NAME}:${VERSION}`,
//   urimPattern: `${self.location.origin}/memento/<datetime>/<urir>`,
//   bannerElementLocation: `${self.location.origin}/reconstructive-banner.js`,
//   showBanner: false,
//   debug: false
// });
const currentPath = self.location.href.substring(0, self.location.href.lastIndexOf('/'));
const reconstructive = new Reconstructive({
  debug: true,
  showBanner: true,
  bannerElementLocation: `${currentPath}/reconstructive-banner.js`,
  urimPattern: `${currentPath}/tests/<datetime>/<urir>`,
});

// Add any custom exclusions or modify or delete default ones
// > reconstructive.exclusions;
// < {
// <   notGet: f (event) => boolean,
// <   bannerElement: f (event) => boolean,
// <   localResource: f (event) => boolean
// < }


// This is not necessary, but can be useful for debugging or in future
self.addEventListener('install', (event) => {
  console.log('ServiceWorker installed');
});

// This is not necessary, but can be useful for debugging or in future
self.addEventListener('activate', (event) => {
  console.log('ServiceWorker Activated');
});

self.addEventListener('fetch', (event) => {
  // Add any custom logic here to conditionally call the reroute function
  reconstructive.reroute(event);
});
