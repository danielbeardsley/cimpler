var Cimpler  = require('../lib/cimpler'),
    childProcess = require('child_process');

exports.cliInterface = function(done, assert) {
   var cimpler = new Cimpler({
      plugins: {
         cli: true
      }
   }),
   bin = "../../bin/cimpler",
   command = bin + " test",
   options = {
      cwd: __dirname + "/../fixtures/repo/"
   },
   consumedBuild = false;

   var build = {
      remote: 'http://example.com/repo.git',
      branch: 'master',
      sha:    'aac5cd96ddd3173678e3666d677699ea6adce875',
      status: 'pending'
   };

   cimpler.consumeBuild(function(inBuild) {
      consumedBuild = true;
      cimpler.shutdown();

      assert.deepEqual(inBuild, build);
   });

   exec(bin + " test", function(stdout) {
      cimplerCalled = true;
   });

   /**
    * In case the above tests fail, this should ensure we don't hang around
    * forever.
    */
   setTimeout(function() {
      cimpler.shutdown();
   }, 500);

   done(function() {
      assert.ok(cimplerCalled);
      assert.ok(consumedBuild);
   });

   function exec(cmd, callback) {
      childProcess.exec(cmd, options, function(err, stdout) {
         if (err) {
            util.error("Command failed: " + cmd);
            process.exit(1);
         }
         callback(stdout.toString());
      });
   }
};
