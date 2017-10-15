#!/bin/sh -l
path=`dirname $0`; cd $path
#export npm_package_version=`grep version package.json | awk -F: '{print $2}' | tr -d '[:punct:]'`
exec node ttymain
