var util       = require('util'),
    _          = require('underscore'),
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
            JSON.stringify(req.connection.address()));
         return next({status: 403});
      }

      var build = req.body;

      try {
         cimpler.addBuild(build);
      } catch (e) {
         var msg = "Error processing command line request." + e.message;
         util.error(msg);
         util.error(e.stack);
         res.end(msg + " -- " + e.message);
         return;
      }
      res.end('OK');
   });
};
