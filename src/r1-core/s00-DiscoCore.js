/**
 * DiSCO (c) 2011 Lightenna Ltd.
 */

(function(disco, global) {
	disco.q.push(['_extendIf', {
		
		'core' : {
			
			// store a reference to our parents
			disco : disco,
			global : global,

			init : function() {
				this.debug('init called.');
				// fire up object manager
				this.objectMan.init();
				// fire up pane manager
				this.paneMan.init();
			},
			
			/**
			 * Entry point following load
			 */
			'main' : function() {
				return this.init();
			}

		},

		'constant' : {
			
			/**
			 * Object manager constants
			 */
			'OBJMAN_TYPE_CLASS' : 0
		}
		
	}, true]);
}(D15C0_m, window));
