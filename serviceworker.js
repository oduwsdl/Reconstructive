console.log('ServiceWorker downloaded');

// This makes a module available named "reconstructive"
importScripts('reconstructive.js');

// Customize configs
// reconstructive.init({
//   id: `${NAME}:${VERSION}`,
//   debug: false,
//   urimPattern: self.location.origin + '/memento/<datetime>/<urir>',
//   showBanner: false
// });
reconstructive.init({
  debug: true,
  urimPattern: self.location.href.substring(0, self.location.href.lastIndexOf('/')) + '/archived/<datetime>/<urir>'
});

// Add any custom exclusions or modify or delete default ones
//> reconstructive.exclusions;
//< {
//<   notGet: f (event, config),
//<   localResource: f (event, config)
//< }

// Pass a custom function to generate banner markup
// reconstructive.bannerCreator(f (event, response, config));
// Or update the rewriting logic
// reconstructive.updateRewriter(f (event, response, config));

// This is not necessary, but can be useful for debugging or in future
self.addEventListener("install", function(event) {
  console.log('ServiceWorker installed');
});

// This is not necessary, but can be useful for debugging or in future
self.addEventListener("activate", function(event) {
  console.log('ServiceWorker Activated');
});

self.addEventListener("fetch", function(event) {
  // Add any custom logic here to conditionally call the reroute function
  reconstructive.reroute(event);
});
