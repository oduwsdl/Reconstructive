/**
 * [Reconstructive](https://github.com/oduwsdl/Reconstructive) is a [ServiceWorker](https://www.w3.org/TR/service-workers/) module for client-side reconstruction of composite mementos.
 * It reroutes embedded resource requests to their appropriate archival version without any URL rewriting.
 * It also provides functionality to add custom archival banners or rewrite hyperlinks on the client-side.
 * Use it in a ServiceWorker as illustrated below:
 *
 * ```js
 * importScripts('https://oduwsdl.github.io/Reconstructive/reconstructive.js');
 * const rc = new Reconstructive();
 * self.addEventListener('fetch', rc.reroute);
 * ```
 *
 * @overview  Reconstructive is a module to be used in a ServiceWorker of an archival replay.
 * @author    Sawood Alam <ibnesayeed@gmail.com>
 * @license   MIT
 * @copyright ODU Web Science / Digital Libraries Research Group 2017
 */
class Reconstructive {
  /**
   * Creates a new Reconstructive instance with optional configurations.
   *
   * @param {{id: string, urimPattern: string, bannerElementLocation: string, bannerLogoLocation: string, showBanner: boolean, debug: boolean}} [config] - Configuration options
   */
  constructor(config) {
    /**
     * Name of the module.
     * Treated as a constant.
     *
     * @type {string}
     */
    this.NAME = 'Reconstructive';

    /**
     * Version of the module.
     * Treated as a constant.
     *
     * @type {string}
     */
    this.VERSION = '0.6.0';

    /**
     * Identifier of the module, sent to the server as X-ServiceWorker header.
     * Defaults to the name and version of the module.
     *
     * @type {string}
     */
    this.id = `${this.NAME}:${this.VERSION}`;

    /**
     * The format of URI-Ms (e.g., http://example.com/archive/<datetime>/<urir>).
     *
     * @type {string}
     */
    this.urimPattern = `${self.location.origin}/memento/<datetime>/<urir>`;

    /**
     * The URL or absolute path of the JS file that defines custom banner element.
     * Only necessary if showBanner is set to true.
     *
     * @type {string}
     */
    this.bannerElementLocation = `${self.location.origin}/reconstructive-banner.js`;

    /**
     * The URL or absolute path of the logo image to appear in the banner.
     * An empty value will render the default Reconstructive logo as inline SVG.
     * Only necessary if showBanner is set to true.
     *
     * @type {string}
     */
    this.bannerLogoLocation = '';

    /**
     * The URL or absolute path to link from the logo image in the banner.
     * This should generally be set to the address of the homepage.
     * Only necessary if showBanner is set to true.
     *
     * @type {string}
     */
    this.bannerLogoHref = '/';

    /**
     * Whether or not to show an archival banner.
     * Defaults to false.
     *
     * @type {boolean}
     */
    this.showBanner = false;

    /**
     * Whether or not to show debug messages in the console.
     * Defaults to false.
     *
     * @type {boolean}
     */
    this.debug = false;

    // Iterate over the supplied configuration object to overwrite defaults and add new properties
    if (config instanceof Object) {
      for (const [k, v] of Object.entries(config)) {
        /** @ignore **/
        this[k] = v;
      }
    }

    /**
     * A private object with varius RegExp properties (possibly derived from other properties) for internal use.
     *
     * @private
     * @type    {{urimPattern: RegExp, absoluteReference: RegExp, bodyEnd: RegExp}}
     */
    this._regexps = {
      urimPattern: new RegExp(`^${this.urimPattern.replace('<datetime>', '(\\d{14})').replace('<urir>', '(.*)')}$`),
      absoluteReference: new RegExp(`(<(iframe|a).*?\\s+(src|href)\\s*=\\s*["']?)(https?:\/\/[^'"\\s]+)(.*?>)`, 'ig'),
      bodyEnd: new RegExp('<\/(body|html)>', 'i')
    };

    /**
     * An object of functions to check whether the request should be excluded from being rerouted.
     * Add more members to the object to add more exclusions or modify/delete existing ones.
     * The property name can be anything descriptive of the particular exclusion, which will be shown in debug logs.
     * Each member function is called with the fetch event as parameters.
     * If any member returns true, the fetch event is excluded from being rerouted.
     *
     * @type {{notGet: function(event: FetchEvent): boolean, bannerElement: function(event: FetchEvent): boolean, bannerLogo: function(event: FetchEvent): boolean, homePage: function(event: FetchEvent): boolean, localResource: function(event: FetchEvent): boolean}}
     */
    this.exclusions = {
      notGet: event => event.request.method !== 'GET',
      bannerElement: event => this.showBanner && event.request.url.endsWith(this.bannerElementLocation),
      bannerLogo: event => this.showBanner && this.bannerLogoLocation && event.request.url.endsWith(this.bannerLogoLocation),
      homePage: event => this.showBanner && this.bannerLogoHref && event.request.url === this.bannerLogoHref,
      localResource: event => !(this._regexps.urimPattern.test(event.request.url) || this._regexps.urimPattern.test(event.request.referrer))
    };

    this.debug && console.log(`${this.NAME}:${this.VERSION} initialized:`, this);

    this.fetchFailure = this.fetchFailure.bind(this)
  }

