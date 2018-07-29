console.log('ServiceWorker downloaded');

// This makes a class module available named "Reconstructive"
importScripts('reconstructive.js');

// Create a Reconstructive instance with optionally customized configurations
// const rc = new Reconstructive({
//   id: `${NAME}:${VERSION}`,
//   urimPattern: `${self.location.origin}/memento/<datetime>/<urir>`,
//   bannerElementLocation: `${self.location.origin}/reconstructive-banner.js`,
//   bannerLogoLocation: `${self.location.origin}/resources/reconstructive-logo.svg`,
//   showBanner: false,
//   debug: false
// });
const currentPath = self.location.href.substring(0, self.location.href.lastIndexOf('/'));
const rc = new Reconstructive({
  debug: true,
  showBanner: true,
  bannerElementLocation: `${currentPath}/reconstructive-banner.js`,
  bannerLogoLocation: `${currentPath}/resources/reconstructive-logo.svg`,
  urimPattern: `${currentPath}/tests/<datetime>/<urir>`
});

// Add any custom exclusions or modify or delete default ones
// > rc.exclusions;
// < {
// <   notGet: function(FetchEvent) => boolean,
// <   bannerElement: function(FetchEvent) => boolean,
// <   localResource: function(FetchEvent) => boolean
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
  // Add any custom logic here to conditionally call the reroute method
  rc.reroute(event);
});
