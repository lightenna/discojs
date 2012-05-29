/**
 * DiSCO (c) 2011 Lightenna Ltd.
 */

(function(disco, global, undefined) {
	disco.q.push(['_load', {
		// unique name of this code block
		'name' : 'single-lib',
		// type flagged as 'inline' to execute as soon as loading pre-requisites met
		'type' : 'inline',
		// function to execute once all libraries are loaded
		'loaded' : function() {
			// {1} contingent upon: [required] jQuery 1.6.1 or later
			// create local alias of jQuery (loaded by disco)
			var $ = disco['$'], context = this;
			// setup a callback onready
			$(document).ready(function() {
				// {1.1} contingent upon: {1} AND document onready event
				var mess;
				// do something...
				mess = context.name+" sample loaded";
				$('body').append('<p class="test-remove">'+mess+'</p>');
			});
		},
		// array of pre-requisites
		'require' : [
		    // {R1} jQuery is first and only pre-requisite
			{
				'name' : 'jQuery',
				'version' : '1.6.1',
				// test function to see if it's already loaded on this page (not by disco)
				'test' : function(lib){
					if (global['jQuery'] !== undefined) {
						// test for version ['version'] or later
						if (this.util.versionmux(global['jQuery'].fn.jquery) > this.util.versionmux(lib.version)) {
							disco['$'] = global['jQuery'];
							return(disco['$']);
						}
					}
				},
				// path array, locations where this library can be loaded from
				'path' : ['//ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js'],
				// function to execute once this library is loaded
				'loaded' : function(lib){
					// {L1} contingent upon: [required] jQuery 1.6.1 or later
					// make sure we don't upset whatever was on the page before
					disco['$'] = global['jQuery'].noConflict();
					return(disco['$']);
				},
				'type' : 'library'//,
			}//,
		]//,
	}]);
}(D15C0_m, window));
