console.log('Reconstructive downloaded');

var reconstructive = (function() {

  let mementoPath = '/memento/<datetime>/<urir>',
      showBanner = false,
      tryOriginalMemento = false;

  function init(conf) {
    if(conf instanceof Object) {
      ({
        mementoPath = mementoPath,
        showBanner = showBanner,
        tryOriginalMemento = tryOriginalMemento
      } = conf);
    }
    console.log('Reconstructive initialized');
  }

  function reroute(event) {
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
    init: init,
    reroute: reroute,
    rewrite: rewrite,
    createBanner: createBanner
  };

})();
