var Cimpler      = require('../lib/cimpler'),
    util         = require('util'),
    childProcess = require('child_process'),
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
      remote: 'http://example.com/repo.git',
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
   });

   function exec(cmd, callback, expectFailure) {
      var execOptions = {
         cwd: __dirname + "/../fixtures/repo/"
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
