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
   req.write("payload=" +
      encodeURIComponent(JSON.stringify(postBuild)));
   req.end();

   cimpler.consumeBuild(function(build) {
      cb++;
      cimpler.shutdown();

      assert.deepEqual(build, {
         repo:    'http',
         sha:     sha,
         branch:  'master',
         status:  'pending'
      });
   });

   done(function() {
      assert.equal(cb, 1);
   });
};
