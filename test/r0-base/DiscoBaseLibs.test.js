/*global window */

module("Module r0-base: DiscoBaseLibs.js");

// tests have to run in order
QUnit.config.reorder = false;

if ( !QUnit.isLocal && true ) {
  
  /**
   * Load object requiring baseLibs
  test("_load, require[baseLibs]", 2, function() {
    stop();
    var disco = window.D15C0_m;
    disco.q.push(["_load", {
      'type' : 'test',
      'loaded' : function(lib, result) {
        equal(result, true,
            "Loaded library successfully");
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
   */

  /**
   * Load object after falling back to find requirement
  test("_load, require local fallback", 5, function() {
    stop();
    var disco = window.D15C0_m, testName, localSettings;
    // force debug on for this test to show log messages
    localSettings = {
      debugMode: true
    };
    disco.q.push(["_settings", localSettings]);
    // write test name to debug stream
    testName = QUnit.config.current.testName;
    disco.q.push(["_debug", {
      'msg' : 'TEST: started '+(testName == undefined ? '' : ' \''+testName+'\'')//,
    }]);
    disco.q.push(["_load", {
      'type' : 'test',
      'loaded' : function(lib, result) {
        equal(result, true,
            "Loaded fallback library successfully");
        equal(window['fallback'], 101,
            "Loaded correct version of fallback");
        equal(disco.settings.debugMode, localSettings.debugMode, "Debug as set");
        start();
        // optional reset
        stop();
        disco.q.push(["_reset", {
          'processed' : function(){
            equal(disco.settings.debugMode, false, "Debug off");
            equal(disco.$, null, "Check no local jQuery yet");
            // write to debug stream, but force because _reset sets debugMode to false
            disco.q.push(["_debug", {
              'msg' : 'TEST: completed '+(testName == undefined ? '' : ' \''+testName+'\''),
              'force' : localSettings.debugMode//,
            }]);
            start();
          }//,
        }]);
      },
      'require' : [
        {
          'name' : 'fallback',
          'path' : ['http://no-such.dom/no-such.file', 'test/r0-base/fallback.js'],
          'type' : 'library'//,
        }//,
      ]//,
    }]);
  });
   */

  /**
   * Load object after failing to find requirement
  test("_load, require no-such-file or no-such-fallback", 1, function() {
    stop();
    var disco = window.D15C0_m;
    disco.q.push(["_load", {
      'type' : 'test',
      'loaded' : function(lib, result) {
        equal(result, false,
            "Called loaded after timeout to report fail");
        start();
      },
      'require' : [
        {
          'name' : 'no-such-file',
          'path' : ['http://no-such.domain/no-such.file', 'http://no-such.fallback-domain/no-such.file'],
          'type' : 'library'//,
        }//,
      ]//,
    }]);
  });
   */
  
  /**
   * Load object requiring baseLibs
   */
  test("_load, require[baseLibs]", 2, function() {
    stop();
    var disco = window.D15C0_m;
    disco.q.push(["_load", {
      'type' : 'test',
      'loaded' : function(lib, result) {
        equal(result, true,
            "Loaded library successfully");
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
  
  /**
   * Load, then reset, the re-load
   */
  test("_load, _reset, _load (previous)", 6, function() {
    var disco = window.D15C0_m, testName, settingsCopy = {};
    // try to fetch settings object before we scrub it (continuity)
    if (disco != undefined) {
      settingsCopy = disco.settings;
    }
    settingsCopy.debugMode = true;
    stop();
    // write test name to debug stream
    testName = QUnit.config.current.testName;
    disco.q.push(["_debug", {
      'msg' : 'TEST: started '+(testName == undefined ? '' : ' \''+testName+'\'')//,
    }]);
    // wait for initial base load
    disco.q.push(["_load", {
      'type' : 'test',
      'loaded' : function(lib, result) {
        equal(typeof disco.objMan.map, 'object',
            "Loader setup objectManager");
        start();
        stop();
        // reset disco (without array []/args, but should get wrapped)
        disco.q.push(["_reset", {
          'processed' : function(){
            equal(disco.settings.debugMode, false, "Debug off");
            equal(disco.$, null, "Check no local jQuery yet");
            start();
          }//,
        }]);
        stop();
        // turn debugging messages back on
        settingsCopy.processed = function() {
          equal(disco.settings.debugMode, true, "Debug on");
          start();
        };
        // push settings (in array []/args)
        disco.q.push(['_settings', settingsCopy]);
        // try and load an unseen previous
        stop();
        disco.q.push(["_load", {
          'type' : 'test',
          'loaded' : function(lib, result) {
            equal(result, false, "[error] called loaded() function based on unseen previous");
            start();
          },
          'require' : [{ 'name' : 'no-such-previous', 'type' : 'previous' }]//,
        }]);
        stop();
        // load a seen previous (jQuery)
        disco.q.push(["_load", {
          'type' : 'test',
          'loaded' : function(lib, result) {
            ok(true, "loaded() function based on familiar previous");
            equal(disco.$.fn.jquery, '1.6.1',
                "Loaded correct version of jQuery");
            disco.q.push(["_debug", {
              'msg' : 'TEST: completed '+(testName == undefined ? '' : ' \''+testName+'\'')//,
            }]);
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
