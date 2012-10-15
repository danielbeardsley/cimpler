/**
 * Simple utility to call the callback
 * after the returned function ahs been called *count* times
 */
module.exports =
   function expect(count, callback) {
      return function() {
         if (--count == 0) {
            callback();
         }
      }
   };
