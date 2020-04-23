var Cimpler       = require('../lib/cimpler'),
    dummyPlugin   = require('../plugins/dummy'),
    expect        = require("./expect"),
    assert        = require('assert'),
    http          = require('http'),
    testConfig    = require('./test-config.js'),
    httpPort      = testConfig.httpPort;

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

      it("should allow filtering with a function that is passed the build", function(done) {
         var cimpler = new Cimpler();
         var check = expect(1, done);

         cimpler.consumeBuild(buildAsserter('A', 'master'), function(build) {
            return build.repo == 'A' && build.branch == 'master';
         });

         cimpler.addBuild(build('A', 'master'));
         cimpler.addBuild(build('A', 'test'));
         cimpler.addBuild(build('B', 'master'));
         cimpler.addBuild(build('B', 'test'));

         function buildAsserter(expectedRepo, expectedBranch) {
            return function(inBuild, started, finished) {
               assert.equal(inBuild.repo, expectedRepo);
               assert.equal(inBuild.branch, expectedBranch);
               finished();
               check();
            };
         }

         function build(repo, branch) {
            return {
               repo: repo,
               branch: branch
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

         // This ensures the builds get the various properties added to them.
         build = {
            repo:    "blah",
            branch:  "A",
            _control: {},
            status:  "pending"
         };

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

      it("should replace the currently running build of the same branch", function(done) {
         var newBuild = function(branch, data) {
            return {
               repo: 'A',
               branch: branch,
               data: data
            };
         };

         var buildA1 = newBuild('A', 'A1');
         var buildA2 = newBuild('A', 'A2');
         var buildB  = newBuild('B', 'B');

         var expectedEventOrder = [
            ['buildAdded',    buildA1],
            ['buildStarted',  buildA1],
            ['buildAdded',    buildB],
            ['buildAdded',    buildA2],
            ['buildAborted',  buildA1],
            ['buildStarted',  buildA2],
            ['buildStarted',  buildB],
         ];

         var cimpler = new Cimpler({abortMatchingBuilds: true});

         cimpler.consumeBuild(function(inBuild, started, finished) {
            inBuild._finished = finished;
            started();
            setTimeout(function() { finished(); }, 10);
         });

         cimpler.on('buildAborted', function(build) {
            if (build._finished) {
               build._finished();
            }
         });

         var eventValidator = function(eventType) {
            return function(build) {
               var nextEvent = expectedEventOrder.shift();
               assert.equal(eventType, nextEvent[0]);
               assert.equal(build.data, nextEvent[1].data);

               if (expectedEventOrder.length === 0) {
                  done();
               }
            };
         };

         var eventTypes = ['buildAdded', 'buildStarted', 'buildAborted'];
         eventTypes.forEach(function(eventType) {
            cimpler.on(eventType, eventValidator(eventType));
         });

         cimpler.addBuild(buildA1);
         cimpler.addBuild(buildB);
         cimpler.addBuild(buildA2);
      });

      it("should merge builds depending on return value of config supplied shouldMergeBuilds function", function(done) {
         var builds = [
            { repo: 'A' },
            { repo: 'A' },
            { repo: 'B' },
            { repo: 'B' },
            { repo: 'C' },
            { repo: 'C' },
         ];

         var falseConfig = {
            shouldMergeBuilds: function(runningBuild, newBuild) {
               return false;
            }
         };

         var cimpler = new Cimpler(falseConfig);

         builds.forEach(function(build) {
            cimpler.addBuild(build);
         });
         assert.equal(builds.length, cimpler.builds()['queued'].length);

         var trueConfig = {
            shouldMergeBuilds: function(runningBuild, newBuild) {
               return true;
            }
         };
         cimpler = new Cimpler(trueConfig);

         builds.forEach(function(build) {
            cimpler.addBuild(build);
         });
         assert.equal(1, cimpler.builds()['queued'].length);

         done();
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
