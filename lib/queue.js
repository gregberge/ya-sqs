var AWS = require('aws-sdk');
var Promise = require('promise');
var jsonp = require('json-promise');

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
}

/**
 * Push a new message in the queue.
 *
 * @param {*} message Message
 * @param {function} [done] optional callback
 * @returns {Promise}
 */

Queue.prototype.push = function (message, done) {
  var queue = this;

  return jsonp.stringify(message)
  .then(function (body) {
    return Promise.denodeify(queue.sqs.sendMessage.bind(queue.sqs))({
      MessageBody: body,
      QueueUrl: queue.queueUrl
    });
  })
  .nodeify(done);
};
