/**
 * DiSCO (c) 2011 Lightenna Ltd.
 */

(function(disco, global, undefined) {
	disco.q.push(['_load', {
    'name' : 'discoball',
    // not using min version during debugging
    'path' : ['dist/r1-core/discoball.js'],
    'type' : 'library',
    'loaded' : function(lib, result){
      // discoball loaded after all dependencies
      console.log('discoball callback '+result);
    },
		'require' : [
      {
        'name' : 'baseLibs',
        'type' : 'inline',
    		'require' : [
    			{
    				'name' : 'jQuery',
    				'version' : '1.6.1',
    				'test' : function(lib, result){
    					if (global['jQuery'] !== undefined) {
    						// test for version ['version'] or later
    						if (disco['util']['versionmux'](global['jQuery'].fn.jquery) > disco['util']['versionmux'](lib.version)) {
    							disco['$'] = global['jQuery'];
    							return(disco['$']);
    						}
    					}
    				},
    				'path' : ['//ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js', 'lib/r1-core/jquery/jquery.min.js'],
    				'loaded' : function(lib, result){
    					// make sure we don't upset whatever was on the page before
    					disco['$'] = global['jQuery'].noConflict();
    					return(disco['$']);
    				},
    				'type' : 'library'// ,
    			},
    			{
    				'name' : 'Backbone',
    				'version' : '0.5.1',
    				'test' : function(lib, result){
    					if (global['Backbone'] !== undefined) {
    						// test for version ['version'] or later
    						if (disco['util']['versionmux'](global['Backbone'].VERSION) > disco['util']['versionmux'](lib.version)) {
    							disco['Backbone'] = global['Backbone'];
    							return(disco['Backbone']);
    						}
    					}
    				},
    				'path' : ['//cdnjs.cloudflare.com/ajax/libs/backbone.js/0.5.1/backbone-min.js', 'lib/r1-core/backbone/backbone.min.js'],
    				'loaded' : function(lib, result){
    					// make sure we don't upset whatever was on the page before
    					disco['Backbone'] = global['Backbone'].noConflict();
    					// after Backbone is loaded, tell underscore to hide itself
              global['_'].noConflict();
    					return(disco['Backbone']);
    				},
    				'type' : 'library',
    				'require' : [
    					{
    						'name' : 'json2',
    						'version' : '20110223',
    						'path' : ['//cdnjs.cloudflare.com/ajax/libs/json2/20110223/json2.js', 'lib/r1-core/JSON-js/json2.js'],
    						'type' : 'library'// ,
    					},
    					{
    						'name' : 'Underscore',
    						'version' : '1.1.6',
    						'test' : function(lib, result){
    							if (global['_'] !== undefined) {
    								// test for version ['version'] or later
    								if (disco['util']['versionmux'](global['_'].VERSION) > disco['util']['versionmux'](lib.version)) {
    								  // copy library into disco, but delay clean up until dependencies loaded
    									disco['_'] = global['_'];
    									return(disco['_']);
    								}
    							}
    						},
    						'path' : ['//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.1.6/underscore-min.js', 'lib/r1-core/underscore/underscore.min.js'],
    						'loaded' : function(lib, result){
    							// make sure we don't upset whatever was on the page before
                  disco['_'] = global['_'];
    							return(disco['_']);
    						},
    						'type' : 'library'// ,
    					}// ,
    				]// End of backbone require (json2, underscore)
    			}// ,
    	  ]// End of baseLibs require (jQuery, backbone)
      }// ,
		]// End of discoball require (baseLibs, discoball)
	}]);
}(D15C0_m, window));
