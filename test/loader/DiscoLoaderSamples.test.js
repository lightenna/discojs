/*global window */

module("Module loader: DiscoLoader.js");

if ( !QUnit.isLocal ) {
	test("_load, load-single-lib sample", 3, function() {
		stop();
		var disco = window.D15C0_m;
		disco.q.push(["_load", {
			'type' : 'test',
			'loaded' : function(lib, result) {
				// use jQuery to find added paragraph
				var $ = disco['$'], t;
				equal(typeof $, 'function', "Disco stored jQuery object");
				t = $('body p.test-remove');
				equal(t.html(), 'single-lib sample loaded',
						"single-lib loaded jQuery and created paragraph");
				t.remove();
				equal($('body p.test-remove').is('p'), false,
						"successfully removed the paragraph");
				start();
			},
			'require' : [
			{
				'name' : 'single-lib',
				'type' : 'previous'//,
			}]//,
		}]);
	});
} else {
	document.write('<p>These tests need to be served from a web server as browser security policies prohibit them from being run as file:///</p>');
}

