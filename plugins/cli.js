var _          = require('underscore');


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

      var build = req.body;

      try {
         cimpler.addBuild(build);
      } catch (e) {
         var msg = "Error processing command line request." + e.message;
         console.error(msg);
         console.error(e.stack);
         res.end(msg + " -- " + e.message);
         return;
      }
      res.end('OK');
   });
};
