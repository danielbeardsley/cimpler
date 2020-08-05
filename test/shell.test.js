var Cimpler  = require('../lib/cimpler'),
    assert   = require('assert'),
    fs       = require('fs');

describe("Shell plugin", function() {
   describe("exiting with status code = 1", function() {
      it("should trigger failure", function(done) {
         testCommand('exit 1', 'failed', done);
      });
   });

   describe("exiting with status code = 0", function() {
      it("should trigger success", function(done) {
         testCommand('exit 0', 'success', done);
      });
   });

   describe("environment variables", function() {
      it("should pass all the useful info", function(done) {
         var cb = false,
         tempFile = "/tmp/cimpler_" + Math.floor(Math.random() * 100000),
         // All the environment variables set by the shell plugin
         envVars = [
            'BUILD_REPO',
            'BUILD_COMMIT',
            'BUILD_BRANCH',
            'BUILD_STATUS'],
         cimpler = new Cimpler();

         // Load the shell plugin with a cmd that writes the env vars to a file
         cimpler.registerPlugin(
            require('../plugins/shell'),
            { cmd: 'echo "$' + envVars.join(' $') + '" >> ' + tempFile });

         cimpler.addBuild({
            repo:'repo',
            commit: '12345',
            branch: 'master',
            status: 'began'
         });

         cimpler.on('buildFinished',
            function(build) {
               cb = true;
               var exists = fs.statSync(tempFile);
               assert.ok(exists);

               // This file should have been written by the plugin
               var contents = fs.readFileSync(tempFile, 'utf8');
               var expectedContents = [
                  build.repo,
                  build.commit,
                  build.branch,
                  'began' // build.status (status will have changed)
               ].join(' ');

               assert.equal(contents, expectedContents + "\n");
               if (exists)
                  fs.unlink(tempFile,() => {});

               done();
            });
      });
   });
});


function testCommand(cmd, status, done) {
   var cb = false,
   cimpler = new Cimpler();
  
   cimpler.registerPlugin(
      require('../plugins/shell'),
      {
         cmd: cmd
      });
   cimpler.addBuild({});

   cimpler.on('buildFinished',
   function(build) {
      assert.equal(build.status, status);
      done();
   });
}
