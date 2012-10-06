Queue   = require('./queue');
util    = require('util');
events  = require('events');


function Cimpler(mongo) {
   this.mongo = mongo;
   this.builds = new Queue();
   this.finishedBuilds = new Queue();
}

util.inherits(Cimpler, events.EventEmitter);
Cimpler.prototype.registerPlugin = function(plugin, config) {
   plugin.init(config, this);
};

module.exports = Cimpler;