  /**
   * Iterates over all the members of the exclusions object and returns true if any of the members return true, otherwise returns false.
   * Logs the first matching exclusion for debugging, if any.
   *
   * @param  {FetchEvent} event - The fetch event
   * @return {boolean}          - Should the request be rerouted?
   */
  shouldExclude(event) {
    return Object.entries(this.exclusions).some(([exclusionName, exclusionFunc]) => {
      if (exclusionFunc(event)) {
        this.debug && console.log('Exclusion found:', exclusionName, event.request.url);
        return true
      }
      return false
    })
  }

  /**
   * Creates a potential URI-M based on the requested URL and the referrer URL for request rerouting.
   *
   * @param  {FetchEvent} event - The fetch event
   * @return {string}           - A potential URI-M
   */
  createUrim(event) {
    // Extract datetime and the URI-R of the referrer.
    let [datetime, refUrir] = this.extractDatetimeUrir(event.request.referrer);
    let urir = new URL(event.request.url);
    // This condition will match when the request was initiated from an absolute path and fail if it was an absolute URL.
    if (urir.origin === self.location.origin) {
      // If it was an absolute path then referrer's origin was used.
      // We need to replace it with the origin of the referrer's URI-R instead.
      // The RegExp used will capture the origin with the protocol, if any (http, https, or BLANK).
      let refOrigin = refUrir.match(/^(https?:\/\/)?[^\/]+/)[0];
      urir = refOrigin + urir.pathname + urir.search;
    } else {
      urir = urir.href;
    }
    return this.urimPattern.replace('<datetime>', datetime).replace('<urir>', urir);
  }

  /**
   * Extracts datetime and URI-R from a URI-M.
   *
   * @param  {string}   urim - A URI-M
   * @return {string[]}      - An array of datetime and URI-R
   */
  extractDatetimeUrir(urim) {
    let [, datetime, urir] = urim.match(this._regexps.urimPattern);
    // Swap the two extracted values if the datetime pattern appeared after the URI-R.
    // This is not a common practice, but possible if an archive uses query parameters instead of paths.
    if (isNaN(datetime)) {
      return [urir, datetime];
    }
    return [datetime, urir];
  }

  /**
   * Creates a new request based on the original.
   * Copies all the headers from the original request.
   * Adds X-ServiceWorker header with the id of the module.
   * Sets the redirect mode to manual to ensure proper origin boundaries.
   *
   * @param  {FetchEvent} event - The fetch event
   * @return {Request}          - A new request object
   */
  createRequest(event) {
    let headers = this.cloneHeaders(event.request.headers);
    headers.set('X-ServiceWorker', this.id);
    return new Request(event.request.url, {headers: headers, redirect: 'manual'});
  }

  /**
   * Clones provided request or response headers.
   *
   * @param  {Headers} original - Original request or response headers
   * @return {Headers}          - A clone of the supplied headers
   */
  cloneHeaders(original) {
    let headers = new Headers();
    for (const [k, v] of original.entries()) {
      headers.append(k, v);
    }
    return headers;
  }

  /**
   * Redirects a non-URI-M request to its potentially URI-M locally.
   * The potential URI-M is generated using createUrim().
   * This function only returns a synthetic redirection response.
   *
   * @param  {string}            urim - A potential URI-M
   * @return {Promise<Response>}      - A 302 redirection response to the potential URI-M
   */
  localRedirect(urim) {
    this.debug && console.log('Locally redirecting to:', urim);
    return Promise.resolve(new Response(`<h1>Locally Redirecting</h1><p>${urim}</p>`, {
      status: 302,
      statusText: 'Found',
      headers: new Headers({
        'Location': urim,
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/html'
      })
    }));
  }

  /**
   * The callback function on a successful fetch from the server.
   * Calls the rewrite() function if the response code is 2xx.
   * Logs the response for debugging.
   * Resolves to a potentially modified response.
   *
   * @param  {Response}          response - Original response object
   * @param  {FetchEvent}        event    - The fetch event
   * @return {Promise<Response>}          - Potentially modified response
   */
  fetchSuccess(response, event) {
    this.debug && console.log('Fetched from server:', response);
    // Perform a potential rewrite only if the response code is 2xx.
    if (response.ok) {
      return this.rewrite(response, event);
    }
    return Promise.resolve(response);
  }

