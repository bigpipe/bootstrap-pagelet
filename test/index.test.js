describe('Boostrap Pagelet', function () {
  'use strict';

  var Collection = require('bigpipe/lib/collection')
    , File = require('bigpipe/lib/file')
    , Framework = require('bigpipe.js')
    , Bootstrapper = require('../')
    , BigPipe = require('bigpipe')
    , Pagelet = require('pagelet')
    , Temper = require('temper')
    , assume = require('assume')
    , pagelet, P, bigpipe;

  beforeEach(function () {
    P = Bootstrapper.extend({
      description: 'my custom description',
      _dependencies: {
        'foreign': ['http://code.jquery.com/jquery-2.0.0.js'],
        '.css': ['fixtures/custom.css']
      }
    });

    //
    // Stub parts of the compiler to skip catalog/optimizing.
    //
    bigpipe = new BigPipe;
    bigpipe._compiler.alias = {
      'http://code.jquery.com/jquery-2.0.0.js': 'file1',
      'fixtures/custom.css': 'file2'
    };

    bigpipe._compiler.buffer = {
      file1: new File(['stubbed buffer-1.js'], '.js'),
      file2: new File(['stubbed buffer-2.js'], '.css')
    };

    pagelet = new P({ temper: new Temper, bigpipe: bigpipe });
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
  });

  it('has no view property', function () {
    assume(pagelet.view).to.equal(null);
    assume(pagelet.view).to.not.equal(process.cwd() + '/view.html');
  });

  it('has set of default keys that will be used by #render', function () {
    assume(pagelet.keys).to.be.an('array');
    assume(pagelet.keys.length).to.equal(13);
    assume(pagelet.keys).to.include('dependencies');
    assume(pagelet.keys).to.include('child');
    assume(pagelet.keys).to.include('length');
    assume(pagelet.keys).to.include('name');
    assume(pagelet.keys).to.include('id');
  });

  it('has charset utf-8', function () {
    assume(pagelet.charset).to.equal('UTF-8');
  });

  describe('#constructor', function () {
    it('sets amount of pagelets to be processed from options', function () {
      var amount = 7;
      pagelet = new P({ temper: new Temper, length: amount, bigpipe: bigpipe });

      assume(pagelet.length).to.equal(amount);
      assume(pagelet.length).to.be.a('number');
    });

    it('resolves dependencies', function () {
      assume(pagelet.dependencies).to.be.instanceof(Collection);
      assume(pagelet.dependencies.stack).to.be.an('array');
    });

    it('sets the correct fallback script', function () {
      assume(pagelet.fallback).to.be.a('string');
      assume(pagelet.fallback).to.include(
        '<meta http-equiv="refresh" content="0; URL=http://localhost/?no_pagelet_js=1">'
      );

      pagelet = new P({ temper: new Temper, mode: 'sync', bigpipe: bigpipe });
      assume(pagelet.fallback).to.be.a('string');
      assume(pagelet.fallback).to.include(
        'if (~location.search.indexOf("no_pagelet_js=1"))location.href = location.href.replace(location.search, "")'
      );
    });

    it('provides the current pathname and querystring to the async fallback script', function () {
      pagelet = new P({
        bigpipe: bigpipe,
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

    it('queues the initial HTML headers', function () {
      pagelet.render();
      assume(pagelet._queue).to.be.an('array');
      assume(pagelet._queue.length).to.equal(1);
      assume(pagelet._queue[0].name).to.equal('bootstrap');
      assume(pagelet._queue[0].view).to.include('<meta charset="UTF-8">');
    });

    it('expects framework instance to be provided', function () {
      delete bigpipe._framework;

      function noframework() {
        try {
          var p = new P({ bigpipe: bigpipe });
          return p.render();
        } catch (e) {
          return e;
        }
      }

      var result = noframework();
      assume(result).to.be.instanceof(Error);
      assume(result.message).to.include("'get' of undefined");
    });

    it('uses default set of keys to replace encapsulated data', function () {
      assume(pagelet.render()._queue[0].view).to.include('<title>BigPipe</title>');
    });

    it('renders the dependencies from the collection', function () {
      assume(pagelet.render()._queue[0].view).to.include(
        '<link rel=stylesheet href="/da39a3ee5e6b4b0d3255bfef95601890afd80709.css" />'
      );

      assume(pagelet.render()._queue[0].view).to.include(
       '<script src="/da39a3ee5e6b4b0d3255bfef95601890afd80709.js"></script>'
      );
    });

    it('use the current values of keys', function () {
      pagelet.child = 'test';
      pagelet.id = 'another id';

      var html = pagelet.render()._queue[0].view;

      assume(html).to.include('test');
      assume(html).to.include('another id');
    });

    it('will use the provided view from the fittings framework', function () {
      bigpipe._framework.bootstrap = require('fs').readFileSync(
        __dirname + '/fixtures/view.html',
        'utf-8'
      );

      pagelet = new (P.extend({
        title: 'Custom title'
      }).on(module))({ temper: new Temper, bigpipe: bigpipe });

      var html = pagelet.render()._queue[0].view;

      assume(html).to.include('<title>Custom title</title>');
      assume(html).to.include('<h1>Wrapping bootstrap!</h1>');
    });
  });

  describe('#queue', function () {
    it('is a function', function () {
      assume(pagelet.queue).is.a('function');
      assume(pagelet.queue.length).to.equal(3);
    });

    it('adds html to the internal queue', function () {
      pagelet._queue.length = 0;

      pagelet.queue('test', 'parent', '<h1>some html</h1>');
      assume(pagelet._queue.length).to.equal(1);
      assume(pagelet._queue[0].name).to.equal('test');
      assume(pagelet._queue[0].parent).to.equal('parent');
      assume(pagelet._queue[0].view).to.equal('<h1>some html</h1>');

      pagelet.queue('test', 'parent', '<p>some more</p>');
      assume(pagelet._queue.length).to.equal(2);
      assume(pagelet._queue[0].parent).to.equal('parent');
      assume(pagelet._queue[1].view).to.equal('<p>some more</p>');
    });

    it('substracts one from count', function () {
      pagelet.length = 5;

      pagelet.queue('test', 'parent', '<p>some more</p>');
      assume(pagelet.length).to.equal(4);

      pagelet.queue('test', 'parent', '<p>some more</p>');
      assume(pagelet.length).to.equal(3);
    });

    it('emits contentType json if an object is queued', function (done) {
      pagelet._queue.length = 0;
      pagelet._res = {
        setHeader: function noop() {}
      };

      pagelet.once('contentType', function (type) {
        assume(type).to.equal('json');
        done();
      });

      pagelet.queue('test', 'parent', {});
    });
  });

  describe('#contentTypeHeader', function () {
    it('is a function', function () {
      assume(pagelet.contentTypeHeader).is.a('function');
      assume(pagelet.contentTypeHeader.length).to.equal(1);
    });

    it('will not change content type if the headers are already sent', function () {
      pagelet._res = {
        headersSent: true
      };

      assume(pagelet._contentType).to.equal('text/html');
      pagelet.contentTypeHeader('json');
      assume(pagelet._contentType).to.equal('text/html');
    });

    it('will switch content type and set headers', function (done) {
      pagelet._res = {
        headersSent: false,
        setHeader: function (key, value) {
          assume(key).to.equal('Content-Type');
          assume(value).to.equal('application/json;charset=UTF-8');
          done();
        }
      };

      assume(pagelet._contentType).to.equal('text/html');
      pagelet.contentTypeHeader('json');
      assume(pagelet._contentType).to.equal('application/json');
    });
  });

  describe('#join', function () {
    it('is a function', function () {
      assume(pagelet.join).is.a('function');
      assume(pagelet.join.length).to.equal(0);
    });

    it('joins the data in the queue and sets the queue length to 0', function () {
      pagelet._queue = [
        { name: '1', view: '<h1>first title</h1>' },
        { name: '2', view: '<h2>second title</h2>' }
      ];

      var result = pagelet.join();
      assume(result).to.be.a('string');
      assume(pagelet._queue.length).to.equal(0);
      assume(result).to.equal('<h1>first title</h1><h2>second title</h2>');
    });

    it('joins and stringifies the data in the queue if required', function () {
      pagelet.contentType = 'application/json';
      pagelet._res = { headersSent: true };
      pagelet._queue = [
        { name: 'obj1', view: { test: 'value' }},
        { name: 'obj2', view: { another: 'object' }}
      ];

      var result = pagelet.join();
      assume(result).to.be.a('string');
      assume(pagelet._queue.length).to.equal(0);
      assume(result).to.equal('{"test":"value"}');
    });

    it('returns empty if the data objects cannot be stringied and emits an error', function (done) {
      var obj1 = { };
      var obj2 = { another: obj1 };
      obj1.test = obj2;

      pagelet.contentType = 'application/json';
      pagelet._res = { headersSent: true };
      pagelet._queue = [
        { name: 'obj1', view: obj1},
        { name: 'obj2', view: obj2}
      ];

      pagelet.once('done', function (error) {
        assume(error).to.be.instanceof(Error);
        assume(error.message).to.equal('Converting circular structure to JSON');
        done();
      });

      var result = pagelet.join();
      assume(pagelet._queue.length).to.equal(2);
      assume(result).to.equal(undefined);
    });

    it('will not join undefined or falsy views', function () {
      pagelet._queue = [
        { name: '1', view: void 0 },
        { name: '2', view: '<h2>second title</h2>' }
      ];

      var result = pagelet.join();
      assume(result).to.be.a('string');
      assume(result).to.equal('<h2>second title</h2>');
    });
  });

  describe('#reduce', function () {
    it('is a function', function () {
      assume(pagelet.reduce).is.a('function');
      assume(pagelet.reduce.length).to.equal(0);
    });

    it('reduces the elements inside the queue to a single element', function () {
      pagelet._queue = [
        { name: '1', view: '<h1>first title <div data-pagelet="2"></div><div data-pagelet="4"></div></h1>' },
        { name: '3', view: 'hello world', parent: '2' },
        { name: '4', view: 'hello world', parent: '1' },
        { name: '2', view: '<h2>second title</h2><span data-pagelet="3"></span><div data-pagelet="4"></div>', parent: '1' }
      ];

      pagelet.reduce();
      assume(pagelet._queue.length).to.equal(1);
      assume(pagelet._queue[0].view).to.equal(
        '<h1>first title <div data-pagelet="2"><h2>second title</h2><span data-pagelet="3">hello world</span><div data-pagelet="4"></div></div><div data-pagelet="4">hello world</div></h1>'
      );
    });

    it('only reduces if the content type is text/html', function () {
      pagelet._queue = [
        { name: '1', view: '<h1>first title <div data-pagelet="2"></div></h1>' },
        { name: '2', view: '<h2>second title</h2>', parent: '1' }
      ];

      pagelet._contentType = 'application/json';
      assume(pagelet.reduce()).to.equal(pagelet);
      assume(pagelet._queue.length).to.equal(2);
      assume(pagelet._queue[0].view).to.equal(
        '<h1>first title <div data-pagelet="2"></div></h1>'
      );
    });

    it('reduces multiple occurences of the same data-pagelet attribute', function () {
      pagelet._queue = [
        { name: '1', view: '<h1>first title <div data-pagelet="2"></div><div data-pagelet="2"></div></h1>' },
        { name: '2', view: '<h2>second title</h2>', parent: '1' }
      ];

      pagelet.reduce();
      assume(pagelet._queue.length).to.equal(1);
      assume(pagelet._queue[0].view).to.equal(
        '<h1>first title <div data-pagelet="2"><h2>second title</h2></div><div data-pagelet="2"><h2>second title</h2></div></h1>'
      );
    });

    it('requires closing > to find matching element', function () {
      pagelet._queue = [
        { name: '1', view: '<h1>first title <div data-pagelet="2"' },
        { name: '2', view: '<h2>second title</h2>', parent: '1' }
      ];

      pagelet.reduce();
      assume(pagelet._queue.length).to.equal(1);
      assume(pagelet._queue[0].view).to.equal(
        '<h1>first title <div data-pagelet="2"'
      );
    });
  });

  describe('#flush', function () {
    var content = {
      name: 'test',
      view: '<h1>some content</h1>'
    };

    beforeEach(function () {
      pagelet = new P({
        bigpipe: bigpipe,
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
      assume(pagelet.flush.length).to.equal(1);
    });

    it('will return early if there is no queue length', function (done) {
      pagelet._queue.length = 0;
      assume(pagelet.flush(done)).to.equal(undefined);
    });

    it('will return early if the response has finished', function (done) {
      pagelet._res.finished = true;

      pagelet.flush(function (error) {
        assume(error).to.be.instanceof(Error);
        assume(error.message).to.equal('Response was closed, unable to flush content');
        done();
      });
    });


    it('joins content to Buffer and writes to the response', function (done) {
      pagelet._queue = [content];

      pagelet.flush(function (error, data) {
        assume(error).to.equal(null);
        assume(data.toString('utf-8')).to.equal(content.view);
        done();
      });
    });

    it('writes with the adequate charset', function (done) {
      pagelet._queue = [content];
      pagelet.contentType = 'text/html; charset=ascii';

      pagelet.flush(function (error, data) {
        assume(error).to.equal(null);
        assume(data.toString('ascii')).to.equal(content.view);
        done();
      });
    });

    it('resets the queue length', function (done) {
      pagelet._queue = [content];
      pagelet.flush(function () {
        assume(pagelet._queue.length).to.equal(0);
        done();
      });
    });

    it('has fallback for callback-less response.write', function (done) {
      pagelet._res.write = function (data, encoding) { return data; };

      pagelet.flush(done);
    });

    it('always emits even if no data is written', function (done) {
      pagelet._queue = [{ name: 'test', view: void 0}];
      pagelet.flush(done);
    });
  });
});
