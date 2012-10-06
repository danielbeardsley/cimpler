/**
 * Copy to config.js in the same directory
 */
exports.config = {
   plugin_dirs: [ './plugins/' ],
   plugins: {
      github: {
         /**
          * For updating commit status via the API
          */
         auth: {
            user: 'username',
            pass: 'password'
         },
         user: 'user-to-watch',
         repo: 'repo_name'
      }
   }
};
