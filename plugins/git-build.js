var childProcess  = require('child_process'),
    fs            = require('fs'),
    util          = require('util'),
    logger        = require('log4js').getLogger(),
    path          = require('path');

exports.init = function(config, cimpler) {
   var paths = config.repoPaths;
   paths = Array.isArray(paths) ? paths : [paths]
   paths.forEach(function(repoPath) {
      var consumer = buildConsumer(config, cimpler, repoPath);
      cimpler.consumeBuild(consumer, config.repoRegex);
   });
}

function buildConsumer(config, cimpler, repoPath) {
   return function(build, started, finished) {
      var execOptions = {
         env: {
            BUILD_REPO:   build.repo,
            BUILD_COMMIT: build.commit,
            BUILD_BRANCH: build.branch,
            BUILD_STATUS: build.status
         },
         timeout: config.timeout || 0
      },
      cdToRepo = 'set -v; set -x; cd "' + repoPath + '"';

      for(var key in process.env) {
         execOptions.env[key] = process.env[key];
      }

      if (!repoPath) {
         throw new Error("Missing the 'path' option of git-build config");
      }

      logger.info(id(build) + " -- Building with git");

      if (logFilePath(build)) {
         fs.writeFileSync(logFilePath(build), new Date());
      }

      startFetch();

      function startFetch() {
         var commands = '(cd "' + repoPath + '" && ' +
            "git fetch --quiet && " +
            "git rev-parse origin/" + build.branch + ") 2>&1";

         exec(commands, function(err, stdout) {
            if (err) {
               var failed = "Fetch Failed";
               build.status = 'error';
               build.error = failed;
               stdout += "\n\n" + failed;
               logger.warn(id(build) + " -- " + failed);
               fs.appendFileSync(logFilePath(build), stdout);
               finishedBuild();
            } else {
               if (!build.commit) {
                  build.commit = stdout.trim();
               }
               startMerge();
            }
         });
      }

      function startMerge() {
         var commands = '(' + cdToRepo + " && " +
            "git reset --hard && " +
            "git clean -ffd && " +
            "git checkout "+build.commit+" && " +
            "git merge origin/master && " +
            "git submodule update --init --recursive ) 2>&1";

         exec(commands, function(err, stdout) {
            var nextStep, message;

            if (err) {
               message = "Merge Failed";
               nextStep = finishedBuild;
               build.status = 'error';
               build.error = message;
               stdout += "\n\n" + message;

            } else {
               message = "Merge Successful";
               nextStep = startBuild;
               stdout = message + "\n";

            }

            // Assigns a log file to this build
            var logPath = logFilePath(build);

            logger.info(id(build) + " -- " + message);
            fs.appendFileSync(logPath, stdout);

            nextStep(started);
         });
      }

      function startBuild(started) {
         var buildCommand = build.buildCommand || config.cmd;
         var commands = cdToRepo + " && (" + buildCommand + ")" +
                        echoStatusCmd('Build');

         var proc = exec(commands, function(err, stdout, stderr) {
            build.status = err ? 'failure' : 'success';
            logger.info(id(build) + " -- Build " + build.status);
            finishedBuild();
         });

         /**
          * Use piping instead of shell redirection to capture output
          * in case of a syntax error in cmd
          */
         proc.stdout.pipe(logFile(), {end:false});
         proc.stderr.pipe(logFile(), {end:false});
         if (build._control.tail_log) {
            build._control.logs = {
               stdout : proc.stdout,
               stderr : proc.stderr
            };
         }

         // Fire the started event now that our build has a log.
         started();
      }

      function logFilePath(inBuild) {
         if (!config.logs || !config.logs.path)
            return null;

         var logFilename = (inBuild.branch || 'HEAD') + "--" +
                           (inBuild.commit || 'unknown') + ".log";

         if (config.logs.url) {
            inBuild.logUrl = path.join(config.logs.url, logFilename);
         }

         inBuild.logPath = path.join(config.logs.path, logFilename);
         return inBuild.logPath;
      }

      var logFileStream;
      function logFile() {
         return logFileStream  =
            logFileStream ||
            fs.createWriteStream(logFilePath(build), {flags:'a+'});
      }

      function finishedBuild() {
         if (logFileStream) logFileStream.end();
         finished();
      }

      function exec(cmd, callback) {
         return childProcess.exec(cmd, execOptions,
            function(err, stdout, stderr) {
               callback(err, stdout.toString());
            });
      }

      function id(inBuild) {
         return inBuild.branch +
            (inBuild.commit ? ' (' + inBuild.commit.substr(0,10) + ')' : '');
      }
   };
};

function echoStatusCmd(noun) {
   return " && echo '"+noun+" Successful' || ( echo '"+noun+" Failed'; exit 1 )";
}
