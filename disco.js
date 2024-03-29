/*! LAB.js (LABjs :: Loading And Blocking JavaScript)
    v2.0.3 (c) Kyle Simpson
    MIT License
*/

(function(global){
	var _$LAB = global.$LAB,
	
		// constants for the valid keys of the options object
		_UseLocalXHR = "UseLocalXHR",
		_AlwaysPreserveOrder = "AlwaysPreserveOrder",
		_AllowDuplicates = "AllowDuplicates",
		_CacheBust = "CacheBust",
		/*!START_DEBUG*/_Debug = "Debug",/*!END_DEBUG*/
		_BasePath = "BasePath",
		
		// stateless variables used across all $LAB instances
		root_page = /^[^?#]*\//.exec(location.href)[0],
		root_domain = /^\w+\:\/\/\/?[^\/]+/.exec(root_page)[0],
		append_to = document.head || document.getElementsByTagName("head"),
		
		// inferences... ick, but still necessary
		opera_or_gecko = (global.opera && Object.prototype.toString.call(global.opera) == "[object Opera]") || ("MozAppearance" in document.documentElement.style),

/*!START_DEBUG*/
		// console.log() and console.error() wrappers
		log_msg = function(){}, 
		log_error = log_msg,
/*!END_DEBUG*/
		
		// feature sniffs (yay!)
		test_script_elem = document.createElement("script"),
		explicit_preloading = typeof test_script_elem.preload == "boolean", // http://wiki.whatwg.org/wiki/Script_Execution_Control#Proposal_1_.28Nicholas_Zakas.29
		real_preloading = explicit_preloading || (test_script_elem.readyState && test_script_elem.readyState == "uninitialized"), // will a script preload with `src` set before DOM append?
		script_ordered_async = !real_preloading && test_script_elem.async === true, // http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order
		
		// XHR preloading (same-domain) and cache-preloading (remote-domain) are the fallbacks (for some browsers)
		xhr_or_cache_preloading = !real_preloading && !script_ordered_async && !opera_or_gecko
	;

/*!START_DEBUG*/
	// define console wrapper functions if applicable
	if (global.console && global.console.log) {
		if (!global.console.error) global.console.error = global.console.log;
		log_msg = function(msg) { global.console.log(msg); };
		log_error = function(msg,err) { global.console.error(msg,err); };
	}
/*!END_DEBUG*/

	// test for function
	function is_func(func) { return Object.prototype.toString.call(func) == "[object Function]"; }

	// test for array
	function is_array(arr) { return Object.prototype.toString.call(arr) == "[object Array]"; }

	// make script URL absolute/canonical
	function canonical_uri(src,base_path) {
		var absolute_regex = /^\w+\:\/\//;
		
		// is `src` is protocol-relative (begins with // or ///), prepend protocol
		if (/^\/\/\/?/.test(src)) {
			src = location.protocol + src;
		}
		// is `src` page-relative? (not an absolute URL, and not a domain-relative path, beginning with /)
		else if (!absolute_regex.test(src) && src.charAt(0) != "/") {
			// prepend `base_path`, if any
			src = (base_path || "") + src;
		}
		// make sure to return `src` as absolute
		return absolute_regex.test(src) ? src : ((src.charAt(0) == "/" ? root_domain : root_page) + src);
	}

	// merge `source` into `target`
	function merge_objs(source,target) {
		for (var k in source) { if (source.hasOwnProperty(k)) {
			target[k] = source[k]; // TODO: does this need to be recursive for our purposes?
		}}
		return target;
	}

	// does the chain group have any ready-to-execute scripts?
	function check_chain_group_scripts_ready(chain_group) {
		var any_scripts_ready = false;
		for (var i=0; i<chain_group.scripts.length; i++) {
			if (chain_group.scripts[i].ready && chain_group.scripts[i].exec_trigger) {
				any_scripts_ready = true;
				chain_group.scripts[i].exec_trigger();
				chain_group.scripts[i].exec_trigger = null;
			}
		}
		return any_scripts_ready;
	}

	// creates a script load listener
	function create_script_load_listener(elem,registry_item,flag,onload) {
		elem.onload = elem.onreadystatechange = function() {
			if ((elem.readyState && elem.readyState != "complete" && elem.readyState != "loaded") || registry_item[flag]) return;
			elem.onload = elem.onreadystatechange = null;
			onload();
		};
	}

	// script executed handler
	function script_executed(registry_item) {
		registry_item.ready = registry_item.finished = true;
		for (var i=0; i<registry_item.finished_listeners.length; i++) {
			registry_item.finished_listeners[i]();
		}
		registry_item.ready_listeners = [];
		registry_item.finished_listeners = [];
	}

	// make the request for a scriptha
	function request_script(chain_opts,script_obj,registry_item,onload,preload_this_script) {
		// setTimeout() "yielding" prevents some weird race/crash conditions in older browsers
		setTimeout(function(){
			var script, src = script_obj.real_src, xhr;
			
			// don't proceed until `append_to` is ready to append to
			if ("item" in append_to) { // check if `append_to` ref is still a live node list
				if (!append_to[0]) { // `append_to` node not yet ready
					// try again in a little bit -- note: will re-call the anonymous function in the outer setTimeout, not the parent `request_script()`
					setTimeout(arguments.callee,25);
					return;
				}
				// reassign from live node list ref to pure node ref -- avoids nasty IE bug where changes to DOM invalidate live node lists
				append_to = append_to[0];
			}
			script = document.createElement("script");
			if (script_obj.type) script.type = script_obj.type;
			if (script_obj.charset) script.charset = script_obj.charset;
			
			// should preloading be used for this script?
			if (preload_this_script) {
				// real script preloading?
				if (real_preloading) {
					/*!START_DEBUG*/if (chain_opts[_Debug]) log_msg("start script preload: "+src);/*!END_DEBUG*/
					registry_item.elem = script;
					if (explicit_preloading) { // explicit preloading (aka, Zakas' proposal)
						script.preload = true;
						script.onpreload = onload;
					}
					else {
						script.onreadystatechange = function(){
							if (script.readyState == "loaded") onload();
						};
					}
					script.src = src;
					// NOTE: no append to DOM yet, appending will happen when ready to execute
				}
				// same-domain and XHR allowed? use XHR preloading
				else if (preload_this_script && src.indexOf(root_domain) == 0 && chain_opts[_UseLocalXHR]) {
					xhr = new XMLHttpRequest(); // note: IE never uses XHR (it supports true preloading), so no more need for ActiveXObject fallback for IE <= 7
					/*!START_DEBUG*/if (chain_opts[_Debug]) log_msg("start script preload (xhr): "+src);/*!END_DEBUG*/
					xhr.onreadystatechange = function() {
						if (xhr.readyState == 4) {
							xhr.onreadystatechange = function(){}; // fix a memory leak in IE
							registry_item.text = xhr.responseText + "\n//@ sourceURL=" + src; // http://blog.getfirebug.com/2009/08/11/give-your-eval-a-name-with-sourceurl/
							onload();
						}
					};
					xhr.open("GET",src);
					xhr.send();
				}
				// as a last resort, use cache-preloading
				else {
					/*!START_DEBUG*/if (chain_opts[_Debug]) log_msg("start script preload (cache): "+src);/*!END_DEBUG*/
					script.type = "text/cache-script";
					create_script_load_listener(script,registry_item,"ready",function() {
						append_to.removeChild(script);
						onload();
					});
					script.src = src;
					append_to.insertBefore(script,append_to.firstChild);
				}
			}
			// use async=false for ordered async? parallel-load-serial-execute http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order
			else if (script_ordered_async) {
				/*!START_DEBUG*/if (chain_opts[_Debug]) log_msg("start script load (ordered async): "+src);/*!END_DEBUG*/
				script.async = false;
				create_script_load_listener(script,registry_item,"finished",onload);
				script.src = src;
				append_to.insertBefore(script,append_to.firstChild);
			}
			// otherwise, just a normal script element
			else {
				/*!START_DEBUG*/if (chain_opts[_Debug]) log_msg("start script load: "+src);/*!END_DEBUG*/
				create_script_load_listener(script,registry_item,"finished",onload);
				script.src = src;
				append_to.insertBefore(script,append_to.firstChild);
			}
		},0);
	}
		
	// create a clean instance of $LAB
	function create_sandbox() {
		var global_defaults = {},
			can_use_preloading = real_preloading || xhr_or_cache_preloading,
			queue = [],
			registry = {},
			instanceAPI
		;
		
		// global defaults
		global_defaults[_UseLocalXHR] = true;
		global_defaults[_AlwaysPreserveOrder] = false;
		global_defaults[_AllowDuplicates] = false;
		global_defaults[_CacheBust] = false;
		/*!START_DEBUG*/global_defaults[_Debug] = false;/*!END_DEBUG*/
		global_defaults[_BasePath] = "";

		// execute a script that has been preloaded already
		function execute_preloaded_script(chain_opts,script_obj,registry_item) {
			var script;
			
			function preload_execute_finished() {
				if (script != null) { // make sure this only ever fires once
					script = null;
					script_executed(registry_item);
				}
			}
			
			if (registry[script_obj.src].finished) return;
			if (!chain_opts[_AllowDuplicates]) registry[script_obj.src].finished = true;
			
			script = registry_item.elem || document.createElement("script");
			if (script_obj.type) script.type = script_obj.type;
			if (script_obj.charset) script.charset = script_obj.charset;
			create_script_load_listener(script,registry_item,"finished",preload_execute_finished);
			
			// script elem was real-preloaded
			if (registry_item.elem) {
				registry_item.elem = null;
			}
			// script was XHR preloaded
			else if (registry_item.text) {
				script.onload = script.onreadystatechange = null;	// script injection doesn't fire these events
				script.text = registry_item.text;
			}
			// script was cache-preloaded
			else {
				script.src = script_obj.real_src;
			}
			append_to.insertBefore(script,append_to.firstChild);

			// manually fire execution callback for injected scripts, since events don't fire
			if (registry_item.text) {
				preload_execute_finished();
			}
		}
	
		// process the script request setup
		function do_script(chain_opts,script_obj,chain_group,preload_this_script) {
			var registry_item,
				registry_items,
				ready_cb = function(){ script_obj.ready_cb(script_obj,function(){ execute_preloaded_script(chain_opts,script_obj,registry_item); }); },
				finished_cb = function(){ script_obj.finished_cb(script_obj,chain_group); }
			;
			
			script_obj.src = canonical_uri(script_obj.src,chain_opts[_BasePath]);
			script_obj.real_src = script_obj.src + 
				// append cache-bust param to URL?
				(chain_opts[_CacheBust] ? ((/\?.*$/.test(script_obj.src) ? "&_" : "?_") + ~~(Math.random()*1E9) + "=") : "")
			;
			
			if (!registry[script_obj.src]) registry[script_obj.src] = {items:[],finished:false};
			registry_items = registry[script_obj.src].items;

			// allowing duplicates, or is this the first recorded load of this script?
			if (chain_opts[_AllowDuplicates] || registry_items.length == 0) {
				registry_item = registry_items[registry_items.length] = {
					ready:false,
					finished:false,
					ready_listeners:[ready_cb],
					finished_listeners:[finished_cb]
				};

				request_script(chain_opts,script_obj,registry_item,
					// which callback type to pass?
					(
					 	(preload_this_script) ? // depends on script-preloading
						function(){
							registry_item.ready = true;
							for (var i=0; i<registry_item.ready_listeners.length; i++) {
								registry_item.ready_listeners[i]();
							}
							registry_item.ready_listeners = [];
						} :
						function(){ script_executed(registry_item); }
					),
					// signal if script-preloading should be used or not
					preload_this_script
				);
			}
			else {
				registry_item = registry_items[0];
				if (registry_item.finished) {
					finished_cb();
				}
				else {
					registry_item.finished_listeners.push(finished_cb);
				}
			}
		}

		// creates a closure for each separate chain spawned from this $LAB instance, to keep state cleanly separated between chains
		function create_chain() {
			var chainedAPI,
				chain_opts = merge_objs(global_defaults,{}),
				chain = [],
				exec_cursor = 0,
				scripts_currently_loading = false,
				group
			;
			
			// called when a script has finished preloading
			function chain_script_ready(script_obj,exec_trigger) {
				/*!START_DEBUG*/if (chain_opts[_Debug]) log_msg("script preload finished: "+script_obj.real_src);/*!END_DEBUG*/
				script_obj.ready = true;
				script_obj.exec_trigger = exec_trigger;
				advance_exec_cursor(); // will only check for 'ready' scripts to be executed
			}

			// called when a script has finished executing
			function chain_script_executed(script_obj,chain_group) {
				/*!START_DEBUG*/if (chain_opts[_Debug]) log_msg("script execution finished: "+script_obj.real_src);/*!END_DEBUG*/
				script_obj.ready = script_obj.finished = true;
				script_obj.exec_trigger = null;
				// check if chain group is all finished
				for (var i=0; i<chain_group.scripts.length; i++) {
					if (!chain_group.scripts[i].finished) return;
				}
				// chain_group is all finished if we get this far
				chain_group.finished = true;
				advance_exec_cursor();
			}

			// main driver for executing each part of the chain
			function advance_exec_cursor() {
				while (exec_cursor < chain.length) {
					if (is_func(chain[exec_cursor])) {
						/*!START_DEBUG*/if (chain_opts[_Debug]) log_msg("$LAB.wait() executing: "+chain[exec_cursor]);/*!END_DEBUG*/
						try { chain[exec_cursor++](); } catch (err) {
							/*!START_DEBUG*/if (chain_opts[_Debug]) log_error("$LAB.wait() error caught: ",err);/*!END_DEBUG*/
						}
						continue;
					}
					else if (!chain[exec_cursor].finished) {
						if (check_chain_group_scripts_ready(chain[exec_cursor])) continue;
						break;
					}
					exec_cursor++;
				}
				// we've reached the end of the chain (so far)
				if (exec_cursor == chain.length) {
					scripts_currently_loading = false;
					group = false;
				}
			}
			
			// setup next chain script group
			function init_script_chain_group() {
				if (!group || !group.scripts) {
					chain.push(group = {scripts:[],finished:true});
				}
			}

			// API for $LAB chains
			chainedAPI = {
				// start loading one or more scripts
				script:function(){
					for (var i=0; i<arguments.length; i++) {
						(function(script_obj,script_list){
							var splice_args;
							
							if (!is_array(script_obj)) {
								script_list = [script_obj];
							}
							for (var j=0; j<script_list.length; j++) {
								init_script_chain_group();
								script_obj = script_list[j];
								
								if (is_func(script_obj)) script_obj = script_obj();
								if (!script_obj) continue;
								if (is_array(script_obj)) {
									// set up an array of arguments to pass to splice()
									splice_args = [].slice.call(script_obj); // first include the actual array elements we want to splice in
									splice_args.unshift(j,1); // next, put the `index` and `howMany` parameters onto the beginning of the splice-arguments array
									[].splice.apply(script_list,splice_args); // use the splice-arguments array as arguments for splice()
									j--; // adjust `j` to account for the loop's subsequent `j++`, so that the next loop iteration uses the same `j` index value
									continue;
								}
								if (typeof script_obj == "string") script_obj = {src:script_obj};
								script_obj = merge_objs(script_obj,{
									ready:false,
									ready_cb:chain_script_ready,
									finished:false,
									finished_cb:chain_script_executed
								});
								group.finished = false;
								group.scripts.push(script_obj);
								
								do_script(chain_opts,script_obj,group,(can_use_preloading && scripts_currently_loading));
								scripts_currently_loading = true;
								
								if (chain_opts[_AlwaysPreserveOrder]) chainedAPI.wait();
							}
						})(arguments[i],arguments[i]);
					}
					return chainedAPI;
				},
				// force LABjs to pause in execution at this point in the chain, until the execution thus far finishes, before proceeding
				wait:function(){
					if (arguments.length > 0) {
						for (var i=0; i<arguments.length; i++) {
							chain.push(arguments[i]);
						}
						group = chain[chain.length-1];
					}
					else group = false;
					
					advance_exec_cursor();
					
					return chainedAPI;
				}
			};

			// the first chain link API (includes `setOptions` only this first time)
			return {
				script:chainedAPI.script, 
				wait:chainedAPI.wait, 
				setOptions:function(opts){
					merge_objs(opts,chain_opts);
					return chainedAPI;
				}
			};
		}

		// API for each initial $LAB instance (before chaining starts)
		instanceAPI = {
			// main API functions
			setGlobalDefaults:function(opts){
				merge_objs(opts,global_defaults);
				return instanceAPI;
			},
			setOptions:function(){
				return create_chain().setOptions.apply(null,arguments);
			},
			script:function(){
				return create_chain().script.apply(null,arguments);
			},
			wait:function(){
				return create_chain().wait.apply(null,arguments);
			},

			// built-in queuing for $LAB `script()` and `wait()` calls
			// useful for building up a chain programmatically across various script locations, and simulating
			// execution of the chain
			queueScript:function(){
				queue[queue.length] = {type:"script", args:[].slice.call(arguments)};
				return instanceAPI;
			},
			queueWait:function(){
				queue[queue.length] = {type:"wait", args:[].slice.call(arguments)};
				return instanceAPI;
			},
			runQueue:function(){
				var $L = instanceAPI, len=queue.length, i=len, val;
				for (;--i>=0;) {
					val = queue.shift();
					$L = $L[val.type].apply(null,val.args);
				}
				return $L;
			},

			// rollback `[global].$LAB` to what it was before this file was loaded, the return this current instance of $LAB
			noConflict:function(){
				global.$LAB = _$LAB;
				return instanceAPI;
			},

			// create another clean instance of $LAB
			sandbox:function(){
				return create_sandbox();
			}
		};

		return instanceAPI;
	}

	// create the main instance of $LAB
	global.$LAB = create_sandbox();


	/* The following "hack" was suggested by Andrea Giammarchi and adapted from: http://webreflection.blogspot.com/2009/11/195-chars-to-help-lazy-loading.html
	   NOTE: this hack only operates in FF and then only in versions where document.readyState is not present (FF < 3.6?).
	   
	   The hack essentially "patches" the **page** that LABjs is loaded onto so that it has a proper conforming document.readyState, so that if a script which does 
	   proper and safe dom-ready detection is loaded onto a page, after dom-ready has passed, it will still be able to detect this state, by inspecting the now hacked 
	   document.readyState property. The loaded script in question can then immediately trigger any queued code executions that were waiting for the DOM to be ready. 
	   For instance, jQuery 1.4+ has been patched to take advantage of document.readyState, which is enabled by this hack. But 1.3.2 and before are **not** safe or 
	   fixed by this hack, and should therefore **not** be lazy-loaded by script loader tools such as LABjs.
	*/ 
	(function(addEvent,domLoaded,handler){
		if (document.readyState == null && document[addEvent]){
			document.readyState = "loading";
			document[addEvent](domLoaded,handler = function(){
				document.removeEventListener(domLoaded,handler,false);
				document.readyState = "complete";
			},false);
		}
	})("addEventListener","DOMContentLoaded");

})(this);// open with blank line
/**
 * @license    DiSCO
 *     v0.2 (c) 2011 Lightenna Ltd
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
  d.VERSION = 0.2;

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
      'debugMode' : false,
      'scriptName' : 'disco.js',
      'scriptPath' : false, // false = 'to discover'
      'loaderTimeout' : 2000, // 0 = 'unlimited'
      'lastSettingNoComma' : 0
    });
  };

  /**
   * @param {object}
   * settings Empty settings, overwritten by process_ functions
   */
  d['settings'] = d.getDefaults();

  /**
   * @param {object}
   * constant Loader constants, extended at compile-time but not overwritten at
   * run-time
   */
  d['constant'] = {};

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
   * @param {string}
   * mess Debugging message for console
   * 
   * @param {boolean}
   * force Force display, even if debugMode set to false
   */
  d.debug = function(mess) {
    if (this['settings'].debugMode || arguments[1]) {
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
            a[a.length] = p + ":{ " + arguments.callee(t).join(", ") + "}";
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
   * queue for processing *next* cycle. The critical section is protected using
   * a semaphor and recursion (no callback).
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
   * queueItem Function name for calling or queueItem array of the form
   * ['_functionName', {args}]
   */
  d.processArrayItem = function(queueItem) {
    var callName, result = true, obj;
    // process array (function name, args...)
    if (queueItem.length >= 1) {
      // item is a subarray containing a process_ function
      // if it's not an array, wrap
      if (typeof queueItem !== 'object') {
        queueItem = [queueItem];
      }
      // if there's no first argument, pass an empty object
      if (typeof queueItem[1] === undefined) {
        queueItem[1] = {};
      }
      callName = 'process' + queueItem[0];
      if (typeof this[callName] === 'function') {
        // global.console.log('calling '+callName+',
        // '+queueItem[1]);
        result = this[callName].apply(d, queueItem.slice(1));
        // if called successfully, run 'processed' function
        if (result) {
          obj = queueItem[1];
          if (typeof obj === 'object') {
            if (typeof obj['processed'] === 'function') {
              // tell the object we successfully processed it
              obj['processed'].call(obj, obj, true);
            }
          }
        }
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
   * obj Settings object to apply
   * @return {boolean} true if the data was processed and should be removed from
   * the queue
   */
  d['process_settings'] = function(obj) {
    // enumerate sets object
    for ( var attrname in obj) {
      // wrap in if statement to protect against prototype changes
      if (obj.hasOwnProperty(attrname)) {
        this['settings'][attrname] = obj[attrname];
      }
    }
    return true;
  };

  // Loader section
  /**
   * Handle load request of library, code/test (inline), class
   */
  d['process_load'] = function(obj) {
    var map, previous, i, testlib, req, reqlen, reqsmet, path;
    // initialise the object manager
    if (!d['objMan']) {
      d['objMan'] = {
        // hash map of active objects
        'map' : {},
        // hash map of previously loaded objects
        'previous' : {},
        // current loader queue
        clhashtree : {},
        // current loader chain
        clchain : this.loader
      };
    }
    map = d['objMan']['map'];
    previous = d['objMan']['previous'];
    // default to previous, i.e. wait until we've loaded this name-version
    // before
    if (!obj['type']) {
      obj['type'] = 'previous';
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
      // archive it for future similar load requests (previous)
      previous[obj['hash']] = obj;
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
    reqlen = 0;
    reqsmet = true;
    if (obj['require']) {
      if (obj['require'] instanceof Array) {
        reqlen = obj['require'].length;
        // process the requisites, until one fails
        for (i = 0; (i < reqlen) && (reqsmet); i++) {
          req = obj['require'][i];
          // parent the requisite to cascade delayed failures
          req['require-parent'] = obj;
          // flag that we have unmet requisites
          if (obj['require-childrenUnmet']) {
            obj['require-childrenUnmet']++;
          } else {
            obj['require-childrenUnmet'] = 1;
          }
          // logic AND the instant results; all requisites are required
          reqsmet &= this['process_load'](req);
        }
      } else {
        d.error("'require' specified but not of type Array");
      }
    }
    if (!reqsmet) {
      return false;
    }
    // actually load the object
    return this.process_loadDirect(obj);
  };

  /**
   * After the various tests, load this object
   */
  d.process_loadDirect = function(obj) {
    var path;
    // process this object depending on its type
    switch (obj['type']) {
      case 'library' :
        // set loaded-index if not set
        if (!obj['loaded-index']) {
          // store reference to last load attempt (which failed)
          obj['loaded-index'] = 0;
        }
        // load this object
        path = d.getPath(obj['path'], obj['loaded-index']);
        // add to loader chain
        d['objMan'].clchain = d['objMan'].clchain.script(path);
        // store in loading queue
        d['objMan'].clhashtree[obj['hash']] = obj;
        // note: NO break
      case 'inline' :
      case 'test' :
        // set status
        obj['loaded-status'] = 'loading';
        if (d['settings']['loaderTimeout'] > 0) {
          // setup a function for when we start the load timeout, if we need it
          obj['loaded-timeout'] = d.loadTimedOut(obj);
          // if this is a terminal node
          if ((obj['require'] === undefined) || (obj['require'].length == 0)) {
            // setup a timeout to catch a failed load/not found event
            obj['loaded-timeoutID'] = setTimeout(obj['loaded-timeout'],
                d['settings']['loaderTimeout']);
          }
        }
        // add wait after every script in chain
        d['objMan'].clchain = d['objMan'].clchain.wait(d.loadSucceeded(obj));
    }
    return true;
  }

  /**
   * Pull or amend a relative path
   * 
   * @param {array}
   * patharr Array of paths for this script
   * @param {int}
   * index Index to pull from array (zero-based)
   * @return {string} referenced script path
   */
  d.getPath = function(patharr, index) {
    var path;
    if (patharr instanceof Array) {
      if (index < patharr.length) {
        path = patharr[index];
      } else {
        // error: index > length of array
        return null;
      }
    } else {
      if (index == 0) {
        path = patharr;
      } else {
        // error: index non-zero and path is singleton
        return null;
      }
    }
    // test for local URLs or protocol relative URLs
    if (path[0] != '/') {
      // test for non-local URLs without http
      if (path.substring(0, 4) != 'http') {
        // get base path/calculate local path to discojs install
        path = d['util']['getScriptPath']() + path;
      }
    }
    return path;
  }

  /**
   * Callback function for load failed (timeout)
   * 
   * @param {object}
   * Object being loaded
   * @param {function}
   * Timeout handler for this object
   */
  d.loadTimedOut = function(obj) {
    return (function() {
      var fail = false;
      // check that the load hasn't finished already
      if (obj['loaded-status'] == 'loading') {
        // debug message
        d.debug('load timed out for '
            + (obj['name'] === undefined ? '{' + obj['type'] + '}' : '\''
                + obj['name'] + '\'') + ' object');
        // cancel timeout (even though it was called)
        delete obj['loaded-timeout'];
        // reset the loader
        d.loader = d.loader.sandbox();
        d['objMan'].clchain = d.loader;
        // check path array setup
        if ((obj['path'] === undefined) || !(obj['path'] instanceof Array)) {
          // console.log(d['util']['toString'](obj));
          fail = true;
        }
        // load failed; if there are more alternatives, load them
        else if (obj['path'].length > (obj['loaded-index'] + 1)) {
          fail = false;
          // scrub the map and previous references, because we haven't loaded it
          delete d['objMan']['map'][obj['hash']];
          delete d['objMan']['previous'][obj['hash']];
          // load next path in the sequence
          obj['loaded-index']++;
          // debug message
          d.debug('trying again for \'' + obj['name']
              + '\' object, loaded-index[' + obj['loaded-index'] + ']');
          d.process_load(obj);
        }
        // load timed out and no alternatives available
        else {
          fail = true;
        }
        // if we failed to load all alternatives
        if (fail == true) {
          d.loadFailed(obj, 'failed');
        }
      } else {
        // protect the critical section
        d['error']('Load timed out on object not flagged for loading '
            + d['toString'](obj));
      }
    });
  }

  /**
   * Load failed
   * 
   * Tell an object it has failed to load. Even if the file loaded, we may still
   * have to mark it as failed if one of its requisites failed.
   * 
   * @param {object}
   * obj which failed
   * @param {string}
   * Reason for failure
   */
  d.loadFailed = function(obj, status) {
    var i;
    // flag loading failed/require-failed
    obj['loaded-status'] = status;
    // log message
    d.debug('failed to load '
        + (obj['name'] === undefined ? '{' + obj['type'] + '}' : '\''
            + obj['name'] + '\'') + ' object');
    // tell parent to fail
    if (obj['require-parent']) {
      d.loadFailed(obj['require-parent'], 'require-failed');
    }
    if (obj['hash']) {
      // pop object off queue
      delete d['objMan'].clhashtree[obj['hash']];
    }
    // trigger listeners
    if (obj['loaded']) {
      // tell the object we failed to load
      obj['object'] = obj['loaded'].call(obj, obj, false);
    }
  }

  /**
   * Callback function for load success (loaded)
   * 
   * @param {object}
   * Object being loaded
   * @param {function}
   * Handler for this object
   */
  d.loadSucceeded = function(obj) {
    return (function() {
      var parent;
      // check that the load hasn't finished already
      if (obj['loaded-status'] == 'loading') {
        // write to log
        d.debug('loaded '
            + (obj['name'] === undefined ? '{' + obj['type'] + '}' : '\''
                + obj['name'] + '\'') + ' object');
        // cancel timeout
        if (obj['loaded-timeout']) {
          clearTimeout(obj['loaded-timeoutID']);
          delete obj['loaded-timeout'];
          delete obj['loaded-timeoutID'];
        }
        // tell parent to decrement counter
        if (obj['require-parent']) {
          parent = obj['require-parent'];
          if (parent['require-childrenUnmet']) {
            // decrement parent counter
            parent['require-childrenUnmet']--;
            if (parent['require-childrenUnmet'] > 0) {
              // do nothing, wait for other children to succeed/timeout
            } else {
              // so long as the parent is still loading
              if (parent['loaded-status'] == 'loading') {
                // set timeout going on parent
                delete parent['require-childrenUnmet'];
                // debug message
                d.debug('waiting on parent '
                    + (parent['name'] === undefined ? '{' + parent['type']
                        + '}' : '\'' + parent['name'] + '\'') + ' object');
                // tell the parent object to timeout, but then to reschedule load
                parent['loaded-timeout'] = function() {
                  return d.process_loadDirect(parent);
                }
                parent['loaded-timeoutID'] = setTimeout(
                    parent['loaded-timeout'], d['settings']['loaderTimeout']);
              }
            }
          }
        }
        // clean up object
        delete obj['loaded-index'];
        // set status
        obj['loaded-status'] = 'loaded';
        // pop object off queue
        delete d['objMan'].clhashtree[obj['hash']];
        if (obj['loaded']) {
          // call loaded function with success result (true)
          obj['object'] = obj['loaded'].call(obj, obj, true);
        }
        // tell parent to succeed
        if (obj['require-parent']) {
          d.loadSucceeded(obj['require-parent'], 'require-failed');
        }
      } else {
        // protect the critical section
        d['error']('Load succeeded on object not flagged for loading '
            + d['toString'](obj));
      }
    });
  }

  /**
   * Resets internal state to pre-init; used in settings-order tests
   * 
   * @param {object}
   * obj for passing additional arguments
   * @return {boolean} true if the data was processed and should be removed from
   * the queue
   */
  d['process_reset'] = function(obj) {
    var uncalled_resetQueue, initLibArray;
    // protect against obj being unset
    obj = obj || {};
    this.$ = null;
    // clear loader state, to re-trigger loaded event
    this.loader = this.loader.sandbox();
    // discard the current chain
    d['objMan'].clchain = this.loader;
    // archive active objects not but previously loaded objects
    d['objMan']['map'] = {};
    // don't reset queue because it's not necessary
    uncalled_resetQueue = function() {
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
    initLibArray = ['_load', {
      'name' : 'baseLibs',
      'type' : 'previous'// ,
    }];
    // if reset has a callback function, attach to baseLib load
    if (obj['loaded'] !== undefined) {
      initLibArray[1]['loaded'] = obj['loaded'];
    }
    this.q.push_super(['_load', {
      'name' : 'baseLibs',
      'type' : 'previous'// ,
    }]);
    // call process() to ensure it clears this at some point
    d.process();
    return true;
  };

  /**
   * Resets internal state to pre-init; used in settings-order tests
   * 
   * @param {object}
   * obj for passing additional arguments
   * @return {boolean} true if the data was processed and should be removed from
   * the queue
   */
  d['process_debug'] = function(obj) {
    if (typeof obj['msg'] !== undefined) {
      d.debug(obj['msg'], obj['force']);
    }
    return true;
  }

  
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
    },

    /**
     * Find ourselves in the script array and return leaf
     * 
     * @return string Path to this script
     */
    'getScriptPath' : function() {
      var i, scripts, path, leafcomp, comp, complen;
      // if scriptPath set, use that
      if (d['settings']['scriptPath']) {
        return d['settings']['scriptPath'];
      }
      scripts = global['document'].getElementsByTagName('script');
      comp = d['settings']['scriptName'];
      complen = comp.length;
      for (i = 0; i < scripts.length; ++i) {
        leafcomp = scripts[i].src.substring(scripts[i].src.length - complen);
        if (leafcomp == d['settings']['scriptName']) {
          // script found, return path
          path = scripts[i].src.split('/').slice(0, -1).join('/') + '/';
          return path;
        }
      }
      // script not found, return /
      return '/';
    },

    /**
     * Convert an object to a string representation
     * 
     * @param object
     * obj Object input
     * @return string String representation
     */
    'toString' : function(obj) {
      var str = '', showFunc = false || arguments[1];
      for ( var prop in obj) {
        if (obj[prop] && !showFunc) {
          if (obj[prop].toString().indexOf('{') != -1)
            continue;
        }
        str += prop + " value :" + (obj[prop] ? obj[prop] : '0') + "\n";
      }
      return str;
    }// ,
  };

  // return augmented module
  return d;
}(D15C0_m || {}, window));
/**
 * DiSCO (c) 2011 Lightenna Ltd.
 */

(function(disco, global, undefined) {
	disco.q.push(['_load', {
    'name' : 'discoball',
    // not using min version during debugging
    'path' : ['dist/r1-core/discoball.js'],
    'type' : 'library',
    'loaded' : function(lib, result){
      // discoball loaded after all dependencies
      console.log('discoball callback '+result);
    },
		'require' : [
      {
        'name' : 'baseLibs',
        'type' : 'inline',
    		'require' : [
    			{
    				'name' : 'jQuery',
    				'version' : '1.6.1',
    				'test' : function(lib, result){
    					if (global['jQuery'] !== undefined) {
    						// test for version ['version'] or later
    						if (disco['util']['versionmux'](global['jQuery'].fn.jquery) > disco['util']['versionmux'](lib.version)) {
    							disco['$'] = global['jQuery'];
    							return(disco['$']);
    						}
    					}
    				},
    				'path' : ['//ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js', 'lib/r1-core/jquery/jquery.min.js'],
    				'loaded' : function(lib, result){
    					// make sure we don't upset whatever was on the page before
    					disco['$'] = global['jQuery'].noConflict();
    					return(disco['$']);
    				},
    				'type' : 'library'// ,
    			},
    			{
    				'name' : 'Backbone',
    				'version' : '0.5.1',
    				'test' : function(lib, result){
    					if (global['Backbone'] !== undefined) {
    						// test for version ['version'] or later
    						if (disco['util']['versionmux'](global['Backbone'].VERSION) > disco['util']['versionmux'](lib.version)) {
    							disco['Backbone'] = global['Backbone'];
    							return(disco['Backbone']);
    						}
    					}
    				},
    				'path' : ['//cdnjs.cloudflare.com/ajax/libs/backbone.js/0.5.1/backbone-min.js', 'lib/r1-core/backbone/backbone.min.js'],
    				'loaded' : function(lib, result){
    					// make sure we don't upset whatever was on the page before
    					disco['Backbone'] = global['Backbone'].noConflict();
    					// after Backbone is loaded, tell underscore to hide itself
              global['_'].noConflict();
    					return(disco['Backbone']);
    				},
    				'type' : 'library',
    				'require' : [
    					{
    						'name' : 'json2',
    						'version' : '20110223',
    						'path' : ['//cdnjs.cloudflare.com/ajax/libs/json2/20110223/json2.js', 'lib/r1-core/JSON-js/json2.js'],
    						'type' : 'library'// ,
    					},
    					{
    						'name' : 'Underscore',
    						'version' : '1.1.6',
    						'test' : function(lib, result){
    							if (global['_'] !== undefined) {
    								// test for version ['version'] or later
    								if (disco['util']['versionmux'](global['_'].VERSION) > disco['util']['versionmux'](lib.version)) {
    								  // copy library into disco, but delay clean up until dependencies loaded
    									disco['_'] = global['_'];
    									return(disco['_']);
    								}
    							}
    						},
    						'path' : ['//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.1.6/underscore-min.js', 'lib/r1-core/underscore/underscore.min.js'],
    						'loaded' : function(lib, result){
    							// make sure we don't upset whatever was on the page before
                  disco['_'] = global['_'];
    							return(disco['_']);
    						},
    						'type' : 'library'// ,
    					}// ,
    				]// End of backbone require (json2, underscore)
    			}// ,
    	  ]// End of baseLibs require (jQuery, backbone)
      }// ,
		]// End of discoball require (baseLibs, discoball)
	}]);
}(D15C0_m, window));
