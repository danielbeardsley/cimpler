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
      build.status = build.status || 'pending';

      // The _control property allows plugins to pass around data
      // without clobbering real build properties.
      build._control = build._control || {};

      var existingBuilds = builds.items();

      var shouldMergeBuilds = typeof config.shouldMergeBuilds !== 'undefined' ?
       config.shouldMergeBuilds : buildEquals;
      for (var i = 0; i < existingBuilds.length; i++) {
         if (shouldMergeBuilds(existingBuilds[i], build)) {
            existingBuilds[i] = build;
            return;
         }
      }

      this.emit('buildAdded', build);

      var runningConsumer = this.isBuildRunning(build);
      if (config.abortMatchingBuilds && runningConsumer) {
         builds.items().unshift(build);
         this.emit('buildAborted', runningConsumer.build);
      } else {
         builds.push(build);
      }
   };

   this.consumeBuild = function(callback, buildFilter) {
      var filter;
      if (buildFilter instanceof RegExp) {
         filter = function(build) {
            return buildFilter.test(build.repo);
         }
      } else if (_.isFunction(buildFilter)) {
         filter = buildFilter
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
      }, filter);
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

         logger.info('Listening on port: ' + config.httpPort);
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
      for (var i = 0; i < consumers.length; ++i) {
         if (consumers[i].build) {
            this.emit('buildAborted', consumers[i].build);
         }
      }
   };

   this.isBuildRunning = function(build) {
      for (var i = 0; i < consumers.length; ++i) {
         if (buildEquals(consumers[i].build, build)) {
            return consumers[i];
         }
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

function buildEquals(build1, build2) {
   return build1 && build2 &&
    build1.branch == build2.branch &&
    build1.repo == build2.repo;
}

module.exports = Cimpler;
