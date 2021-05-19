var Cimpler      = require('../lib/cimpler'),
    fs           = require('fs'),
    assert       = require('assert');
    expect       = require("./expect"),
    childProcess = require('child_process'),
    testRepoSource   = __dirname + "/../fixtures/repo/",
    buildLogsPath    = "/tmp/cimpler-test-logs/",
    buildLogsUrl     = "http://www.example.com/ci-builds/";

// Current branch pointers in our test repo.
var testBranch = "aa6b0aa64229caee1b07500334a64de9e1ffcddd",
    conflictBranch = "ac3b2b311ce6cb11e0698fd7aaca906ecf6bf0a6",
    master     = "ff47c0e58eef626f912c7e5d80d67d8796f65003",
    masterParent = "aac5cd96ddd3173678e3666d677699ea6adce875",
    hotfixTestBranch = "97d2ad995a7ea62bc425b3d75c7629e0b836a456";

// Command to test that the BUILD_COMMIT environment variable is correct.
var buildCommitTest = "[ \"$BUILD_COMMIT\" = '" + testBranch + "' ]" +
                      " && [ -n \"$BUILD_LOG_URL\" ]";

describe("git-build plugin", function() {
   var testRepoDirs = [tempDir(), tempDir()];

   it("should merge the appropriate branch into the branch under testing", 
    function(done) {
      var concurrency = concurrencyChecker(1);
      var cimpler = new Cimpler({
         plugins: {
            "git-build": {
               repoPaths: testRepoDirs[0],
               mergeBranchRegexes: [
                  [/^hotfix-/, 'test-branch']
               ],
               // Pass if test_branch is the build branch and BUILD_COMMIT
               // is correct.
               cmd: "[ \"$BUILD_BRANCH\" = 'test-branch' ] && " + buildCommitTest,
               logs: {
                  path: buildLogsPath,
                  url:  buildLogsUrl
               },
            }
         },
      });

      // 9 is 3 per build started.
      var check = expect(9, function() {
         cimpler.shutdown();
         done();
      });

      var expectedStatuses = ['success', 'failure', 'failure'];
      var expectedBuildCommits = [ testBranch, master, hotfixTestBranch ];
      var expectedParents = [
         [ testBranch, master ],
         [ masterParent ],
         [ hotfixTestBranch, testBranch ]
      ];

      cimpler.on('buildStarted', function(build) {
         concurrency(1);
         // git-build is supposed to lookup the sha for us.
         assert.equal(build.commit, expectedBuildCommits.shift());

         var cmd = "git rev-list --parents -n 1 HEAD";
         exec(cmd, testRepoDirs[0], function assertParents(stdout) {
            var parents = stdout.split(' ');
            // drop the first hash which == HEAD
            parents.shift();
            assert.deepEqual(parents, expectedParents.shift());
            check();
         });
         check();
      });

      cimpler.on('buildFinished', function(build) {
         concurrency(-1);
      });

      cimpler.on('buildFinished', function(build) {
         if (build.error) {
            var log = fs.readFileSync(build.logPath);
            console.log(log.toString());
         }
         assert.equal(build.error, null);
         assert.equal(build.status, expectedStatuses.shift());
         check();
      });

      cimpler.addBuild({
         repo: "doesn't matter",
         branch: "test-branch"
      });
      cimpler.addBuild({
         repo: "doesn't matter",
         branch: "master"
      });
      cimpler.addBuild({
         repo: "doesn't matter",
         branch: "hotfix-test-branch"
      });
   });

   it("should fail a build if the merge fails", function(done) {
      var cimpler = new Cimpler({
         plugins: {
            "git-build": {
               repoPaths: testRepoDirs[0],
               // Pass if test_branch is the build branch
               cmd: "[ \"$BUILD_BRANCH\" = 'conflict-branch' ]",
               logs: {
                  path: buildLogsPath,
                  url:  buildLogsUrl
               },
            }
         },
      });

      var check = expect(2, function() {
         cimpler.shutdown();
         done();
      });

      cimpler.on('buildStarted', function(build) {
         check();
      });

      cimpler.on('buildFinished', function(build) {
         // git-build is supposed to lookup the sha for us.
         assert.equal(build.commit, conflictBranch);
         assert.equal(build.error, "Merge Failed");
         // Assert that the log exists and contains "Merge Failed"
         var log = fs.readFileSync(build.logPath).toString();
         assert.ok(log.match('Merge Failed'))
         assert.notEqual(build.code, 0);
         check();
      });

      cimpler.addBuild({
         repo: "doesn't matter",
         branch: "conflict-branch"
      });
   });

   it("should create as many workers as there are repoPaths", function(done) {
      var started = 0, finished = 0;
      var cimpler = new Cimpler({
         plugins: {
            "git-build": {
               repoPaths: testRepoDirs,
               // Pass if test_branch is the build branch
               cmd: "sleep 1 && [ \"$BUILD_BRANCH\" = 'test-branch' ]",
               logs: {
                  path: buildLogsPath,
                  url:  buildLogsUrl
               },
            }
         },
      });

      var check = expect(4, function() {
         cimpler.shutdown();
         done();
      });

      var expectedBuildCommits = {
         A: testBranch,
         B: master
      };
      cimpler.on('buildStarted', function(build) {
         assert.equal(build.commit, expectedBuildCommits[build.letter]);
         check();
         started++;
         // We should be running these in paralell
         assert.ok(finished == 0, "Both builds should start before either finish");
      });

      var expectedStatuses = {
         A: 'success',
         B: 'failure'
      };
      cimpler.on('buildFinished', function(build) {
         assert.equal(build.status, expectedStatuses[build.letter]);
         check();
         finished++;
         // We should be running these in paralell
         assert.ok(started == 2, "One build finished before both has started");
      });

      cimpler.addBuild({
         letter: 'A',
         repo: "doesn't matter",
         branch: "test-branch"
      });
      cimpler.addBuild({
         letter: 'B',
         repo: "doesn't matter",
         branch: "master"
      });
   });

   it("should expose the BUILD_QUEUED_AT env var", function(done) {
      var cimpler = new Cimpler({
         plugins: {
            "git-build": {
               repoPaths: testRepoDirs[0],
               cmd: '[ "$BUILD_QUEUED_AT" = "1234" ]',
            }
         },
      });

      function finished() {
         cimpler.shutdown();
         done();
      }

      cimpler.on('buildFinished', function(build) {
         assert.equal(build.status, 'success');
         assert.equal(1234, build.queuedAt);
         finished();
      });

      cimpler.getTimestamp = () => 1234;
      cimpler.addBuild({
         letter: 'A',
         repo: "doesn't matter",
         branch: "omg/a/slash",
      });
   });

   it("should expose the BUILD_NUMBER env var", function(done) {
      var cimpler = new Cimpler({
         plugins: {
            "git-build": {
               repoPaths: testRepoDirs[0],
               cmd: 'echo hello',
            }
         },
      });

      function finished() {
         cimpler.shutdown();
         done();
      }

      cimpler.on('buildFinished', function(build) {
         assert.equal(build.status, 'success');
         assert.equal(1234, build.number);
         finished();
      });

      cimpler.addBuild({
         letter: 'A',
         repo: "doesn't matter",
         branch: "omg/a/slash",
         number: '1234',
      });
   });

   it("should allow a null BUILD_NUMBER", function(done) {
      var cimpler = new Cimpler({
         plugins: {
            "git-build": {
               repoPaths: testRepoDirs[0],
               cmd: 'echo hello',
            }
         },
      });

      function finished() {
         cimpler.shutdown();
         done();
      }

      cimpler.on('buildFinished', function(build) {
         assert.equal(build.status, 'success');
         assert.equal(null, build.number);
         finished();
      });

      cimpler.addBuild({
         letter: 'A',
         repo: "doesn't matter",
         branch: "omg/a/slash",
         number: null,
      });
   });

   it("should perform build logging correctly", function(done) {
      var cimpler = new Cimpler({
         plugins: {
            "git-build": {
               repoPaths: testRepoDirs[0],
               cmd: "echo boogity; exit 0",
               logs: {
                  path: buildLogsPath,
                  url:  buildLogsUrl
               },
            }
         },
      });

      function finished() {
         cimpler.shutdown();
         done();
      }

      cimpler.on('buildFinished', function(build) {
         assert.equal(build.status, 'success');
         var log = fs.readFileSync(build.logPath);
         assert(/boogity/.test(log), "command output not present in log");
         assert(/Successful/.test(log), "'Successful' not present in log");
         assert(build.logUrl, "build.logUrl missing");
         assert.equal(build.logUrl.substr(0, buildLogsUrl.length), buildLogsUrl);
         finished();
      });

      cimpler.addBuild({
         letter: 'A',
         repo: "doesn't matter",
         branch: "omg/a/slash",
      });
   });


   it("should allow custom commands to be specified per-build", function(done) {
      var started = 0, finished = 0;
      var cimpler = new Cimpler({
         plugins: {
            "git-build": {
               repoPaths: testRepoDirs,
               cmd: "exit 1",
               logs: {
                  path: buildLogsPath,
                  url:  buildLogsUrl
               },
            }
         },
      });

      var check = expect(2, function() {
         cimpler.shutdown();
         done();
      });

      var expectedStatuses = {
         A: 'success',
         B: 'failure'
      };
      var expectedCodes = {
         A: 0,
         B: 7
      };
      cimpler.on('buildFinished', function(build) {
         assert.equal(build.status, expectedStatuses[build.letter]);
         assert.equal(build.code, expectedCodes[build.letter]);
         check();
      });

      cimpler.addBuild({
         letter: 'A',
         repo: "doesn't matter",
         branch: "master",
         buildCommand: 'exit 0'
      });
      cimpler.addBuild({
         letter: 'B',
         repo: "doesn't matter",
         branch: "master",
         buildCommand: 'exit 7'
      });
   });

   it("should deal with leaving out the logs config option", function(done) {
      var cimpler = new Cimpler({
         plugins: {
            "git-build": {
               repoPaths: testRepoDirs[0],
               // Pass if test_branch is the build branch
               cmd: "exit 1",
            }
         },
      });

      function finished() {
         cimpler.shutdown();
         done();
      };

      cimpler.on('buildFinished', function(build) {
         assert.equal(build.status, 'failure');
         finished();
      });

      cimpler.addBuild({
         letter: 'A',
         repo: "doesn't matter",
         branch: "master"
      });
   });

   describe("timeout feature", function() {
      it("should fail builds that timeout", function(done) {
         var cimpler = new Cimpler({
            plugins: {
               "git-build": {
                  repoPaths: testRepoDirs[0],
                  // command that will take longer than timeout
                  cmd: "sleep 1",
                  timeout: 500, // ms
                  logs: {
                     path: buildLogsPath,
                     url:  "http://www.example.com/ci-builds/"
                  },
               }
            },
         });

         function finished() {
            cimpler.shutdown();
            done();
         };

         cimpler.on('buildFinished', function(build) {
            assert.equal(build.status, 'error');
            finished();
         });

         cimpler.addBuild({
            letter: 'A',
            repo: "doesn't matter",
            branch: "master"
         });
      });

      it("should be overriden by build.buildTimeout", function(done) {
         const seconds = 4;
         const timeoutSeconds = 0.1;
         let start;

         var cimpler = new Cimpler({
            plugins: {
               "git-build": {
                  // This timeout should be overridden by the buildTimeout
                  timeout: seconds * 2,
                  repoPaths: testRepoDirs[0],
                  // command that will take longer than timeout
                  cmd: "sleep " + seconds,
                  logs: {
                     path: buildLogsPath,
                     url:  "http://www.example.com/ci-builds/"
                  },
               }
            },
         });

         function finished() {
            cimpler.shutdown();
            done();
         }

         cimpler.on('buildFinished', function(build) {
            assert.equal(build.status, 'error');
            if (Date.now() - start > seconds * 1000) {
               assert.fail("Build should have timed out before the sleep command finished");
            }
            finished();
         });

         start = Date.now();
         cimpler.addBuild({
            letter: 'A',
            repo: "doesn't matter",
            branch: "master",
            buildTimeout: timeoutSeconds * 1000
         });
      });

      it("should abort a build when told to", function(done) {
         var cimpler = new Cimpler({
            abortMatchingBuilds: true,
            plugins: {
               "git-build": {
                  repoPaths: testRepoDirs[0],
                  // command that will take longer than timeout
                  cmd: "sleep 10"
               }
            },
         });

         cimpler.on('buildFinished', function(build) {
            assert.equal(build.status, 'error');
            assert.equal(build.aborted, true);
            assert.equal(build.branch, 'master');
            finished();
         });

         // Don't add these two until we've started on the first one.
         cimpler.on('buildStarted', function() {
            cimpler.addBuild(newBuild("test-branch"));
            cimpler.addBuild(newBuild("master"));
         });
         cimpler.addBuild(newBuild("master"));

         function finished() {
            cimpler.shutdown();
            done();
            done = function(){};
         };

      });

      /**
       * To test this feature we follow this logic:
       *  - Queue a build with a 'sleep [randomnumber]' command
       *  - Wait till it appears in the process list (ps aux | grep ...)
       *  - Abort the build
       *  - Wait till it disappears from the process list (Success!)
       */
      it("should kill all child processes", function(done) {
         // Sadly, the bash EXIT trap that this feature depends on doesn't work
         // in travis-ci, so we can't run this test.
         if (process.env.TRAVIS) {
            return done();
         }

         var sleepLength = Math.floor((1+Math.random()) * 100000);
         var cimpler = newCimpler("sleep 1" + sleepLength);
         var findSleep = 'ps aux | grep [1]' + sleepLength;

         cimpler.on('buildFinished', function(build) {
            repeatTillSuccessful('! ' + findSleep, finished);
         });

         var build = newBuild("master");
         // Don't abort until the sleep is actually running
         repeatTillSuccessful(findSleep, function(stdout) {
            cimpler.emit('buildAborted', build);
         });
         cimpler.addBuild(build);

         function finished() {
            cimpler.shutdown();
            done();
         };
      });
   });

   it("should pass the `repoRegex` the consumeBuild() function", function() {
      var gitBuild = require('../plugins/git-build');
      var _undefined;
      var testRegex = /Blah/;
      var regexes = [];
      var mockCimpler = {
         consumeBuild: function(consumer, repoRegex) {
            regexes.push(repoRegex);
         },
         on:function(){}
      }

      gitBuild.init({
         repoPaths: testRepoDirs[0],
         repoRegex: testRegex
      }, mockCimpler);

      gitBuild.init({
         repoPaths: testRepoDirs[0],
      }, mockCimpler);

      assert.deepEqual(regexes, [testRegex, _undefined])
   });

   function exec(cmd, dir, callback, expectFailure) {
      var execOptions = {
         cwd: dir
      };
      childProcess.exec(cmd, execOptions, function(err, stdout, stderr) {
         if (!expectFailure != !err) {
            var msg = err ? "Command failed: " + cmd :
                            "Command was supposed to fail (but didn't): " + cmd;
            console.error(msg);
            console.log(stdout.toString());
            console.log(stderr.toString());
            process.exit(1);
         }
         callback(stdout.toString().trim());
      });
   }

   /**
    * Repeat a shell command forever (every 250ms) until it returns
    * successfully.
    */
   function repeatTillSuccessful(cmd, callback) {
      function tryIt() {
         childProcess.exec(cmd, {}, function(err, stdout, stderr) {
            if (err) {
               setTimeout(tryIt, 250);
            } else {
               callback(stdout.toString().trim());
            }
         });
      }
      tryIt();
   }

   /**
    * Because Git doesn't allow adding any files or dirs named .git
    * we can't add the test repo's .git dir directly to the main repo.
    * We must resort to dynamically creating and destroying a
    * "symlink-like" file that points git to a different folder for
    * the actual repo dir.
    *
    * Actual repo dir:        fixtures/repo/git
    * "symlink" to repo dir:  fixtures/repo/.git
    */
   before(function(done) {
      // Add a 'git-style' symlink
      fs.writeFileSync(testRepoSource + '.git', "gitdir: ./git");
      // Ignore the "Already exists" errors
      try { fs.mkdirSync(buildLogsPath) } catch (err) {}
      // Clone the test repo into a temp dir.
      var cmd = testRepoDirs.map(function (dir) {
         var cmds = [
            "git clone " + testRepoSource + " " + dir,
            // Otherwise creating any new commits fails with "tell me who you are".
            "cd " + dir,
            "git config user.name 'tester'",
            "git config user.email 'tester@test.com'"
         ];
         return cmds.join(" && ");
      }).join(" && ");
      childProcess.exec(cmd, {}, done);
   });

   after(function() {
      // Dont' do this, because Travis seems to execute its builds in paralell
      // on the same dir tree. So if one test finishes during a parallel
      // execution of the same test, the parallel test could fail.
      // fs.unlink(testRepoSource + '.git');
   });

   function newCimpler(cmd, abortMatching) {
      return new Cimpler({
         plugins: {
            "git-build": {
               repoPaths: testRepoDirs[0],
               // command that will take longer than timeout
               cmd: cmd
            }
         },
      });
   }
});

function newBuild(branch) {
   return {
      letter: 'A',
      repo: "doesn't matter",
      branch: branch
   };
}

function concurrencyChecker(max) {
   var levels = 0;
   return function (inc) {
      levels += inc;
      if (levels > max)
         assert.fail("Concurrency should not be greater than " + max);
   };
}

function tempDir() {
   return "/tmp/cimpler-test-" +
            Math.floor(Math.random() * 999999);
}
