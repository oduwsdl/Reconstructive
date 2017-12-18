console.log('Reconstructive downloaded');

var reconstructive = (function() {

  let config = {
    version: 'reconstructive.js:v1',
    urimPattern: self.location.origin + '/memento/<datetime>/<urir>',
    showBanner: false
  };

  let exclusions = {
    notGet: function(event, config) {
      return event.request.method != 'GET';
    },
    localResource: function(event, config) {
      return !(event.request.url.startsWith(config.mementoEndpoint) || event.request.referrer.startsWith(config.mementoEndpoint));
    }
  };

  function shouldExclude(event, config) {
    return Object.keys(exclusions).some(key => {
      if (exclusions[key](event, config)) {
        console.log('Exclusion found:', key, event);
        return true;
      }
      return false;
    });
  }

  function derivedConfig() {
    config.mementoEndpoint = config.urimPattern.substr(0, config.urimPattern.indexOf('<'));
    config.datetimePattern = new RegExp('^' + config.mementoEndpoint + '(\\d{14})');
  }
  derivedConfig();

  function updateConfig(opts) {
    if(opts instanceof Object) {
      Object.assign(config, opts);
    }
    derivedConfig();
    console.log('Reconstructive configs updated');
  }

  function reroute(event) {
    if (shouldExclude(event, config)) return;
    request = createUrimRequest(event);
    event.respondWith(
      fetch(request)
        .then(response => {
          return fetchSuccess(event, response, config);
        })
        .catch(fetchFailure)
    );
  }

  function createUrimRequest(event) {
    let urim = event.request.url;
    if (!urim.startsWith(config.mementoEndpoint)) {
      let match = event.request.referrer.match(config.datetimePattern);
      if (!match) {
        match = ['Current datetime', (new Date()).toISOString().replace(/\D/g, '').substring(0, 14)];
        console.log('No datetime found, fallback to now:', event);
      }
      urim = config.urimPattern.replace('<datetime>', match[1]).replace('<urir>', urim);
    }
    let headers = new Headers();
    for (let hdr of event.request.headers.entries()) {
      headers.append(hdr[0], hdr[1]);
    }
    headers.set('X-ServiceWorker', config.version);
    return new Request(urim, {headers: headers, redirect: 'manual'});
  }

  function fetchSuccess(event, response, config) {
    console.log('Fetched from server:', response);
    if (response.ok) {
      return rewrite(event, response, config);
    }
    return response;
  }

  function fetchFailure(error) {
    console.log(error);
    return new Response('<h1>Service Unavailable</h1>', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/html'
      })
    });
  }

  function rewrite(event, response, config) {
    // TODO: Make necessary changes in the response
    if (config.showBanner && response.headers.get('Content-Type') == 'text/xml') {
      let banner = createBanner(event, rewritten, config);
      // TODO: Add the banner markup in the appropriate place
    }
    return response;
  }

  function createBanner(event, response, config) {
    // TODO: Add a genric banner markup
    return '';
  }

  return {
    exclusions: exclusions,
    updateConfig: updateConfig,
    reroute: reroute,
    rewrite: rewrite,
    createBanner: createBanner
  };

})();
