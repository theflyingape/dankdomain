<a href="https://robert.hurst-ri.us"><img src="https://avatars.githubusercontent.com/theflyingape" title="Robert Hurst" align="right"></a>

# 👑 Ɗanƙ Ɗomaiƞ

## the return of Hack &amp; Slash

![screenshot](https://raw.githubusercontent.com/theflyingape/dankdomain/master/build/door/static/assets/title.jpg "Can you defeat the Demogorgon?")
***Read*** *the* [Player's Manual](https://www.ddgame.us) *and* ***Play*** *the* [online game](https://play.ddgame.us)
---
>**Ɗanƙ Ɗomaiƞ** is basically a bulletin board built around a medieval role-playing atmosphere (or is it the other way around?). Instead, you _live_ the online game as you kill, steal, brawl, and joust the other members to gain levels and fortune. The success of this game is dependent upon the users that play it. Your involvment will not only provide you with entertainment, but also shares your activity with the other players.

*Original Amiga* **Hack & Slash** *enthusiasts can visit:*  [Absinthe BBS](https://www.telnetbbsguide.com/bbs/absinthe-bbs/) *by Anachronist*

---

## Installation
Requires `Linux` or `Chrome OS` running a container with the `Node.js` runtime

[![Downloads](https://img.shields.io/npm/dy/dankdomain.svg)](https://www.npmjs.com/package/dankdomain)
[![GitHub release](https://img.shields.io/github/release/theflyingape/dankdomain.svg)](https://github.com/theflyingape/dankdomain/releases) [![npm version](https://badge.fury.io/js/dankdomain.svg)](https://www.npmjs.com/package/dankdomain) [![Dependencies](https://img.shields.io/david/theflyingape/dankdomain.svg)](https://david-dm.org/theflyingape/dankdomain) [![Issues](http://img.shields.io/github/issues/theflyingape/dankdomain.svg)](https://github.com/theflyingape/dankdomain/issues)

Download packs: [images](https://drive.google.com/open?id=1jjLPtGf_zld416pxytZfbfCHREZTghkW) 📷 and [sounds](https://drive.google.com/open?id=1UvqQJbN61VbWVduONXgo1gm9yvGI0Qp8) 🔉

With the packs loaded, the game + runtime files will need **440mb** storage.

To run a local game copy:
```bash
$ npm install dankdomain
$ ./install.sh /usr/local/games
$ npm start
$ google-chrome http://localhost:1939
$ telnet localhost 1986
```
Modify your game networking settings:
```
$ cd /usr/local/games/dankdomain
$ mv etc/network.json_inet etc/network.json
$ vim etc/network.json
```
You can also play www.DDgame.us from the command-line:
```bash
$ npm run tty
$ npm run mame
$ telnet play.ddgame.us
```
File directory structure:
```linux
[theflyingape@ddgame dankdomain]$ pwd
/usr/local/games/dankdomain
.vscode/            Visual Studio Code: settings & debug profiles
console/            MAME support files
door/               web services & client for browser
../static           web browser client content
   ../images        visual media for artifacts, creatures, and players
   ../sounds        audio media for event notifications
etc/                game app & system support files
files/              game, menu & player support files: ANSI and/or text formats
../arena            ASCII art & menu files
../casino           menu files
../dungeon          ASCII art
../main             about system & menu files
../naval            ASCII art & menu files
../party            instruction & menu files
../player           ASCII art
../square           menu files
../tavern           all player events logged for the day
../user             each player’s events logged since last visit
items/              game artifacts
users/              player data files
node_modules/       Node.js support libraries
tty/                game modules for each main menu item
package.json        Node.js manifest
battle.js           support module for player engagements
common.js           global support module for game
email.js            support module for dispatching email notifications
items.js            support module for loading artifacts
telnet.js           telnet client - via web services
ttymain.js          game app - startup entry point
door-startup.sh     web services - systemctl startup script
logins.sh           player - startup script into game app
mame.sh             player - MAME VT240 terminal + solcat startup script
tty.sh              player - startup script into web services
```
**NOTE**: *in **`users`** folder, edit a hidden (dot) export file and save as **`save.json`**. The game app will auto-import it for a SQL update operation into the dankdomain.sql **`Players`** table.*

 🇺🇸 ©️1991 - 2021 [Robert Hurst](https://www.linkedin.com/in/roberthurstrius/)

#### Ɗanƙ Ɗomaiƞ image gallery

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
