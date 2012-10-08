var Cimpler  = require('../lib/cimpler'),
    fs = require('fs');

exports.shellCmd = function(done, assert) {
   var cb = false,
   tempFile = "/tmp/cimpler_" + Math.floor(Math.random() * 100000),
   cimpler = new Cimpler();
  
   cimpler.registerPlugin(
      require('../plugins/shell'),
      {
         cmd: "touch " + tempFile
      });
   cimpler.addBuild({});

   cimpler.on('finishBuild',
      function(build) {
         cb = true;
         var exists = fs.statSync(tempFile);
         if (exists)
            fs.unlink(tempFile);
         assert.ok(exists);
      });

   done(function() {
      assert.ok(cb);
   });
};

