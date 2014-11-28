var Promise = require('promise');

/**
 * Format input in JSON message.
 *
 * @param {*} input
 * @returns {Message}
 */

exports.format = function (input) {
  try {
    return Promise.resolve({
      MessageBody: JSON.stringify(input)
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Parse JSON message.
 *
 * @param {Message} message
 * @returns {*}
 */

exports.parse = function (message) {
  try {
    return Promise.resolve(JSON.parse(message.Body));
  } catch (e) {
    return Promise.reject(e);
  }
};
