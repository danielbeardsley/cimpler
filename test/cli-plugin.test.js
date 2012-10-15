var Cimpler  = require('../lib/cimpler'),
    net      = require('net'),
    assert   = require('assert'),
    childProcess = require('child_process');

describe("CLI plugin", function() {
   it("should accept builds via TCP", function(done) {
      var cb = 0,
      tcpPort = 20002,
      consumedBuild = false,
      cimpler = new Cimpler({
         plugins: {
            cli: { tcpPort: tcpPort}
         },
         testMode: true  // Don't console.log() anything
      });

      var build = {
         repo:       'http',
         branch:     'test-branch',
         sha:        '12345678',
         status:     'pending'
      };

      cimpler.consumeBuild(function(inBuild) {
         cimpler.shutdown();

         assert.deepEqual(inBuild, build);
         done();
      });

      var connection = net.createConnection(tcpPort, "127.0.0.1", function() {
         connection.end(JSON.stringify(build));
      });
   });
});
