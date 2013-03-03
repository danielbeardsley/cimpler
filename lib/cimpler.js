var NotifyQueue = require('notify-queue'),
    Connect = require('connect'),
    util    = require('util'),
    _       = require('underscore');
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
   var consumers = [];

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

      // The _control property allows plugins to pass around data
      // without clobbering real build properties.
      build._control = build._control || {};

      this.emit('buildAdded', build);
      builds.push(build);
   };

   this.consumeBuild = function(callback, repoRegex) {
      var repoMatcher = repoRegex && function(build) {
         return repoRegex.test(build.repo);
      }

      var consumer = {
         build: null
      };
      consumers.push(consumer);

      builds.pop(function(build, done) {
         consumer.build = build;
         var started = false;
         callback(build, start, finish);

         function start() {
            started = true;
            cimpler.emit('buildStarted', build);
         }

         function finish() {
            process.nextTick(function() {
               if (!started)
                  cimpler.emit('buildStarted', build);
               cimpler.emit('buildFinished', build);
               consumer.build = null;
               done();
            });
         }
      }, repoMatcher);
   };

   /**
    * Register the passed function as a connect.js middleware under the given
    * route. The two arguments will be passed directly to connect.use().
    */
   this.registerMiddleware = function(route, inMiddleware){
      if (!connect) {
         connect = Connect()
            .use(Connect.responseTime())
            .use(Connect.bodyParser())
            .use(Connect.query());

         connectServer = connect.listen(config.httpPort);
      }

      connect.use(route, inMiddleware);
   };

   this.registerPlugin = function(plugin, configs) {
      var cimpler = this;
      if (!(configs instanceof Array)) {
         configs = [configs];
      }

      configs.forEach(function(config) {
         plugin.init(config, cimpler);
         cimpler.plugins.push(plugin);
      });
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
    * Returns an object of queued and active builds like:
    * {
    *    queued: [build, build, ...],
    *    building: [build, build]
    * }
    *
    * @sanitizeBuilds: pass true to have the _control proerty stripped from
    *                  each build which allows easy JSON serialization.
    */
   this.builds = function(sanitizeBuilds) {
      var safe = function(build) {
         return sanitizeBuilds ? _.omit(build, '_control'): build;
      };
      return {
         queued: builds.items().map(safe),
         building: consumers.reduce(function(builds, consumer) {
            if (consumer.build)
               builds.push(consumer.build);
            return builds;
         }, []).map(safe)
      }
   }

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
}
util.inherits(Cimpler, events.EventEmitter);

module.exports = Cimpler;
