/**
 * DiSCO (c) 2011 Lightenna Ltd.
 */

(function(d, global) {
  d.q.push(['_load', {
    'name' : 'disco.core',
    'type' : 'inline',
    'loaded' : function() {
      d['_']['extend'](d, {
        'core' : {
          'init' : function() {
            d['debug']('init called.');
            // fire up object manager
            d['objMan']['init']();
            // fire up pane manager
            d['paneMan']['init']();
          }// ,
        },

        /**
         * Object manager constants
         */
        'constant' : {
          'OBJMAN_TYPE_CLASS' : 0
        },

        // store a reference to our parents
        disco : disco,
        global : global
      // ,
      });
      // initialise the core
      d['core']['init']();
    },
    'require' : [{
      'name' : 'baseLibs'
    }, {
      'name' : 'disco.object'
    }, {
      'name' : 'disco.objMan'
    }, {
      'name' : 'disco.paneMan'
    }]
  // ,
  }]);
}(D15C0_m, window));

