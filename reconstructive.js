console.log('Reconstructive downloaded');

var reconstructive = (function() {

  let config = {
    mementoPath: '/memento/<datetime>/<urir>',
    showBanner: false,
    tryOriginalMemento: false
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
    return Object.keys(exclusions).some((key) => {
      if (exclusions[key](event, config)) {
        console.log('Exclusion matched:', key, event);
        return true;
      }
      return false;
    });
  }

  function derivedConfig() {
    config.origin = self.location.origin;
    config.mementoPathPrefix = config.mementoPath.substr(0, config.mementoPath.indexOf('<'));
    config.mementoEndpoint = config.origin + config.mementoPathPrefix;
    config.urimPattern = config.origin + config.mementoPath;
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
        .then(serverFetch, serverFailure)
        .catch(serverFailure)
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
    return new Request(urim, {redirect: 'manual'});
  }

  function serverFetch(response) {
    console.log('Fetched from server:', response);
    return response;
  }

  function serverFailure() {
    console.log('Fetching from server failed');
    return new Response('<h1>Service Unavailable</h1>', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/html'
      })
    });
  }

  function rewrite(request, response) {
    // TODO: Make any necessary changes in the response
    return response;
  }

  function createBanner(request, response) {
    // TODO: Add a banner to the response
    return response;
  }

  return {
    exclusions: exclusions,
    updateConfig: updateConfig,
    reroute: reroute,
    rewrite: rewrite,
    createBanner: createBanner
  };

})();
