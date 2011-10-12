/*global window */

module("Module r0-base: DiscoBaseLibs.js");

// tests don't have to run in order, but first test has to run first!
QUnit.config.reorder = false;

if ( !QUnit.isLocal ) {
	test("_load, require[baseLibs]", 1, function() {
		stop();
		var disco = window.D15C0_m;
		disco.q.push(["_load", {
			'type' : 'test',
			'loaded' : function() {
				equal(disco.$.fn.jquery, '1.6.1',
						"Loaded correct version of jQuery");
				start();
			},
			'require' : [
				{
					'name' : 'jQuery',
					'version' : '1.6.1',
					'type' : 'library'//,
				}//,
			]//,
		}]);
	});
	test("_load, _reset, _load (previous)", 6, function() {
		var disco = window.D15C0_m, settingsCopy = {
			'debugMode' : true
		};
		// try to fetch settings object before we scrub it (continuity)
		if (disco != undefined) {
			settingsCopy = disco.settings;
			settingsCopy.debugMode = true;
		}
		stop();
		// wait for initial base load
		disco.q.push(["_load", {
			'type' : 'test',
			'loaded' : function() {
				equal(typeof disco.objMan.map, 'object',
						"Loader setup objectManager");
				start();
				stop();
				// reset disco (without array []/args, but should get wrapped)
				disco.q.push({command:'_reset', processed:function(){
					equal(disco.settings.debugMode, false, "Debug off");
					equal(disco.$, null, "Check no local jQuery yet");
					start();
				}});
				stop();
				// push settings command (in array []/args)
				disco.q.push({command:['_settings', settingsCopy], processed:function(){
					equal(disco.settings.debugMode, true, "Debug on");
					start();
				}});
				/**
				 * Not sure about this test.  It leaves an item in the queue, waiting for
				 * a library called 'no-such-previous' to be loaded.  We really should 
				 * either test-and-fail (this case) or test-and-keep-trying (current behaviour)
				 * @todo split test (current behaviour) and test-once (should be used for this)
				 */
				disco.q.push(["_load", {
					'type' : 'test',
					'loaded' : function() {
						ok(false, "[error] loaded() function based on unseen previous");
					},
					'require' : [{ 'name' : 'no-such-previous', 'type' : 'previous' }]//,
				}]);
				stop();
				disco.q.push(["_load", {
					'type' : 'test',
					'loaded' : function() {
						ok(true, "loaded() function based on familiar previous");
						equal(disco.$.fn.jquery, '1.6.1',
								"Loaded correct version of jQuery");
						start();
					},
					'require' : [{ 'name' : 'baseLibs', 'type' : 'previous' }]//,
				}]);
			},
			'require' : [{ 'name' : 'baseLibs', 'type' : 'previous' }]//,
		}]);
	});
} else {
	document.write('<p>These tests need to be served from a web server as browser security policies prohibit them from being run as file:///</p>');
}
