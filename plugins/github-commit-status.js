var util   = require('util'),
Git        = require('../lib/git'),
GitHubApi  = require('github');

exports.init = function(config, cimpler) {
   // Just to allow mocking the api in the tests.
   GitHubApi = config._overrideApi || GitHubApi;

   var GitHub = getGithubApi(config);

   cimpler.on('buildAdded', function(build) {
      if (!build.error) {
         reportBuildStatus(build, 'pending', 'Build Queued');
      }
   });

   cimpler.on('buildStarted', function(build) {
      if (!build.error) {
         reportBuildStatus(build, 'pending', 'Build Started');
      }
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

      var repo = Git.parseGithubUrl(build.repo);

      // If we don't know the commit SHA, we can't report the status
      if (!build.commit) return;

      var commitStatus = {
         context: config.context || 'default',
         user: repo.user,
         repo: repo.name,
         sha: build.commit,
         state: status,
         target_url: build.logUrl,
         description: description };
      GitHub.repos.createStatus(commitStatus);
   }
};

function getGithubApi(config) {
   var githubApi = new GitHubApi({
      headers: {
         "user-agent": "Cimpler CI"
      }
   });
   githubApi.authenticate(config.auth);
   return githubApi;
}
