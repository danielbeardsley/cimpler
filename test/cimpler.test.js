var Cimpler       = require('../lib/cimpler'),
    dummyPlugin   = require('../plugins/dummy'),
    expect        = require("./expect"),
    assert        = require('assert');

describe("Cimpler", function() {
   describe(".registerPlugins()", function() {
      var dummyConfig = { a:1 },
         config = {
            plugins: {
               dummy: dummyConfig,
               notLoadedPlugin: {
                  enabled: false
               }
            },
            testMode: true  // Don't console.log() anything
         },
         cimpler;

      before(function() {
         cimpler = new Cimpler(config);
      });

      it("should load and instantiate the correct plugins modules", function() {
         assert.equal(cimpler.plugins.length, 1);
         assert.equal(dummyPlugin, cimpler.plugins[0]);
         assert.equal(dummyConfig, cimpler.plugins[0].config);
      });
   });

   describe(".registerPlugin()", function() {
      it("should call plugin.init and pass the config", function(done) {
         var config = {a: 1},
         cb = false,
         cimpler = new Cimpler();

         cimpler.registerPlugin({
            init: function(inConfig, inCimpler) {
               assert.equal(inConfig, config);
               assert.equal(inCimpler, cimpler);
               done();
            }
         }, config);
      });
   });

   describe("build events", function() {
      it("should be emitted in the correct order", function(done) {
         var build = {a: 1},
         cb = [],
         cimpler = new Cimpler();

         var check = expect(4, function() {
            assert.deepEqual(cb, ['added', 'consumed', 'started', 'finished']);
            done();
         });

         cimpler.on('buildAdded', function(inBuild) {
            assert.equal(inBuild, build);
            cb.push('added');
            check();
         });
         cimpler.addBuild(build);
         cimpler.on('buildStarted', function(inBuild) {
            assert.equal(inBuild, build);
            cb.push('started');
            check();
         });
         cimpler.consumeBuild(function(inBuild, started, finished) {
            assert.equal(inBuild, build);
            cb.push('consumed');
            check();
            process.nextTick(function() {
               started();
               process.nextTick(function() { finished();});
            });
         });
         cimpler.on('buildFinished', function(inBuild) {
            assert.equal(inBuild, build);
            cb.push('finished');
            check();
         });
      });
   });

   describe(".consumeBuild()", function() {
      it("should work with multiple builds", function(done) {
         var first = {f: 1},
         second = {s: 1},
         cb = 0,
         cimpler = new Cimpler();

         cimpler.consumeBuild(function(inBuild, started, finished) {
            assert.equal(inBuild, cb === 0 ? first : second);
            finished();
            cb++;
            if (cb >= 2) done();
         });

         cimpler.addBuild(first);
         cimpler.addBuild(second);
      });
   });

   describe(".addBuild()", function() {
      it("should not replace existing builds from different branches", function(done) {
         var branches  = "A B C D E F".split(' ');

         var builds = branches.map(function(branch) {
            return {
               repo: "blah",
               branch:branch
            };
         });

         passBuildsThrough(builds, builds, done);
      });

      it("should replace existing builds from the same branche", function(done) {
         var build = {
            repo:    "blah",
            branch:  "A"
         };

         var builds = [build,build,build,build];

         passBuildsThrough(builds, [build, build], done);
      });

      it("should not replace existing builds from different Repos", function(done) {
         var repos  = "A B C D E F".split(' ');

         var builds = repos.map(function(repo) {
            return {
               repo: repo,
               branch: "A"
            };
         });

         passBuildsThrough(builds, builds, done);
      });

      function passBuildsThrough(inBuilds, expectedOutBuilds, done) {
         var outBuilds = [],
         cimpler = new Cimpler();

         cimpler.consumeBuild(function(inBuild, started, finished) {
            outBuilds.push(inBuild);
            started();
            setTimeout(function() { finished(); }, 1);
            if (outBuilds.length >= expectedOutBuilds.length) {
               assert.deepEqual(outBuilds, expectedOutBuilds);
               done();
            }
         });

         inBuilds.forEach(function(build) {
            cimpler.addBuild(build);
         });
      }
   });

   describe(".shutdown()", function() {
      it("should emit the shutdown event (only once)", function() {
         var cb = 0,
         cimpler = new Cimpler();

         cimpler.on('shutdown', function() { cb++; });
         cimpler.shutdown();
         // Ensure it only gets called once
         cimpler.shutdown();

         // Ensure it's called immediately.
         assert.equal(cb, 1);
      });
   });
});
