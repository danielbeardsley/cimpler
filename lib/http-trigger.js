var http     = require('http'),
    fs       = require('fs'),
    url      = require('url'),
    ConfigProvider = require('./config-provider');
    connectionTimeout = 30*60*1000, // 30 min
    defaulthttpHost = 'localhost',
    defaulthttpPort = 25750;

    ConfigProvider.load();

/**
 * Provides a function to inject a build into the system using
 * the same http port as the CLI plugin.
 */
exports.injectBuild = function injectBuild(build, options, callback) {
   var config = ConfigProvider.get();
   var httpHost = (options && options.httpHost)
               || (config && config.httpHost)
               || defaulthttpHost;
   var httpPort = (options && options.httpPort)
               || (config && config.httpPort)
               || defaulthttpPort;

   process.stdout.write("Adding build of " + build.branch + " to the queue ... ");

   var reqOptions = {
      host: httpHost,
      port: httpPort,
      path: '/build',
      method: 'POST',
      headers: {
         'Content-Type' : 'application/json'
      }
   };

   var req = http.request(reqOptions, onResponse);
   // To support both <=0.8 and >=0.10
   var connection = req.connection || req;
   connection.setTimeout(connectionTimeout);

   req.on('error', function(err) {
      console.log("Couldn't connect to cimpler server");
      process.exit(1);
   });

   req.end(JSON.stringify(build));

   function onResponse(res) {
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
         process.stdout.write(chunk);
      });

      res.on('end', function() {
         process.stdout.write("\n");
         if (res.statusCode != 200) {
            console.log("Error");
            process.exit(1);
         }
         if (callback) {
            callback();
         }
      });
      res.on('error', function(err) {
         console.log("Connection to cimpler interrupted.");
         console.log(err);
         process.exit(1);
      });
   }
}

exports.getStatus = function(options, callback) {
   var config = ConfigProvider.get();
   var httpHost = (options && options.httpHost)
               || (config && config.httpHost)
               || defaulthttpHost;
   var httpPort = (options && options.httpPort)
               || (config && config.httpPort)
               || defaulthttpPort;

   var options = {
      host: httpHost,
      port: httpPort,
      path: '/builds/status'
   };

   var req = http.get(options, onResponse);

   req.on('error', function(err) {
      console.log("Error sending request to cimpler server");
      console.log(err);
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
            console.log("body: " + body);
            process.exit(1);
         }

         callback(null, JSON.parse(body));
      });
      req.on('error', function(err) {
         console.log("Error reading response from cimpler server");
         console.log(err);
         process.exit(1);
      });
   }
}
