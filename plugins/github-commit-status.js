var util   = require('util'),
GitHubApi  = require('github');

exports.init = function(config, cimpler) {
   // Just to allow mocking the api in the tests.
   GitHubApi = config._overrideApi || GitHubApi;

   var GitHub = new GitHubApi({ version: '3.0.0' });
   GitHub.authenticate(config.auth);

   cimpler.on('buildStarted', function(build) {
      reportBuildStatus(build, 'pending', 'Build Started');
   });

   cimpler.on('buildFinished', function(build) {
      var desc = build.error || ("Build " + build.status);
      reportBuildStatus(build, build.error ? 'error' : build.status, desc);
   });

   function reportBuildStatus(build, status, description) {
      // Don't report status for non-github repos
      if (build.repo.indexOf('github.com') == -1) {
         return;
      }

      var repo = extractRepoFromURL(build.repo);

      // If we don't know the commit SHA, we can't report the status
      if (!build.commit) return;

      var commitStatus = {
         user: repo.user,
         repo: repo.name,
         sha: build.commit,
         state: status,
         target_url: build.logUrl,
         description: description };
      GitHub.statuses.create(commitStatus);
   }
};

function extractRepoFromURL(url) {
   var matches = url.match(/([^:\/]+)\/([^\/.]+)(\.git|$)/);
   return {
      user: matches[1],
      name: matches[2]
   };
}
