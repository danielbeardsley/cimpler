var Cimpler  = require('../lib/cimpler'),
    GCS      = require('../plugins/github-commit-status');

exports.authentication = function(done, assert) {
   var auth = {a: 1},
   cimpler = new Cimpler(),
   GH = newApi();

   cimpler.registerPlugin(GCS, {
      auth: auth,
      _overrideApi: GH
   });

   assert.equal(GH.collected.auth, auth);
};

exports['started then finished'] = function(done, assert) {
   var build = {
      repo: "git://github.com/user/repo.git",
      status: 'BLAH',
      sha: '11111', 
      logUrl: 'http'
   };
   sendBuild(assert, build, function(statuses) {
      assert.equal(statuses.length, 2);

      var status = {
         user: 'user',
         repo: 'repo',
         sha: build.sha,
         state: 'pending',
         target_url: build.logUrl,
         description: 'Build Started' };
      assert.deepEqual(statuses[0], status);
      status.description = "Build BLAH";
      status.state = 'BLAH';
      assert.deepEqual(statuses[1], status);
   });
}

exports['build Error'] = function(done, assert) {
   var build = {
      repo: "git://github.com/user/repo.git",
      status: 'BLAH',
      sha: '11111', 
      logUrl: 'http',
      error: "ERR"
   };
   sendBuild(assert, build, function(statuses) {
      assert.equal(statuses.length, 2);

      var status = {
         user: 'user',
         repo: 'repo',
         sha: build.sha,
         state: 'pending',
         target_url: build.logUrl,
         description: 'Build Started' };

      assert.deepEqual(statuses[0], status);
      // The status for 'finished' will be 'error' if build.error
      status.description = "ERR";
      status.state = 'error';
      assert.deepEqual(statuses[1], status);
   });
}

function sendBuild(assert, build, callback) {
   var cimpler = new Cimpler(),
   startedBuild = false,
   GH = newApi();

   cimpler.registerPlugin(GCS, {
      _overrideApi: GH
   });

   statuses = GH.collected.statuses;
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
