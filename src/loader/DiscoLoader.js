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
      'scriptPath' : false // flag to discover
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
  d['constant'] = {
    'loaderTIMEOUT' : 2000
  };

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
   * @deprecate push({command:[_some, arg1, arg2], processed:function()}
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
                  queueItem['processed'].apply(queueItem['context']);
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
   * @return {boolean} true if the data was processed and should be removed from
   * the queue
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
    var map, previous, i, testlib, reqlen, reqsmet, path;
    // initialise the object manager
    if (!d['objMan']) {
      d['objMan'] = {
        // hash map of active objects
        'map' : {},
        // hash map of previously loaded objects
        'previous' : {},
        // current loader queue
        clqueue : {},
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
        // count the number of requisites as they're parented
        obj['timeout-pending'] = 0;
        // process the requisites, until one fails
        for (i = 0; (i < reqlen) && (reqsmet); i++) {
          reqsmet &= this['process_load'](obj['require'][i]);
          // parent each requisite for cascading timeouts
          obj['require'][i]['timeout-parent'] = obj;
          obj['timeout-pending']++;
        }
        // tell the loader to wait for our pre-requisites if more than 1
        if (reqlen >= 2) {
          // not sure about the role of this
          // the idea is to capture multiple loads in one go
          // d['objMan'].clchain = d['objMan'].clchain.wait(d.loadSucceeded(obj));
        }
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
        // set loaded-index if not set
        if (!obj['loaded-index']) {
          // store reference to last load attempt (which failed)
          obj['loaded-index'] = 0;
        }
        // set status
        obj['loaded-status'] = 'loading';
        // load this object
        path = d.getPath(obj['path'], obj['loaded-index']);
        // add to loader chain
        d['objMan'].clchain = d['objMan'].clchain.script(path);
        // store in loading queue
        d['objMan'].clqueue[obj['hash']] = obj;
        // note no break
      case 'inline' :
      case 'test' :
        // setup a function for when we start the load timeout, if we need it
        obj['loaded-timeout'] = d.loadTimedOut(obj);
        // if this is a terminal node
        if (reqlen == 0) {
          // setup a timeout to catch a failed load/not found event
          setTimeout(obj['loaded-timeout'], d['constant']['loaderTIMEOUT']);
        }
        // add wait after every script in chain
        d['objMan'].clchain = d['objMan'].clchain.wait(d.loadSucceeded(obj));
    }
    return true;
  };

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
      // cancel timeout (though it was called)
      delete obj['loaded-timeout'];
      // check obj passed
      if ((obj['path'] === undefined) || !(obj['path'] instanceof Array)) {
        // console.log(d['util']['toString'](obj));
        fail = true;
      }
      // load failed; if there are more alternatives, load them
      else if (obj['path'].length > (obj['loaded-index'] + 1)) {
        // scrub the map and previous references, because we haven't loaded it
        delete d['objMan']['map'][obj['hash']];
        delete d['objMan']['previous'][obj['hash']];
        // load next path in the sequence
        obj['loaded-index']++;
        d.process_load(obj);
        fail = false;
      }
      if (fail) {
        // otherwise flag library failed
        obj['loaded-status'] = 'failed';
        // tell timeout-parent to start timing out
        if (obj['timeout-parent']) {
          // if parent hasn't loaded or timed out yet
          if (obj['timeout-parent']['loaded-timeout']) {
            setTimeout(obj['timeout-parent']['loaded-timeout'], d['constant']['loaderTIMEOUT']);
          }
        }
        if (obj['hash']) {
          // pop object off queue
          delete d['objMan'].clqueue[obj['hash']];
        }
        if (obj['loaded']) {
          // tell the object we failed to load
          obj['object'] = obj['loaded'].call(obj, obj, false);
        }
      }
    });
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
      // cancel timeout
      clearTimeout(obj['loaded-timeout']);
      delete obj['loaded-timeout'];
      // tell timeout-parent to start timing out
      if (obj['timeout-parent']) {
        setTimeout(obj['timeout-parent']['loaded-timeout'], d['constant']['loaderTIMEOUT']);
      }
      // clean up object
      delete obj['loaded-index'];
      // set status
      obj['loaded-status'] = 'loaded';
      // pop object off queue
      delete d['objMan'].clqueue[obj['hash']];
      if (obj['loaded']) {
        // call loaded function with success result (true)
        obj['object'] = obj['loaded'].call(obj, obj, true);
      }
    });
  }

  /**
   * Resets internal state to pre-init; used in settings-order tests
   * 
   * @return {boolean} true if the data was processed and should be removed from
   * the queue
   */
  d['process_reset'] = function() {
    this.$ = null;
    // clear loader state, to re-trigger loaded event
    this.loader = this.loader.sandbox();
    // discard the current chain
    d['objMan'].clchain = this.loader;
    // archive active objects not but previously loaded objects
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
