var Cimpler  = require('../lib/cimpler'),
    fs = require('fs');

exports.shellCmd = function(done, assert) {
   var cb = false,
   tempFile = "/tmp/cimpler_" + Math.floor(Math.random() * 100000),
   cimpler = new Cimpler();
  
   cimpler.registerPlugin(
      require('../plugins/shell'),
      {
         cmd: "touch " + tempFile
      });
   cimpler.addBuild({});

   cimpler.on('finishBuild',
      function(build) {
         cb = true;
         var exists = fs.statSync(tempFile);
         if (exists)
            fs.unlink(tempFile);
         assert.ok(exists);
      });

   done(function() {
      assert.ok(cb);
   });
};

exports.shellEnvironment = function(done, assert) {
   var cb = false,
   tempFile = "/tmp/cimpler_" + Math.floor(Math.random() * 100000),
   // All the environment variables set by the shell plugin
   envVars = [
      'BUILD_REPO',
      'BUILD_SHA',
      'BUILD_BRANCH',
      'BUILD_STATUS'],
   cimpler = new Cimpler();

   // Load the shell plugin with a cmd that writes the env vars to a file
   cimpler.registerPlugin(
      require('../plugins/shell'),
      { cmd: 'echo -n "$' + envVars.join(' $') + '" >> ' + tempFile });

   cimpler.addBuild({
      repo:'repo',
      sha: '12345',
      branch: 'master',
      status: 'began'
   });

   cimpler.on('finishBuild',
      function(build) {
         cb = true;
         var exists = fs.statSync(tempFile);
         assert.ok(exists);

         // This file should have been written by the plugin
         var contents = fs.readFileSync(tempFile, 'utf8');
         var expectedContents = [
            build.repo,
            build.sha,
            build.branch,
            'began' // build.status (status will have changed)
         ].join(' ');

         assert.equal(contents, expectedContents);
         if (exists)
            fs.unlink(tempFile);
      });

   done(function() {
      assert.ok(cb);
   });
};
