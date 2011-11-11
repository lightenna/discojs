/*global window */

module("Module loader: DiscoLoader.js");

if ( !QUnit.isLocal ) {
	test("_load, no dependencies (implicit disco.js)", 3, function() {
		stop();
		var disco = window.D15C0_m;
		disco.q.push(["_load", {
			'type' : 'test',
			'loaded' : function(lib, result) {
				equal(typeof disco.process, 'function',
						"Loader setup with augmented closure");
				equal(typeof disco.q, 'object', "Loader queue setup");
				equal(typeof disco.loader.script('../loader/data/stub.js'),
						"object", "Fired stub request");
				start();
			}
		}]);
	});
} else {
	document.write('<p>These tests need to be served from a web server as browser security policies prohibit them from being run as file:///</p>');
}

