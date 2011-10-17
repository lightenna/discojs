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

/**
 * DiSCO (c) 2011 Lightenna Ltd.
 */

(function(d, global) {
  d.q.push(['_load', {
    'name' : 'disco.object',
    'type' : 'inline',
    'loaded' : function() {
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

/**
 * DiSCO (c) 2011 Lightenna Ltd.
 */

(function(d, global) {
  d.q.push(['_load', {
    'name' : 'disco.paneMan',
    'type' : 'inline',
    'loaded' : function() {
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
