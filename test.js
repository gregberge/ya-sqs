var expect = require('chai').expect;
var sqs = require('./index');
var Promise = require('promise');
var _ = require('lodash');

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
      test({name: process.env.QUEUE_NAME});
    });

    function test(options) {
      var queue;

      before(function () {
        queue = sqs.createQueue(_.defaults(options, {
          aws: {
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET
          },
          url: process.env.QUEUE_URL
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

  describe('#queue.pull', function () {
    describe('with url', function () {
      test({url: process.env.QUEUE_URL});
    });

    describe('with name', function () {
      test({name: process.env.QUEUE_NAME});
    });

    function test(options) {
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

      beforeEach(function () {
        return queue.push('test message');
      });

      it('should pull message', function (done) {
        queue.once('message processed', function () {
          done();
        });

        queue.pull(function (message, next) {
          expect(message).to.equal('test message');
          next();
        });
      });
    }
  });
});
