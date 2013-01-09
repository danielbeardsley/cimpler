var Cimpler      = require('../lib/cimpler'),
    util         = require('util'),
    fs           = require('fs'),
    assert       = require('assert');
    _            = require('underscore');
    expect       = require("./expect"),
    childProcess = require('child_process'),
    testRepoDir  = __dirname + "/../fixtures/repo/",
    httpPort     = 25750;

describe("CLI build command", function() {
   var exec = execInDir(testRepoDir);

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
         status: 'pending',
         _control: {}
      };

      var check = expect(4, function() {
         cimpler.shutdown();
         assert.deepEqual(builtBranches, ['master', 'test-branch']);
         done();
      });

      cimpler.consumeBuild(function(inBuild, started, finished) {
         started();

         builtBranches.push(inBuild.branch);
         assert.deepEqual(inBuild, expectedBuild);
         // So the next assertion will succeed
         expectedBuild.branch = 'test-branch';
         expectedBuild._control.tail_log = true

         finished();
         check();
      });

      exec(bin, function(stdout) { }, /* expect failure = */ true);

      exec(bin + " build", function(stdout) {
         check();
         exec(bin + " build --tail --branch=test-branch", function(stdout) {
            check();
         });
      });

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

describe("CLI status command", function() {
   var exec = execInDir("./");

   it("should print a pretty list of builds", function(done) {
      var cimpler = new Cimpler({
         plugins: {
            'build-status': true
         },
         httpPort: httpPort,
         testMode: true  // Don't console.log() anything
      }),
      bin = __dirname + "/../bin/cimpler -p " + httpPort;

      cimpler.addBuild({
         repo:   'http://',
         branch: 'master'
      });
      cimpler.addBuild({
         repo:   'http://',
         branch: 'test-branch'
      });

      var expectedOutputs = [
         "* master\n" +
         "  test-branch\n",

         "* test-branch\n",

         "(no builds in queue)\n"
      ];

      cimpler.consumeBuild(function(inBuild, started, finished) {
         started();
         testNextCommand(finished);
      });

      function testNextCommand(callback) {
         testCommand(bin + " status", expectedOutputs.shift(), function(){
            callback();
            if (expectedOutputs.length == 1) {
               testNextCommand(function() {
                  cimpler.shutdown();
                  done();
               });
            }
         });
      }

      function testCommand(command, expectedOutput, callback) {
         exec(command, function(stdout) {
            assert.equal(stdout, expectedOutput);
            callback();
         });
      }
   });
});

function execInDir(dir) {
   return function exec(cmd, callback, expectFailure) {
      var execOptions = {
         cwd: dir
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
   };
}
