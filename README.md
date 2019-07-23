<img src="https://avatars.githubusercontent.com/theflyingape" title="Robert Hurst" align="right">

# :crown: Dank Domain

## the return of Hack &amp; Slash

**Dank Domain** is basically a bulletin board built around a medieval role-playing atmosphere (or is it the other way around?). Instead, you _live_ the online game as you kill, steal, brawl, and joust the other members to gain levels and fortune. The success of this game is dependent upon the users that play it. Your involvment will not only provide you with entertainment, but also shares your activity with the other players.

### Read, then play on [https://DDgame.us](https://ddgame.us)

#### Original Amiga Hack & Slash enthusiasts can visit:  [Absinthe BBS](https://www.telnetbbsguide.com/bbs/absinthe-bbs/) by Anachronist

[![Downloads](https://img.shields.io/npm/dy/dankdomain.svg)](https://www.npmjs.com/package/dankdomain)
[![GitHub release](https://img.shields.io/github/release/theflyingape/dankdomain.svg)](https://github.com/theflyingape/dankdomain/releases) [![npm version](https://badge.fury.io/js/dankdomain.svg)](https://www.npmjs.com/package/dankdomain)

Download packs: [images](https://drive.google.com/open?id=1jjLPtGf_zld416pxytZfbfCHREZTghkW) :camera:
and [sounds](https://drive.google.com/open?id=1UvqQJbN61VbWVduONXgo1gm9yvGI0Qp8) :sound:

To run a local game copy (Linux only):

```bash
npm install dankdomain
./install.sh
./debug.sh
npm test
```

You can also play DDgame.us from the command-line: `node telnet`

```
[rhurst@atom dankdomain]$ pwd
/usr/local/games/dankdomain
etc/                game app & system support files
files/              game & player support files: ANSI and/or text formats
../arena            ASCII art files
../dungeon          ASCII art files
../naval            ASCII art files
../player           ASCII art files
../tavern           all player events logged for the day
../user             each player’s events logged since last visit
items/              game artifacts
users/              player data files
package.json        Node.js manifest
node_modules/       Node.js support libraries
door/               web services & client for browser
../static           web browser client content
   ../images        visual media for artifacts, creatures, and players
   ../sounds        audio media for event notifications
tty/                game modules for each main menu item
battle.js           support module for player engagements
common.js           global support module for game
email.js            support module for dispatching email notifications
items.js            support module for loading artifacts
telnet.js           telnet client - via web services
ttymain.js          game app - startup entry point
door-startup.sh     web services - sysctl startup script
logins.sh           player - startup script into game app
tty.sh              player - startup script into web services
```

:us: :copyright: 1991 - 2019 [Robert Hurst](https://www.linkedin.com/in/roberthurstrius/)
