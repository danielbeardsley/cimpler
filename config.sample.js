/**
 * Copy to config.js in the same directory
 */
module.exports = {
   /**
    * Cimpler needs only one port for all it's network activity.
    *
    * All interaction is done via http.
    */
   httpPort: 25751

   plugins: {
      'github-commit-status': {
         /**
          * For updating commit status via the github API
          *
          * Passed straight through to github.authenticate()
          * from the `github` npm module:
          * https://github.com/ajaxorg/node-github
          */
         auth: {
            type: 'basic', // or 'oauth'
            username: 'githubuser',
            password: 'password'
         }
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
         /**
          * `enabled` is not required, but if `enabled: false` is present in
          * any plugin config, that plugin will not be loaded
          */
         enabled: false
      },
      /**
       * Enable the command line plugin (uses http)
       * (no options)
       */
      cli: true,
      /**
       * Run arbitraty shell commands on each build
       */
      shell: {
         cmd: "echo some shell command",
         enabled: false
      },
      /**
       * Checkout the appropriate commit, merge in master and perform a build
       */
		"git-build":  {
         /**
          * Path (or array of paths) to a local clone of the github repo.
          * One build "consumer" will be created for each path in the array
          * This allows builds to be executed in parallel.
          */
         repoPaths: "/home/user/ci/cloned-repo",
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
