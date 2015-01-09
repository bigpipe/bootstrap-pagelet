describe('Boostrap Pagelet', function () {
  'use strict';

  var Bootstrapper = require('../')
    , Pagelet = require('pagelet')
    , Temper = require('temper')
    , assume = require('assume')
    , pagelet, P;

  beforeEach(function () {
    P = Bootstrapper.extend({
      description: 'my custom description',
      dependencies: [
        '<script src="http://code.jquery.com/jquery-2.0.0.js"></script>',
        '<script src="fixtures/custom.js"></script>'
      ]
    });

    pagelet = new P({ temper: new Temper });
  });

  afterEach(function each() {
    pagelet = null;
  });

  it('has collection of keys that are used to generate the template', function () {
    assume(pagelet.keys).to.be.an('array');
    assume(pagelet.keys).to.include('title');
    assume(pagelet.keys).to.include('description');
  });

  it('is an extendible constructor', function () {
    assume(Bootstrapper).to.be.a('function');
    assume(Bootstrapper.extend).to.be.a('function');
    assume(pagelet).to.be.instanceof(Bootstrapper);
    assume(pagelet).to.be.instanceof(Pagelet);
  });

  it('has a default name bootstrap', function () {
    assume(pagelet.name).to.equal('bootstrap');
    assume(Bootstrapper.prototype.name).to.equal('bootstrap');
    assume(Bootstrapper.prototype.name).to.equal(pagelet.name);
    assume(Bootstrapper.prototype.name).to.equal(P.prototype.name);
  });

  it('has default values', function () {
    assume(pagelet.title).to.equal('BigPipe');
    assume(pagelet.description).to.equal('my custom description');
    assume(pagelet.keywords.join()).to.equal('BigPipe,pagelets,bootstrap');
    assume(pagelet.robots.join()).to.equal('index,follow');
    assume(pagelet.favicon).to.equal('/favicon.ico');
    assume(pagelet.author).to.equal('BigPipe');
    assume(pagelet.view).to.equal(process.cwd() + '/view.html');
    assume(pagelet.charset).to.equal('utf-8');
  });

  it('has set of default keys that will be used by #render', function () {
    assume(pagelet.keys).to.be.an('array');
    assume(pagelet.keys.length).to.equal(12);
    assume(pagelet.keys).to.include('dependencies');
    assume(pagelet.keys).to.include('_parent');
    assume(pagelet.keys).to.include('length');
    assume(pagelet.keys).to.include('id');
  });

  describe('#constructor', function () {
    it('sets amount of pagelets to be processed from options', function () {
      var amount = 7;
      pagelet = new P({ temper: new Temper, queue: amount });

      assume(pagelet.length).to.equal(amount);
      assume(pagelet.length).to.be.a('number');
    });

    it('queues the initial HTML headers', function () {
      assume(Bootstrapper.prototype._queue).to.equal(undefined);
      assume(pagelet._queue).to.be.an('array');
      assume(pagelet._queue.length).to.equal(1);
      assume(pagelet._queue[0]).to.include('<meta charset="utf-8">');
    });

    it('initial HTML will not substract from count', function () {
      pagelet.length = 12;

      assume(pagelet._queue.length).to.equal(1);
      assume(pagelet._queue[0]).to.include('<meta charset="utf-8">');
      assume(pagelet.length).to.equal(12);
    });

    it('resolves dependencies to a string', function () {
      assume(pagelet.dependencies).to.be.a('string');
      assume(pagelet.dependencies).to.include('<script src="http://code.jquery.com/jquery-2.0.0.js"></script>');
      assume(pagelet.dependencies).to.include('<script src="fixtures/custom.js"></script>');
    });

    it('will leave dependencies string intact', function () {
      pagelet = new (P.extend({
        dependencies: '<script src="http://code.jquery.com/jquery-2.0.0.js"></script>'
      }).on(module))({ temper: new Temper });

      assume(pagelet.dependencies).to.be.a('string');
      assume(pagelet.dependencies).to.equal('<script src="http://code.jquery.com/jquery-2.0.0.js"></script>');
    });

    it('expects temper instance to be provided', function () {
      function notemper() {
        try {
          return new P;
        } catch (e) {
          return e;
        }
      }

      var result = notemper();
      assume(result).to.be.instanceof(Error);
      assume(result.message).to.equal("Cannot call method 'fetch' of undefined");
    });

    it('sets the correct fallback script', function () {
      assume(pagelet.fallback).to.be.a('string');
      assume(pagelet.fallback).to.include(
        '<meta http-equiv="refresh" content="0; URL=http://localhost/?no_pagelet_js=1">'
      );

      pagelet = new P({ temper: new Temper, mode: 'sync' });
      assume(pagelet.fallback).to.be.a('string');
      assume(pagelet.fallback).to.include(
        'if (~location.search.indexOf("no_pagelet_js=1"))location.href = location.href.replace(location.search, "")'
      );
    });

    it('provides the current pathname and querystring to the async fallback script', function () {
      pagelet = new P({
        temper: new Temper,
        req: {
          query: { test: 'req' },
          uri: { pathname: 'http://fancytwirls.com/' }
        }
      });

      assume(pagelet.fallback).to.be.a('string');
      assume(pagelet.fallback).to.include(
        '<meta http-equiv="refresh" content="0; URL=http://fancytwirls.com/?no_pagelet_js=1&test=req">'
      );
    });
  });

  describe('#render', function () {
    it('is a function', function () {
      assume(pagelet.render).is.a('function');
      assume(Pagelet.prototype.render).is.a('function');
      assume(Bootstrapper.prototype.render.length).to.equal(0);
    });

    it('returns the initial HTML', function () {
      var html = pagelet.render();

      assume(html).to.include('<html class="no-js">');
      assume(html).to.include('<meta charset="utf-8">');
    });

    it('uses default set of keys to replace encapsulated data', function () {
      pagelet.keys = pagelet.keys.filter(function (key) { return key !== 'dependencies'; });

      assume(pagelet.render()).to.include('{dependencies}');
    });

    it('use the current values of keys', function () {
      pagelet._parent = 'test';
      pagelet.id = 'another id';

      var html = pagelet.render();

      assume(html).to.include('test');
      assume(html).to.include('another id');
    });

    it('will use the provided view', function () {
      pagelet = new (P.extend({
        view: 'fixtures/view.html'
      }).on(module))({ temper: new Temper });

      var html = pagelet.render();

      assume(html).to.include('<title>Custom title</title>');
      assume(html).to.include('<h1>Wrapping bootstrap!</h1>');
    });
  });

  describe('#queue', function () {
    it('is a function', function () {
      assume(pagelet.queue).is.a('function');
      assume(pagelet.queue.length).to.equal(2);
    });

    it('adds html to the internal queue', function () {
      pagelet._queue.length = 0;

      pagelet.queue('<h1>some html</h1>');
      assume(pagelet._queue.length).to.equal(1);
      assume(pagelet._queue[0]).to.equal('<h1>some html</h1>');

      pagelet.queue('<p>some more</p>');
      assume(pagelet._queue.length).to.equal(2);
      assume(pagelet._queue[1]).to.equal('<p>some more</p>');
    });

    it('substracts one from count', function () {
      pagelet.length = 5;

      pagelet.queue('<p>some more</p>');
      assume(pagelet.length).to.equal(4);

      pagelet.queue('<p>some more</p>', 'not a number');
      assume(pagelet.length).to.equal(3);
    });

    it('substracts provided number from count', function () {
      pagelet.length = 7;

      pagelet.queue('<p>some more</p>', 3);
      assume(pagelet.length).to.equal(4);
    });
  });

  describe('#flush', function () {
    var content = '<h1>some content</h1>';

    beforeEach(function () {
      pagelet = new P({
        temper: new Temper,
        res: {
          write: function (data, encoding, done) {
            if ('function' !== typeof done) {
              done = encoding;
              encoding = 'utf-8';
            }

            done(null, data);
          }
        }
      });
    });

    it('is a function', function () {
      assume(pagelet.flush).is.a('function');
      assume(pagelet.flush.length).to.equal(0);
    });

    it('will return early if there is no queue length', function () {
      pagelet._queue.length = 0;
      assume(pagelet.flush()).to.equal(pagelet);
    });

    it('joins content to Buffer and writes to the response', function (done) {
      pagelet._queue = [content];

      pagelet.once('flush', function (error, data) {
        assume(error).to.equal(null);
        assume(data.toString('utf-8')).to.equal(content);
        done();
      });

      assume(pagelet.flush()).to.equal(pagelet);
    });


    it('writes with the adequate charset', function (done) {
      pagelet._queue = [content];
      pagelet.charset = 'ascii';

      pagelet.once('flush', function (error, data) {
        assume(error).to.equal(null);
        assume(data.toString('ascii')).to.equal(content);
        done();
      });

      assume(pagelet.flush()).to.equal(pagelet);
    });

    it('resets the queue length', function () {
      pagelet._queue = [content];
      pagelet.flush();

      assume(pagelet._queue.length).to.equal(0);
    });

    it('has fallback for callback-less response.write', function (done) {
      pagelet._res.write = function (data, encoding) { return data; };

      pagelet.once('flush', done);
      assume(pagelet.flush()).to.equal(pagelet);
    });

    it('always emits even if no data is written', function (done) {
      pagelet._queue = [void 0];
      pagelet.once('flush', done);
      pagelet.flush();
    });
  });
});
