var Cimpler      = require('../lib/cimpler'),
    util         = require('util'),
    fs           = require('fs'),
    childProcess = require('child_process'),
    testRepoDir  = __dirname + "/../fixtures/repo/"
    cliPort      = 20003;

exports.cliInterface = function(done, assert) {
   var cimpler = new Cimpler({
      plugins: {
         cli: {
            tcpPort: cliPort
         }
      }
   }),
   bin = "../../bin/cimpler -p " + cliPort,
   builtBranches  = [],
   expectedBuilds = null
   cimplerCalls   = 0,
   consumedBuild  = false;

   var build = {
      repo:   'http://example.com/repo.git',
      branch: 'master',
      status: 'pending'
   };

   cimpler.consumeBuild(function(inBuild, started, finished) {
      builtBranches.push(inBuild.branch);
      if (builtBranches.length >= expectedBuilds) {
         cimpler.shutdown();
      }
      assert.deepEqual(inBuild, build);
      // So the next assertion will succeed
      build.branch = 'test-branch';
      finished();
   });

   exec(bin, function(stdout) { }, /* expect failure = */ true);

   expectedBuilds = 2;
   exec(bin + " test", function(stdout) {
      cimplerCalls++;
      callTestBranch();
   });

   function callTestBranch() {
      exec(bin + " test --branch=test-branch", function(stdout) {
         cimplerCalls++;
      });
   }

   /**
    * In case the above tests fail, this should ensure we don't hang around
    * forever.
    */
   setTimeout(function() {
      cimpler.shutdown();
   }, 500);

   done(function() {
      assert.equal(cimplerCalls, 2);
      assert.deepEqual(builtBranches, ['master', 'test-branch']);
      cleanupTestRepo();
   });

   function exec(cmd, callback, expectFailure) {
      prepareTestRepo();

      var execOptions = {
         cwd: testRepoDir
      };
      childProcess.exec(cmd, execOptions, function(err, stdout, stderr) {
         if (!expectFailure && err) {
            util.error("Command failed: " + cmd);
            console.log(stdout.toString());
            console.log(stderr.toString());
            process.exit(1);
         }
         callback(stdout.toString());
      });
   }
};

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
var testRepoPrepared = false;
function prepareTestRepo() {
   if (testRepoPrepared) {
      return;
   }

   try {
      fs.writeFileSync(testRepoDir + '.git', "gitdir: ./git");
      testRepoPrepared  = true;
   } catch (err) {}
}

function cleanupTestRepo() {
   if (!testRepoPrepared) {
      return;
   }

   fs.unlink(testRepoDir + '.git');
}
