var http     = require('http'),
    fs       = require('fs'),
    url      = require('url'),
    defaulthttpPort = 25750;

/**
 * Provides a function to inject a build into the system using
 * the same http port as the CLI plugin.
 */
exports.injectBuild = function injectBuild(build, httpPort, options) {
   httpPort = httpPort || loadPortFromConfig() || defaulthttpPort;

   process.stdout.write("Ctrl-C will not stop the build, only the display.\n\n");
   process.stdout.write("Triggering build on " + build.branch + " ... ");

   options = options || {};
   var urlParams = {};
   if (options.tail) {
      urlParams.tail_log = 'true';
   }

   var reqOptions = {
      port: httpPort,
      path: '/build' + url.format({query:urlParams}),
      method: 'POST',
      headers: {
         'Content-Type' : 'application/json'
      }
   };

   var req = http.request(reqOptions, onResponse);

   req.on('error', function(err) {
      console.log("Couldn't connect to cimpler server");
      process.exit(1);
   });

   req.end(JSON.stringify(build));

   function onResponse(res) {
      process.stdout.write("Done\n\n");

      res.setEncoding('utf8');
      res.on('data', function(chunk) {
         process.stdout.write(chunk);
      });

      res.on('end', function() {
         if (res.statusCode != 200) {
            console.log("Error");
            process.exit(1);
         }
      });
      res.on('close', function() {
         console.log("Connection to cimpler interrupted.");
         process.exit(1);
      });
   }
}

exports.getStatus = function(httpPort, callback) {
   httpPort = httpPort || loadPortFromConfig() || defaulthttpPort;

   var options = {
      port: httpPort,
      path: '/builds/status'
   };

   var req = http.get(options, onResponse);

   req.on('error', function(err) {
      console.log("Couldn't connect to cimpler server");
      process.exit(1);
   });

   function onResponse(res) {
      var body = '';
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
         body += chunk;
      });

      res.on('end', function() {
         if (res.statusCode != 200) {
            console.log("Error retreiving build status, "+
                        "got http response code: " + res.statusCode);
            process.exit(1);
         }

         callback(null, JSON.parse(body));
      });
      res.on('close', function() {
         console.log("Connection to cimpler interrupted.");
         process.exit(1);
      });
   }
}

function loadPortFromConfig() {
   var config = loadConfig(__dirname + '/../config.js');
   return config && config.httpPort;
}

function loadConfig(path) {
   try {
      if (fs.statSync(path)) {
         return require(path);
      }
   } catch (err) {}
   return {};
}
