var Cimpler  = require('../lib/cimpler'),
    http     = require('http'),
    assert   = require('assert'),
    childProcess = require('child_process');

describe("CLI plugin", function() {
   it("should accept builds via HTTP", function(done) {
      var cb = 0,
      httpPort = 25750,
      consumedBuild = false,
      cimpler = new Cimpler({
         plugins: {
            cli: { }
         },
         httpPort: httpPort,
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

      var options = {
         port: httpPort,
         path: '/build',
         method: 'POST',
         headers: {
            'Content-Type' : 'application/json'
         }
      };

      var req = http.request(options);

      req.on('error', function(err) {
         cimpler.shutdown();
         assert.fail(err);
         done();
      });

      req.end(JSON.stringify(build));
   });
});
