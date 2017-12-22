# Reconstructive

Traditionally, web archival replay systems rewrite link and resource references in HTML/CSS/JavaScript responses so that they resolve to their corresponding archival version.
Failure to do so would result in a broken rendering of archived pages (composite mementos) as the embedded resource references might resolve to their live version or an invalid location.
With the growing use of JavaScript in web applications, often resources are injected dynamically, hence rewriting such references is not possible from the server side.
To mitigate this issue, some JavaScript is injected in the page that overrides the global namespace to modify the DOM and monitor every network activity.
We proposed a ServiceWorker-based solution to this issue that requires no server-side rewriting, but catches every network request, even those that were initiated due to dynamic resource injection.

Reconstructive is a [ServiceWorker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) module for client-side reconstruction of composite [mementos](https://tools.ietf.org/html/rfc7089) ) by rerouting resource requests to corresponding archived copies.
This is an implementation of a [published research paper](http://www.cs.odu.edu/~mln/pubs/jcdl-2017/jcdl-2017-alam-service-worker.pdf).
This can be used in archival replay systems such as [IPWB](https://github.com/oduwsdl/ipwb) or in the UI of memento aggregators such as [MemGator](https://github.com/oduwsdl/memgator).

## Getting Started

Assuming that your ServiceWorker script (e.g., `serviceworker.js`) is already registered, add the following lines in that script.

```js
importScripts('https://oduwsdl.github.io/reconstructive/reconstructive.js');

self.addEventListener('fetch', Reconstructive.reroute);
```

This will start monitoring every request originated from its scope and reroute them to their appropriate mementos at `/memento/<datetime>/<urir>` as necessary.
However, the default rerouting might not work for every archival replay system.
So, Reconstructive allows customization to fit to different needs.

## Configuration and Customization

When the script is imported, it provides a module named `Reconstructive`.
The module has following public members:

* `init`           - Initialization fucntion to update configs.
* `exclusions`     - Object of rerouting exclusion functions.
* `reroute`        - Callback function to be bound on fetch event.
* `updateRewriter` - Setter function to override rewrite() function.
* `bannerCreator`  - Setter function to override createBanner() function.

### Update Configurations

The `init()` function is a setter that allows changing private configuration options.
It merges supplied options into the existing configurations.
Let's change some options:

```js
// Following is the default config object.
// config = {
//   id: `${NAME}:${VERSION}`,
//   urimPattern: `${self.location.origin}/memento/<datetime>/<urir>`,
//   showBanner: false,
//   debug: false
// }
Reconstructive.init({
  urimPattern: `${self.location.origin}/archived/<datetime>/<urir>`,
  showBanner: true,
  debug: true,
  customColor: '#0C383B'
});
```

We have updated three existing options and added a new one, `customColor`, which we can use later in our custom logic.
There is also a derived option `config.urimRegex` available that is the RegExp form of the `config.urimPattern` which is updated automatically.

### Adding Exclusions

`Reconstructive.exclusions` is a publicly exposed object of functions.
Add more members to the object to add more exclusions or modify/delete existing ones.

```js
// Following is the default exclusions object.
// exclusions = {
//   notGet: (event, config) => event.request.method != 'GET',
//   localResource: (event, config) => !(config.urimRegex.test(event.request.url) || config.urimRegex.test(event.request.referrer))
// }
Reconstructive.exclusions.bannerLogo = (event, config) => event.request.url.endsWith('replay-banner-logo.png');
```

We have added a new exclusion named `bannerLogo` which will return `true` if the requested URL ends with `replay-banner-logo.png`.
This exclusion will ensure that the request will not be routed to an archived version of the logo.
In a practical application such exclusion rules should be kept very tight to avoid any false positives.

### Custom Rerouting

`Reconstructive` does not register itself as a ServiceWorker, instead it is added as a module to an existing ServiceWorker for archival replay rerouting logic.
Hence, it is possible to have some custom ServiceWorker logic in place while selectively calling `reroute()` function on some requests.

```js
self.addEventListener('fetch', function(event) {
  if (event.requests.url.startsWith(`https://example.com/api/`)) {
    event.respondWith(fetch(event.request, {
      mode: 'cors'
    }));
  } else {
    Reconstructive.reroute(event);
  }
});
```

### Custom Rewriting

Reconstructive has a built-in private `rewrite()` function that tries to make necessary changes in the HTML pages to fix some common replay issues and changes hyperlinks to their archival context.
However, there might be times when you need some custom rewriting logic in your archival replay system.
The `updateRewriter()` public function can be used to override private `rewrite()` function with a custom one.

```js
let customRewriter = (response, event, config) => {
  let customResponse = new Response();
  // Do something with the original response to create a custom response.
  return customResponse;
}
Reconstructive.updateRewriter(customRewriter);
```

*NOTE: Currently, no rewriting is implemented in the default `rewrite()` function, but overriding with a custom implementation is still possible.*

### Custom Banner

Reconstructive has a built-in private `createBanner()` function that creates a banner markup using [Web Components](https://www.webcomponents.org/).
This markup is then injected into navigational HTML pages by the `rewrite()` function if the `showBanner` configuration option is set to `true`.
However, it is possible to override the private `createBanner()` function using the public `bannerCreator()` function.
Note that the banner is included by the built-in `rewrite()` function, which if overriden, may not include the banner unless `rewrite()` is called by the `customRewriter()` too.

```js
let customBannerCreator = (response, event, config) => {
  return `<custom-replay-banner background="${config.customColor}"></custom-replay-banner>`;
}
Reconstructive.bannerCreator(customRewriter);
```

*NOTE: Currently, banner inclusion functionality is not implemented. You can archive it using a `customRewriter()` function meanwhile.*
