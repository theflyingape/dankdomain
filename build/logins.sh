#!/bin/sh -l
path=`dirname $0`; cd $path || exit 1
exec node ttymain $1
