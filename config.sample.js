/**
 * Copy to config.js in the same directory
 */
exports.config = {
   plugin_dirs: [ './plugins/' ],
   plugins: {
      'github-commit-status': {
         /**
          * For updating commit status via the github API
          */
         auth: {
            user: 'githubuser',
            pass: 'password'
         },
         /**
          * user/repo to update
          */
         user: 'user',
         repo: 'repo'
      },
      github: {
         /**
          * TCP port to listen for Github post-receive hooks on
          */
         listen_port: 12345
      },
      /**
       * Automatically marks all builds as successful (for testing)
       */
      dummy: {
         enabled: false
      },
      /**
       * Run arbitraty shell commands on each build
       */
      shell: {
         cmd: "echo some shell command",
         enabled: false
      },
      /**
       * Checkout the build, merge in master and perform a build
       */
		"git-build":  {
         // Path to an existing repo
         repoPath: "/home/user/ci/cloned-repo",
         // Arbitrary shell command
         cmd: "make test",
         logs: {
            // Path to write log files for each build (optional)
            path: "/var/www/ci-builds/",
            // Base Url to access the above log files.
            url:  "http://www.example.com/ci-builds/"
         },
         enabled: true
      }
   }
};
