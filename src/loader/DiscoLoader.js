// open with blank line
/**
 * @license    DiSCO
 *     v0.1 (c) 2011 Lightenna Ltd
 *     MIT Licence
 */

/**
 * Augment D15CO_m object base object only, not prototype, pre _.extend()
 * 
 * @param {!Object}
 * disco Loader closure (LabCoat.js, LAB.js)
 * @param {!Object}
 * global Window, global variable scope
 */
var D15C0_m = (function(d, global, undefined) {
	d.loader = global.$LAB.noConflict();
	// insist on loader prerequisite
	if (!d.loader) {
		return (d);
	}
	// export loader symbol
	d['loader'] = d.loader;

	/**
	 * @param {int}
	 * version DiSCO client version number
	 */
	d.VERSION = 0.1;

	/**
	 * @param {object} $
	 * Local jQuery instance
	 */
	d.$ = null;
	d['$'] = d.$;

	/**
	 * @param {int}
	 * synProcess <sync var>; Non-zero if we're mid-process() on queue
	 */
	d.synProcess = 0;

	/**
	 * @return {object} Default Disco settings
	 */
	d.getDefaults = function() {
		return ({
			'api' : d.VERSION,
			'debugMode' : false
		});
	};

	/**
	 * @param {object}
	 * settings Empty settings, overwritten by process_ functions
	 */
	d['settings'] = d.getDefaults();

	/**
	 * @param {array}
	 * q Queue of pending actions
	 */
	d['q'] = d['q'] || [];
	// import symbol, in case queue exists already
	d.q = d['q'];

	// preserved pointer to native push() function in push_super
	d.q.push_super = d.q.push;

	/**
	 * Push method with trigger to process actions; should not be called on
	 * {disco} but {disco.q}; setup as generic function so we can do a q reset
	 * 
	 * @param {(function()|array|object)=}
	 * item can be a function, called during process
	 * 
	 * push(function(){ do.something() });
	 * 
	 * item can be an array of disco func name and arguments
	 * 
	 * push([_something, arg1, arg2]);
	 * 
	 * item can a structured object with callback methods
	 * 
	 * push({command:[_some, arg1, arg2], processed:function()}
	 * 
	 * q is list of items
	 * 
	 */
	d.q.push = function() {
		if (arguments.length > 0) {
			var argtype = typeof arguments[0];
			if ((argtype != 'function') && (argtype != 'object')) {
				d.debug('Attempt to push incorrectly formatted array.');
			}
			// pass up to push()
			this.push_super.apply(this, arguments);
		}
		// trigger processing of queue
		d.process();
	};

	/**
	 * Show a debugging message if we're debugging
	 * 
	 * @param string
	 * mess Debugging message for console
	 */
	d.debug = function(mess) {
		if (this['settings'].debugMode) {
			if (global.console != undefined) {
				global.console.log(mess);
			}
		}
	};
	d['debug'] = d.debug;
	d['error'] = d.debug;

	/**
	 * Shows an object represented as a string
	 * 
	 * @param object
	 * o Nested object structure to represent
	 */
	d['toString'] = function(o) {
		if (!o)
			return '{ "DiSCO":' + d.VERSION + ' }';
		var parse = function(_o) {
			var a = [], t;
			for ( var p in _o) {
				if (_o.hasOwnProperty(p)) {
					t = _o[p];
					if (!t)
						continue;
					if (typeof t == "object") {
						a[a.length] = p + ":{ "
								+ arguments.callee(t).join(", ") + "}";
					} else {
						if (typeof t == "string") {
							a[a.length] = [p + ": \"" + t.toString() + "\""];
						} else {
							a[a.length] = [p + ": " + t.toString()];
						}
					}
				}
			}
			return a;
		}
		return "{" + parse(o).join(", ") + "}";
	};

	// Process section

	/**
	 * Process any queued items, while allowing new items to be push onto the
	 * queue for processing *next* cycle. The critical section is protected
	 * using a semaphor and recursion (no callback).
	 */
	d.process = function() {
		var queueItem, qlen, qi, result, f = [], failItem, flen = 0, fi;
		// set semaphor sync var to say we're now in the critical section
		d.synProcess++;
		if (d.synProcess > 1) {
			// we're currently mid-process (>=2), flagged another cycle
			return;
		}
		// process queue
		qlen = this.q.length;
		if (qlen > 0) {
			for (qi = 0; qi < qlen; qi += 1) {
				queueItem = this.q[qi];
				result = true;
				if (typeof queueItem === 'function') {
					// item is a stacked function(){} so call
					queueItem.call();
				} else {
					if (queueItem instanceof Array) {
						result = d.processArrayItem(queueItem);
					} else {
						// process structured object
						if (queueItem['command'] != undefined) {
							result = d.processArrayItem(queueItem['command']);
							// if we successfully executed the command
							if (result) {
								if (queueItem['processed'] != undefined) {
									// invent context if not set
									if (queueItem['context'] == undefined) {
										queueItem['context'] = global;
									}
									// call 'processed' function in that context
									queueItem['processed']
											.apply(queueItem['context']);
								}
							}
						}
					}
				}
				// if we couldn't process this item, flag it
				if (result == false) {
					f[flen++] = qi;
				}
			}
			// if any new items have been added to the queue
			if (this.q.length > qlen) {
				// loop through newly added items
				for (qi = qlen; qi < this.q.length; qi += 1) {
					// flag them as new
					f[flen++] = qi;
				}
			}
			// if there were no failures/new items, skip
			if (flen == 0) {
				// scrub the queue
				this.q.length = 0;
			} else {
				// shift failures/new items down to base of q
				for (fi = 0; fi < flen; fi += 1) {
					// skip entries that are shifting down to themselves
					if (f[fi] == fi) {
						continue;
					}
					// otherwise copy down, overwritting removed results
					this.q[fi] = this.q[f[fi]];
				}
				// and shorten
				this.q.length = flen;
			}
		}
		if (d.synProcess > 1) {
			// clear, but call process again for another cycle
			d.synProcess = 0;
			return d.process();
		}
		// unset semaphor sync var
		d.synProcess = 0;
	};
	d['process'] = d.process;

	/**
	 * Helper function for process()
	 * 
	 * @param array|string
	 * queueItem Function for calling
	 */
	d.processArrayItem = function(queueItem) {
		var callName, result = true;
		// process array (function name, args...)
		if (queueItem.length >= 1) {
			// item is a subarray containing a process_ function
			// reference; if it's not an array, wrap
			if (typeof queueItem !== 'object') {
				queueItem = [queueItem];
			}
			callName = 'process' + queueItem[0];
			if (typeof this[callName] === 'function') {
				// global.console.log('calling '+callName+',
				// '+queueItem[1]);
				result = this[callName].apply(d, queueItem.slice(1));
			}
		}
		return result;
	};

	/**
	 * Process settings, underscore used to mark API/user-called function. The
	 * idea came from Google who use a similar thing for the asynchronous
	 * analytics javascript urchin.
	 * 
	 * @param {object}
	 * sets Settings object to apply
	 * @return {boolean} true if the data was processed and should be removed
	 * from the queue
	 */
	d['process_settings'] = function(sets) {
		// enumerate sets object
		for ( var attrname in sets) {
			// wrap in if statement to protect against prototype changes
			if (sets.hasOwnProperty(attrname)) {
				this['settings'][attrname] = sets[attrname];
			}
		}
		return true;
	};

	// Loader section
	/**
	 * Handle load request of library, code/test (inline), class
	 */
	d['process_load'] = function(obj) {
		var map, previous, reqlen, i, testlib, reqsmet;
		// initialise the object manager
		if (!d['objMan']) {
			d['objMan'] = {
				// hash map of active objects
				'map' : {},
				// hash map of previously loaded objects
				'previous' : {},
				// current loader chain
				clchain : this.loader
			};
		}
		map = d['objMan']['map'];
		previous = d['objMan']['previous'];
		// default to library
		if (!obj['type']) {
			obj['type'] = 'library';
		}
		// if name set, see if we've loaded before
		if (obj['name']) {
			// get the hash
			if (!obj['hash']) {
				obj['hash'] = obj['name'];
				if (obj['version']) {
					obj['hash'] += '-' + obj['version'];
				}
			}
			// see if we've loaded this object already
			if (map[obj['hash']]) {
				// library previously loaded
				return true;
			}
			// if the request is to load something previously loaded
			if (obj['type'] == 'previous') {
				// see if we've previously loaded it
				if (previous[obj['hash']]) {
					// then re-'loaded' the previously loaded one
					obj = previous[obj['hash']];
				} else {
					// if we haven't loaded it before, wait until we have
					return false;
				}
			}
			// implicit else; store the load request object
			map[obj['hash']] = obj;
		}
		// see if this object exists on the page already
		if (obj['test']) {
			testlib = obj['test'].call(this, obj);
			if (testlib) {
				// library already loaded on the page
				obj['object'] = testlib;
				// don't call 'loaded' because we didn't load it
				return true;
			}
		}
		// see if it has pre-requisites
		reqsmet = true;
		if (obj['require']) {
			if (obj['require'] instanceof Array) {
				reqlen = obj['require'].length;
				// process the requisites, until one fails
				for (i = 0; (i < reqlen) && (reqsmet); i++) {
					reqsmet &= this['process_load'](obj['require'][i]);
				}
				// tell the loader to wait for our pre-requisites (in case)
				d['objMan'].clchain = d['objMan'].clchain.wait();
			} else {
				d.error("'require' specified but not of type Array");
			}
		}
		if (!reqsmet) {
			return false;
		}
		// process this object depending on its type
		switch (obj['type']) {
			case 'library' :
				// load this object
				d['objMan'].clchain = d['objMan'].clchain
						.script(obj['path'][0]);
				// note no break
			case 'inline' :
			case 'test' :
				// if this function has a 'loaded' callback, call it
				if (obj['loaded']) {
					d['objMan'].clchain = d['objMan'].clchain.wait(function() {
						obj['object'] = obj['loaded'].call(obj, obj);
					});
				}
		}
		return true;
	};

	/**
	 * Resets internal state to pre-init; used in settings-order tests
	 * 
	 * @return {boolean} true if the data was processed and should be removed
	 * from the queue
	 */
	d['process_reset'] = function() {
		this.$ = null;
		// clear loader state, to re-trigger loaded event
		this.loader = this.loader.sandbox();
		// discard the current chain
		d['objMan'].clchain = this.loader;
		// archive active objects as previously loaded objects
		d['objMan']['previous'] = d['objMan']['map'];
		d['objMan']['map'] = {};
		// don't reset queue because it's not necessary
		var uncalled_resetQueue = function() {
			// record push function pointer
			var pushStack = this.q.push;
			// setup empty q (mid-reset) with .push() wrapper
			this.q = [['_reset']];
			this.q.push_super = this.q.push;
			// restore .push() wrapper
			this.q.push = pushStack;
		}
		// reset settings back to defaults
		this['settings'] = this.getDefaults();
		// push onto queue an _initLib request, processed *next* push
		this.q.push_super(['_load', {
			'name' : 'baseLibs',
			'type' : 'previous'
		}]);
		// call process() to ensure it clears this at some point
		d.process();
		return (true);
	};

	// start building up util lib
	d['util'] = {
		/**
		 * Convert a version string into a number for comparison
		 * 
		 * @param string
		 * vstr Version string (max 99.99.99.99)
		 * @return int Integer version number
		 */
		'versionmux' : function(vstr) {
			var varr = vstr.split('.', 4), n = 0, i, len;
			len = varr.length;
			for (i = 0; i < len; i++) {
				n += parseInt(varr[i]) * Math.pow(100, i);
			}
			return n;
		}
	};

	// return augmented module
	return (d);
}(D15C0_m || {}, window));
