var util = require('util');
var EventEmitter = require('events').EventEmitter;
var AWS = require('aws-sdk');
var Promise = require('promise');
var _ = require('lodash');
var jsonFormatter = require('./json-formatter');

/**
 * Expose module.
 */

module.exports = Queue;

/**
 * Create a new queue.
 *
 * @param {object} options
 * @param {string} [options.queue] Name of the queue
 * @param {string} [options.url] Url of the queue
 * @param {string} [options.aws] AWS config
 * @param {string} [options.waitTime=20] Polling time
 * @param {string} [options.formatter] Formatter (default JSON)
 * @param {AWS.SQS} [options.sqs] SQS queue
 */

function Queue(options) {
  options = options || {};

  if (!options.name && !options.url)
    throw new Error('You must provide an url or a name');

  if (options.aws)
    AWS.config.update(options.aws);

  this._createQueuePromise = null;
  this.name = options.name;
  this.url = options.url;
  this.waitTime = options.waitTime || 20;
  this.sqs = options.sqs || new AWS.SQS();
  this.formatter = options.formatter || jsonFormatter;

  EventEmitter.call(this);
}

util.inherits(Queue, EventEmitter);

/**
 *  Return queue url.
 *
 * @returns {Promise}
 */

Queue.prototype.getUrl = function () {
  var queue = this;

  if (queue.url) return Promise.resolve(queue.url);
  if (queue._createQueuePromise) return queue._createQueuePromise;

  queue._createQueuePromise = Promise.denodeify(queue.sqs.createQueue.bind(queue.sqs))({
    QueueName: queue.name,
    Attributes: {}
  }).then(function (data) {
    queue.url = data.QueueUrl;
    return queue.url;
  });

  return queue._createQueuePromise;
};

/**
 * Push a new message in the queue.
 *
 * @param {*} input Input message
 * @param {function} [done] optional callback
 * @returns {Promise}
 */

Queue.prototype.push = function (input, done) {
  var queue = this;

  return queue.getUrl()
  .then(function () {
    return queue.formatter.format(input);
  })
  .then(function (message) {
    message.QueueUrl = queue.url;
    return Promise.denodeify(queue.sqs.sendMessage.bind(queue.sqs))(message);
  })
  .then(function () {
    process.nextTick(function () {
      queue.emit('message pushed', input);
    });
  })
  .nodeify(done);
};

/**
 * Push messages in the queue (batch mode).
 *
 * @param {*[]} input Input messsage
 * @param {function} [done] optional callback
 * @returns {Promise}
 */

Queue.prototype.mpush = function (input, done) {
  var queue = this;

  return queue.getUrl()
  .then(function () {
    return Promise.all(input.map(function (data) {
      return queue.formatter.format(data);
    }));
  })
  .then(function (entries) {
    // Generate ids for entries.
    _.each(entries, function (entry, index) {
      entry.Id = 'batch_' + index;
    });

    var message = {
      QueueUrl: queue.url,
      Entries: entries
    };

    return Promise.denodeify(queue.sqs.sendMessageBatch.bind(queue.sqs))(message);
  })
  .then(function () {
    process.nextTick(function () {
      _.each(input, function (message) {
        queue.emit('message pushed', message);
      });
    });
  })
  .nodeify(done);
};

/**
 * Pull message from the queue.
 *
 * @param {function} handler
 */

Queue.prototype.pull = function (handler) {
  var queue = this;

  function pullMessage() {
    queue.pullRequest = queue.sqs.receiveMessage({
      QueueUrl: queue.url,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: queue.waitTime
    }, function (err, response) {
      if (err) return queue.emit('error', err);

      // Extract message from response.
      var message = getMessage(response);

      // If message can't be extract, pull again.
      if (!message) return pullMessage();

      queue.formatter
      .parse(message)
      .then(function (output) {
        // Notify that a new message is received.
        process.nextTick(function () {
          queue.emit('message received', message);
        });

        // Test if we use promise or not.
        var usePromise = handler.length === 1;
        return usePromise ?
          handler(output) :
          Promise.denodeify(handler)(output);
      })
      .then(function () {
        return queue._deleteMessage(message);
      })
      .then(function () {
        process.nextTick(function () {
          queue.emit('message processed', message);
        });
      })
      .then(pullMessage)
      .catch(function (err) {
        process.nextTick(function () {
          queue.emit('error', err);
        });
      });
    });
  }

  queue.getUrl()
  .then(pullMessage);
};

/**
 * Delete message.
 *
 * @param {object} message
 * @returns {Promise}
 */

Queue.prototype._deleteMessage = function (message) {
  var queue = this;

  return queue.getUrl()
  .then(function () {
    var deleteParams = {
      QueueUrl: queue.url,
      ReceiptHandle: message.ReceiptHandle
    };

    return Promise.denodeify(queue.sqs.deleteMessage.bind(queue.sqs))(deleteParams);
  });
};

/**
 * Extract message from response.
 *
 * @param {objet} response
 * @returns {string}
 */

function getMessage(response) {
  if (!response || !response.Messages || !response.Messages.length)
    return null;

  return response.Messages[0];
}
