/*****************************************************************************\
 *  Ɗaɳƙ Ɗoɱaiɳ: the return of Hack & Slash                                  *
 *  NPC authored by: Robert Hurst <theflyingape@gmail.com>                   *
\*****************************************************************************/

import $ = require('./runtime')
import db = require('./db')
import { Access } from './items'
import { vt } from './lib'
import { PC } from './pc'
import { dice, int, money, pathTo, whole } from './sys'

module npc {

    class _arena {

        monsters: arena[]

        constructor() {
            this.monsters = require(pathTo('characters', 'arena.json'))
        }
    }

    class _dungeon {

        domain = new Array(10)
        level: ddd
        monsters: dungeon[]
        potions: vial[] = []

        crawling: choices = {
            'N': { description: 'orth' },
            'S': { description: 'outh' },
            'E': { description: 'ast' },
            'W': { description: 'est' },
            'C': { description: 'ast' },
            'P': { description: 'oison' },
            'Y': { description: 'our status' }
        }

        readonly potion = [
            'Potion of Cure Light Wounds',
            'Vial of Weakness',
            'Potion of Charm',
            'Vial of Stupidity',
            'Potion of Agility',
            'Vial of Clumsiness',
            'Potion of Wisdom',
            'Vile Vial',
            'Potion of Stamina',
            'Vial of Slaad Secretions',
            'Potion of Mana',
            'Flask of Fire Water',
            'Elixir of Restoration',
            'Vial of Crack',
            'Potion of Augment',
            'Beaker of Death'
        ]

        //  £
        readonly Cleric = {
            VT: '\x1B(0\x7D\x1B(B',
            PC: '\x9C',
            XT: '✟',
            dumb: '+'
        }

        //  ·
        readonly Dot = vt.Empty

        readonly Mask = ['   ', ' ѩ ', 'ѩ ѩ', 'ѩѩѩ', 'ѩӂѩ']
        readonly Monster = {
            door: ['   ', 'Mon', 'M+M', 'Mob', 'MOB'],
            telnet: ['   ', 'Mon', 'M+M', 'Mob', 'MOB']
        }

        //  ±
        readonly Teleport = {
            VT: '\x1B(0\x67\x1B(B',
            PC: '\xF1',
            XT: '↨',
            dumb: '%'
        }

        constructor() {
            this.monsters = require(pathTo('characters', 'dungeon.json'))
            //	make some magic brew & bottle it up . . .
            let containers = ['beaker filled with', 'bottle containing', 'flask of', 'vial holding']
            let v = 0
            while (containers.length) {
                let c = dice(containers.length) - 1
                let liquids = ['bubbling', 'clear', 'milky', 'sparkling']
                let colors = ['amber', 'sapphire', 'crimson', 'emerald', 'amethyst']
                let coded = [vt.yellow, vt.blue, vt.red, vt.green, vt.magenta]
                while (liquids.length) {
                    let l = dice(liquids.length) - 1
                    let i = dice(colors.length) - 1
                    this.potions.push({
                        potion: v++, identified: false
                        , image: 'potion/' + (containers[c].startsWith('beaker') ? 'beaker' : colors[i])
                        , description: vt.attr(vt.uline, containers[c], vt.nouline, ' a ', liquids[l], ' ', coded[i], colors[i])
                    })
                    liquids.splice(l, 1)
                    colors.splice(i, 1)
                    coded.splice(i, 1)
                }
                containers.splice(c, 1)
            }
        }
    }

    class _elemental {

        targets: target[]
        Bail: string = ''
        Brawl: string = ''
        Curse: string = ''
        Fight: string = ''
        Joust: string = ''
        Party: string = ''
        Resurrect: string = ''
        Rob: string = ''

        get cmd(): string {
            return this._cmd.length ? this._cmd.splice(0, 1).toString() : ''
        }

        set cmd(input: string) {
            this._cmd = this._cmd.concat(input)
        }

        private _cmd: string[] = []

        flush(cmd?: string) {
            this._cmd = []
            if (cmd) this.cmd = cmd
        }

        nme(venue: string) {
            this[venue] = ''
            this.targets.sort((n1, n2) => (n1[venue] < n2[venue] ? 1 : -1))
            for (let i in this.targets) {
                if (dice(this.targets[i][venue]) > 1) {
                    this[venue] = this.targets[i].player.id
                    break
                }
            }
        }

