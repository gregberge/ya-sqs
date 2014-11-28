var expect = require('chai').expect;
var sqs = require('./index');
var Promise = require('promise');

describe('ya-sqs', function () {
  describe('#createQueue', function () {
    it('should return an error if a required parameter is missing', function () {
      expect(function () {
        sqs.createQueue();
      }).to.throw('Missing queue option: queueUrl');
    });
  });

  describe('#queue.push', function () {
    var queue;

    before(function () {
      queue = sqs.createQueue({
        aws: {
          region: process.env.AWS_REGION,
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET
        },
        queueUrl: process.env.QUEUE_URL
      });
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
  });

  describe('#queue.pull', function () {
    var queue;

    beforeEach(function () {
      queue = sqs.createQueue({
        aws: {
          region: process.env.AWS_REGION,
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET
        },
        queueUrl: process.env.QUEUE_URL
      });
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

    it('should pull message (promise)', function (done) {
      queue.once('message processed', function () {
        done();
      });

      queue.pull(function (message) {
        expect(message).to.equal('test message');
        return Promise.resolve();
      });
    });
  });
});
