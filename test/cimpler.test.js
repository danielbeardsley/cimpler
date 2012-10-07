var Cimpler  = require('../lib/cimpler')
  , assert = require('assert');

exports.registerPlugin = function(done) {
   var config = {a: 1},
   cb = false,
   cimpler = new Cimpler();
  
   cimpler.registerPlugin({
      init: function(inConfig, inCimpler) {
         cb = true;
         assert.ok(inConfig == config);
         assert.ok(inCimpler == cimpler);
      }
   }, config);

   done(function() {
      assert.ok(cb);
   });
};

exports.onNewBuild = function(done) {
   var build = {a: 1},
   cb = 0,
   cimpler = new Cimpler();
  
   cimpler.on('newBuild', function(inBuild) {
      assert.equal(inBuild, build);
      cb++;
   });
   cimpler.addBuild(build);

   done(function() {
      assert.equal(cb, 1);
   });
};

exports.consumeBuild = function(done) {
   var build = {a: 1},
   cb = 0,
   cimpler = new Cimpler();
  
   cimpler.consumeBuild(function(inBuild) {
      assert.equal(inBuild, build);
      cb++;
   });
   cimpler.addBuild(build);

   done(function() {
      assert.equal(cb, 1);
   });
};

exports.finishedBuild = function(done) {
   var build = {a: 1},
   cb = 0,
   cimpler = new Cimpler();
  
   cimpler.addBuild(build);
   cimpler.on('finishBuild', function(inBuild) {
      assert.equal(inBuild, build);
      cb++;
   });
   cimpler.consumeBuild(function(inBuild, finished) {
      finished();
   });

   done(function() {
      assert.equal(cb, 1);
   });
};

exports.shutdown = function(done) {
   var cb = 0,
   cimpler = new Cimpler();
  
   cimpler.on('shutdown', function() {
      cb++;
   });
   cimpler.shutdown();

   done(function() {
      assert.equal(cb, 1);
   });
};
