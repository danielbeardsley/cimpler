childProcess = require('child_process');

exports.init = function(config, cimpler) {
   cimpler.consumeBuild(function(build, finished) {
      childProcess.exec(config.cmd, {}, function() {
         build.status = 'success';
         finished();
      });
   });
};
