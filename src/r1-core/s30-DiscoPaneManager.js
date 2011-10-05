/**
 * DiSCO (c) 2011 Lightenna Ltd.
 */

(function(disco, global) {
	var obj = {
		'pMan' : {
			
			// store a reference to our parents
			disco : disco,
			global : global,

			init : function() {
			}

		}
	};
	// push on to queue for processing
	disco.q.push(['_extendIf', obj, true]);
}(D15C0_m, window));
