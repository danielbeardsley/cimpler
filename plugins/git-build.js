var childProcess  = require('child_process'),
    fs            = require('fs'),
    util          = require('util'),
    logger        = require('log4js').getLogger(),
    _             = require('underscore'),
    path          = require('path'),
    shellQuote    = require('shell-quote').quote,
    quote = function (input) {
       return shellQuote([input]);
    }
exports.init = function(config, cimpler) {
   var paths = config.repoPaths;
   paths = Array.isArray(paths) ? paths : [paths]
   paths.forEach(function(repoPath) {
      var consumer = buildConsumer(config, cimpler, repoPath);
      cimpler.consumeBuild(consumer, config.repoRegex || config.buildFilter);
   });

   cimpler.on('buildAborted', function(build) {
      if (build._control && build._control.abortGitBuild) {
         build.aborted = true;
         build._control.abortGitBuild();
      }
   });
}

function buildConsumer(config, cimpler, repoPath) {
   return function(build, started, finished) {
      var startedAt = Date.now();
      var execOptions = {
         env: {
            BUILD_REPO:   build.repo,
            BUILD_COMMIT: build.commit,
            BUILD_BRANCH: build.branch,
            BUILD_STATUS: build.status
         },
         timeout: config.timeout || 0,
         maxBuffer: config.maxBuffer || 1024 * 1024 * 2,
         stdio: 'pipe',
         detached: true
      },
      cdToRepo = 'set -v; set -x; cd ' + quote(repoPath);

      for(var key in process.env) {
         execOptions.env[key] = process.env[key];
      }

      if (!repoPath) {
         throw new Error("Missing the 'path' option of git-build config");
      }

      logger.info(id(build) + " -- Building with git");

      sometimesPrune();

      // This needs to be delayed until we have a commit hash
      function writeLogHeader() {
         logFile().write( 
            "----------------------------------------------\n" +
            " Cimpler build started at: " + Date() + "\n" +
            "----------------------------------------------\n");
      }

      /**
       * If there are too many loose objects, git auto-gc will not run 'git
       * prune' on its own and complain and fail with:
       * "too many loose objects, run git prune".
       * So, run git prune every once in a while so we dont' run into this.
       */
      function sometimesPrune() {
         var next = startFetch;
         if (shouldPrune()) {
            var command = 'cd ' + quote(repoPath) + ' && ' + "git prune 2>&1";
            exec(command, function(err, stdout) {
               if (err) {
                  var failed = "git prune failed";
                  build.status = 'error';
                  build.error = failed;
                  build.code = err.code;
                  stdout += "\n\n" + failed;
                  logger.warn(id(build) + " -- " + failed);
                  finishedBuild();
               } else {
                  next();
               }
            })
         } else {
            next();
         }
      }

      function startFetch() {
         var commands = '(cd ' + quote(repoPath) + ' && ' +
            "git fetch --quiet && " +
            "git rev-parse " + quote("origin/" + build.branch) + ") 2>&1";

         var fetching = exec(commands, function(err, stdout) {
            if (err) {
               var failed = "Fetch Failed";
               build.status = 'error';
               build.error = failed;
               build.code = err.code;
               stdout += "\n\n" + failed;
               logger.warn(id(build) + " -- " + failed);
               writeLogHeader()
               logFile().write(stdout);
               finishedBuild();
            } else {
               if (!build.commit) {
                  // Update the build commit and the environment variable if
                  // we didn't know what the build commit was previously.
                  build.commit = stdout.trim();
                  execOptions.env.BUILD_COMMIT = build.commit;
               }
               writeLogHeader();
               startMerge();
            }
         });
      }

      function startMerge() {
         var branchToMerge = config.mainBranch || 'master';
         var regex, mergeBranch;
         if (config.mergeBranchRegexes) {
            for (var i = 0; i < config.mergeBranchRegexes.length; ++i) {
               regex = config.mergeBranchRegexes[i][0];
               mergeBranch = config.mergeBranchRegexes[i][1];
               if (build.branch.match(regex)) {
                  branchToMerge = mergeBranch;
                  break;
               }
            }
         }
         var commands = '(' + cdToRepo + " && " +
            "git reset --hard && " +
            "git clean -ffd && " +
            "(git submodule foreach --recursive git clean -ffd || true) && " +
            "git checkout "+ quote(build.commit) + " && " +
            "git merge " + quote("origin/" + branchToMerge) + " && " +
            "git clean -ffd && " +
            "git submodule sync && " +
            "git submodule update --init --recursive ) 2>&1";

         var merging = exec(commands, function(err, stdout) {
            var nextStep, message;

            if (err) {
               message = "Merge Failed";
               nextStep = finishedBuild;
               build.status = 'error';
               build.error = message;
               build.code = err.code;
               stdout += "\n\n" + message;

            } else {
               message = "Merge Successful";
               nextStep = startBuild;
               stdout = message + "\n";

            }


            logger.info(id(build) + " -- " + message);
            logFile().write(stdout);

            nextStep(started);
         });
      }

      function startBuild(started) {
         var buildCommand = (build.buildCommand || config.cmd) + " 2>&1";
         var commands = [cdToRepo, buildCommand];
         var commandString = commands.join("; ");

         var proc = exec(commandString, function(err, stdout, stderr) {
            if (err && err.signal) {
               build.status = 'error';
               build.error = err.signal + " - " + err.code;
               build.code = err.code;
            } else {
               build.status = err ? 'failure' : 'success';
               build.code = err ? err.code : 0;
            }
            logger.info(id(build) + " -- Build " + build.status);
            finishedBuild();
         });

         /**
          * Use piping instead of shell redirection to capture output
          * in case of a syntax error in cmd
          */
         proc.stdout.pipe(logFile(), {end:false});
         proc.stderr.pipe(logFile(), {end:false});

         // Fire the started event now that our build has a log.
         started();
      }

      function logFilePath(inBuild) {
         if (!config.logs || !config.logs.path)
            return null;

         var logFilename = (inBuild.branch.replace(/[^0-9a-zA-Z]+/g, '-') || 'HEAD') + "--" +
                           (inBuild.commit || 'unknown') + "--" + 
                           Date.now() + ".log";

         if (config.logs.url) {
            inBuild.logUrl = config.logs.url + logFilename;
            execOptions.env.BUILD_LOG_URL = inBuild.logUrl;
         }

         inBuild.logPath = path.join(config.logs.path, logFilename);
         return inBuild.logPath;
      }

      var logFileStream;
      function logFile() {
         if (logFileStream) {
            return logFileStream;
         }

         var logPath = logFilePath(build);
         if (!logPath) {
            logFileStream = dummyWriteStream();
         }

         return logFileStream  =
            logFileStream ||
            fs.createWriteStream(logPath);
      }

      function finishedBuild() {
         if (build.aborted) {
            build.error = "Build Aborted";
            build.status = 'error';
         }

         var seconds = Math.round((Date.now() - startedAt) / 1000);
         logFile().write(
          "\n-------------------------------------------" +
          "\n Cimpler build finished in " + seconds + " seconds");
         if (build.error) {
            logFile().write("\n Error: " + build.error);
         } else {
            logFile().write("\n Status: " + build.status + " Exit Code: " + build.code);
         }
         // Call 'finished' when end() flushes it's data to disk
         // This is mostly for testing so we *known* that the data has been
         // written.
         logFile().end(
          "\n-------------------------------------------\n",'utf8',finished);
      }

      function exec(cmd, callback) {
         var child, done = false, forceErr, options = _.clone(execOptions);
         if (options.timeout) {
            setTimeout(function() {
               if (done) return;
               forceErr = {signal: "timeout", code: execOptions.timeout};
               process.kill(-child.pid);
            }, options.timeout);
            delete options.timeout;
         }

         var args = ['-c', cmd];
         child = childProcess.spawn('bash', args, execOptions).on('exit',
            function(code, signal) {
               done = true;
               child.stdout.setEncoding('utf8');
               child.stderr.setEncoding('utf8');
               var stdout = child.stdout.read();
               var stderr = child.stderr.read();
               setAbort(build, function () {});
               var errObj = code == 0 ? null : {code: code, signal: signal};
               callback(forceErr || errObj, stdout, stderr);
            });

         setAbort(build, function() {
            process.kill(-child.pid);
         });

         build.pid = child.pid;
         return child;
      }
   };
};

/**
 * Create a dummy write stream that works in node >= 0.8 
 */
function dummyWriteStream() {
   var stream = require('stream').Writable || require('stream');
   var devnull = new stream();
   devnull._write = devnull.write = devnull.end =
   function (a,b,callback) {
      callback && callback();
   };
   return devnull;
}


function setAbort(build, callback) {
   if (!build._control) {
      build._control = {};
   } 
   build._control.abortGitBuild = function() {
      logger.info(id(build) + " -- Build Aborted");
      callback();
   }
}

function id(inBuild) {
   return inBuild.branch +
      (inBuild.commit ? ' (' + inBuild.commit.substr(0,10) + ')' : '');
}

function shouldPrune() {
   return Math.random() < 0.05;
}
