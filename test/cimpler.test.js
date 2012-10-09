var Cimpler  = require('../lib/cimpler')
  , assert = require('assert');

exports.registerPlugins = function(done) {
   var dummyConfig = { a:1 },
      config = {
         plugins: {
            dummy: dummyConfig,
            notLoadedPlugin: {
               enabled: false
            }
         }
      };

   var cimpler = new Cimpler(config);
  
   assert.equal(1, cimpler.plugins.length);
   var dummy = require('../plugins/dummy');
   assert.equal(dummy, cimpler.plugins[0]);
   assert.equal(dummyConfig, cimpler.plugins[0].config);
};

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

exports.consumeMultipleBuilds = function(done, assert) {
   var first = {f: 1},
   second = {s: 1},
   cb = 0,
   cimpler = new Cimpler();
  
   cimpler.consumeBuild(function(inBuild, done) {
      assert.equal(inBuild, cb == 0 ? first : second);
      cb++;
      done();
   });
   cimpler.addBuild(first);
   cimpler.addBuild(second);

   done(function() {
      assert.equal(cb, 2);
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
   // Ensure it only gets called once
   cimpler.shutdown();

   done(function() {
      assert.equal(cb, 1);
   });
};
