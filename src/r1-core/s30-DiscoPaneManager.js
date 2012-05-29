/**
 * DiSCO (c) 2011 Lightenna Ltd.
 */

(function(d, global) {
  d.q.push(['_load', {
    'name' : 'disco.paneMan',
    'type' : 'inline',
    'loaded' : function(lib, result) {
      d['_']['extend'](d, {
        'paneMan' : {

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
