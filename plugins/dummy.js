exports.init = function(config, cimpler) {
   cimpler.consumeBuild(function(build, finished) {
      console.log("Starting Build");
      setTimeout(function() {
         console.dir(build);
         build.status = 'success';
         finished();
      }, 20000);
   });
};
