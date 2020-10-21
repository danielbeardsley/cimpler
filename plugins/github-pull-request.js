exports.init = function(config, cimpler) {
   /**
    * Listen for post-receive hooks
    */
   cimpler.registerMiddleware('/github-pull-request', function(req, res, next) {
      var payload = JSON.parse(req.body.payload);
      // We only care about POSTs to "/github-pull-request" with synchronize action
      if (req.method !== 'POST' || req.url !== '/' || payload.action != 'synchronize') {
         return next();
      }

      try {
         var build = extractBuildInfo(payload);
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

function extractBuildInfo(payload) {
   var headCommit = payload.pull_request.head;
   var repoName = headCommit.full_name;
   var branch = headCommit.ref;
   var commit = headCommit.sha;
   var status = 'pending';

   return {
      repo   : "github.com" + '/' + repoName,
      commit : commit,
      branch : branch,
      status : status
   };
}
