var Cimpler  = require('../lib/cimpler'),
    Github   = require('../plugins/github'),
    http     = require('http'),
    assert   = require('assert'),
    expect   = require("./expect"),
    _        = require('underscore'),
    testConfig = require('./test-config.js'),
    httpPort = testConfig.httpPort;

var config = {a: 1},
pushCommit = "push1232322",
pullRequestCommit = "pullrequest1232322",
options = {
   port: httpPort,
   path: '/github',
   method: 'POST',
   agent: false,
   headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-GitHub-Event": "push"
   }
},
pushTestBranchName = "push-branch-name-with/slashes.and.dots",
pullRequestTestBranchName = "pull-request-branch-name-with/slashes.and.dots",
postBuild = {
   ref:"refs/heads/" + pushTestBranchName,
   repository:{full_name:"user/repo"},
   after: pushCommit,
   action: "synchronize",
   pull_request:{
      head: {
         ref: pullRequestTestBranchName,
         sha: pullRequestCommit
      }
   }
};

describe("Github plugin", function() {
   it("should listen for and add builds for push events",
   function(done) {
      // Set event type to 'push'
      options.headers["X-GitHub-Event"] = "push";

      var cimpler = new Cimpler({
         httpPort: httpPort
      });

      cimpler.registerPlugin(Github, { });

      var check = expect(1, function(count) {
         assert.fail();
      });

      var req = http.request(options);

      // Pretend to be github and POST to our listener
      req.write("payload=" + encodeURIComponent(JSON.stringify(postBuild)));
      req.end();

      /**
       * Ensure "tag" notifications get filtered
       * (this shouldn't get to consumeBuild)
       */
      postBuild.ref = "refs/tags/some_tag";
      req = http.request(options);
      // Pretend to be github and POST to our listener
      req.write("payload=" + encodeURIComponent(JSON.stringify(postBuild)));
      req.end();

      var cb = 0;
      cimpler.consumeBuild(function(build, started, finished) {
         cb++;

         var sanitizedBuild = _.pick(build, 'repo', 'commit', 'branch', 'status')
         assert.deepEqual(sanitizedBuild, {
            repo:    'github.com/user/repo',
            commit:   pushCommit,
            branch:  pushTestBranchName,
            status:  'pending'
         });
         finished();
      });

      // Ensure this callback doesn't get called again by
      // delaying the done()
      setTimeout(function() {
         cimpler.shutdown();
         assert.equal(cb, 1, "Assert the callback was called once.");
         done();
      }, 100);
   });
   it("should listen for and add builds for pull_request sychronize events",
   function(done) {
      // Set event type to 'pull_request' and action to 'synchronize'
      options.headers["X-GitHub-Event"] = "pull_request";
      postBuild.action = 'synchronize';

      var cimpler = new Cimpler({
         httpPort: httpPort
      });

      cimpler.registerPlugin(Github, { });

      var check = expect(1, function(count) {
         assert.fail();
      });

      var req = http.request(options);

      // Pretend to be github and POST to our listener
      req.write("payload=" + encodeURIComponent(JSON.stringify(postBuild)));
      req.end();

      var cb = 0;
      cimpler.consumeBuild(function(build, started, finished) {
         cb++;

         var sanitizedBuild = _.pick(build, 'repo', 'commit', 'branch', 'status')
         assert.deepEqual(sanitizedBuild, {
            repo:    'github.com/user/repo',
            commit:   pullRequestCommit,
            branch:  pullRequestTestBranchName,
            status:  'pending'
         });
      finished();
      });

      // Ensure this callback doesn't get called again by
      // delaying the done()
      setTimeout(function() {
         cimpler.shutdown();
         assert.equal(cb, 1, "Assert the callback was called once.");
         done();
      }, 100);
   });
   it("should listen for and add builds for pull_request opened events",
   function(done) {
      // Set event type to 'pull_request' and action to 'opened'
      options.headers["X-GitHub-Event"] = "pull_request";
      postBuild.action = 'opened';

      var cimpler = new Cimpler({
         httpPort: httpPort
      });

      cimpler.registerPlugin(Github, { });

      var check = expect(1, function(count) {
         assert.fail();
      });

      var req = http.request(options);

      // Pretend to be github and POST to our listener
      req.write("payload=" + encodeURIComponent(JSON.stringify(postBuild)));
      req.end();

      var cb = 0;
      cimpler.consumeBuild(function(build, started, finished) {
         cb++;

         var sanitizedBuild = _.pick(build, 'repo', 'commit', 'branch', 'status')
         assert.deepEqual(sanitizedBuild, {
            repo:    'github.com/user/repo',
            commit:   pullRequestCommit,
            branch:  pullRequestTestBranchName,
            status:  'pending'
         });
         finished();

      });

      // Ensure this callback doesn't get called again by
      // delaying the done()
      setTimeout(function() {
         cimpler.shutdown();
         assert.equal(cb, 1, "Assert the callback was called once.");
         done();
      }, 100);
   });
   it("should listen but abort builds for pull_requests with actions other than synchronize and opened",
   function(done) {
      // Set event type to 'pull_request' and action to 'closed'
      options.headers["X-GitHub-Event"] = "pull_request";
      postBuild.action = 'closed';

      var cimpler = new Cimpler({
         httpPort: httpPort
      });

      cimpler.registerPlugin(Github, { });

      var check = expect(1, function(count) {
         assert.fail();
      });

      var req = http.request(options);

      // Pretend to be github and POST to our listener
      req.write("payload=" + encodeURIComponent(JSON.stringify(postBuild)));
      req.end();

      var cb = 0;
      cimpler.consumeBuild(function() {
         cb++;
      });

      // Ensure we don't miss any requests
      setTimeout(function() {
         cimpler.shutdown();
         assert.equal(cb, 0, "consumeBuild should not have been called.");
         done();
      }, 100);
   });
});
