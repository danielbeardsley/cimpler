var http = require('http');

exports.init = function(config, cimpler) {
   var queuedBuilds = [];
   var runningBuilds = [];

   var server = http.createServer(function(req, res) {
      res.end(JSON.stringify(cimpler.builds()));
   });
   server.listen(config.httpPort || 20002);

   cimpler.on('shutdown', function() {
      server.close();
   });
};
