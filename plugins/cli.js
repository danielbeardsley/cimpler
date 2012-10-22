var util       = require('util'),
    allowedIps = [
       '127.0.0.1'
    ];


exports.init = function(config, cimpler, middleware) {

   /**
    * Listen for incoming data via TCP
    *
    * This expects the entirety of the packet to be a JSON encoded build object
    */
   middleware("/build", function (req, res, next) {
      // We only care about POSTs to "/build" 
      if (req.method !== 'POST' || req.url !== '/') {
         return next();
      }

      if (allowedIps.indexOf(req.connection.address().address) < 0) {
         util.error("Connection denied from: " +
            JSON.stringify(connection.address()));
         return next({status: 403});
      }

      try {
         cimpler.addBuild(req.body);
         res.end("OK");
      } catch (e) {
         var msg = "Error processing command line request." + e.message;
         util.error(msg);
         util.error(e.stack);
         res.end(msg + " -- " + e.message);
      }
   });
};
