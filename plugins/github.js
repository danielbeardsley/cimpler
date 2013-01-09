var util       = require('util'),
    logger     = require('log4js').getLogger(),
    allowedIps = [
       '127.0.0.1',      // For Testing
       '207.97.227.253', // GitHub #1
       '50.57.128.197',  // GitHub #2
       '108.171.174.178' // GitHub #3
    ];


exports.init = function(config, cimpler, middleware) {
   /**
    * Listen for post-recieve hooks
    */
   middleware('/github', function(req, res, next) {
      // We only care about POSTs to "/github"
      if (req.method !== 'POST' || req.url !== '/') {
         return next();
      }

      if (!passesWhitelist(req, next)) {
         return;
      }

      try {
         var build = extractBuildInfo(req.body);
         if (build) {
            cimpler.addBuild(build);
         }
      } catch (e) {
         util.error("Bad Request");
         util.error(e.stack);
      }
      res.end();
   });
};

function passesWhitelist(req, next) {
   if (allowedIps.indexOf(req.connection.remoteAddress) >= 0) {
      return true;
   }
   next({status: 403});
   logger.warn('Access denied for ' + req.connection.remoteAddress);
}

function extractBuildInfo(requestBody) {
   var info = JSON.parse(requestBody.payload);

   // Filter out notifications about annotated tags
   if (info.ref.indexOf('refs/tags/') == 0) {
      return null;
   }

   // ref: "refs/heads/master"
   var branch = info.ref.split('/').pop();

   // Build info structure
   return {
     repo   : info.repository.url,
     commit : info.after,
     branch : branch,
     status : 'pending'
   };
}

