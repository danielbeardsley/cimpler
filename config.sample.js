/**
 * Copy to config.js in the same directory
 */
module.exports = {
   /**
    * Cimpler needs only one port for all it's network activity.
    *
    * All interaction is done via http.
    */
   httpPort: 25751,

   plugins: {
      /**
       * HTTP endpoint for retrieving build-status information
       *
       * url: /builds/status
       */
      'build-status': true,

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

      /**
       * Github Post-Receive listener
       *
       * Listens to POSTs with urls === "/github" on httpPort
       */
      github: true,

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
       * Run arbitraty shell commands on for build (an alternative to git-build).
       * This does not do depend on a local clone, it executes `cmd` in the
       * cimpler directory and has several environment variables set before
       * each build.
       */
      shell: {
         cmd: "echo some shell command",
         enabled: false
      },

      /**
       * Checkout the appropriate commit, merge in master and perform a build
       */
      "git-build":[ {
         /**
          * Path (or array of paths) to a local clone of the github repo.
          * One build "consumer" will be created for each path in the array
          * This allows builds to be executed in parallel.
          */
         repoPaths: "/home/user/ci/cloned-repo",
         /**
          * Regex that allows filtering of which builds this plugin instance
          * should be responsible for. Only builds who's `build.repo` property
          * match this regex will be built.
          *
          * If this property is falsy or undefined, the plugin will accept all
          * builds.
          */
         repoRegex: /githubuser\/reponame/,
         /**
          * The shell command that is run for each build.
          * The exit code of this command determines success or failure
          * of the build. Both stdout and stderr are sent to the log.
          */
         cmd: "make test",
         logs: {
            // Path to write log files for each build (optional)
            path: "/var/www/ci-builds/",
            // Base Url to access the above log files.
            url:  "http://www.example.com/ci-builds/"
         },
         enabled: true
      }/** , {
         * Any plugin who's configuration object is an array
         * will have it's .init() function called once for each element
         * in the array.
         *
         * Using the `repoRegex` config option allows you to
         * build and test multiple repositories using the
         * same instance of Cimpler
         repoRegex: /githubuser\/otherrepo/,
      }*/
      ]
   }
};
