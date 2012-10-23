var NotifyQueue = require('notify-queue'),
    Connect = require('connect'),
    util    = require('util'),
    log4js  = require('log4js'),
    logger  = require('log4js').getLogger(),
    events  = require('events');

function Cimpler(config) {
   if (config && config.testMode) {
      log4js.clearAppenders();
   }

   var builds = new NotifyQueue();
   var cimpler = this;
   var connect;
   var connectServer;
   var running = true;

   this.plugins = [];
   config = config || {};

   this.addBuild = function(build) {
      var existingBuilds = builds.items();
      for(var i=0; i < existingBuilds.length; i++) {
         if (existingBuilds[i].branch == build.branch &&
             existingBuilds[i].repo   == build.repo) {
             existingBuilds[i] = build;
             return;
         }
      }

      build.status = build.status || 'pending';
      this.emit('buildAdded', build);
      builds.push(build);
   };

   this.consumeBuild = function(callback) {
      builds.pop(function(build, done) {
         var started = false;
         callback(build, start, finish);

         function start() {
            process.nextTick(function() {
               started = true;
               cimpler.emit('buildStarted', build);
            });
         }

         function finish() {
            process.nextTick(function() {
               if (!started)
                  cimpler.emit('buildStarted', build);
               cimpler.emit('buildFinished', build);
               done();
            });
         }
      });
   };

   this.registerPlugin = function(plugin, config) {
      plugin.init(config, this, registerMiddleware);
      this.plugins.push(plugin);
   };

   this.shutdown = function() {
      if (!running) return;
      running = false;
      this.emit('shutdown');
      if (connectServer) {
         connectServer.close();
      }
   };

   /**
    * Register all plugins in passed-in config obj
    */
   var plugins = config.plugins || {};
   Object.keys(plugins).forEach(function(pluginName) {
      var pluginConfig = plugins[pluginName];
      if (!pluginConfig || pluginConfig.enabled === false)
         return;

      logger.info('Loading plugin: ' + pluginName);
      var pluginPath = '../plugins/' + pluginName;
      var plugin = require(pluginPath);
      cimpler.registerPlugin(plugin, pluginConfig);
   });


   function registerMiddleware(route, inMiddleware){
      if (!connect) {
         connect = Connect()
            .use(Connect.responseTime())
            .use(Connect.bodyParser())
            .use(Connect.query());

         connectServer = connect.listen(config.httpPort);
      }

      connect.use(route, inMiddleware);
   }
}
util.inherits(Cimpler, events.EventEmitter);

module.exports = Cimpler;
