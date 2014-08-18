var logger     = require('log4js').getLogger();

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
         console.error("Bad Request");
         console.error(e.stack);
      }
      res.end();
   });
};

function extractBuildInfo(requestBody) {
   var info = JSON.parse(requestBody.payload);

   // ref: "refs/heads/some-long-branch-name/maybe-even-slashes"
   const matches = info.ref.match(/^(refs\/[^\/]+)\/(.*$)/);
   if (!matches) {
      return null;
   }

   const headType = matches[1];
   const branch = matches[2];

   // Filter out notifications about anything but branches (i.e. tags)
   if (headType !== 'refs/heads') {
      return null;
   }


   // Build info structure
   return {
     repo   : "github.com" + '/' + info.repository.full_name,
     commit : info.after,
     branch : branch,
     status : 'pending'
   };
}

