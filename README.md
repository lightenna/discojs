[DiSCO](http://discojs.com/) - Javascript API for DiSCO
=======================================================

About DiSCO
-----------

Database-integrated Server and Client Objects (DiSCO) attempts to unify a single datamodel across both client and server to facilitate the development of browser-based metadata-driven applications.  DiSCO comprises:

* a simple syntax for specifying object dependencies
* a javascript dependency loader, to load libraries in parallel using [LABjs](https://github.com/getify/LABjs).  This loader can be used independently of the rest of the DiSCO framework.
* SOON a sync mechanism for saving changes back to and receiving update notifications from a server and database


Getting started
---------------

Code samples that illustrate some basic uses of the API can be found in the `test/[feature]/samples` directories.


Build instructions
------------------

Everything you need is on github, in this repo and others using submodules.

1. Check out the repo

        git init
        git clone <address of this repo>

2. Then check out the submodules

        git submodule init
        git submodule update

3a. Run the build and minify script

        ./build/scripts/build-concat-min.bat

3b. Or run the build command manually

        ant -f ../build.xml concat min > ../intermediates/output.txt 2>&1


Documentation
-------------

All the APIs are documented using JSDoc.  The HTML documentation it generates lives in the `docs` directory.


Notes
-----
Minified versions are compiled with Google Closure Compiler, using the advanced optimisations.  As a result, the code features several symbol export/import statements. 
