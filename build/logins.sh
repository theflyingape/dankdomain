#!/bin/sh -l
path=`dirname $0`; cd $path
export `resize | grep ^LINES | tr -d \;`
exec node ttymain
