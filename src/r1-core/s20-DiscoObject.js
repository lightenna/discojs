/**
 * DiSCO (c) 2011 Lightenna Ltd.
 */

(function(disco, global) {
	// constructor
	var object = function() {
		// register instance with the object manager
		disco.objMan.register(this);
	};
	_.extend(object.prototype, {
		'name' : 'object',
		'version' : '1.0.0',
		'type' : 'class',

		// store a local reference to our parents
		disco : disco,
		global : global,

		// store a reference to our constructor, in case overwritten by subtypes
		constructor : object,
		
		init : function() {
		},

		// define class' non-core pre-requisites
		'require' : [
		    // these are redundant pre-reqs to illustrate how they work
		    {
			  	'name' : 'jQuery',
			  	'version' : '1.6.1',
			  	'test' : function(lib){
			  	  // test for version ['version'] or later
			  	  return(this.util.versionmux(lib.object.fn.jquery) > this.util.versionmux(lib.version));
			  	},
			  	'path' : ['//ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js','/wito_rcv/js/min/r1/jquery-1.6.1.min.js'],
			  	'loaded' : function(lib, global){
			  	  // make sure we don't upset whatever was on the page before
			  	  lib.object = lib.object.noConflict();
			  	},
			  	'type' : 'library'
		    },
		    {
			  	'name' : 'Backbone',
			  	'version' : '0.5.1',
			  	'test' : function(lib){
			  	  // test for version ['version'] or later
			  	  return(this.util.versionmux(lib.object.VERSION) > this.util.versionmux(lib.version));
			  	},
			  	'path' : ['//cdnjs.cloudflare.com/ajax/libs/backbone.js/0.5.1/backbone-min.js','/wito_rcv/js/min/r2/backbone-0.5.1.min.js'],
			  	'loaded' : function(lib, global){
			  	  // make sure we don't upset whatever was on the page before
			  	  lib.object = lib.object.noConflict();
			  	},
			  	'type' : 'library'
		    },
		    {
		    	'type' : 'core'
		    }
		] //,

	});
	disco.q.push(['_load', object]);
}(D15C0_m, window));
