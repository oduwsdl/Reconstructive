/**
 * [Reconstructive]{@link https://github.com/oduwsdl/reconstructive} is a ServiceWorker module for client-side reconstruction of composite mementos.
 * It reroutes embedded resource requests to their approprieate arcival version without any URL rewriting.
 * It also provides functionality to add custom archival banners or rewrite hyperlinks on the client-side.
 *
 * @overview  Reconstructive is a module to be used in a ServiceWorker of an archival replay.
 * @author    Sawood Alam <ibnesayeed@gmail.com>
 * @version   0.3
 * @license   MIT
 * @copyright ODU Web Science / Digital Libraries Research Group 2017
 */
var Reconstructive = (function() {
  const NAME = 'Reconstructive',
        VERSION = '0.3';

  /**
   * config - Primary config object that can be customized using init() fucntion.
   *
   * @private
   * @property {string}  id          - Identifier of the module, sent to the server as X-ServiceWorker header. Defaults to the name and version of the module.
   * @property {string}  urimPattern - The format of URI-Ms (e.g., http://example.com/archive/<datetime>/<urir>).
   * @property {boolean} showBanner  - Whether or not to show an archival banner. Defaults to false.
   * @property {boolean} debug       - Whether or not to show debug messages in the console. Defaults to false.
   */
  let config = {
    id: `${NAME}:${VERSION}`,
    urimPattern: `${self.location.origin}/memento/<datetime>/<urir>`,
    showBanner: false,
    debug: false
  };

  /**
   * derivedConfig - Derives some config properties from the existing.
   *                 Executed on module load and init() call.
   *
   * @private
   */
  function derivedConfig() {
    config.urimRegex = new RegExp('^' + config.urimPattern.replace('<datetime>', '(\\d{14})').replace('<urir>', '(.*)') + '$');
  }
  // Invovke immediately to ensure derived configs are populated even if init() is not called by the user.
  derivedConfig();

  /**
   * init - Customize configs by supplying an object.
   *        The supplied object is merged into the existing config.
   *        Overwrites exisiting properties and adds any exta ones.
   *        Logs the id of the module for debugging.
   *        Logs a warning if the supplied argument is not an object.
   *
   * @public
   * @param  {objec} opts - An options object to customize the config object.
   */
  function init(opts) {
    if(opts instanceof Object) {
      Object.assign(config, opts);
      derivedConfig();
      config.debug && console.log(`${NAME}:${VERSION} initialized with supplied configs`);
    } else {
      console.warn('Expected an object not a', typeof opts);
    }
  }

 /**
  * exclusions - An object of functions to check whether the request should be excluded from being rerouted.
  *              Add more memebers to the object to add more exclusions or modify/delete existing ones.
  *              The property name can be anything descriptive of the particular exclusion, which will be shown in debug logs.
  *              Each member function is called with the fetch event and config object as parameters.
  *              If any memeber returns true, the fetch event is excluded from being rerouted.
  *
  * @public
  */
  let exclusions = {
    notGet: (event, config) => event.request.method != 'GET',
    localResource: (event, config) => !(config.urimRegex.test(event.request.url) || config.urimRegex.test(event.request.referrer))
  };

  /**
   * shouldExclude - Iterates over all the members of the exclusions object and returns true if any of the members return true, otherwise returns false.
   *                 Logs the first matching exclusion for debugging, if any.
   *
   * @private
   * @param   {FetchEvent} event  - The fetch event.
   * @param   {object}     config - The config object.
   * @return  {boolean}           - Should the request be rerouted?
   */
  function shouldExclude(event, config) {
    return Object.keys(exclusions).some(key => {
      if (exclusions[key](event, config)) {
        config.debug && console.log('Exclusion found:', key, event.request.url);
        return true;
      }
      return false;
    });
  }

  /**
   * createUrim - Creates a potential URI-M based on the requested URL and the referrer URL for request rerouting.
   *
   * @private
   * @param   {FetchEvent} event  - The fetch event.
   * @return  {string}            - A potential URI-M.
   */
  function createUrim(event) {
    // Extract datetime and the URI-R of the referrer.
    let [, datetime, refUrir] = event.request.referrer.match(config.urimRegex);
    // Swap the two extracted values if the datetime pattern appeared after the URI-R.
    // This is not a common practice, but possible if an archive uses query parameters instead of paths.
    if (isNaN(datetime)) {
      [datetime, refUrir] = [refUrir, datetime];
    }
    let urir = new URL(event.request.url);
    // This condition will match when the request was initiated from an absolute path and fail if it was an absolute URL.
    if (urir.origin == self.location.origin) {
      // If it was an absolute path then referrer's origin was used.
      // We need to replace it with the origin of the referrer's URI-R instead.
      // The RegExp used will capture the origin with the protocol, if any (http, https, or BLANK).
      let refOrigin = refUrir.match(/^(https?:\/\/)?[^\/]+/)[0];
      urir = refOrigin + urir.pathname + urir.search;
    } else {
      urir = urir.href;
    }
    return config.urimPattern.replace('<datetime>', datetime).replace('<urir>', urir);
  }

  /**
   * createRequest - Creates a new request based on the original.
   *                 Coppies all the headers from the original request.
   *                 Adds X-ServiceWorker header with the id of the module.
   *                 Sets the redirect mode to manual to ensure proper origin boundaries.
   *
   * @private
   * @param   {FetchEvent} event  - The fetch event.
   * @return  {Request}           - A new request object.
   */
  function createRequest(event) {
    let headers = cloneHeaders(event.request.headers);
    headers.set('X-ServiceWorker', config.id);
    return new Request(event.request.url, {headers: headers, redirect: 'manual'});
  }

  /**
   * cloneHeaders - Clones provided request or response headers.
   *
   * @private
   * @param   {Headers} original - Origina request or response headers.
   * @return  {Headers}          - A clone of the supplied headers.
   */
  function cloneHeaders(original) {
    let headers = new Headers();
    for (let hdr of original.entries()) {
      headers.append(hdr[0], hdr[1]);
    }
    return headers;
  }

  /**
   * localRedirect - Redirects a non-URI-M request to its poytential URI-M locally.
   *                 The potential URI-M is generated using createUrim().
   *                 This function only returns a synthetic redirection response.
   *
   * @private
   * @async
   * @param  {string}   urim - A potential URI-M.
   * @return {Response}      - A 302 redirection response to the potential URI-M.
   */
  async function localRedirect(urim) {
    config.debug && console.log('Locally redirecting to:', urim);
    return new Response(`<h1>Locally Redirecting</h1><p>${urim}</p>`, {
      status: 302,
      statusText: 'Found',
      headers: new Headers({
        'Location': urim,
        'Content-Type': 'text/html'
      })
    });
  }

  /**
   * fetchFailure - The callback function on network failure of the server fetch.
   *                Logs the failure reason for debugging.
   *                Returns a synthetic 503 Service Unavailable response.
   *
   * @private
   * @param   {Error}    error - The exception rasied on fetching from the server.
   * @return  {Response}       - A 503 Service Unavailable response.
   */
  function fetchFailure(error) {
    config.debug && console.log(error);
    return new Response('<h1>Service Unavailable</h1>', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/html'
      })
    });
  }

  /**
   * fetchSuccess - The callback function on a successful fetch from the server.
   *                Calls the rewrite() function if the response code is 2xx.
   *                Logs the response for debugging.
   *                Returns a potentially modified response. a potentially modified response.
   *
   * @private
   * @param   {FetchEvent} event    - The fetch event.
   * @param   {Response}   response - Original response object.
   * @param   {object}     config   - The config object.
   * @return  {Response}            - Potentially modified response.
   */
  function fetchSuccess(event, response, config) {
    config.debug && console.log('Fetched from server:', resp
    // Inject a banner only on navigational HTML pages when onse);
    if (response.ok) {
      return rewrite(event, response, config);
    }
    return response;
  }

  /**
   * reroute - The callback fucntion on the fetch event.
   *           Logs the fetch event for debugging.
   *           Checks for any rerouting exclusions.
   *           If the request URL is not a URI-M, responds with a redirect to the potential URI-M.
   *           Creates a new request with certain modifications in the original then fetches it from the server.
   *           Both success and failure responses are dealt with approprietely.
   *
   * @public
   * @param  {FetchEvent} event - The fetch event.
   */
  function reroute(event) {
    config.debug && console.log('Rerouting requested', event);
    // Let the browser deal with the requests if it matches a rerouting exclusion.
    if (shouldExclude(event, config)) return;
    // This condition will match if the request URL is not a URI-M.
    if (!config.urimRegex.test(event.request.url)) {
      let urim = createUrim(event);
      event.respondWith((urim => localRedirect(urim))(urim));
    } else {
      let request = createRequest(event);
      event.respondWith(
        fetch(request)
          .then(response => fetchSuccess(event, response, config))
          .catch(fetchFailure)
      );
    }
  }

  /**
   * rewrite - Rewrites the fetched response when necessary.
   *           Potential uses are to fix certain replay issues, adding an archival banner, or modifying hyperlinks.
   *           When the showBanner config is set to true, it tries to add a banner in navigational HTML pages.
   *           Returns a potentially modified response.
   *
   * @private
   * @param   {FetchEvent} event    - The fetch event.
   * @param   {Response}   response - Original response object.
   * @param   {object}     config   - The config object.
   * @return  {Response}            - Potentially modified response.
   */
  function rewrite(event, response, config) {
    // TODO: Make necessary changes in the response
    // Inject a banner only on navigational HTML pages when showBanner config is set to true.
    if (config.showBanner && event.request.mode == 'navigate' && /text\/html/i.test(response.headers.get('Content-Type'))) {
      let banner = createBanner(event, response, config);
      // TODO: Add the banner markup in the appropriate place
    }
    return response;
  }

  /**
   * createBanner - Creates a string reperesenting an HTML element to be injected in the response's HTML body.
   *
   * @private
   * @param   {FetchEvent} event    - The fetch event.
   * @param   {Response}   response - Original response object.
   * @param   {object}     config   - The config object.
   * @return  {string}              - Potentially modified response.
   */
  function createBanner(event, response, config) {
    // TODO: Add a genric banner markup
    return '';
  }

  /**
   * updateRewriter - A setter like function to override private rewrite() function.
   *                  It enables users to plug their custom rewriting logic.
   *                  The only parameter needs to have the same signature as the rewrite() function.
   *                  Logs a warning if the supplied argument is not a function.
   *
   * @public
   * @param  {function} fn - A function with the signature: (event, response, config) => Response.
   */
  function updateRewriter(fn) {
    if (fn instanceof Function) {
      rewrite = fn;
    } else {
      console.warn('Expected a function not a', typeof fn);
    }
  }

  /**
   * bannerCreator - A setter like function to override private createBanner() function.
   *                 It enables users to plug their custom banner creation logic.
   *                 The only parameter needs to have the same signature as the createBanner() function.
   *                 Logs a warning if the supplied argument is not a function.
   *
   * @public
   * @param  {function} fn - A function with the signature: (event, response, config) => string.
   */
  function bannerCreator(fn) {
    if (fn instanceof Function) {
      createBanner = fn;
    } else {
      console.warn('Expected a function not a', typeof fn);
    }
  }

  /**
   * Reconstructive - The object that the module returns with all the public members.
   *
   * @public
   * @namespace Reconstructive
   * @property  {function}     init           - Initialization fucntion to update configs.
   * @property  {object}       exclusions     - Object of rerouting exclusion functions.
   * @property  {function}     reroute        - Callback function to be bound on fetch event.
   * @property  {function}     updateRewriter - Setter function to override rewrite() function.
   * @property  {function}     bannerCreator  - Setter function to override createBanner() function.
   */
  return {
    init: init,
    exclusions: exclusions,
    reroute: reroute,
    updateRewriter: updateRewriter,
    bannerCreator: bannerCreator
  };
})();
