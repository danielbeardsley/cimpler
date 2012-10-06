Queue   = require('./queue');
util    = require('util');
events  = require('events');


function Cimpler() {
   var builds = new Queue();

   this.addBuild = function(build) {
      this.emit('newBuild', build);
      builds.push(build);
   };

   this.consumeBuild = function(callback) {
      builds.pop(callback);
   };

   this.registerPlugin = function(plugin, config) {
      plugin.init(config, this);
   };
}
util.inherits(Cimpler, events.EventEmitter);

module.exports = Cimpler;
