var Cimpler  = require('../lib/cimpler');
var http     = require('http');
var assert   = require('assert');
var _        = require('underscore');
var testConfig = require('./test-config.js');
var httpPort = testConfig.httpPort;

describe("build-status plugin", function() {
   it("should provide build list via http", function(done) {
      var cimpler = new Cimpler({
         plugins: {
            "build-status": { }
         },
         httpPort: httpPort,
         testMode: true  // Don't console.log() anything
      });

      var builds = [{
         repo:       'http',
         branch:     'test-branch',
      },{
         repo:       'http',
         branch:     'other-branch',
      }];

      cimpler.addBuild(builds[0]);
      cimpler.addBuild(builds[1]);
      cimpler.consumeBuild(function(inBuild) { });

      var options = {
        host: 'localhost',
        port: httpPort,
        path: '/builds/status'
      };

      http.get(options, function(res) {
         onEntireBody(res, function(err, body) {
            cimpler.shutdown();
            if (err) assert.fail(err);
            builds = builds.map(function(build) {
               return _.omit(build, '_control');
            });
            var expected = {
               queued: [builds[1]],
               building: [builds[0]]
            };
            assert.deepEqual(JSON.parse(body), expected);
            finished();
         });
      }).on('error', function(e) {
         finished(e);
      });

      function finished(err) {
         if (err) assert.fail(e);
         cimpler.shutdown();
         done();
      }
   });
});

function onEntireBody(stream, done) {
   var body = '';
   stream.setEncoding('utf8');
   stream.on('data', function (chunk) {
      body += chunk;
   });
   stream.on('end', function () {
      done(null, body); 
   });
   stream.on('close', function (err) {
      done(err, body); 
   });
}
