var Queue  = require('../lib/queue')
  , assert = require('assert');

describe("Queue", function() {
   describe(".push() and .pop()", function() {
      it("should enqueue and dequeue items", function (done) {
         var job = {a: 1, b: 2},
            cb = 0,
            queue = new Queue();
        
         queue.push(job);
         queue.pop(function(retjob, next) {
            cb++;
            assert.equal(cb, 1);
            assert.equal(job, retjob);
            next();
            // Ensure this callback doesn't get called again by
            // delaying the done()
            later(function() { done(); });
         });
      });

      it("should have a max concurrency of 1", function (done) {
         var job = {a: 1, b: 2},
            queue = new Queue(),
            cb = 0,
            concurrency = 0;

         queue.push(job);
         queue.push(job);
         queue.pop(function(retjob, next) {
            concurrency++;
            cb++;
            if (concurrency > 1) assert.fail();
            // delay a bit
            later(function() {
              next();
              concurrency--;
              if (concurrency == 0 && cb == 2) done();
            });
         });
      });

      it("should work when pop is called first", function (done) {
         var job = {a: 1, b: 2},
            cb = 0,
            ready = false,
            queue = new Queue();
        
         queue.pop(function(retjob, next) {
            cb++;
            assert.ok(ready);
            assert.equal(cb, 1);
            assert.equal(job, retjob);
            next();
            // Ensure this callback doesn't get called again by
            // delaying the done()
            later(function() { done(); });
         });
         later(function() {
            ready = true;
            queue.push(job);
         });
      });
   });
   describe(".items()", function() {
      it("should return an array of the currently queueed items", function(testDone) {
         var queue = new Queue();
         queue.push(1);
         queue.push(2);
         queue.push(3);
         assert.deepEqual(queue.items(), [1,2,3]);
         queue.pop(function(item, done) {
            assert.deepEqual(queue.items(), [2,3]);
            testDone()
         });
      });
   });
});

function later(callback) {
   process.nextTick(function() {
      process.nextTick(callback);
   });
}
