var Queue  = require('../lib/queue')
  , assert = require('assert');

exports.push_then_pop = function(done) {
   var job = {a: 1, b: 2}
    , queue = new Queue()
    , cb1 = false;
  
  queue.push(job);
  queue.pop(function(retjob, done) {
    assert.ok(! cb1);
    assert.eql(job, retjob);
    cb1 = true;
    done();
  });
  
  done(function() {
    assert.ok(cb1);
  })
};

exports.concurrency = function(done) {
  var job = {a: 1, b: 2}
    , queue = new Queue()
    , concurrency = 0;
  
  queue.push(job);
  queue.push(job);
  queue.pop(function(retjob, done) {
    concurrency++;
    if (concurrency > 1) assert.ok(false);
    // delay a bit
    setTimeout(function() {
        done();
        concurrency--;
    },10);
  });
  
  done(function() {
    assert.ok(concurrency == 0);
  })
};

exports.pop_then_push = function(done) {
  var job = {a: 2, b: 2}
    , queue = new Queue()
    , cb1 = false;
  
  queue.pop(function(retjob, done) {
    assert.ok(! cb1);
    assert.eql(job, retjob);
    cb1 = true;
    done();
  });
  queue.push(job);
  
  done(function() {
    assert.ok(cb1);
  })
};

exports.pop_no_push = function(done) {
  var job = {a: 3, b: 2}
    , queue = new Queue()
    , cb1 = false;
  
  queue.pop(function(retjob, done) {
    assert.ok(! cb1);
    assert.eql(job, retjob);
    cb1 = true;
    done();
  });

  done(function() {
    assert.ok(! cb1);
  })
};
