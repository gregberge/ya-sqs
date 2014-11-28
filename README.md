# ya-sqs
[![Build Status](https://travis-ci.org/neoziro/ya-sqs.svg?branch=master)](https://travis-ci.org/neoziro/ya-sqs)
[![Dependency Status](https://david-dm.org/neoziro/ya-sqs.svg?theme=shields.io)](https://david-dm.org/neoziro/ya-sqs)
[![devDependency Status](https://david-dm.org/neoziro/ya-sqs/dev-status.svg?theme=shields.io)](https://david-dm.org/neoziro/ya-sqs#info=devDependencies)

Yet Another AWS SQS wrapper with pull (long polling), push, error management and promises.

## Install

```
npm install ya-sqs
```

## Usage

```js
var sqs = require('ya-sqs');

var queue = sqs.createQueue();

// Pull message.
queue.pull(function (message, done) {
  // Do your stuff..

  // Remove message from the queue.
  done();
});

// Push message in the queue.
queue.push(message, function (err) {
  // Message pushed.
});
```

### Example with promises

```js
var sqs = require('ya-sqs');
var Promise = require('promise');

var queue = sqs.createQueue();

// Pull message.
queue.pull(function (message) {
  return new Promise(function (resolve, reject) {
    // Do your stuff..
    resolve();
  });
});

// Push message in the queue.
queue.push(message)
.then(function () {
  // Message pushed.
});
```

## License

MIT
