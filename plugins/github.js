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

      const event = req.headers['x-github-event'];
      var build = null;

      try {
         const payload = getPayloadFromRequest(req);

         /**
          * The webhook sent must be a push event OR a pull_request event,
          * not both.
          */
         if (event == 'push') {
            build = extractPushBuildInfo(payload);
         } else if (event == 'pull_request') {
            build = extractPullRequestBuildInfo(payload);
         }

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

function getPayloadFromRequest(req) {
   if (req.body && req.body.payload && (typeof req.body.payload) === 'string') {
      return JSON.parse(req.body.payload);
   } else {
      return req.body;
   }
}

function extractPushBuildInfo(payload) {
   // ref: "refs/heads/some-long-branch-name/maybe-even-slashes"
   const matches = payload.ref.match(/^(refs\/[^\/]+)\/(.*$)/);
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
     repo   : "github.com" + '/' + payload.repository.full_name,
     commit : payload.after,
     branch : branch,
     status : 'pending',
     number : null
   };
}

function extractPullRequestBuildInfo(payload) {
   // Filter out all actions but open and synchronize
   const action = payload.action;
   if (!['opened', 'synchronize'].includes(action)) {
      return null;
   }

   const headCommit = payload.pull_request.head;
   const repoName = payload.repository.full_name;;
   const branch = headCommit.ref;
   const commit = headCommit.sha;
   const status = 'pending';
   const number = payload.number;

   return {
      repo   : "github.com" + '/' + repoName,
      commit : commit,
      branch : branch,
      status : status,
      number : number
   };
}
