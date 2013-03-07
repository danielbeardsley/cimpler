var util       = require('util'),
    logger     = require('log4js').getLogger();

exports.init = function(config, cimpler) {
   /**
    * Listen for post-receive hooks
    */
   cimpler.registerMiddleware('/github', function(req, res, next) {
      // We only care about POSTs to "/github"
      if (req.method !== 'POST' || req.url !== '/') {
         return next();
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

