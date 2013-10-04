var Cimpler  = require('../lib/cimpler'),
    http     = require('http'),
    assert   = require('assert'),
    stream   = require('stream'),
    _        = require('underscore'),
    childProcess = require('child_process');

describe("CLI plugin", function() {
   var httpPort = 25750;
   it("should accept builds via HTTP", function(done) {
      var cb = 0,
      cimpler = createCimpler();

      var build = {
         repo:       'http',
         branch:     'test-branch',
         commit:     '12345678',
         status:     'pending'
      };

      cimpler.consumeBuild(function(inBuild) {
         cimpler.shutdown();

         var sanitizedBuild = _.omit(inBuild, '_control');
         assert.deepEqual(sanitizedBuild, build);
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

   it("should accept builds via HTTP and block", function(done) {
      var cb = 0,
      logStream = new stream.Stream(),
      cimpler = createCimpler();

      var build = {
         repo:       'http',
         branch:     'test-branch',
         sha:        '12345678',
         status:     'pending'
      };

      cimpler.consumeBuild(function(inBuild, started) {
         logStream.readable = true;
         setTimeout(function() {
            inBuild.started = true;
            inBuild._control.logs = {
               stdout: logStream
            }
            started();
            logStream.emit("data", "OUTPUT");
            logStream.emit("end");
         }, 50);
      });

      var options = {
         port: httpPort,
         path: '/build?tail_log=true',
         method: 'POST',
         headers: {
            'Content-Type' : 'application/json'
         }
      };

      var req = http.request(options, function(res) {
         var body = '';
         res.setEncoding('utf8');
         res.on('data', function(chunk) {
            body += chunk;
         });

         res.on('end', function(err) {
            build.started = true;
            assert.equal(body, "Added ... Build Started\n\nOUTPUT");
            cimpler.shutdown();
            if (err) assert.fail(err);
            done();
         });
      });

      req.end(JSON.stringify(build));
   });

   function createCimpler() {
      return new Cimpler({
         plugins: {
            cli: { }
         },
         httpPort: httpPort,
         testMode: true  // Don't console.log() anything
      });
   }
});
