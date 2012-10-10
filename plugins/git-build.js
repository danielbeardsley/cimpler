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
      cdToRepo = 'set -v; set -x; cd "' + config.repoPath + '"';

      for(var key in process.env) {
         execOptions.env[key] = process.env[key];
      }

      if (!config.repoPath) {
         throw new Error("Missing the 'path' option of git-build config");
      }

      console.log(id(build) + " -- Building with git");

      startFetch();

      function startFetch() {
         var commands = '(cd "' + config.repoPath + '" && ' +
            "git fetch --quiet 2>/dev/null && " +
            "git rev-parse origin/" + build.branch + ") 2>&1";

         exec(commands, function(err, stdout) {
            if (err) {
               var failed = "Fetch Failed";
               build.status = 'error';
               build.error = failed;
               stdout += "\n\n" + failed;
               console.log(id(build) + " -- " + failed);
               if (logFilePath(build)) {
                  fs.writeFile(logFilePath(build), stdout);
               }
               finished();
            } else {
               if (!build.sha) {
                  build.sha = stdout.trim();
               }
               startMerge();
            }
         });
      }

      function startMerge() {
         var commands = '(' + cdToRepo + " && " +
            "git reset --hard && " +
            "git checkout "+build.sha+" && " +
            "git merge origin/master) 2>&1";

         exec(commands, function(err, stdout) {
            if (err) {
               var failed = "Merge Failed";
               build.status = 'error';
               build.error = failed;
               stdout += "\n\n" + failed;
               console.log(id(build) + " -- " + failed);
               finished();
            } else {
               var success = "Merge Successful";
               stdout += success;
               console.log(id(build) + " -- " + success);
               startBuild();
            }

            if (logFilePath(build)) {
               fs.writeFile(logFilePath(build), stdout);
            }
         });
      }

      function startBuild() {
         var commands = "(" + config.cmd + ")" +
            echoStatusCmd('Build') +
            logRedirection(build);

         exec(commands, function(err, stdout) {
            build.status = err ? 'failure' : 'success';
            console.log(id(build) + " -- Build " + build.status);
            finished();
         });
      }

      function logFilePath(inBuild) {
         if (!config.logs.path)
            return null;

         var logFilename = (inBuild.branch || 'HEAD') + "--" +
                           (inBuild.sha || 'unknown') + ".log";

         if (config.logs.url) {
            inBuild.logUrl = path.join(config.logs.url, logFilename);
         }

         inBuild.logPath = path.join(config.logs.path, logFilename);
         return inBuild.logPath;
      }

      function logRedirection(inBuild) {
         return ' 1>>"' + logFilePath(inBuild) + '" 2>&1';
      }

      function exec(cmd, callback) {
         return childProcess.exec(cmd, execOptions,
            function(err, stdout, stderr) {
               callback(err, stdout.toString());
            });
      }

      function id(inBuild) {
         return inBuild.branch +
            (inBuild.sha ? ' (' + inBuild.sha.substr(0,10) + ')' : '');
      }
   });

   function echoStatusCmd(noun) {
      return " && echo '"+noun+" Successful' || ( echo '"+noun+" Failed'; exit 1 )";
   }
};
