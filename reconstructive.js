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
      return !(event.request.url.startsWith(config.mementoPathPrefix) || event.request.referrer.startsWith(config.mementoPathPrefix));
    }
  };

  function shouldExclude(event, config) {
    return Object.keys(exclusions).some((key) => {
      if (exclusions[key](event, config)) {
        console.log('Exclusion matched:', key)
        return true;
      }
      return false;
    });
  }

  function derivedConfig() {
    config.mementoPathPrefix = config.mementoPath.substr(0, config.mementoPath.indexOf('<'));
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
    // TODO: Implement rerouting logic
    request = new Request(event.request.url);
    event.respondWith(
      fetch(request)
        .then(serverFetch, serverFailure)
        .catch(serverFailure)
    );
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
