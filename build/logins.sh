#!/bin/sh -l
path=`dirname $0`; cd $path
exec node ttymain $1
