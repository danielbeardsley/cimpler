var Cimpler      = require('../lib/cimpler'),
    util         = require('util'),
    fs           = require('fs'),
    assert       = require('assert');
    expect       = require("./expect"),
    childProcess = require('child_process'),
    testRepoSource   = __dirname + "/../fixtures/repo/",
    buildLogsPath    = "/tmp/cimpler-test-logs/";

// Current branch pointers in our test repo.
var testBranch = "aa6b0aa64229caee1b07500334a64de9e1ffcddd",
    master     = "ff47c0e58eef626f912c7e5d80d67d8796f65003",
    masterParent = "aac5cd96ddd3173678e3666d677699ea6adce875";

describe("git-build plugin", function() {
   var testRepoDirs = [tempDir(), tempDir()];

   it("should merge master into the branch under testing", function(done) {
      var concurrency = concurrencyChecker(1);
      var cimpler = new Cimpler({
         plugins: {
            "git-build": {
               repoPaths: testRepoDirs[0],
               // Pass if test_branch is the build branch
               cmd: "[ \"$BUILD_BRANCH\" = 'test-branch' ]",
               logs: {
                  path: buildLogsPath,
                  url:  "http://www.example.com/ci-builds/"
               },
            }
         },
      });

      var check = expect(6, function() {
         cimpler.shutdown();
         done();
      });

      var expectedBuildCommits = [ testBranch, master ];
      cimpler.on('buildStarted', function(build) {
         concurrency(1);
         // git-build is supposed to lookup the sha for us.
         assert.equal(build.sha, expectedBuildCommits.shift());

         var cmd = "git rev-list --parents -n 1 HEAD";
         exec(cmd, testRepoDirs[0], assertParents);
         check();
      });

      cimpler.on('buildFinished', function(build) {
         concurrency(-1);
      });

      var expectedParents = [
         [ testBranch, master ],
         [ masterParent ]
      ];
      function assertParents(stdout) {
         var parents = stdout.split(' ');
         // drop the first hash which == HEAD
         parents.shift();
         assert.deepEqual(parents, expectedParents.shift());
         check();
      }

      var expectedStatuses = ['success', 'failure'];
      cimpler.on('buildFinished', function(build) {
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
   });

   it("Create as many workers as there are repoPaths", function(done) {
      var started = 0, finished = 0;
      var cimpler = new Cimpler({
         plugins: {
            "git-build": {
               repoPaths: testRepoDirs,
               // Pass if test_branch is the build branch
               cmd: "sleep 1 && [ \"$BUILD_BRANCH\" = 'test-branch' ]",
               logs: {
                  path: buildLogsPath,
                  url:  "http://www.example.com/ci-builds/"
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
         assert.equal(build.sha, expectedBuildCommits[build.letter]);
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

   function exec(cmd, dir, callback, expectFailure) {
      var execOptions = {
         cwd: dir
      };
      childProcess.exec(cmd, execOptions, function(err, stdout, stderr) {
         if (!expectFailure != !err) {
            var msg = err ? "Command failed: " + cmd :
                            "Command was supposed to fail (but didn't): " + cmd;
            util.error(msg);
            console.log(stdout.toString());
            console.log(stderr.toString());
            process.exit(1);
         }
         callback(stdout.toString().trim());
      });
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
         return "git clone " + testRepoSource + " " + dir;
      }).join(" && ");
      childProcess.exec(cmd, {}, done);
   });

   after(function() {
      fs.unlink(testRepoSource + '.git');
   });
});

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
