var Queue   = require('./queue');
    util    = require('util');
    events  = require('events');


function Cimpler() {
   var builds = new Queue();
   var self = this;

   this.addBuild = function(build) {
      this.emit('newBuild', build);
      builds.push(build);
   };

   this.consumeBuild = function(callback) {
      builds.pop(function(build) {
         callback(build, function() {
            self.emit('finishBuild', build);
         });
      });
   };

   this.registerPlugin = function(plugin, config) {
      plugin.init(config, this);
   };

   this.shutdown = function() {
      this.emit('shutdown');
   };
}
util.inherits(Cimpler, events.EventEmitter);

module.exports = Cimpler;
