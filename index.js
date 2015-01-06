'use strict';

var Pagelet = require('pagelet')
  , qs = require('querystring');

//
// BigPipe depends heavily on the support of JavaScript in browsers as the
// rendering of the page's components is done through JavaScript. When the
// user has JavaScript disabled they will see a blank page instead. To prevent
// this from happening we're injecting a `noscript` tag in to the page which
// forces the `sync` render mode.
//
var noscript = [
  '<noscript>',
  '<meta http-equiv="refresh" content="0; URL={path}?{query}">',
  '</noscript>'
].join('');

//
// Also when we have JavaScript enabled make sure the user doesn't accidentally
// force them selfs in to a `sync` render mode as the URL could have been
// shared through social media.
//
var script = [
  '<script>',
  'if (~location.search.indexOf("no_pagelet_js=1"))',
  'location.href = location.href.replace(location.search, "")',
  '</script>'
].join('');

//
// This basic HEAD/bootstrap pagelet can easily be extended.
// Bootstrap adds specific directives to the HEAD element, which are required
// for BigPipe to function.
//
// - Sets a default set of meta tags in the HEAD element
// - It includes the pipe.js JavaScript client and initializes it.
// - It includes "core" library files for the page (pagelet dependencies).
// - It includes "core" CSS for the page (pagelet dependencies).
// - It adds a noscript meta refresh to force a `sync` method which fully
//   renders the HTML server side.
//
// Do NOT change the name of the bootstrap pagelet or BigPipe will not
// be able to find it in the pagelet collection.
//
Pagelet.extend({
  name: 'bootstrap',
  title: 'BigPipe',
  description: 'Default description for BigPipe\'s pagelets',
  keywords: ['BigPipe', 'pagelets', 'bootstrap'],
  robots: ['index', 'follow'],
  favicon: '/favicon.ico',
  author: 'BigPipe',
  dependencies: '',
  view: 'view.html',

  //
  // Add a meta charset so the browser knows the encoding of the content so it
  // will not buffer it up in memory to make an educated guess. This will ensure
  // that the HTML is shown as fast as possible.
  //
  charset: 'utf-8',

  //
  // Used for proper client side library initialization.
  //
  length: 0,

  //
  // Set a number of properties on the response as it is available to all pagelets.
  // This will ensure the correct amount of pagelets are processed and that the
  // entire queue is written to the client.
  //
  ended: false,
  _queue: [],
  n: 0,

  //
  // Set of keys used by the HTML renderer to deduce the required data.
  //
  keys: [
    'title', 'description', 'keywords', 'robots', 'favicon', 'author',
    'dependencies', 'fallback', 'charset', '_parent', 'length', 'id'
  ],

  /**
   * Render the HTML template with the data provided. Temper provides a minimal
   * templater to handle data in HTML templates. Data has to be specifically
   * provided, properties of `this` are not enumarable and would not be included.
   *
   * @return {String} Generated template.
   * @api public
   */
  html: function html() {
    var bootstrap = this
      , data = this.keys.reduce(function reduce(memo, key) {
          memo[key] = bootstrap[key];
          return memo;
        }, {});

    return this._temper.fetch(this.view).server(data);
  },

  /**
   * Add fragment of HTML to the queue.
   *
   * @param {String} html Output to be send to the response
   * @returns {Pagelet} this
   * @api public
   */
  queue: function queue(html) {
    this._queue.push(html);
    return this;
  },

  /**
   * Adds initial HTML headers to the queue. This method is
   * triggered by the first flush to the response.
   *
   * @returns {Pagelet} this
   * @api private
   */
  headers: function headers() {
    this.debug('Queueing initial headers');
    return this.queue(this.html());
  },

  /**
   * Flush all queued rendered pagelets to the request object.
   *
   * @returns {Pagelet} this
   * @api private
   */
  flush: function flush() {
    this.emit('flush');
    if (!this._queue.length) return this;

    var data = new Buffer(this._queue.join(''), 'utf-8');
    this._queue.length = 0;

    if (data.length) {
      this.debug('Writing %d bytes to response', data.length);
      this._res.write(data, this.emits('flushed'));
    }

    //
    // Optional write confirmation, it got added in more recent versions of
    // node, so if it's not supported we're just going to call the callback
    // our selfs.
    //
    if (this._res.write.length !== 3 || !data.length) this.emit('flushed');
    return this;
  },

  /**
   * Extend the default constructor of the pagelet to set additional defaults
   * based on the provided options.
   *
   * @param {Object} options Optional options.
   * @api public
   */
  constructor: function constructor(options) {
    Pagelet.prototype.constructor.call(this, options);

    options = options || {};
    options.dependencies = options.dependencies || this.dependencies;

    //
    // Store the provided global dependencies.
    //
    if (Array.isArray(options.dependencies)) {
      this.dependencies = options.dependencies.join('');
    }

    var req = options.req || {}
      , uri = req.uri || {}
      , query = req.query || {};

    //
    // Number of pagelets that should be written, increased with 1 as the parent
    // pagelet itself should be written as well.
    //
    this.length = options.children++;

    //
    // The initial flush will trigger writing the bootstrap HTML.
    //
    this.once('flush', this.headers, this);

    //
    // Set the default fallback script, see explanation above.
    //
    this.fallback = 'sync' === options.mode ? script : noscript.replace(
      '{path}',
      uri.pathname || 'http://localhost/'
    ).replace(
      '{query}',
      qs.stringify(this.merge({ no_pagelet_js: 1 }, query))
    );
  }
}).on(module);
