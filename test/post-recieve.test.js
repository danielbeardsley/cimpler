var Cimpler      = require('../lib/cimpler'),
    util         = require('util'),
    fs           = require('fs'),
    assert       = require('assert');
    expect       = require("./expect"),
    childProcess = require('child_process'),
    path         = require('path'),
    testRepoDir  = path.normalize(__dirname + "/../fixtures/repo/"),
    cliPort      = 20003;

describe("post-receive git-hook", function() {
   it("should trigger a build when passed info via stdin", function(done) {
      var cimpler = new Cimpler({
         plugins: {
            cli: {
               tcpPort: cliPort
            }
         },
         testMode: true  // Don't console.log() anything
      }),
      bin = __dirname + "/../hooks/post-receive",
      builtBranches  = [],
      expectedBuild = {
         repo:   'http://example.com/repo.git',
         branch: 'imabranch',
         status: 'pending',
         commit: 'commit-new'
      };

      var check = expect(2, function() {
         cimpler.shutdown();
         assert.deepEqual(builtBranches, ['imabranch']);
         done();
      });

      cimpler.consumeBuild(function(inBuild, started, finished) {
         builtBranches.push(inBuild.branch);
         assert.deepEqual(inBuild, expectedBuild);
         finished();
         check();
      });

      var proc = exec(bin, function(stdout) {
         check();
      });
      proc.stdin.end("commit-old commit-new refs/heads/imabranch");

      function exec(cmd, callback) {
         var execOptions = {
            cwd: testRepoDir,
            env: {
               GIT_DIR: testRepoDir,
               PATH: process.env.PATH,
               CIMPLER_PORT: cliPort
            }
         };
         return childProcess.exec(cmd, execOptions, function(err, stdout, stderr) {
            if (err) {
               console.log(stdout.toString());
               console.log(stderr.toString());
               throw new Error("Command failed: " + cmd);
               process.exit(1);
            }
            callback(stdout.toString());
         });
      }
   });

   before(function() {
      try {
         fs.writeFileSync(testRepoDir + '.git', "gitdir: ./git");
      } catch (err) {
         console.dir(err);
         assert.fail("Couldn't write to file: " + testRepoDir + '.git');
      }
   });

   after(function() {
      fs.unlink(testRepoDir + '.git');
   });
});
