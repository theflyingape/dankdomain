/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  ELEMENTAL authored by: Robert Hurst <theflyingape@gmail.com>             *
\*****************************************************************************/

module Elemental {
  class coins {
    constructor(money: string | number) {
      if (typeof money == 'number') {
        this.value = money
      }
      else {
        this.amount = money
      }
    }

    _value: number

    get value(): number {
      return this._value
    }

    set value(newValue: number) {
      const MAX = (1e+18 - 1e+09)
      this._value = newValue < 0 ? 0 : newValue < MAX ? newValue
        : newValue == Infinity ? 1 : MAX
    }

    set amount(newAmount: string) {
      this.value = 0
      let coins = 0

      for (var i = 0; i < newAmount.length; i++) {
        let c = newAmount.charAt(i)
        switch (c) {
          case 'c':
            coins *= 1
            break
          case 's':
            coins *= 1e+05
            break
          case 'g':
            coins *= 1e+09
            break
          case 'p':
            coins *= 1e+13
            break
        }
        if (c >= '0' && c <= '9') {
          coins *= 10
          coins += +c
        }
        else {
          this.value += coins
          coins = 0
        }
      }
    }
  }

  let id = process.argv.length > 2 ? process.argv[2] : ''
  let bot: active = { user: { id: id } }
  let nme: active
  let menu = ''

  //  game/sysop database interfaces
  const DD = '../users/dankdomain.sql'
  let better = require('better-sqlite3')
  let sqlite3 = new better(DD)
  login()

  function login() {
    let sql = `SELECT * FROM Players WHERE id = '${bot.user.id}'`
    let rs = query(sql)
    if (rs.length) {
      Object.assign(bot.user, rs[0])
      bot.user.coin = new coins(rs[0].coin)
      bot.user.bank = new coins(rs[0].bank)
      bot.user.loan = new coins(rs[0].loan)
      bot.user.bounty = new coins(rs[0].bounty)

      bot.user.keyhints = rs[0].keyhints.split(',')

      bot.user.poisons = []
      if (rs[0].poisons.length)
        bot.user.poisons = rs[0].poisons.split(',')

      bot.user.spells = []
      if (rs[0].spells.length)
        bot.user.spells = rs[0].spells.split(',')

      bot.user.rings = []
      if (rs[0].rings.length)
        bot.user.rings = rs[0].rings.split(',')
    }
    else {
      console.log(`Player ID '${id}' not found`)
      process.exit(1)
    }
  }

  function query(q: string, errOk = false, ...params): any {
    try {
      let cmd = sqlite3.prepare(q)
      return cmd.all(...params)
    }
    catch (err) {
      if (!errOk) {
        console.log('?Unexpected error: ', String(err))
        console.log(q)
      }
      return []
    }
  }
}

export = Elemental
