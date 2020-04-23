var path = require('path');
var fs = require('fs');
var config;
var loaded = false;

exports.load = function(configPath) {
   loaded = true;
   return config = loadConfigFile(configPath);
}

exports.get = function() {
   if (!loaded) {
      throw new Error("Config file must be loaded with '.load()'");
   }
   return config;
}

function loadConfigFile(configPath) {
   if (configPath) {
      return require(configPath);
   }
   configPath = path.join(__dirname, "../config.js");
   try {
      if (fs.statSync(configPath)) {
         return require(configPath);
      }
   } catch (err) {}
   return {};
}
