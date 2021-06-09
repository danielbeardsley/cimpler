var util   = require('util'),
Git        = require('../lib/git');
let { Octokit } = require('@octokit/rest');

exports.init = function(config, cimpler) {
   // Just to allow mocking the api in the tests.
   Octokit = config._overrideApi || Octokit;

   var GitHub = getGithubApi(config);

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
         owner: repo.user,
         repo: repo.name,
         sha: build.commit,
         state: status,
         target_url: build.logUrl,
         description: description };
      GitHub.repos.createCommitStatus(commitStatus);
   }
};

function getGithubApi(config) {
   return new Octokit({
      headers: {
         "user-agent": "Cimpler CI"
      },
      auth: config.auth.token
   });
}
