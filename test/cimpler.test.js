var Cimpler       = require('../lib/cimpler'),
    dummyPlugin   = require('../plugins/dummy'),
    expect        = require("./expect"),
    assert        = require('assert'),
    http          = require('http'),
    httpPort      = 25750;

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
      it("should call plugin.init() and pass the config", function(done) {
         var config = {a: 1},
         cimpler = new Cimpler();

         var pluginInfo = createPlugin(function(inConfig, inCimpler) {
            assert.equal(inConfig, config);
            assert.equal(inCimpler, cimpler);
            done();
         });

         cimpler.registerPlugin(pluginInfo.plugin, config);
      });
   });

   describe(".registerPlugin()", function() {
      it("should call plugin.init() multiple times if config is an array.", function(done) {
         var config = {a: 1},
         check = expect(4, done),
         cimpler = new Cimpler();

         var pluginInfo = createPlugin(check);

         cimpler.registerPlugin(pluginInfo.plugin, [config, config]);
         cimpler.registerPlugin(pluginInfo.plugin, config);

         assert.deepEqual(pluginInfo.passedConfigs, [config, config, config]);
         check();
      });
   });

   describe(".registerMiddleware()", function() {
      it("should allow a function to be setup as a connect middlware", function(done) {
         var check = expect(3, function() {
            cimpler.shutdown();
            done();
         });
         var cimpler = new Cimpler({
            httpPort: httpPort
         });

         cimpler.registerMiddleware("/blah", function(req, res) {
            check();
            res.end("OK");
         });

         var options = {
            port: httpPort,
            path: '/blah'
         };

         http.get(options, function(res) {
            check();
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
               check()
               assert.equal("OK", chunk);
            });
            assert.equal(200, res.statusCode);
         });
      });
   });

   function createPlugin(init) {
      var configs = [];
      return {
         plugin: {
            init: function(inConfig, inCimpler) {
               configs.push(inConfig);
               if (init) {
                  init(inConfig, inCimpler);
               }
            }
         },
         passedConfigs: configs
      };
   }

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
      it("should provide builds to consumers serially", function(done) {
         var first = {f: 1},
         second = {s: 1},
         cb = 0,
         cimpler = new Cimpler();

         var concurrency = 0;
         cimpler.consumeBuild(function(inBuild, started, finished) {
            concurrency++
            assert.equal(inBuild, cb === 0 ? first : second);
            process.nextTick(function() {
               started();
               process.nextTick(function() {
                  concurrency--;
                  assert.equal(concurrency, 0);
                  finished();
               });
            });
            cb++;
            if (cb >= 2) done();
         });

         cimpler.addBuild(first);
         cimpler.addBuild(second);
      });

      it("should allow filtering by repo", function(done) {
         var cimpler = new Cimpler();
         var check = expect(6, done);

         cimpler.consumeBuild(buildAsserter('A'), /A/);
         cimpler.consumeBuild(buildAsserter('B'), /B/);

         cimpler.addBuild(build('A'));
         cimpler.addBuild(build('A'));
         cimpler.addBuild(build('A'));
         cimpler.addBuild(build('B'));
         cimpler.addBuild(build('B'));
         cimpler.addBuild(build('B'));

         function buildAsserter(expectdRepo) {
            return function(inBuild, started, finished) {
               assert.equal(inBuild.repo, expectdRepo);
               finished();
               check();
            };
         }

         function build(repo) {
            return {
               repo: repo,
               branch: "" + Math.random()
            };
         }
      });
   });

   describe(".addBuild()", function() {
      it("should not replace existing builds from different branches", function(done) {
         var branches  = "A B C D E F".split();

         var builds = branches.map(function(branch) {
            return {
               repo: "blah",
               branch:branch
            };
         });

         passBuildsThrough(builds, builds, done);
      });

      it("should replace existing builds from the same branch", function(done) {
         var build = {
            repo:    "blah",
            branch:  "A"
         };

         var builds = [build,build,build,build];

         // expected.length == 2 because the first one is pop()ed immediately
         // and thus can't be replaced.
         passBuildsThrough(builds, [build, build], done);
      });

      it("should not replace existing builds from different Repos", function(done) {
         var repos  = "A B C D E F".split();

         var builds = repos.map(function(repo) {
            return {
               repo: repo,
               branch: "A"
            };
         });

         passBuildsThrough(builds, builds, done);
      });

      it("should replace the oldest queued build of the same branch", function(done) {
         var repos  = "B A A A".split(' ');

         var builds = repos.map(function(repo) {
            return {
               repo: repo,
               branch: "A",
               data: Math.random()
            };
         });

         // The last added build of branch A should be the only one that makes
         // it through.
         var expectedOutBuilds = [builds[0], builds[3]];

         passBuildsThrough(builds, expectedOutBuilds, done);
      });

      function passBuildsThrough(inBuilds, expectedOutBuilds, done) {
         var outBuilds = [],
         cimpler = new Cimpler();

         cimpler.consumeBuild(function(inBuild, started, finished) {
            outBuilds.push(inBuild);
            started();
            setTimeout(function() { finished(); }, 0);
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

   describe(".builds()", function() {
      it("should return an array of queued and running builds", function(done) {
         var builds = [ {branch:'a'}, {branch:'b'}, {branch:'c'} ],
             cimpler = new Cimpler();

         cimpler.addBuild(builds[0]);
         cimpler.addBuild(builds[1]);
         cimpler.addBuild(builds[2]);
         cimpler.consumeBuild(function(build) {
         });
         process.nextTick(function(){
            assert.deepEqual(cimpler.builds(), {
               queued: [builds[1], builds[2]],
               building: [builds[0]]
            });
            done();
         });
      });
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
