var Cimpler  = require('../lib/cimpler'),
    GCS      = require('../plugins/github-commit-status'),
    assert   = require('assert');

describe("Github commit status plugin", function() {
   it("started then finished", function(done) {
      var build = {
         repo: "git://github.com/user/repo.git",
         status: 'BLAH',
         commit: '11111', 
         logUrl: 'http'
      };

      sendBuild(build, function(statuses) {
         assert.equal(statuses.length, 2);

         var status = {
            context: 'test-context',
            owner: 'user',
            repo: 'repo',
            sha: build.commit,
            state: 'pending',
            target_url: build.logUrl,
            description: 'Build Started' };
         assert.deepEqual(statuses[0], status);
         status.description = "Build BLAH";
         status.state = 'BLAH';
         assert.deepEqual(statuses[1], status);
         done();
      });
   });

   describe("with build errors", function() {
      it("should emit a started, then error commit status", function(done) {
         var build = {
            repo: "git://github.com:user/repo.git",
            status: 'BLAH',
            commit: '11111', 
            logUrl: 'http',
            fail_message: "ERR"
         };
         sendBuild(build, function(statuses) {
            assert.equal(statuses.length, 2);

            var status = {
               context: 'test-context',
               owner: 'user',
               repo: 'repo',
               sha: build.commit,
               state: 'pending',
               target_url: build.logUrl,
               description: 'Build Started' };

            assert.deepEqual(statuses[0], status);
            // The status for 'finished' will be 'error' if build.error
            status.description = "ERR";
            status.state = 'error';
            assert.deepEqual(statuses[1], status);
            done();
         });
      });

      it("should not emit a 'started' status when finish() is called before started()", function(done) {
         var build = {
            repo: "git://github.com:user/repo.git",
            status: 'BLAH',
            commit: '11111', 
            logUrl: 'http',
            fail_message: "ERR",
            failFast: true
         };
         sendBuild(build, function(statuses) {
            var status = statuses[0];
            assert.equal(statuses.length, 1);

            var expectedStatus = {
               context: 'test-context',
               owner: 'user',
               repo: 'repo',
               sha: build.commit,
               state: 'error',
               target_url: build.logUrl,
               description: build.error };

            assert.deepEqual(expectedStatus, status);
            done();
         });
      });
   });
});

/**
 * Passes a build through the started/finished phase and collect the commit
 * status API calls.
 */
function sendBuild(build, callback) {
   var cimpler = new Cimpler(),
   startedBuild = false,
   GH = newApi();

   cimpler.registerPlugin(GCS, {
      auth: {token: 1},
      _overrideApi: GH,
      context: 'test-context',
   });

   var statuses = GH.collected.statuses;
   assert.equal(statuses.length, 0);

   cimpler.addBuild(build);

   cimpler.consumeBuild(function(build, started, finished) {
      assert.equal(statuses.length, 0);
      if (!build.failFast) {
         started();
      }

      later(function() {
         if (build.fail_message) {
            build.error = build.fail_message;
         }
         finished();
      });
   });

   cimpler.on('buildFinished', function(build) {
      later(function() {
         callback(GH.collected.statuses);
      });
   });
}
 
function newApi() {
   var info = {
      statuses: []
   };

   function ghAPI() {
      this.repos = {
         createCommitStatus: function(status) {
            info.statuses.push(status);
         }
      };
   }

   ghAPI.collected = info;
   return ghAPI;
}

function later(callback) {
   process.nextTick(function() {
      process.nextTick(callback);
   });
}
