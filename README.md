# Reconstructive

Reconstructive is a [ServiceWorker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) module for client-side reconstruction of composite [mementos](https://tools.ietf.org/html/rfc7089) by rerouting resource requests to corresponding archived copies.
This is an implementation of a [published research paper](http://www.cs.odu.edu/~mln/pubs/jcdl-2017/jcdl-2017-alam-service-worker.pdf).
This can be used in archival replay systems such as [IPWB](https://github.com/oduwsdl/ipwb) or in the UI of memento aggregators such as [MemGator](https://github.com/oduwsdl/memgator).

## Getting started

Assuming that your ServiceWorker script (e.g., `serviceworker.js`) is already registered, add the following lines in that script.

```js
importScripts('https://oduwsdl.github.io/reconstructive/reconstructive.js');

self.addEventListener('fetch', Reconstructive.reroute);
```

This will start monitoring every request originated from its scope and reroute them to their appropriate mementos at `/memento/<datetime>/<urir>` as necessary.
However, the default rerouting might not work for every archival replay system.
So, Reconstructive allows customization to fit to different needs.
