var Cimpler  = require('../lib/cimpler'),
    assert = require('assert');

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

   assert.equal(cimpler.plugins.length, 1);
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
         assert.equal(inConfig, config);
         assert.equal(inCimpler, cimpler);
      }
   }, config);

   done(function() {
      assert.ok(cb);
   });
};

exports['build events'] = function(done) {
   var build = {a: 1},
   cb = [],
   cimpler = new Cimpler();
  
   cimpler.on('buildAdded', function(inBuild) {
      assert.equal(inBuild, build);
      cb.push('added');
   });
   cimpler.addBuild(build);
   cimpler.on('buildStarted', function(inBuild) {
      assert.equal(inBuild, build);
      cb.push('started');
   });
   cimpler.consumeBuild(function(inBuild, started, finished) {
      assert.equal(inBuild, build);
      cb.push('consumed');
      process.nextTick(function() {
         started();
         process.nextTick(function() { finished();});
      });
   });
   cimpler.on('buildFinished', function(inBuild) {
      assert.equal(inBuild, build);
      cb.push('finished');
   });

   done(function() {
      assert.deepEqual(cb, ['added', 'consumed', 'started', 'finished']);
   });
};

exports.consumeMultipleBuilds = function(done, assert) {
   var first = {f: 1},
   second = {s: 1},
   cb = 0,
   cimpler = new Cimpler();
  
   cimpler.consumeBuild(function(inBuild, started, finished) {
      assert.equal(inBuild, cb === 0 ? first : second);
      cb++;
      finished();
   });
   cimpler.addBuild(first);
   cimpler.addBuild(second);

   done(function() {
      assert.equal(cb, 2);
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
