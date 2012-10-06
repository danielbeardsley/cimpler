var config  = require('./config').config,
    Queue   = require('./lib/queue'),

    fs      = require('fs'),
    path    = require('path'),
    util    = require('util'),
    events  = require('events');

var Cimpler = function(mongo) {
   this.mongo = mongo;
   this.builds = new Queue();
   this.finishedBuilds = new Queue();
};

util.inherits(Cimpler, events.EventEmitter);
cimpler = new Cimpler();

config.plugin_dirs.forEach(function(dir) {
   fs.readdir(dir, function(err, files) {
      if (err) {
         console.debug(err);
         return;
      }

      for (var i = 0, l = files.length; i < l; i++) {
         var filename   = path.join(dir, files[i]),
             pluginName = path.basename(files[i], '.js'),
             conf       = { enabled: true };

         if (path.extname(filename) != '.js') {
            continue;
         }

         if (config.plugins && config.plugins[pluginName]) {
            conf = config.plugins[pluginName];
         }

         if (conf.enabled == undefined || conf.enabled) {
            console.log('Loading plugin: ' + pluginName);
            require("./" + filename).init(conf, cimpler);
         } else {
            console.log('Not loading disabled plugin ' + pluginName);
         }
      }
   });
});
