var Cimpler  = require('../lib/cimpler'),
    Github   = require('../plugins/github'),
    http     = require('http'),
    githubPort = 19191;

exports.githubPostRecieve = function(done, assert) {
   var config = {a: 1},
   sha = "sha1232322",
   cb = 0,
   cimpler = new Cimpler();

   cimpler.registerPlugin(Github, {
      listen_port: githubPort
   });
 
   var options = {
     host: '127.0.0.1',
     port: githubPort,
     method: 'POST',
     agent: false
   };

   var req = http.request(options);

   var postBuild = {
      ref:"b/master",
      repository:{url:"http"},
      after: sha
   };

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
   });

   setTimeout(function() {
      cimpler.shutdown();
   }, 1000);

   done(function() {
      assert.equal(cb, 1);
   });
};
