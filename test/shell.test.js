var Cimpler  = require('../lib/cimpler'),
    fs = require('fs');

exports.shellCmdBad = function(done, assert) {
   testCommand('exit 1', 'failed', done, assert);
};

exports.shellCmdGood = function(done, assert) {
   testCommand('exit 0', 'success', done, assert);
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


function testCommand(cmd, status, done, assert) {
   var cb = false,
   cimpler = new Cimpler();
  
   cimpler.registerPlugin(
      require('../plugins/shell'),
      {
         cmd: cmd
      });
   cimpler.addBuild({});

   cimpler.on('finishBuild',
      function(build) {
         cb = true;
         assert.equal(build.status, status);
      });

   done(function() {
      assert.ok(cb);
   });
}
