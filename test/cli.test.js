var Cimpler      = require('../lib/cimpler'),
    util         = require('util'),
    fs           = require('fs'),
    assert       = require('assert');
    expect       = require("./expect"),
    childProcess = require('child_process'),
    testRepoDir  = __dirname + "/../fixtures/repo/",
    httpPort     = 25750;

describe("CLI build command", function() {
   it("should add builds based on CWD or commandline params", function(done) {
      var cimpler = new Cimpler({
         plugins: {
            cli: {
            }
         },
         httpPort: httpPort,
         testMode: true  // Don't console.log() anything
      }),
      bin = "../../bin/cimpler -p " + httpPort,
      builtBranches  = [],
      expectedBuilds = 2,
      cimplerCalls   = 0,
      consumedBuild  = false,
      expectedBuild = {
         repo:   'http://example.com/repo.git',
         branch: 'master',
         status: 'pending'
      };

      var check = expect(4, function() {
         cimpler.shutdown();
         assert.deepEqual(builtBranches, ['master', 'test-branch']);
         done();
      });

      cimpler.consumeBuild(function(inBuild, started, finished) {
         builtBranches.push(inBuild.branch);
         assert.deepEqual(inBuild, expectedBuild);
         // So the next assertion will succeed
         expectedBuild.branch = 'test-branch';
         finished();
         check();
      });

      exec(bin, function(stdout) { }, /* expect failure = */ true);

      exec(bin + " build", function(stdout) {
         check();
         exec(bin + " build --branch=test-branch", function(stdout) {
            check();
         });
      });

      function exec(cmd, callback, expectFailure) {
         var execOptions = {
            cwd: testRepoDir
         };
         childProcess.exec(cmd, execOptions, function(err, stdout, stderr) {
            if (!expectFailure && err) {
               util.error("Command failed: " + cmd);
               console.log(stdout.toString());
               console.log(stderr.toString());
               process.exit(1);
            } else if (expectFailure && !err) {
               util.error("Command was supposed to fail (but didn't): " + cmd);
               console.log(stdout.toString());
               console.log(stderr.toString());
               process.exit(1);
            }
            callback(stdout.toString());
         });
      }
   });

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
   before(function() {
      try {
         fs.writeFileSync(testRepoDir + '.git', "gitdir: ./git");
      } catch (err) {}
   });

   after(function() {
      fs.unlink(testRepoDir + '.git');
   });
});
