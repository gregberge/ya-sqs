var Queue = require('./lib/queue');

/**
 * Create a new queue.
 *
 * @see lib/queue.js
 */

exports.createQueue = function (options) {
  return new Queue(options);
};
