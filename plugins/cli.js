var net        = require('net'),
    util       = require('util'),
    allowedIps = [
       '127.0.0.1'
    ];


exports.init = function(config, cimpler) {
   var cliPort = config.tcpPort || 20001;

   /**
    * Listen for post-recieve hooks
    */
   var server = net.createServer(function(connection) {
      if (allowedIps.indexOf(connection.address().address) < 0) {
         util.error("Connection denied from: " +
            JSON.stringify(connection.address()));
         return connection.end("DENIED");
      }

      var body = '';
      connection.setEncoding('utf8');
      connection.on('data', function(chunk) {
         body += chunk;
      });

      connection.on('end', function() {
         try {
            var build = JSON.parse(body);
            cimpler.addBuild(build);
         } catch (e) {
            util.error("Bad command line request");
            util.error(e.stack);
         }
      });
   });
   server.listen(cliPort);

   cimpler.on('shutdown', function() {
      server.close();
   });
};
