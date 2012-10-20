var Queue   = require('./queue'),
    util    = require('util'),
    events  = require('events');


function Cimpler(config) {
   var builds = new Queue();
   var cimpler = this;
   var running = true;
   this.plugins = [];
   config = config || {};

   this.addBuild = function(build) {
      var branchIsAlreadyQueued =
         builds.items().some(function(existingBuild) {
            return existingBuild.branch == build.branch;
         });
      if (branchIsAlreadyQueued) return false;

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
      plugin.init(config, this);
      this.plugins.push(plugin);
   };

   this.shutdown = function() {
      if (!running) return;
      running = false;
      this.emit('shutdown');
   };

   /**
    * Register all plugins in passed-in config obj
    */
   var plugins = config.plugins || {};
   Object.keys(plugins).forEach(function(pluginName) {
      var pluginConfig = plugins[pluginName];
      if (!pluginConfig || pluginConfig.enabled === false)
         return;

      if (!config.testMode)
         console.log('Loading plugin: ' + pluginName);
      var pluginPath = '../plugins/' + pluginName;
      var plugin = require(pluginPath);
      cimpler.registerPlugin(plugin, pluginConfig);
   });
}
util.inherits(Cimpler, events.EventEmitter);

module.exports = Cimpler;