  /**
   * The callback function on network failure of the server fetch.
   * Logs the failure reason for debugging.
   * Returns a synthetic 503 Service Unavailable response.
   *
   * @param  {Error}    error - The exception raised on fetching from the server
   * @return {Response}       - A 503 Service Unavailable response
   */
  fetchFailure(error) {
    this.debug && console.log(error);
    return new Response('<h1>Service Unavailable</h1>', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/html'
      })
    });
  }

  /**
   * Rewrites the fetched response when necessary.
   * Potential uses are to fix certain replay issues, adding an archival banner, or modifying hyperlinks.
   * When the showBanner config is set to true, it tries to add a banner in navigational HTML pages.
   * Resolves to a potentially modified response.
   *
   * @param  {Response}          response - Original response object
   * @param  {FetchEvent}        event    - The fetch event
   * @return {Promise<Response>}          - Potentially modified response
   */
  rewrite(response, event) {
    // TODO: Make necessary changes in the response
    if (/text\/html/i.test(response.headers.get('Content-Type'))) {
      let headers = this.cloneHeaders(response.headers);
      let init = {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      };
      return response.text().then(body => {
        const [datetime] = this.extractDatetimeUrir(response.url);
        // Replace all absolute URLs in src and href attributes of <iframe> and <a> elements with corresponding URI-Ms to avoid replay and navigation issues.
        body = body.replace(this._regexps.absoluteReference, `$1${this.urimPattern.replace('<datetime>', datetime).replace('<urir>', '$4')}$5`);
        // Inject a banner only on navigational HTML pages when showBanner config is set to true.
        if (this.showBanner && event.request.mode === 'navigate') {
          const banner = this.createBanner(response, event);
          // Try to inject the banner markup before closing </body> tag, fallback to </html>.
          // If none of the two closing tags are found, append it to the body.
          if (this._regexps.bodyEnd.test(body)) {
            body = body.replace(this._regexps.bodyEnd, banner+'</$1>');
          } else {
            body += banner;
          }
        }
        return new Response(body, init);
      });
    }
    return Promise.resolve(response);
  }

  /**
   * Creates a string representing an HTML block to be injected in the response's HTML body.
   *
   * @param  {Response}   response - Original response object
   * @param  {FetchEvent} event    - The fetch event
   * @return {string}              - The banner markup
   */
  createBanner(response, event) {
    let mementoDatetime = response.headers.get('Memento-Datetime') || '';
    const [datetime, urir] = this.extractDatetimeUrir(response.url);
    if (!mementoDatetime) {
      mementoDatetime = new Date(`${datetime.slice(0, 4)}-${datetime.slice(4, 6)}-${datetime.slice(6, 8)}T${datetime.slice(8, 10)}:${datetime.slice(10, 12)}:${datetime.slice(12, 14)}Z`).toUTCString()
    }
    // TODO: Extract link parser in a method
    let rels = {};
    const links = response.headers.get('Link');
    if (links) {
      links.replace(/[\r\n]+/g, ' ')
           .replace(/^\W+|\W+$/g, '')
           .split(/\W+</)
           .forEach(l => {
             let segs = l.split(/\W*;\W*/);
             let href = segs.shift();
             let attributes = {};
             segs.forEach(s => {
               let [k, v] = s.split(/\W*=\W*/);
               attributes[k] = v;
             });
             attributes['rel'].split(/\s+/)
                              .forEach(r => {
                                rels[r] = {href: href, datetime: attributes['datetime']};
                              });
           });
    }
    return `
      <script src="${this.bannerElementLocation}"></script>
      <reconstructive-banner logo-src="${this.bannerLogoLocation}"
                             home-href="${this.bannerLogoHref}"
                             urir="${urir}"
                             memento-datetime="${mementoDatetime}"
                             first-urim="${rels.first && rels.first.href || ''}"
                             first-datetime="${rels.first && rels.first.datetime || ''}"
                             last-urim="${rels.last && rels.last.href || ''}"
                             last-datetime="${rels.last && rels.last.datetime || ''}"
                             prev-urim="${rels.prev && rels.prev.href || ''}"
                             prev-datetime="${rels.prev && rels.prev.datetime || ''}"
                             next-urim="${rels.next && rels.next.href || ''}"
                             next-datetime="${rels.next && rels.next.datetime || ''}">
      </reconstructive-banner>
    `;
  }

  /**
   * The callback function on the fetch event.
   * Logs the fetch event for debugging.
   * Checks for any rerouting exclusions.
   * If the request URL is a URI-M then creates a new request with certain modifications in the original request and fetches it from the server.
   * Otherwise, responds with a redirect to the potential URI-M.
   * Both success and failure responses are dealt with appropriately.
   *
   * @param {FetchEvent} event - The fetch event
   */
  reroute(event) {
    this.debug && console.log('Rerouting requested', event);
    // Let the browser deal with the requests if it matches a rerouting exclusion.
    if (this.shouldExclude(event)) return;
    // This condition will match if the request URL is a URI-M.
    if (this._regexps.urimPattern.test(event.request.url)) {
      let request = this.createRequest(event);
      event.respondWith(
        fetch(request)
          .then(response => this.fetchSuccess(response, event))
          .catch(this.fetchFailure)
      );
    } else {
      let urim = this.createUrim(event);
      event.respondWith(this.localRedirect(urim));
    }
  }

}
