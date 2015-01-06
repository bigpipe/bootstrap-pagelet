describe('Boostrap Pagelet', function () {
  'use strict';

  function noop() {}

  var Pagelet = require('pagelet')
    , Bootstrapper = require('../')
    , assume = require('assume')
    , temper = { fetch: function noop() { return { server: noop }}}
    , pagelet, P;

  beforeEach(function () {
    P = Bootstrapper.extend({
      description: 'my custom title',
      view: 'fixtures/view.html',
      dependencies: [
        '<script src="http://code.jquery.com/jquery-2.0.0.js"></script>',
        '<script src="fixtures/custom.js"></script>"'
      ]
    });

    pagelet = new P({ params: {}, temper: temper });
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
});
