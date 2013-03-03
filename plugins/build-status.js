var http = require('http');

exports.init = function(config, cimpler) {
   cimpler.registerMiddleware('/builds/status', function(req, res, next) {
      res.end(JSON.stringify(cimpler.builds(true)));
   });
};
