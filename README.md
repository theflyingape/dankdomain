<a href="https://robert.hurst-ri.us"><img src="https://avatars.githubusercontent.com/theflyingape" title="Robert Hurst" align="right"></a>

# 👑 Ɗaɳƙ Ɗoɱaiɳ

## _the return of Hack &amp; Slash_

![screenshot](https://raw.githubusercontent.com/theflyingape/dankdomain/master/build/door/static/assets/title.jpg "Can you defeat the Demogorgon?")
_Read the_ [Player's Manual](https://www.ddgame.us) _to play the_ [online game](https://play.ddgame.us)
---
>**Ɗaɳƙ Ɗoɱaiɳ** is basically a bulletin board built around a medieval role-playing atmosphere (or is it the other way around?). Instead, you _live_ the online game as you kill, steal, brawl, and joust the other members to gain levels and fortune. The success of this game is dependent upon the users that play it. Your involvment will not only provide you with entertainment, but also shares your activity with the other players.

*Original Amiga* **Hack & Slash** *enthusiasts can visit:*  [Absinthe BBS](https://www.telnetbbsguide.com/bbs/absinthe-bbs/) *by Anachronist*

---

[![npm version](https://badge.fury.io/js/dankdomain.svg)](https://www.npmjs.com/package/dankdomain) ![npm version](https://img.shields.io/node/v/dankdomain) ![David](https://img.shields.io/david/dev/theflyingape/dankdomain) [![Issues](http://img.shields.io/github/issues/theflyingape/dankdomain.svg)](https://github.com/theflyingape/dankdomain/issues)

Download packs: [images](https://drive.google.com/open?id=1jjLPtGf_zld416pxytZfbfCHREZTghkW) 📷 and [sounds](https://drive.google.com/open?id=1UvqQJbN61VbWVduONXgo1gm9yvGI0Qp8) 🔉

With the _optional_ packs loaded for the web portal, the game + runtime files will need roughly **500mb** storage.

## Installation
Tested on `Linux`, `Chrome OS`, and `Docker`. To [install](https://www.npmjs.com/package/dankdomain) and run a local game copy (requires the `Node.js` runtime):

```bash
$ npm install dankdomain
$ cd node_modules/dankdomain
$ ./install.sh /path/to/games
$ cd /path/to/games/dankdomain
$ npm start
```

**NOTE**: _my "public" access [packages](https://github.com/theflyingape?tab=packages&visibility=public) are published on GitHub, too, and it requires your `Personal Access Token` authentication to fetch/install them from this alternative `npm registry`:_

```bash
$ npm config set @theflyingape:registry https://npm.pkg.github.com
$ npm login --scope=@theflyingape
$ npm install @theflyingape/dankdomain
```

_Read GitHub's [Working with the npm registry](https://docs.github.com/en/enterprise-server@2.22/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages) to learn more details._

... or use **Docker** _(convenient, but not always kept current)_:

```
$ docker pull theflyingape/dankdomain
```

Connect into the game via portal or directly:

```
$ google-chrome http://localhost:1939
$ telnet localhost 1986
```

Your game networking preferences:

```
$ cd /path/to/dankdomain/etc
$ cp network.json_inet network.json
$ vim network.json
```

You can also play www.DDgame.us from the command-line:

```bash
$ npm run tty
$ npm run mame
$ telnet play.ddgame.us
```

**Files directory structure**

```linux
$ pwd
/usr/local/games/dankdomain
.vscode/          Visual Studio Code: settings & debug profiles
console/          MAME support files
door/             web services
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
users/            player data files
node_modules/     Node.js support libraries
tty/              game modules for each main menu item
package.json      Node.js manifest
battle.js         support module for player engagements
common.js         global support module for game
email.js          support module for dispatching email notifications
items.js          support module for loading artifacts
telnet.js         telnet client - via web services
door-startup.sh   web services - systemctl startup script
logins.sh         player - startup script into game app
mame.sh           player - MAME VT240 terminal + solcat startup script
tty.sh            player - telnet.js wrapper
```

**NOTE**: _in **`users`** folder, edit a hidden (dot) export file and save as **`save.json`**. The game app will consume it for a SQL update into the dankdomain.sql **`Players`** table._

 🇺🇸 ©️1991 - 2021 [Robert Hurst](https://www.linkedin.com/in/roberthurstrius/)

#### Ɗaɳƙ Ɗoɱaiɳ image gallery

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
