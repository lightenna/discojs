cd %~dp0
ant -f ../build.xml concat lint min > ../intermediates/output.txt 2>&1