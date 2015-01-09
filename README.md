# Bootstrap Pagelet

[![Version npm][version]](http://browsenpm.org/package/bootstrap-pagelet)[![Build Status][build]](https://travis-ci.org/bigpipe/bootstrap-pagelet)[![Dependencies][david]](https://david-dm.org/bigpipe/bootstrap-pagelet)[![Coverage Status][cover]](https://coveralls.io/r/bigpipe/bootstrap-pagelet?branch=master)

[version]: http://img.shields.io/npm/v/bootstrap-pagelet.svg?style=flat-square
[build]: http://img.shields.io/travis/bigpipe/bootstrap-pagelet/master.svg?style=flat-square
[david]: https://img.shields.io/david/bigpipe/bootstrap-pagelet.svg?style=flat-square
[cover]: http://img.shields.io/coveralls/bigpipe/bootstrap-pagelet/master.svg?style=flat-square

This Pagelet is responsible for bootstrapping the client side
of BigPipe and keeping state on the child pagelet queue. By default
the Bootstrap Pagelet is provided with [BigPipe]. However, if you
require a custom Bootstrap you can extend this Pagelet.

## Installation

The boostrap Pagelet is distributed through the node package manager (npm).

```
npm install --save bootstrap-pagelet
```

## Support

Got stuck? Or can't wrap your head around a concept or just want some feedback,
we got a dedicated IRC channel for that on Freenode:

- **IRC Server**: `irc.freenode.net`
- **IRC Room**: `#bigpipe`

Still stuck? Create an issue. Every question you have is a bug in our
documentation and that should be corrected. So please, don't hesitate to create
issues, many of them.

### Example

In this example the Bootstrap Pagelet is extended with a custom view.
For instance, if you want to use a custom layout or have several repeating
pagelets that always need to be added. [BigPipe] will automatically
discover this extended version if it is provided to [BigPipe] alongside
the other pagelets.

```js
'use strict';

//
// Extend the Bootstrap Pagelet with a custom view.
//
var Bootstrap = require('bootstrap-pagelet').extend({
  view: '/path/to/my/custom-view.html'
});

//
// Initialise BigPipe server.
//
var pipe = require('bigpipe').createServer(2000, {
  pagelets: [ bootstrap, ... ]
});
```

### API

The following methods are available on the bootstrap instance. Most are
only used internally. There is rarely a reason to call these methods.

#### new Bootstrap()

**public**, _returns Pagelet_.

The bootstrap constructor expects several options to be provided, these
include: `queue`, `mode`, `req`, `res` and `pipe`. The last option is
a reference to the [BigPipe] instance, mainly to ensure the same [Temper]
instance is re-used. All code examples assume your file is setup as:

```js
'use strict';

var Bootstrap = require('bootstrap-pagelet');
  , bootstrap = new Bootstrap({ options });
```

#### Bootstrap.render()

**public**, _returns string_.

Generates the HTML from the values on the pagelet. The properties
in `bootstrap.keys` are provided to the template parser.

```js
var html = bootstrap.render();
```

#### Bootstrap.queue()

**private**, _returns Pagelet_.

Push a chunk of HTML on the queue to be flushed. This function will
also decrease the internal counter of the number of flushed pagelets.
By default the counter is decreased with 1, but a specific _Number_
can be provided as well.

```js
bootstrap.queue('chunk of html', 2);
```

#### Bootstrap.flush()

**private**, _returns Pagelet_.

Concatenates all values in the `bootstrap._queue` and writes the Buffer
with the appropriate _charset_ to the response. This function has a
fallback for older Node.JS versions to ensure `flush` is always emitted.

```js
var emit = bootstrap.once('flush', function (error) {
  // Result of the write to response.
});

bootstrap.flush();
```

## Debugging

The library makes use the `diagnostics` module from Pagelet.
To display the bootstrap Pagelet specific debug messages, supply the
following before running the program or

```bash
DEBUG=pagelet:bootstrap node ...
```

## Testing

Tests are automatically run on [Travis CI] to ensure that everything is
functioning as intended. For local development we automatically install a
[pre-commit] hook that runs the `npm test` command every time you commit changes.
This ensures that we don't push any broken code in to this project.

To run tests locally, make sure the development dependencies are installed.

```bash
npm test
npm run coverage
```

## License

Bootstrap-pagelet is released under MIT.

[BigPipe]: http://bigpipe.io/
[Travis CI]: http://travisci.org
[Temper]: http://github.com/bigpipe/temper
[pre-commit]: http://github.com/observing/pre-commit