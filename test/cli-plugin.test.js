var Cimpler  = require('../lib/cimpler'),
    net      = require('net'),
    childProcess = require('child_process');

exports.cliInterface = function(done, assert) {
   var cb = 0,
   tcpPort = 20002,
   consumedBuild = false,
   cimpler = new Cimpler({
      plugins: {
         cli: { tcpPort: tcpPort}
      }
   });

   var build = {
      repo:       'http',
      branch:     'test-branch',
      sha:        '12345678',
      status:     'pending'
   };

   cimpler.consumeBuild(function(inBuild) {
      consumedBuild = true;
      cimpler.shutdown();

      assert.deepEqual(build, inBuild);
   });

   var connection = net.createConnection(tcpPort, "127.0.0.1", function() {
      connection.end(JSON.stringify(build));
   });

   /**
    * In case the above tests fail, this should ensure we don't hang around
    * forever.
    */
   setTimeout(function() {
      assert.ok(consumedBuild);
      cimpler.shutdown();
   }, 1000);

   done(function() {
      assert.ok(consumedBuild);
   });
};
