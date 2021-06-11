var childProcess = require('child_process');

exports.init = function(config, cimpler) {
   cimpler.consumeBuild(function(build, started, finished) {
      var options = {
         env: {
            BUILD_REPO:   build.repo,
            BUILD_COMMIT: build.commit,
            BUILD_BRANCH: build.branch,
            BUILD_STATUS: build.status,
            BUILD_QUEUED_AT: build.queuedAt,
            BUILD_NUMBER: build.number,
         }
      };
      childProcess.exec(config.cmd, options, function(err) {
         build.status = err ? 'failed' : 'success';
         finished();
      });
   });
};
