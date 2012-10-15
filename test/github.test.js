var Cimpler  = require('../lib/cimpler'),
    Github   = require('../plugins/github'),
    http     = require('http'),
    assert   = require('assert'),
    githubPort = 19191;

var config = {a: 1},
sha = "sha1232322",
options = {
   host: '127.0.0.1',
   port: githubPort,
   method: 'POST',
   agent: false
},
postBuild = {
   ref:"b/master",
   repository:{url:"http"},
   after: sha
};

describe("Github plugin", function() {
   it("should listen for and add builds in the post-receive fashion",
   function(done) {
      var cimpler = new Cimpler();

      cimpler.registerPlugin(Github, {
         listen_port: githubPort
      });

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

         assert.deepEqual(build, {
            repo:    'http',
            sha:     sha,
            branch:  'master',
            status:  'pending'
         });
         finished();
         // Ensure this callback doesn't get called again by
         // delaying the done()
         setTimeout(function() { done(); }, 100);
      });
   });
});
