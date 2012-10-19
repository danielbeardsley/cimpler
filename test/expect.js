var assert = require('assert');
/**
 * Simple utility to call the callback
 * after the returned function ahs been called *count* times
 */
module.exports =
   function expect(originalCount, callback) {
      var count = originalCount
      return function() {
         if (--count == 0) {
            // Delay a bit to see if any more events come through
            setTimeout(callback, 100);
         } else if (count < 0) {
            assert.fail("Got " + (originalCount + 1) +
             " events, expecting " + originalCount);
         }
      }
   };
