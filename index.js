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
  // Used for proper client side library initialization. Overrules the
  // default pagelet children length getter.
  //
  length: 0,

  //
  // Set of keys used by the HTML renderer to deduce the required data.
  //
  keys: [
    'title', 'description', 'keywords', 'robots', 'favicon', 'author',
    'dependencies', 'fallback', 'contentType', '_parent', 'length', 'id'
  ],

  /**
   * Render the HTML template with the data provided. Temper provides a minimal
   * templater to handle data in HTML templates. Data has to be specifically
   * provided, properties of `this` are not enumarable and would not be included.
   *
   * @return {String} Generated template.
   * @api public
   */
  render: function render() {
    var bootstrap = this
      , data = this.keys.reduce(function reduce(memo, key) {
          memo[key] = bootstrap[key];
          return memo;
        }, {});

    return this._temper.fetch(this.view).server(data);
  },

  /**
   * Add fragment of data to the queue.
   *
   * @param {String} name Pagelet name that queued the content.
   * @param {Mixed} data Output to be send to the response
   * @returns {Pagelet} this
   * @api public
   */
  queue: function queue(name, data) {
    this.length--;

    this._queue.push({
      name: name,
      view: data
    });

    return this;
  },

  /**
   * Joins all the data fragments in the queue.
   *
   * @return {Mixed} Object by pagelet name or HTML string
   * @api private
   */
  join: function join() {
    var pagelet = this
      , html = ~this.contentType.indexOf('text/html')
      , result;

    result = this._queue.reduce(function reduce(memo, fragment) {
      if (!fragment.name || !fragment.view) return memo;
      if (html) return memo + fragment.view;

      memo[fragment.name] = fragment.view;
      return memo;
    }, html ? '' : {});

    if (!html) try {
      result = JSON.stringify(result);
    } catch (error) {
      pagelet.debug('Captured error while stringifying JSON data %s', error);
      result = '';
    }

    this._queue.length = 0;
    return result;
  },

  /**
   * Get the charset fromt the content type.
   *
   * @returns {String} Charset
   * @api private
   */
  get charset() {
    var match = this.contentType.match(/charset="?([^"']+)/);
    return match && match.length > 1 ? match[1] : 'UTF-8';
  },

  /**
   * Flush all queued rendered pagelets to the request object.
   *
   * @returns {Pagelet} this
   * @api private
   */
  flush: function flush(done) {
    this.once('done', done);

    if (this._res.finished) {
      this.emit('done', new Error('Response was closed, unable to flush content'));
    }

    if (!this._queue.length) this.emit('done');
    var data = new Buffer(this.join(), this.charset);

    if (data.length) {
      this.debug('Writing %d bytes of %s to response', data.length, this.charset);
      this._res.write(data, this.emits('done'));
    }

    //
    // Optional write confirmation, it got added in more recent versions of
    // node, so if it's not supported we're just going to call the callback
    // our selfs.
    //
    if (this._res.write.length !== 3 || !data.length) this.emit('done');
  },

  /**
   * Reduce all elements of the current queue to one single element based on
   * the data-pagelet attribute
   *
   * @TODO cleanup
   *
   * @returns {Bootstrap} reference to self
   * @api private
   */
  reduce: function reduce() {
    var i = this._queue.length;

    while (i--) {
      var content = this._queue.pop()
        , match = false
        , base;

      this._queue = this._queue.map(function (fragment) {
        base = fragment.view;

        [
          "data-pagelet='"+ content.name +"'",
          'data-pagelet="'+ content.name +'"',
          'data-pagelet='+ content.name,
        ].forEach(function locate(attribute) {
          var index = base.indexOf(attribute)
            , end;

          //
          // As multiple versions of the pagelet can be included in to one single
          // parent pagelet we need to search for multiple occurrences of the
          // `data-pagelet` attribute.
          //
          match = match || !!~index;
          while (~index) {
            end = base.indexOf('>', index);

            if (~end) {
              end += 1;
              base = base.slice(0, end) + content.view + base.slice(end);
              index = end + content.view.length;
            }

            index = base.indexOf(attribute, index + 1);
          }
        });

        fragment.view = base;
        return fragment;
      });

      //
      // No match found push the element back into the queue so other
      // elements can iterate against it.
      //
      if (!match) this._queue.unshift(content);
    }

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
    // Set a number of properties on the response as it is available to all pagelets.
    // This will ensure the correct amount of pagelets are processed and that the
    // entire queue is written to the client.
    //
    this._queue = [];

    //
    // Number of child pagelets that should be written.
    //
    this.length = options.queue || 0;

    //
    // Set the default fallback script, see explanation above.
    //
    this.debug('Initialized in %s mode', options.mode);
    this.fallback = 'sync' === options.mode ? script : noscript.replace(
      '{path}',
      uri.pathname || 'http://localhost/'
    ).replace(
      '{query}',
      qs.stringify(this.merge({ no_pagelet_js: 1 }, query))
    );

    //
    // Adds initial HTML headers to the queue. The first flush will
    // push out these headers immediatly. If the render mode is sync
    // the headers will be injected with the other content.
    //
    this.debug('Queueing initial headers');
    this._queue.push({
      name: this.name,
      view: this.render()
    });
  }
}).on(module);
