exports.init = function(config, cimpler) {
   this.config = config;
   cimpler.consumeBuild(function(build, started, finished) {
      console.log("Starting Build");
      setTimeout(function() {
         console.dir(build);
         build.status = 'success';
         finished();
      }, (config.buildTime || 20) * 1000);
   });
};
