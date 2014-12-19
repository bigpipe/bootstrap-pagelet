describe('Boostrap Pagelet', function () {
  'use strict'

  var Pagelet = require('pagelet')
    , Boostrapper = require('../').extend({ name: 'bootstrapper' })
    , assume = require('assume')
    , pagelet, P;

  beforeEach(function () {
    P = Boostrapper.extend({
      description: 'my custom title',
      view: 'fixtures/view.html',
      dependencies: [
        '<script src="http://code.jquery.com/jquery-2.0.0.js"></script>',
        '<script src="fixtures/custom.js"></script>"'
      ]
    });

    pagelet = new P(new Pagelet);
  });

  afterEach(function each() {
    pagelet = null;
  });

  it('has collection of keys that are used to generate the template', function () {
    assume(pagelet.keys).to.be.an('array');
    assume(pagelet.keys).to.include('title');
    assume(pagelet.keys).to.include('description');
  });
});
