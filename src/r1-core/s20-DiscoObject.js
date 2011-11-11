/**
 * DiSCO (c) 2011 Lightenna Ltd.
 */

(function(d, global) {
  d.q.push(['_load', {
    'name' : 'disco.object',
    'type' : 'inline',
    'loaded' : function(lib, result) {
      d['_']['extend'](d['objMan'], {
        /**
         * Setup default objMan class
         */
        'Object' : d['Backbone']['Model']['extend']({
          'something' : function() {
            // my specialised default Object, ready to communicate with server
          }// ,
        }),

        // store a reference to our parents
        disco : disco,
        global : global// ,
      });
    },
    'require' : [{
      'name' : 'baseLibs'
    }, {
      'name' : 'disco.objMan'
    }]
  // ,
  }]);
}(D15C0_m, window));