        orders(from: string) {
            vt.action(from.toLowerCase())
            $.from = from
            if (!$.access.bot) {
                vt.title(`${$.sysop.name} :: ${from}`)
                return
            }
            if (this._cmd.length) return

            //  queue up bot's new action(s) from this module
            switch (from) {
                case 'Arena':
                    if (dice($.player.poison) > 1 && $.player.toWC >= 0 && $.player.toWC < int($.player.poisons.length / 2) + 1)
                        this.cmd = 'p'
                    if ($.online.hp < $.player.hp || $.player.coin.value >= money($.player.level))
                        this.cmd = 'g'
                    if ($.joust) {
                        if (this.Joust) {
                            this.cmd = 'j'
                            return
                        }
                    }
                    if ($.arena) {
                        if (this.Fight) {
                            this.cmd = 'u'
                            let m = whole($.player.level / 2) + 1
                            m = whole($.player.level / m) + 1
                        }
                        else {
                            this.cmd = 'm'
                            if ($.player.level > 51 && $.online.weapon.wc > 37)
                                this.cmd = 'd'
                            else {
                                let mon = 0
                                for (mon = 0; mon < 12; mon++) {
                                    let monster = <active>{}
                                    monster.user = <user>{ id: '', handle: arena.monsters[mon].name, sex: 'I' }
                                    PC.reroll(monster.user, arena.monsters[mon].pc, arena.monsters[mon].level)
                                    monster.user.weapon = arena.monsters[mon].weapon
                                    monster.user.armor = arena.monsters[mon].armor
                                    PC.activate(monster)
                                    if (monster.user.level > ($.player.level + int($.player.melee / 2) + int($.player.backstab / 2)))
                                        break
                                }
                                this.cmd = mon.toString()
                            }
                        }
                    }
                    this.cmd = 'q'
                    break

                case 'Casino':
                    break

                case 'Library':
                    this.cmd = ['h', 'i'][dice(2) - 1]
                    this.cmd = ['c', 'm', 't', 'w'][dice(4) - 1]
                    this.cmd = 'q'
                    break

                case 'MainMenu':
                    this.refresh()
                    this.nme('Bail')
                    this.nme('Brawl')
                    this.nme('Curse')
                    this.nme('Fight')
                    this.nme('Joust')
                    this.nme('Party')
                    this.nme('Resurrect')
                    this.nme('Rob')

                    if (dice(77) > 1) {
                        this.cmd = 'y'
                        this.cmd = 'm'
                        if ($.access.roleplay) {
                            if ($.player.coin.value >= money($.player.level))
                                this.cmd = 's'
                            else if ($.timeleft > 4 && $.brawl && this.Brawl)
                                this.cmd = 't'
                            else if ($.joust && this.Joust)
                                this.cmd = 'a'
                            else if ($.arena && (this.Fight || dice(6) > 1))
                                this.cmd = 'a'
                            else if ($.party && (this.Party || dice(6) == 6)) {
                                this.Party = this.Party || 'M'
                                this.cmd = 'p'
                            }
                        }
                        else {
                            this.cmd = 'l'
                        }
                    }
                    //  look around
                    if (!this._cmd.length)
                        this.cmd = ['g', 'l', 'n', 'p', 'q', 'r', 't', 'u', 'x', 'z'][dice(10) - 1]
                    break

                case 'Party':
                    this.cmd = 'm'
                    if ($.party && this.Party) {
                        this.cmd = 'f'
                        return
                    }
                    this.cmd = 'q'
                    break

                case 'Square':
                    const rarity = whole(1000 / ($.player.steal + 1))
                    if ($.player.bank.value > 0) {
                        this.cmd = 'b'
                        this.cmd = 'w'
                        if ($.player.level > 1 && dice(rarity) == rarity) this.cmd = 'r'
                        this.cmd = 'q'
                    }
                    if ($.player.coin.value > 0) {
                        if ($.player.magic > 1 || $.player.magic >= $.player.poison) {
                            this.cmd = 'm'
                            if ($.player.poison) this.cmd = 'v'
                        }
                        else {
                            if ($.player.poison) this.cmd = 'v'
                            if ($.player.magic) this.cmd = 'm'
                        }
                        this.cmd = 's'
                        this.cmd = 'w'
                        this.cmd = 'a'
                        this.cmd = 'r'
                    }
                    else {
                        if (dice(rarity) == 1 || (!$.arena && !$.brawl && !$.joust && (!$.naval || !$.player.hull) && !$.party && dice($.player.steal) > 1))
                            this.cmd = 'p'
                    }
                    if ($.player.coin.value > 0) {
                        this.cmd = 'b'
                        this.cmd = 'd'
                        if ($.player.level > 1 && dice(rarity) == rarity) this.cmd = 'r'
                        this.cmd = 'q'
                    }
                    if ($.online.hp < $.player.hp) this.cmd = 'h'
                    if ($.arena || $.joust || ($.player.poison > 1 && $.player.toWC == 0))
                        this.cmd = 'g'
                    break

                case 'Tavern':
                    if ($.brawl && this.Brawl)
                        this.cmd = 'b'
                    else {
                        this.cmd = ['e', 't', 'y'][dice(3) - 1]
                        if ($.player.level > 66 && dice(10) == 1)
                            this.cmd = 's'
                        this.cmd = 'q'
                    }
                    break
            }
            if (!this._cmd.length) this.cmd = 'q'
        }

