var childProcess  = require('child_process'),
    fs            = require('fs'),
    path          = require('path');

exports.init = function(config, cimpler) {
   cimpler.consumeBuild(function(build, finished) {
      var execOptions = {
         env: {
            BUILD_REPO:   build.repo,
            BUILD_SHA:    build.sha,
            BUILD_BRANCH: build.branch,
            BUILD_STATUS: build.status
         },
         timeout: config.timeout || 0
      },
      logFilePath,
      logRedirection = '';

      for(var key in process.env) {
         execOptions.env[key] = process.env[key];
      }

      if (!config.repoPath) {
         throw new Error("Missing the 'path' option of git-build config");
      }

      var logRedirection = "";
      if (config.logs.path) {
         var logFilename = build.branch + "--" + build.sha + ".log";

         logFilePath = path.join(config.logs.path, logFilename);
         logRedirection = ' 1>"' + logFilePath + '" 2>&1';

         if (config.logs.url) {
            build.logUrl = path.join(config.logs.url, logFilename);
         }
      }

      console.log(build.sha + " -- Building with git");

      startMerge();

      function startMerge() {
         var commands = 
            '(set -v; set -x;' +
            'cd "' + config.repoPath + '" && ' +
            "git fetch && " +
            "git reset --hard && " +
            "git checkout $BUILD_SHA && " +
            "git merge origin/master) 2>&1";

         exec(commands, function(err, stdout) {
            if (err) {
               var failed = "Merge Failed";
               build.status = 'error';
               build.error = failed;
               stdout += "\n\n" + failed;
               console.log(build.sha + " -- " + failed);
               finished();
            } else {
               var success = "Merge Successful";
               stdout += success;
               console.log(build.sha + " -- " + success);
               startBuild();
            }

            if (logFilePath) {
               fs.writeFile(logFilePath, stdout);
            }
         });
      }

      function startBuild() {
         var commands = "(" + config.cmd + ")" +
            echoStatusCmd('Build') +
            logRedirection;

         console.log(build.sha + " -- Running: " + commands);
         exec(commands, function(err, stdout) {
            build.status = err ? 'failure' : 'success';
            console.log(build.sha + " -- Build " + build.status);
            finished();
         });
      }

      function exec(cmd, callback) {
         return childProcess.exec(cmd, execOptions,
            function(err, stdout, stderr) {
               callback(err, stdout.toString());
            });
      }
   });

   function echoStatusCmd(noun) {
      return " && echo '"+noun+" Successful' || ( echo '"+noun+" Failed'; exit 1 )";
   }
};
