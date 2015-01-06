describe('Boostrap Pagelet', function () {
  'use strict';

  var Bootstrapper = require('../')
    , Pagelet = require('pagelet')
    , Temper = require('temper')
    , assume = require('assume')
    , pagelet, P;

  beforeEach(function () {
    P = Bootstrapper.extend({
      description: 'my custom title',
      dependencies: [
        '<script src="http://code.jquery.com/jquery-2.0.0.js"></script>',
        '<script src="fixtures/custom.js"></script>"'
      ]
    });

    pagelet = new P({ params: {}, temper: new Temper });
  });

  afterEach(function each() {
    pagelet = null;
  });

  it('has collection of keys that are used to generate the template', function () {
    assume(pagelet.keys).to.be.an('array');
    assume(pagelet.keys).to.include('title');
    assume(pagelet.keys).to.include('description');
  });

  it('has a default name bootstrap', function () {
    assume(pagelet.name).to.equal('bootstrap');
    assume(Bootstrapper.prototype.name).to.equal('bootstrap');
    assume(Bootstrapper.prototype.name).to.equal(pagelet.name);
    assume(Bootstrapper.prototype.name).to.equal(P.prototype.name);
  });

  it('has set of default keys that will be used by #render', function () {
    assume(pagelet.keys).to.be.an('array');
    assume(pagelet.keys.length).to.equal(12);
    assume(pagelet.keys).to.include('dependencies');
    assume(pagelet.keys).to.include('_parent');
    assume(pagelet.keys).to.include('length');
    assume(pagelet.keys).to.include('id');
  })

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
      pagelet.keys = pagelet.keys.filter(function (key) { return key !== 'dependencies' });

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
      }).on(module))({ params: {}, temper: new Temper });

      var html = pagelet.render();

      assume(html).to.include('<title>Custom title</title>');
      assume(html).to.include('<h1>Wrapping bootstrap!</h1>');
    });
  });
});