        refresh() {
            $.player.coward = false

            let lo = $.player.level - 3
            let hi = $.player.level +
                $.player.level < 15 ? $.player.melee
                : $.player.level < 30 ? dice(3) + $.player.melee
                    : $.player.level < 60 ? dice(6) + $.player.melee
                        : 30
            lo = lo < 1 ? 1 : lo
            hi = hi > 99 ? 99 : hi

            //  gather potential targets
            this.targets = []
            let rpc = <active>{ user: { id: '' } }
            const rs = db.query(`SELECT id FROM Players
            WHERE id != '${$.player.id}' AND id NOT GLOB '_*'
            AND gang != '${$.player.gang}'
            AND level BETWEEN ${lo} AND ${hi} AND xplevel > 0
            ORDER BY level`)

            //  evaluate targets for next actions
            for (let i in rs) {
                rpc.user.id = rs[i].id
                const online = !PC.load(rpc)
                if (!Access.name[rpc.user.access].roleplay) continue
                if (!db.lock(rpc.user.id)) continue

                this.targets = this.targets.concat({
                    player: rpc.user,
                    Bail: 0, Brawl: 0, Curse: 0, Fight: 0, Joust: 0, Party: 0, Resurrect: 0, Rob: 0
                })
                const n = this.targets.length - 1
                let target = this.targets[n]

                const diff = whole(hi - rpc.user.level) + 1
                const up = PC.experience($.player.level, 1, $.player.int)
                const need = whole(100 - 2 * int(100 * whole(up - $.player.xp) / up))

                if (rpc.user.status !== 'jail') {
                    if ($.joust && !(rpc.user.level > 1 && (rpc.user.jw + 3 * rpc.user.level) < rpc.user.jl)) {
                        const ability = PC.jousting($.online)
                        const versus = PC.jousting(rpc)
                        const factor = (100 - ($.player.level > rpc.user.level ? $.player.level : rpc.user.level)) / 10 + 3
                        if ((ability + factor * $.player.level) > versus)
                            target.Joust += diff + whole(ability - versus) * (100 - $.player.level)
                    }
                    if ($.brawl) {
                        target.Brawl += diff + $.player.melee
                    }
                    if ($.arena) {
                        if (!rpc.user.novice && !rpc.user.status)
                            target.Fight += diff + $.player.melee + $.player.backstab
                    }
                    if ($.party && rpc.user.gang && !rpc.user.status) {
                        let gang = PC.loadGang(rpc.user.gang)
                        if (need > 10 && need < 70) {
                            let sum = 0, size = 0
                            for (let i in gang.members) {
                                if (gang.validated[i]) {
                                    let nme: active = { user: { id: gang.members[i] } }
                                    if (PC.load(nme) && !nme.user.status) {
                                        sum += nme.user.xplevel
                                        size++
                                    }
                                }
                            }
                            if (sum && size) target.Party += 100 - int(sum / size) + int($.player.level / 3) + diff
                        }
                    }
                    if ($.rob) {
                        target.Rob += diff + $.player.steal
                    }
                }
                else {
                    if ($.bail) {
                        target.Bail = 3 + diff
                    }
                    if ($.rob) {
                        target.Rob += 2 * (diff + $.player.steal)
                    }
                }
            }
        }
    }

    export const arena = new _arena
    export const dungeon = new _dungeon
    export const elemental = new _elemental
}

export = npc
