/*global window */

module("Module r1-core: DiscoCore.js");

// check that disco.js loader was fired
test("Core loaded", function() {
	var d = window.D15C0_m;
	stop();
	equal(typeof d.process, 'function',
			"Loader setup with augmented closure");
	equal(typeof d.core.main, 'function',
			"Loader extended by core");
	equal(d.loadedLibs(), true, "Loader loaded libraries");
	d.q.push(["_callbackPostLoad", function() {
		start();
	}]);
});
