var Cimpler  = require('../lib/cimpler'),
    Github   = require('../plugins/github'),
    http     = require('http'),
    assert   = require('assert'),
    expect   = require("./expect"),
    _        = require('underscore'),
    testConfig = require('./test-config.js'),
    httpPort = testConfig.httpPort;

var config = {a: 1},
commit = "sha1232322",
options = {
   port: httpPort,
   path: '/github',
   method: 'POST',
   agent: false,
   headers: {
      "Content-Type": "application/x-www-form-urlencoded"
   }
},
testBranchName = "branch-name-with/slashes.and.dots",
postBuild = {
   ref:"refs/heads/" + testBranchName,
   repository:{url:"http"},
   after: commit
};

describe("Github plugin", function() {
   it("should listen for and add builds in the post-receive fashion",
   function(done) {
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
         assert.equal(cb, 0, "Only one build should get through");
         cb++;

         var sanitizedBuild = _.pick(build, 'repo', 'commit', 'branch', 'status')
         assert.deepEqual(sanitizedBuild, {
            repo:    'http',
            commit:   commit,
            branch:  testBranchName,
            status:  'pending'
         });
         finished();
         // Ensure this callback doesn't get called again by
         // delaying the done()
      setTimeout(function() {
         cimpler.shutdown();
         done();
      }, 100);
      });
   });
});
