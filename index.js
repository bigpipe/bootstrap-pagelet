'use strict';

var Pagelet = require('pagelet')
  , Sapling = require('sapling')
  , qs = require('querystring')
  , t = require('t');

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
// Map of available content types.
//
var contentTypes = {
  'html': 'text/html',
  'json': 'application/json'
};

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
  dependencies: [],

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
    'dependencies', 'fallback', 'charset', 'child', 'length', 'id', 'name'
  ],

  /**
   * Get the value of the child's name.
   *
   * @return {String} Child's name
   * @api private
   */
  get child() {
    return this._child;
  },

  /**
   * Set the value of the child's name, only allows strings.
   *
   * @param {String} value Child's name.
   * @api private
   */
  set child(value) {
    if ('string' !== typeof value) return;
    this._child = value;
  },

  /**
   * Render the HTML template with the data provided. Temper provides a minimal
   * templater to handle data in HTML templates. Data has to be specifically
   * provided, properties of `this` are not enumerable and would not be included.
   *
   * @returns {Pagelet} this
   * @api public
   */
  render: function render() {
    var framework = this._bigpipe._framework
      , bootstrap = this
      , data;

    data = this.keys.reduce(function reduce(memo, key) {
      memo[key] = bootstrap[key];
      return memo;
    }, {});

    //
    // Adds initial HTML headers to the queue. The first flush will
    // push out these headers immediately. If the render mode is sync
    // the headers will be injected with the other content. Since each
    // front-end framework might require custom bootstrapping, data is
    // passed to fittings, which will return valid bootstrap content.
    //
    this.debug('Queueing initial headers');
    this._queue.push({
      name: this.name,
      view: framework.get('bootstrap', {
        name: this.name,
        template: '',
        id: this.id,
        data: data,
        state: {}
      })
    });

    return this;
  },

  /**
   * Change the contentType header if possible.
   *
   * @param {String} type html|json
   * @api private
   */
  contentTypeHeader: function contentTypeHeader(type) {
    if (this._res.headersSent) return this.debug(
      'Headers already sent, ignoring content type change: %s', contentTypes[type]
    );

    this.contentType = contentTypes[type];
    this._res.setHeader('Content-Type', this.contentType);
  },

  /**
   * Add fragment of data to the queue.
   *
   * @param {String} name Pagelet name that queued the content.
   * @param {String} parent Pagelet parent that queued the content.
   * @param {Mixed} data Output to be send to the response
   * @returns {Pagelet} this
   * @api public
   */
  queue: function queue(name, parent, data) {
    this.length--;

    //
    // Object was queued, transform the response type to application/json.
    //
    if ('object' === typeof data && this._contentType !== contentTypes.json) {
      this.emit('contentType', 'json');
    }

    this._queue.push({
      parent: parent,
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
      , result = this._queue.map(function flatten(fragment) {
          if (!fragment.name || !fragment.view) return '';
          return fragment.view;
        });

    try {
      result = this._contentType === contentTypes.json
        ? JSON.stringify(result.shift())
        : result.join('');
    } catch (error) {
      this.emit('done', error);
      return this.debug('Captured error while stringifying JSON data %s', error);
    }

    this._queue.length = 0;
    return result;
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
   * the data-pagelet attribute. Only text/html content can be properly reduced.
   *
   * @returns {Bootstrap} reference to self
   * @api private
   */
  reduce: function reduce() {
    if (this._contentType !== contentTypes.html) return this;
    var tree = new Sapling(this._queue, 'name', 'parent');

    t.dfs(tree, function each(child, parent) {
      if (parent && parent.name === child.parent) [
        "data-pagelet='"+ child.name +"'",
        'data-pagelet="'+ child.name +'"',
        'data-pagelet='+ child.name,
      ].forEach(function locate(attribute) {
        var index = parent.view.indexOf(attribute)
          , id = '{id-'+ child.name +'}'
          , end;

        //
        // As multiple versions of the pagelet can be included in to one single
        // parent pagelet we need to search for multiple occurrences of the
        // `data-pagelet` attribute.
        //
        while (~index) {
          end = parent.view.indexOf('>', index);

          if (~end) {
            end += 1;
            parent.view = parent.view.slice(0, end) + id + parent.view.slice(end);
            index = end + id.length;
          }

          index = parent.view.indexOf(attribute, index + 1);
        }
      });
    });

    //
    // Walk through the tree in reversed order to replace the data
    // added in each view. This has to be done separately otherwise childs
    // at different branches might replace content in the wrong parent
    // due to name collisions.
    //
    t.dfs(tree, { order: 'post' }, function each(child, parent) {
      if (parent && parent.name === child.parent) {
        parent.view = parent.view.replace(
          new RegExp('{id-'+ child.name +'}','g'),
          child.view
        );
      }
    });

    //
    // Finally clean up the queue for unprocessed fragments. Only the root
    // element containing the content of the reduced children is allowed to
    // be written to the response. Remaining fragments would destroy the
    // HTML output.
    //
    this._queue = [{
      name: tree.name,
      view: tree.view
    }];

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
    Pagelet.prototype.constructor.call(this, options = options || {});

    //
    // Store the provided global dependencies.
    //
    this.dependencies = this._bigpipe._compiler.page(this).concat(
      options.dependencies
    );

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
    // Prepare several properties that are used to render the HTML fragment.
    //
    this.length = options.length || 0;
    this.child = options.child || 'root';
    this.once('contentType', this.contentTypeHeader, this);

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
  }
}).on(module);
