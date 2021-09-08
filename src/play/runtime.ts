/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  RUNTIME authored by: Robert Hurst <theflyingape@gmail.com>               *
\*****************************************************************************/

import { fs, now, pathTo } from '../sys'

module runtime {
    //  system operator
    export let sysop: sysop = Object.assign({}, JSON.parse(fs.readFileSync(pathTo('etc', 'sysop.json'))))
    export let game: game
    export let ruler: user

    //  player
    export let door: string[]
    export let from: string
    export let online: active = { user: { id: '' } }
    export let player: user = online.user
    export let reason: string = ''

    //  maintain usual suspects
    export let barkeep: active
    export let dwarf: active
    export let neptune: active
    export let seahag: active
    export let taxman: active
    export let witch: active

    //  player runtime features
    export let access: access
    export let arena: number
    export let argue: number
    export let bail: number
    export let border: boolean
    export let brawl: number
    export let dungeon: number
    export let joust: number
    export let jumped: number
    export let naval: number
    export let party: number
    export let realestate: number
    export let rob: number
    export let security: number
    export let sorceress: number
    export let steal: number
    export let taxboss: number
    export let tiny: number
    export let timeleft: number
    export let warning: number
    export let xrate: number

    //  global features
    export let callers: caller[] = []
    export let mydeeds: deed[]
    export let remote = process.env.REMOTEHOST || process.env.SSH_CLIENT || ''
    export let whereis: string

    Object.assign(runtime, JSON.parse(fs.readFileSync(pathTo('play', 'runtime.json'))))
    savegame()

    export function savegame(update = false) {
        const gamesave = pathTo('users', 'game.json')
        if (update) {
            fs.writeFileSync(gamesave, JSON.stringify(game, null, 2))
        }
        else {
            try {
                game = Object.assign({}, JSON.parse(fs.readFileSync(gamesave)))
            }
            catch (err) {
                console.info('New game install -- greetings')
                console.info('Shall we play a game?')
                game = {
                    created: now().date, calls: 0,
                    started: now().date, winner: 'nobody', plays: 0,
                    lastdate: now().date, lasttime: now().time, today: 0
                }
                savegame(true)
            }
        }
    }
}

export = runtime
