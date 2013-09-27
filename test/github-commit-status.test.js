var Cimpler  = require('../lib/cimpler'),
    GCS      = require('../plugins/github-commit-status'),
    assert   = require('assert');

describe("Github commit status plugin", function() {
   describe("authentication", function() {
      it("should pass the 'auth' config object straight through", function() {
         var auth = {a: 1},
         cimpler = new Cimpler(),
         GH = newApi();

         cimpler.registerPlugin(GCS, {
            auth: auth,
            _overrideApi: GH
         });

         assert.equal(GH.collected.auth, auth);
      });
   });

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
            user: 'user',
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

   describe("build errors", function() {
      it("should emit an error commit status", function(done) {
         var build = {
            repo: "git://github.com:user/repo.git",
            status: 'BLAH',
            commit: '11111', 
            logUrl: 'http',
            error: "ERR"
         };
         sendBuild(build, function(statuses) {
            assert.equal(statuses.length, 2);

            var status = {
               user: 'user',
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
      _overrideApi: GH
   });

   var statuses = GH.collected.statuses;
   assert.equal(statuses.length, 0);

   cimpler.addBuild(build);

   cimpler.consumeBuild(function(build, started, finished) {
      assert.equal(statuses.length, 0);
      started();

      later(function() {
         assert.equal(statuses.length, 1);
         finished();
      });
   });

   cimpler.on('buildFinished', function(build) {
      later(function() {
         assert.equal(statuses.length, 2);
         callback(GH.collected.statuses);
      });
   });
}
 
function newApi() {
   var info = {
      statuses: []
   };

   function ghAPI() {
      this.statuses = {
         create: function(status) {
            info.statuses.push(status);
         }
      };

      this.authenticate = function(auth) {
         info.auth = auth;
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
