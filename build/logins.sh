#!/bin/sh -l
# drop to PC emulation if remote enquiry fails
exec env TERM=ansi node /usr/local/games/dankdomain/ttymain
