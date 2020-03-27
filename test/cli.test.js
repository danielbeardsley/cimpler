var Cimpler      = require('../lib/cimpler'),
    fs           = require('fs'),
    path         = require('path'),
    assert       = require('assert'),
    _            = require('underscore'),
    expect       = require("./expect"),
    childProcess = require('child_process'),
    testConfig   = require('./test-config.js'),
    testRepoDir  = testConfig.testRepoDir,
    httpPort     = testConfig.httpPort;
var bin          = __dirname + "/../bin/cimpler";

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

      var args = ["-h", "127.0.0.1", "-p", httpPort];

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
         expectedBuild.buildCommand = 'blah';

         finished();
         check();
      });

      exec(bin, args, function(stdout) { }, /* expect failure = */ true);

      exec(bin, args.concat(["build"]), function(stdout) {
         check();
         exec(bin, args.concat(["build", "--branch=test-branch", "--command=blah"]),
         function(stdout) {
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
      // Dont' do this, because Travis seems to execute its builds in paralell
      // on the same dir tree. So if one test finishes during a parallel
      // execution of the same test, the parallel test could fail.
      // fs.unlink(testRepoDir + '.git');
   });
});

describe("CLI server command", function() {
   var exec = execInDir(testRepoDir);

   it("takes in the config option", function(done) {
      var configPath = testConfigFile();
      var proc = exec(bin, ["server", "--config=" + configPath],
      function(output) {
         var pattern = "Listening on port: " + httpPort;
         assert(output.match(new RegExp(pattern)));
         done();
         clearInterval(killerInterval);
      }, true);
      var killerInterval = setInterval(function() {
         proc.kill();
      }, 1000);
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
      });

      var args = ["-h", "127.0.0.1", "-p", httpPort];

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
         testCommand(bin, args.concat(["status"]), expectedOutputs.shift(), function(){
            callback();
            if (expectedOutputs.length == 1) {
               testNextCommand(function() {
                  cimpler.shutdown();
                  done();
               });
            }
         });
      }

      function testCommand(command, args, expectedOutput, callback) {
         exec(command, args, function(stdout) {
            assert.equal(stdout, expectedOutput);
            callback();
         });
      }
   });
});

function execInDir(dir) {
   return function exec(cmd, args, callback, expectFailure) {
      var execOptions = {
         cwd: dir
      };
      var output = [];
      var proc = childProcess.spawn(cmd, args, execOptions);

      var collect = function(out) {
         output.push(out);
      };

      proc.stdout.on('data', collect);
      proc.stderr.on('data', collect);
      proc.on('close', function(code, signal) {
         var outputStr = output.join('');
         if (!expectFailure && code != 0) {
            console.error("Command failed: " + cmd);
            console.log(outputStr);
            process.exit(1);
         } else if (expectFailure && code == 0) {
            console.error("Command was supposed to fail (but didn't): " + cmd);
            console.log(outputStr);
            process.exit(1);
         }
         callback && callback(outputStr);
      });
      return proc;
   };
}

function testConfigFile() {
   var configPath = path.join(testRepoDir, "./config.temp.js");
   fs.writeFileSync(configPath,
   "module.exports = " + JSON.stringify({
      httpHost: 'localhost',
      httpPort: httpPort,
      plugins: {cli: true}
   }));
   return configPath;
}
