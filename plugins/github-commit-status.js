var util   = require('util'),
GitHubApi  = require('github');

exports.init = function(config, cimpler) {
   var GitHub = new GitHubApi({ version: '3.0.0' });
   GitHub.authenticate({
      type: 'basic',
      username: config.auth.user,
      password: config.auth.pass
   });

   cimpler.on('finishBuild', function(build) {
      reportBuildStatus(build);
   });

   cimpler.on('newBuild', function(build) {
      reportBuildStatus(build);
   });

   function reportBuildStatus(build) {
      GitHub.statuses.create({
         user: config.user,
         repo: config.repo,
         sha: build.sha,
         state: build.status,
         target_url: "http://www.example.com/",
         description: "Build " + build.status });
   }
};
