var util = require('util');
var EventEmitter = require('events').EventEmitter;
var AWS = require('aws-sdk');
var Promise = require('promise');
var jsonFormatter = require('./json-formatter');

/**
 * Expose module.
 */

module.exports = Queue;

var requiredOptions = ['queueUrl'];

/**
 * Validate options.
 *
 * @param {object} options
 * @returns {boolean}
 */

function validateOptions(options) {
  requiredOptions.forEach(function (option) {
    if (!options[option])
      throw new Error('Missing queue option: ' + option);
  });
}

/**
 * Create a new queue.
 *
 * @param {object} options
 * @param {string} options.queueUrl Url of the queue
 * @param {string} [options.aws] AWS config
 * @param {string} [options.waitTime=20] Polling time
 * @param {string} [options.formatter] Formatter (default JSON)
 * @param {AWS.SQS} [options.sqs] SQS queue
 */

function Queue(options) {
  options = options || {};

  validateOptions(options);

  if (options.aws)
    AWS.config.update(options.aws);

  this.queueUrl = options.queueUrl;
  this.waitTime = options.waitTime || 20;
  this.sqs = options.sqs || new AWS.SQS();
  this.formatter = options.formatter || jsonFormatter;

  EventEmitter.call(this);
}

util.inherits(Queue, EventEmitter);

/**
 * Push a new message in the queue.
 *
 * @param {*} input Input message
 * @param {function} [done] optional callback
 * @returns {Promise}
 */

Queue.prototype.push = function (input, done) {
  var queue = this;

  return queue.formatter
  .format(input)
  .then(function (message) {
    message.QueueUrl = queue.queueUrl;
    return Promise.denodeify(queue.sqs.sendMessage.bind(queue.sqs))(message);
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
    queue.sqs.receiveMessage({
      QueueUrl: queue.queueUrl,
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
        queue.emit('message received', message);

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
        queue.emit('message processed', message);
      })
      .then(pullMessage)
      .catch(function (err) {
        queue.emit('error', err);
      });
    });
  }

  pullMessage();
};

/**
 * Delete message.
 *
 * @param {object} message
 * @returns {Promise}
 */

Queue.prototype._deleteMessage = function (message) {
  var queue = this;

  var deleteParams = {
    QueueUrl: this.queueUrl,
    ReceiptHandle: message.ReceiptHandle
  };

  return Promise.denodeify(queue.sqs.deleteMessage.bind(queue.sqs))(deleteParams);
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
