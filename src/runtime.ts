/*****************************************************************************\
 *  Ɗaɳƙ Ɗoɱaiɳ: the return of Hack & Slash                                  *
 *  RUNTIME authored by: Robert Hurst <theflyingape@gmail.com>               *
\*****************************************************************************/

module runtime {
    //  player
    export let door: string[]
    export let from: string
    export let online: active = { user: { id: '' } }
    export let player: user = online.user
    export let reason: string = ''

    //  maintain usual suspects
    export let barkeep: active = { user: { id: '_BAR' } }
    export let dwarf: active = { user: { id: '_DM' } }
    export let neptune: active = { user: { id: '_NEP' } }
    export let seahag: active = { user: { id: '_OLD' } }
    export let taxman: active = { user: { id: '_TAX' } }
    export let witch: active = { user: { id: '_WOW' } }
    export let king: user = { id: '' }
    export let sysop: user = { id: '_SYS' }

    //  player runtime features
    export let access: access
    export let arena: number = 0
    export let argue: number = 0
    export let bail: number = 0
    export let brawl: number = 0
    export let dungeon: number = 0
    export let joust: number = 0
    export let jumped: number = 0
    export let naval: number = 0
    export let party: number = 0
    export let realestate: number = 0
    export let rob: number = 0
    export let security: number = 0
    export let sorceress: number = 0
    export let steal: number = 0
    export let taxboss: number = 0
    export let tiny: number = 0
    export let timeleft: number = 0
    export let warning: number = 2
    export let xrate: number = 1

    //  bot runtime features
    export let border: boolean = false

    //  global features
    export let callers: caller[] = []
    export let mydeeds: deed[]
    export let remote = process.env.REMOTEHOST || process.env.SSH_CLIENT || ''
    export let whereis: string
}

export = runtime
