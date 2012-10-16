var net              = require('net'),
    defaultTcpPort   = 20001;

/**
 * Provides a function to inject a build into the system using
 * the same TCP port as the CLI plugin.
 */
module.exports = function triggerBuild(build, tcpPort) {
   tcpPort = tcpPort || loadPortFromConfig() || defaultTcpPort;

   process.stdout.write("Triggering build on " + build.branch + " ... ");
   var connection = net.createConnection(tcpPort, "127.0.0.1", function() {
      connection.end(JSON.stringify(build));
   });

   var body = '';
   connection.setEncoding('utf8');
   connection.on('data', function(chunk) {
      body += chunk;
   });

   connection.on('end', function() {
      if (body) {
         console.log(body);
      }

      if (body !== 'OK') {
         process.exit(1);
      }
   });

   connection.on('error', function() {
      console.log("Couldn't connect to cimpler server");
      process.exit(1);
   });
}

function loadPortFromConfig() {
   var plugins;
   return ((plugins = loadConfig(__dirname + '/../config.js').plugins) &&
            plugins.cli &&
            plugins.cli.tcpPort);
}

function loadConfig(path) {
   try {
      if (fs.statSync(path)) {
         return require(path);
      }
   } catch (err) {}
   return {};
}
