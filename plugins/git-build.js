var childProcess  = require('child_process'),
    path          = require('path');

exports.init = function(config, cimpler) {
   cimpler.consumeBuild(function(build, finished) {
      var options = {
         env: {
            BUILD_REPO:   build.repo,
            BUILD_SHA:    build.sha,
            BUILD_BRANCH: build.branch,
            BUILD_STATUS: build.status
         },
         timeout: config.timeout || 0
      };

      if (!config.repoPath) {
         throw new Error("Missing the 'path' option of git-build config");
      }

      var logRedirection = "";
      if (config.logs.path) {
         var logFilename = build.branch + "--" + build.sha + ".log",
         logFilePath = path.join(config.logs.path, logFilename);
         logRedirection = ' 1>"' + logFilePath + '" 2>&1';

         if (config.logs.url) {
            build.logUrl = path.join(config.logs.url, logFilename);
         }
      }

      var commands =
         '(cd "' + config.repoPath + '" && ' +
         "git fetch --quiet && " +
         "git reset --hard --quiet && " +
         "git checkout --quiet $BUILD_SHA && " +
         "git merge origin/master >/dev/null && " + 
         "echo Merge Successful && " +
         "(" + config.cmd + ") && " +
         "echo Build Successful ) " + logRedirection;

      console.log("Building with git");

      var proc = childProcess.exec(commands, options,
         function(err, stdout, stderr) {
            build.status = err ? 'failure' : 'success';
            finished();
         });
   });
};
