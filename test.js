var expect = require('chai').expect;
var sqs = require('./index');
var _ = require('lodash');
var Promise = require('promise');

describe('ya-sqs', function () {
  this.timeout(4000);

  describe('#createQueue', function () {
    it('should return an error if a required parameter is missing', function () {
      expect(function () {
        sqs.createQueue();
      }).to.throw('You must provide an url or a name');
    });
  });

  describe('#queue.push', function () {
    describe('with url', function () {
      test({url: process.env.QUEUE_URL});
    });

    describe('with name', function () {
      test({name: randomQueueName()});
    });

    function test(options) {
      var queue;

      before(function () {
        queue = sqs.createQueue(_.defaults(options, {
          aws: {
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET
          }
        }));
      });

      it('should return an error if the message can\'t be serialized', function (done) {
        var foo = {};
        foo.foo = foo;

        queue.push(foo, function (err) {
          expect(err).to.be.instanceOf(Error);
          done();
        });
      });

      it('should push a new message in the queue', function (done) {
        queue.push('test message', done);
      });

      it('should push a new message in the queue (promise)', function () {
        return queue.push('test message');
      });
    }
  });

  describe('#queue.mpush', function () {
    var queue;

    before(function () {
      queue = sqs.createQueue({
        name: randomQueueName(),
        aws: {
          region: process.env.AWS_REGION,
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET
        }
      });
    });

    it('should push multiple messages', function (done) {
      queue.mpush(['test message', 'test message'], done);
    });
  });

  describe('#queue.pull', function () {
    describe('using callback', function () {
      test({name: randomQueueName()});
    });

    describe('using promise', function () {
      test({name: randomQueueName()}, true);
    });

    function test(options, usePromise) {
      var queue;

      beforeEach(function () {
        queue = sqs.createQueue(_.defaults(options, {
          aws: {
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET
          }
        }));
      });

      if (!usePromise) {
        it('should pull message', function (done) {
          var messages = ['first message', 'second message'];
          var idx = 0;

          queue.push(messages[0]);

          queue.on('message processed', function () {
            if (idx === 1) return done();
            idx++;
            queue.push(messages[idx]);
          });

          queue.pull(function (message, next) {
            expect(message).to.equal(messages[idx]);
            next();
          });
        });
      } else {
        it('should pull message (using promise)', function (done) {
          var messages = ['first message', 'second message'];
          var idx = 0;

          queue.push(messages[0]);

          queue.on('message processed', function () {
            if (idx === 1) return done();
            idx++;
            queue.push(messages[idx]);
          });

          queue.pull(function (message) {
            expect(message).to.equal(messages[idx]);
            return Promise.resolve();
          });
        });
      }
    }
  });
});

/**
 * Generate a random queue name.
 *
 * @returns {string}
 */

function randomQueueName() {
  return process.env.QUEUE_NAME + Date.now();
}
