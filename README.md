<a href="https://robert.hurst-ri.us"><img src="https://avatars.githubusercontent.com/theflyingape" title="Robert Hurst" align="right"></a>

# Ɗaɳƙ Ɗoɱaiɳ :: _the return of Hack &amp; Slash_

![screenshot](https://raw.githubusercontent.com/theflyingape/dankdomain/master/build/door/static/assets/title.jpg "Can you defeat the Demogorgon?")

### _Read the_ [Player's Manual](https://www.ddgame.us) _to play the_ [online game](https://play.ddgame.us)

---
>**Ɗaɳƙ Ɗoɱaiɳ** is the re-imagined classic Amiga bulletin board, [Hack & Slash](https://github.com/theflyingape/rpgbbs), built around a medieval role-playing atmosphere. Your character kills, steals, brawls, and jousts other PCs, NPCs, and BOTs to gain levels and fortune. Successful ventures into its deep dank dungeon are the keys to immortality.

*Original Amiga* **Hack & Slash** *enthusiasts can visit:*  [Absinthe BBS](https://www.telnetbbsguide.com/bbs/absinthe-bbs/) *by Anachronist*

---

[![Open in Visual Studio Code](https://open.vscode.dev/badges/open-in-vscode.svg)](https://open.vscode.dev/organization/repository)[![npm version](https://badge.fury.io/js/dankdomain.svg)](https://www.npmjs.com/package/dankdomain) ![npm version](https://img.shields.io/node/v/dankdomain) ![David](https://img.shields.io/david/dev/theflyingape/dankdomain) [![Issues](http://img.shields.io/github/issues/theflyingape/dankdomain.svg)](https://github.com/theflyingape/dankdomain/issues)

Download packs: [images](https://drive.google.com/open?id=1jjLPtGf_zld416pxytZfbfCHREZTghkW) 📷 and [sounds](https://drive.google.com/open?id=1UvqQJbN61VbWVduONXgo1gm9yvGI0Qp8) 🔉

With the _optional_ packs loaded for the web portal, the game + runtime files will need roughly **500mb** storage.

## Installation

Tested on `Linux`, `Chrome OS`, and `Docker`. To [install](https://www.npmjs.com/package/dankdomain) and run a local game copy (requires the `Node.js` runtime):

```bash
# fetch this package source:
$ git clone https://github.com/theflyingape/dankdomain
# ... or via Node.js
$ npm install dankdomain

# cd into package source folder:
$ npm install
$ cd /usr/local/games/dankdomain

# 1) play it as standalone:
$ npm run play

# modify for your server networking preferences:
$ cp etc/network.json_inet etc/network.json
$ vim etc/network.json

# 2) run it as a local multiuser server:
$ npm run serve &
$ npm start
$ npm stop

# 3) other ways to play online:
$ npm run mame
$ node telnet
$ telnet play.ddgame.us
```

**NOTE**: _my_ "public" _access [packages](https://github.com/theflyingape?tab=packages&visibility=public) are published on_ **GitHub** _and it requires your_ `Personal Access Token` authentication _to fetch/install them from this alternative_ `npm registry`. Read GitHub's [Working with the npm registry](https://docs.github.com/en/enterprise-server@2.22/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages) to learn more details.

```bash
# setup local Node.js package
$ npm config set @theflyingape:registry https://npm.pkg.github.com
$ npm login --scope=@theflyingape
$ npm install @theflyingape/dankdomain
```

... or use **Docker** _(convenient, but not maintained with the latest commits)_:

```bash
$ docker pull theflyingape/dankdomain
$ docker run --rm -it -p 1939:1939/tcp -p 1986:1986/tcp theflyingape/dankdomain

Ɗaɳƙ Ɗoɱaiɳ (ƊƊnet) started on linux #1
cwd /usr/games/dankdomain → /usr/games/dankdomain/door
initializing Deeds
initializing Online
initializing Rings (unique)
 + adding ⚛️ Atomic
 + adding ✝️ Faith
 + adding ♾️ Infinity
 + adding 🐍 Medusa's
 + adding 🕳️ Mystic Portal
 + adding 👹 Ogre
 + adding 🖤 Undying
 + adding ⚪ White Wizard
initializing Players
 + adding sysop - 👑 Sysop
 + adding barkeep - Tiny, the Ogre barkeep
 + adding merchant - Manu
 + adding neptune - Neptune of the Sea
 + adding seahag - old sea hag
 + adding taxman - Ira Hess
 + adding witch - Medea
 + adding bot1 - Imagination
 + adding bot2 - Nobody
initializing Gangs
ENOENT: no such file or directory, open '../etc/network.json'
→ listening on telnet 0.0.0.0:1986
→ listening on https://0.0.0.0:1939/
↔ WebSocket endpoints enabled
```

Supports running as a BBS door (as Amiga-only BBSes did for `Hack & Slash` in 1994) by allowing a passed user ID paired with a compatible **Mystic** `door.sys` [file format](http://wiki.mysticbbs.com/doku.php?id=menu_commands#external_doors) launched from its `BBS node` startup directory.  For example, what follows might be for the BBS sysop (`0`):

```bash
#!/bin/sh
$ pwd; [ -s door.sys ] || exit 1
$ node /usr/local/games/dankdomain/main 0
```

## Files directory structure

```linux
$ pwd
/usr/local/games/dankdomain
.vscode/          Visual Studio Code: settings & debug profiles
characters        bot, player, and non-playing characters
console/          MAME support files
door/             web services: app server startup: ƊƊnet
../static         game portal
   ../assets      app install, fonts, etc.
   ../images      visual media for artifacts, creatures, and players
   ../sounds      audio media for event notifications
etc/              game app & system support files
files/            game, menu & player support files: ANSI and/or text formats
../arena          ASCII art & menu files
../casino         menu files
../dungeon        ASCII art
../main           game app - startup entry point
../menu           about system & menu files
../naval          ASCII art & menu files
../party          instruction & menu files
../player         ASCII art
../square         menu files
../tavern         all player events logged for the day
../user           each player’s events logged since last visit
items/            game artifacts
users/            player runtime data files
node_modules/     Node.js support libraries
tty/              game modules for each main menu item
package.json      Node.js manifest
battle.js         support module for player engagements
db.js             app & client SQLite module for dankdomain.sql
email.js          support module for (optional) dispatching email notifications
interfaces.js     TypeScript object types
items.js          support module for loading item artifacts
lib.js            support module for common I/O functions
main.js           client node startup: ƊƊplay
pc.js             support classes for BOTs, NPCs and PCs with Deeds
player.js         support module for common PC functions
runtime.js        global runtime variables to govern play
sys.js            support module with discrete functions to dependencies
telnet.js         telnet client using websocket and XT emulator handling
types.js          TypeScript template literals
door-startup.sh   web services - systemctl startup script
logins.sh         player - startup script into game app
mame.sh           player - MAME VT240 terminal + socat startup script
tty.sh            player - telnet.js wrapper
```

**NOTE**: _in_ **`users`** _folder, edit a hidden (dot) export file and save as_ **`save.json`** _whereas_ **`app.js`** _will automatically consume and apply it to the dankdomain.sql_ **`Players`** _table._

 🇺🇸 ©️1991 - 2021 [Robert Hurst](https://www.linkedin.com/in/roberthurstrius/)

### Ɗaɳƙ Ɗoɱaiɳ image gallery

+ [Arena](https://photos.app.goo.gl/sZS7xx6rpyoG4CYBA)
+ [Connect](https://photos.app.goo.gl/AeZZXrC8VKnMFuqj8)
+ [Dungeon](https://photos.app.goo.gl/XfQTJ2NrKdVWJext9)
+ [Images](https://photos.app.goo.gl/wXpBUtrY2L64SrEH6)
+ [Monster](https://photos.app.goo.gl/rTRm8xDbF2wGJDFZ7)
+ [Naval](https://photos.app.goo.gl/w6v8Zk4GVBc3CbAA6)
+ [NPC](https://photos.app.goo.gl/T4QQT87U1eZK6EHk8)
+ [Player](https://photos.app.goo.gl/BCEAJjynqHZKxpaX9)
+ [Potion](https://photos.app.goo.gl/Gj9HYSXQUDGVcviJ7)
+ [Ring](https://photos.app.goo.gl/SWQDdytqjdXNfT4m7)
+ [Specials](https://photos.app.goo.gl/Dn2g2BtdwtKSbudu7)
+ [User](https://photos.app.goo.gl/hfTJ8EstLPSp4Kry6)
