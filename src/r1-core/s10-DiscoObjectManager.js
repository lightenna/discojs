/**
 * DiSCO (c) 2011 Lightenna Ltd.
 */

(function(d, global) {
  d.q.push(['_load', {
    'name' : 'disco.objMan',
    'type' : 'inline',
    'loaded' : function() {
      d['_']['extend'](d, {
        'objMan' : {
          // already defined
          // map : {},
          // previous : {},
          // clchain : function $LAB,

          'init' : function() {
            // initialise the object manager
          }// ,
        },

        // store a reference to our parents
        disco : disco,
        global : global
      // ,
      });
    },
    'require' : [{
      'name' : 'baseLibs'
    }]
  // ,
  }]);
}(D15C0_m, window));

