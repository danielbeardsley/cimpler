var util   = require('util'),
GitHubApi  = require('github');

exports.init = function(config, cimpler) {
   // Just to allow mocking the api in the tests.
   var GitHubApi = config._overrideApi || GitHubApi;

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
      // If we don't know the SHA, we can't report the status
      if (!build.sha) return;

      var commitStatus = {
         user: config.user,
         repo: config.repo,
         sha: build.sha,
         state: status,
         target_url: build.logUrl,
         description: description };
      GitHub.statuses.create(commitStatus);
   }
};
