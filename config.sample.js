/**
 * Copy to config.js in the same directory
 */
module.exports = {
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
         /**
          * `enabled` is not required, but if `enabled: false` is present in
          * any plugin config, that plugin will not be loaded
          */
         enabled: false
      },
      /**
       * Enable the command line plugin (uses tcp)
       */
      cli: {
         tcpPort: 20001 // if omitted, default port is 20001
      },
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
         // Path to a local clone of the github repo
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
