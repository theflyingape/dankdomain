#!/bin/bash -l

ARG="${@: -1}"
[ "${ARG:0:1}" = "-" ] && ARG=""
path=`dirname $0`; cd $path || exit 1
umask 0002

exec node ttymain ${ARG}
