var logger  = require('log4js').getLogger();

exports.init = function(config, cimpler) {
   this.config = config;
   cimpler.consumeBuild(function(build, started, finished) {
      logger.info("Starting Build");
      setTimeout(function() {
         logger.info(build);
         build.status = 'success';
         finished();
      }, (config.buildTime || 20) * 1000);
   });
};
