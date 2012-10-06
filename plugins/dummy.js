exports.init = function(config, cimpler) {
   cimpler.builds.pop(function(build, done) {
      console.log("Starting Build");
      setTimeout(function() {
         console.dir(build);
         build.status = 'success';
         cimpler.finishedBuilds.push(build);
         done();
      }, 20000);
   });
};
