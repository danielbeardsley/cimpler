var Cimpler      = require('../lib/cimpler'),
    util         = require('util'),
    fs           = require('fs'),
    assert       = require('assert'),
    expect       = require("./expect"),
    childProcess = require('child_process'),
    path         = require('path'),
    _            = require('underscore'),
    testConfig   = require('./test-config.js'),
    testRepoDir  = testConfig.testRepoDir,
    httpPort     = testConfig.httpPort;

describe("post-receive git-hook", function() {
   it("should trigger a build when passed info via stdin", function(done) {
      var cimpler = new Cimpler({
         plugins: {
            cli: { }
         },
         httpPort: httpPort,
         testMode: true  // Don't console.log() anything
      }),
      bin = __dirname + "/../hooks/post-receive",
      builtBranches  = [],
      expectedBuilds = [{
         repo:   'http://example.com/repo.git',
         branch: 'imabranchA',
         status: 'pending',
         commit: 'commit-newA'
      },{
         repo:   'http://example.com/repo.git',
         branch: 'imabranchB',
         status: 'pending',
         commit: 'commit-newB'
      }];

      var check = expect(3, function() {
         cimpler.shutdown();
         assert.deepEqual(builtBranches, ['imabranchA', 'imabranchB']);
         done();
      });

      cimpler.consumeBuild(function(inBuild, started, finished) {
         builtBranches.push(inBuild.branch);
         var sanitizedBuild = _.pick(inBuild, 'repo', 'branch', 'status', 'commit')
         assert.deepEqual(sanitizedBuild, expectedBuilds.shift());
         finished();
         check();
      });

      var proc = exec(bin, function(stdout) {
         check();
      });
      var lines = [
         "commit-oldA commit-newA refs/heads/imabranchA",
         "commit-oldB commit-newB refs/heads/imabranchB"
      ];
      proc.stdin.end(lines.join("\n"));

      function exec(cmd, callback) {
         var execOptions = {
            cwd: testRepoDir,
            env: {
               GIT_DIR: testRepoDir,
               PATH: process.env.PATH,
               CIMPLER_PORT: httpPort,
               CIMPLER_HOST: "127.0.0.1"
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
      // Dont' do this, because Travis seems to execute its builds in paralell
      // on the same dir tree. So if one test finishes during a parallel
      // execution of the same test, the parallel test could fail.
      // fs.unlink(testRepoDir + '.git');
   });
});
