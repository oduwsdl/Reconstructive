var reconstructive = (function() {
  const NAME = 'Reconstructive',
        VERSION = '0.1';

  let config = {
    id: `${NAME}:${VERSION}`,
    urimPattern: self.location.origin + '/memento/<datetime>/<urir>',
    showBanner: false
  };

  let exclusions = {
    notGet: function(event, config) {
      return event.request.method != 'GET';
    },
    localResource: function(event, config) {
      return !(config.urimRegex.test(event.request.url) || config.urimRegex.test(event.request.referrer));
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
    config.urimRegex = new RegExp('^' + config.urimPattern.replace('<datetime>', '(\\d{14})').replace('<urir>', '(.*)') + '$');
  }
  derivedConfig();

  function init(opts) {
    if(opts instanceof Object) {
      Object.assign(config, opts);
      derivedConfig();
      console.log(`${NAME}:${VERSION} initialized with supplied configs`);
    } else {
      console.warn('Expected an object not a', typeof opts);
    }
  }

  function reroute(event) {
    if (shouldExclude(event, config)) return;
    if (!config.urimRegex.test(event.request.url)) {
      let urim = createUrim(event);
      console.log('Locally redirecting to:', urim, event);
      event.respondWith(async urim => {
        return localRedirect(urim);
      });
    } else {
      request = createRequest(event);
      event.respondWith(
        fetch(request)
        .then(response => {
          return fetchSuccess(event, response, config);
        })
        .catch(fetchFailure)
      );
    }
  }

  function createUrim(event) {
    let [, datetime, refUrir] = event.request.referrer.match(config.urimRegex);
    if (isNaN(datetime)) {
      [datetime, refUrir] = [refUrir, datetime];
    }
    let urir = new URL(event.request.url);
    if (urir.origin == self.location.origin) {
      refOrigin = refUrir.match(/^(https?:\/\/)?[^\/]+/)[0];
      urir = refOrigin + urir.pathname + urir.search;
    } else {
      urir = urir.href;
    }
    return config.urimPattern.replace('<datetime>', datetime).replace('<urir>', urir);
  }

  function createRequest(event) {
    let headers = cloneHeaders(event.request.headers);
    headers.set('X-ServiceWorker', config.id);
    return new Request(event.request.url, {headers: headers, redirect: 'manual'});
  }

  function cloneHeaders(original) {
    let headers = new Headers();
    for (let hdr of original.entries()) {
      headers.append(hdr[0], hdr[1]);
    }
    return headers;
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

  function localRedirect(urim) {
    return new Response('<h1>Locally Redirecting</h1><p>' + urim + '</p>', {
      status: 302,
      statusText: 'Found',
      headers: new Headers({
        'Location': urim,
        'Content-Type': 'text/html'
      })
    });
  }

  function rewrite(event, response, config) {
    // TODO: Make necessary changes in the response
    if (config.showBanner && response.headers.get('Content-Type') == 'text/xml') {
      let banner = createBanner(event, response, config);
      // TODO: Add the banner markup in the appropriate place
    }
    return response;
  }

  function createBanner(event, response, config) {
    // TODO: Add a genric banner markup
    return '';
  }

  function updateRewriter(fn) {
    if (fn instanceof Function) {
      rewrite = fn;
    } else {
      console.warn('Expected a function not a', typeof fn);
    }
  }

  function bannerCreator(fn) {
    if (fn instanceof Function) {
      createBanner = fn;
    } else {
      console.warn('Expected a function not a', typeof fn);
    }
  }

  return {
    init: init,
    exclusions: exclusions,
    reroute: reroute,
    updateRewriter: updateRewriter,
    bannerCreator: bannerCreator
  };

})();
