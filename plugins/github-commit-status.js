var util   = require('util'),
GitHubApi  = require('github');

exports.init = function(config, cimpler) {
   var GitHub = new GitHubApi({ version: '3.0.0' });
   GitHub.authenticate({
      type: 'basic',
      username: config.auth.user,
      password: config.auth.pass
   });

   cimpler.on('buildStarted', function(build) {
      reportBuildStatus(build, 'pending', 'Build Started');
   });

   cimpler.on('buildFinished', function(build) {
      var desc = build.error || ("Build " + build.status);
      reportBuildStatus(build, build.status, desc);
   });

   function reportBuildStatus(build, status, description) {
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
