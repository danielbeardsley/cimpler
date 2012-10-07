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
      }
   }
};
