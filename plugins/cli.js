var util       = require('util'),
    _          = require('underscore'),
    connectionTimeout = 30*60*1000, // 30 min
    allowedIps = [
       '127.0.0.1'
    ];


exports.init = function(config, cimpler) {

   /**
    * Listen for incoming data via HTTP.
    *
    * This expects JSON formatted POSTs at url: /build
    */
   cimpler.registerMiddleware("/build", function (req, res, next) {
      // We only care about POSTs to "/build" 
      if (req.method !== 'POST' || !req.url.match(/^\/($|\?)/)) {
         return next();
      }

      if (allowedIps.indexOf(req.connection.address().address) < 0) {
         util.error("Connection denied from: " +
            JSON.stringify(connection.address()));
         return next({status: 403});
      }

      var build = req.body;
      build._control = {};

      if (req.query && req.query.tail_log) {
         build._control.tail_log = true;
      }

      try {
         cimpler.addBuild(build);
      } catch (e) {
         var msg = "Error processing command line request." + e.message;
         util.error(msg);
         util.error(e.stack);
         res.end(msg + " -- " + e.message);
      }

      // Schedule the logs to be piped once the build starts
      if (build._control.tail_log) {
         // To support both <=0.8 and >=0.10
         var connection = res.connection || res;
         connection.setTimeout(connectionTimeout);

         uponStarting(build, function() {
            var sanitizedBuild = _.omit(build, '_control');
            res.write(JSON.stringify(sanitizedBuild) + "\n");

            if (build._control.logs) {
               // Pipe the log to the HTTP response obj
               build._control.logs.stdout.pipe(res);
            } else {
               // Logs aren't available, end the response.
               res.end('OK');
            }
         });
      } else {
         res.end('OK');
      }
   });

   var index = 0;
   var waitingOnBuilds = {};
   function uponStarting(build, callback) {
      waitingOnBuilds[index++] = {
         build: build,
         callback: callback
      };
   }

   cimpler.on('buildStarted', function(build) {
      Object.keys(waitingOnBuilds).forEach(function(key) {
         var waitingFor = waitingOnBuilds[key];
         if (waitingFor.build === build) {
            waitingFor.callback();
            delete waitingOnBuilds[key];
         }
      });
   });
};
