var http       = require('http'),
    util       = require('util'),
    allowedIps = [
       '127.0.0.1',      // For Testing
       '207.97.227.253', // GitHub #1
       '50.57.128.197',  // GitHub #2
       '108.171.174.178' // GitHub #3
    ];


exports.init = function(config, cimpler) {
   /**
    * Listen for post-recieve hooks
    */
   var server = http.createServer(function(request, response) {
      if (!passesWhitelist(request, response)) {
         return;
      }

      var body = '';
      request.setEncoding('utf8');
      request.on('data', function(chunk) {
         body += chunk;
      });

      request.on('end', function() {
         try {
            var build = extractBuildInfo(body);
            cimpler.addBuild(build);
            reportBuildStatus(build);
         } catch (e) {
            util.error("Bad Request");
            util.error(e.stack);
         }
         response.end();
      });
   }).listen(config.listen_port);

   cimpler.on('shutdown', function() {
      server.close();
   });

   function reportBuildStatus(build) {
   }
};

function passesWhitelist(req, res) {
   if (allowedIps.indexOf(req.connection.remoteAddress) >= 0) {
      return true;
   }

   res.writeHead(403, 'Access denied.');
   res.end();
   console.warn('Access denied for ' + req.connection.remoteAddress);
}

function extractBuildInfo(requestBody) {
   body = decodeURIComponent(requestBody);
   // Get rid of "payload="
   var payload = body.substring(8);
   var info = JSON.parse(payload);

   // ref: "refs/heads/master"
   var branch = info.ref.split('/').pop();

   // Build info structure
   return {
     repo   : info.repository.url,
     sha    : info.after,
     branch : branch,
     status : 'pending'
   };
}

