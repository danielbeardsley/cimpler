var path = require('path');
var config;

exports.load = function(configPath) {
   loaded = true;
   return config = require(configPath || path.join(__dirname, "../config.js"));
}

exports.get = function() {
   return config;
}
