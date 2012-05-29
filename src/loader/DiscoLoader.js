// open with blank line
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
