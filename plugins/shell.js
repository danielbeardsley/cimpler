var childProcess = require('child_process');

exports.init = function(config, cimpler) {
   cimpler.consumeBuild(function(build, finished) {
      var options = {
         env: {
            BUILD_REPO:   build.repo,
            BUILD_SHA:    build.sha,
            BUILD_BRANCH: build.branch,
            BUILD_STATUS: build.status
         }
      };
      childProcess.exec(config.cmd, options, function() {
         build.status = 'success';
         finished();
      });
   });
};
