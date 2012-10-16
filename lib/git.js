var util       = require('util'),
error          = (util.error || console.log),
childProcess   = require('child_process');

function Git(gitDir) {
   this._execOptions = gitDir ? { cwd: gitDir } : {};
}

Git.prototype.remote = function(cb) {
   var git = this;
   this._exec("git remote -v", function(stdout) {
      // Output looks like:
      // ...
      var remotes = stdout.split("\n");
      // Default to the first remote.
      var originRemote = remotes[0];
      // Choose the first remote containing ^origin
      for(var i=0; i<remotes.length; i++) {
         if (remotes[i].match(/^origin\s/)){
            originRemote = remotes[i];
            break;
         }
      }
      // If we found a remote
      if (originRemote) {
         // origin  http://remote_url (fetch)
         return cb(originRemote.split(/\s+/)[1]);
      } else {
         exec("git rev-parse --show-toplevel", function(stdout) {
            // Output looks like:
            // /usr/blah/path/to/repo
            return cb(null, stdout.trim());
         });
      }
   });
};

Git.prototype._exec = function exec(cmd, callback) {
   childProcess.exec(cmd, this._execOptions, function(err, stdout) {
      if (err) {
         error("Command failed: " + cmd);
         error(err.toString());
         process.exit(1);
      }
      callback(stdout.toString());
   });
}

module.exports = Git;
