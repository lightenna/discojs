/**
 * DiSCO (c) 2011 Lightenna Ltd.
 */

(function(disco, global, undefined) {
	disco.q.push(['_load', {
		'name' : 'baseLibs',
		'type' : 'inline',
		'loaded' : function() {
			// @todo fire request to load [r1] discoball
		},
		'require' : [
			{
				'name' : 'jQuery',
				'version' : '1.6.1',
				'test' : function(lib){
					if (global['jQuery'] !== undefined) {
						// test for version ['version'] or later
						if (this['util']['versionmux'](global['jQuery'].fn.jquery) > this['util']['versionmux'](lib.version)) {
							disco['$'] = global['jQuery'];
							return(disco['$']);
						}
					}
				},
				'path' : ['//ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js','/wito_rcv/js/min/r1/jquery-1.6.1.min.js'],
				'loaded' : function(lib){
					// make sure we don't upset whatever was on the page before
					disco['$'] = global['jQuery'].noConflict();
					return(disco['$']);
				},
				'type' : 'library'//,
			},
			{
				'name' : 'Backbone',
				'version' : '0.5.1',
				'test' : function(lib){
					if (global['Backbone'] !== undefined) {
						// test for version ['version'] or later
						if (this['util']['versionmux'](global['Backbone'].VERSION) > this['util']['versionmux'](lib.version)) {
							disco['Backbone'] = global['Backbone'];
							return(disco['Backbone']);
						}
					}
				},
				'path' : ['//cdnjs.cloudflare.com/ajax/libs/backbone.js/0.5.1/backbone-min.js','/wito_rcv/js/min/r1/backbone-0.5.1.min.js'],
				'loaded' : function(lib){
					// make sure we don't upset whatever was on the page before
					disco['Backbone'] = global['Backbone'].noConflict();
					return(disco['Backbone']);
				},
				'type' : 'library',
				'require' : [
					{
						'name' : 'json2',
						'version' : '20110223',
						'path' : ['//cdnjs.cloudflare.com/ajax/libs/json2/20110223/json2.js','/wito_rcv/js/lib/r1/json2-20110223.js'],
						'type' : 'library'//,
					},
					{
						'name' : 'Underscore',
						'version' : '1.1.6',
						'test' : function(lib){
							if (global['_'] !== undefined) {
								// test for version ['version'] or later
								if (this['util']['versionmux'](global['_'].VERSION) > this['util']['versionmux'](lib.version)) {
									disco['_'] = global['_'];
									return(disco['_']);
								}
							}
						},
						'path' : ['//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.1.6/underscore-min.js','/wito_rcv/js/min/r1/underscore-1.1.6.min.js'],
						'loaded' : function(lib){
							// make sure we don't upset whatever was on the page before
							disco['_'] = global['_'].noConflict();
							return(disco['_']);
						},
						'type' : 'library'//,
					}//,
				]//,
			}//,
		]//,
	}]);
}(D15C0_m, window));
