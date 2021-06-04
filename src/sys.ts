/*****************************************************************************\
 *  Ɗaɳƙ Ɗoɱaiɳ: the return of Hack & Slash                                  *
 *  SYS authored by: Robert Hurst <theflyingape@gmail.com>                   *
\*****************************************************************************/

module sys {

    //  dependencies with nice aliases
    export const fs = require('fs')
    export const got = require('got')
    export const path = require('path')
    export const romanize = require('romanize')
    export const sprintf = require('sprintf-js').sprintf
    export const titlecase = require('title-case').titleCase

    //  runtime filesystem paths
    let PATH = process.cwd()
    while (!fs.existsSync(`${PATH}/etc`)) PATH = path.resolve(PATH, '..')

    export const NEWS = pathTo('files/tavern')
    if (!fs.existsSync(NEWS)) fs.mkdirSync(NEWS)

    export const LOG = pathTo('files/user')
    if (!fs.existsSync(LOG)) fs.mkdirSync(LOG)

    export const USERS = pathTo('users')

    export function an(item: string, show = true): string {
        return ' ' + (/a|e|i|o|u/i.test(item[0]) ? 'an' : 'a') + ' ' + (show ? item : '')
    }

    export function cuss(text: string): boolean {
        let words = titlecase(text).split(' ')

        for (let i in words) {
            if (words[i].match('/^Asshole$|^Cock$|^Cunt$|^Fck$|^Fu$|^Fuc$|^Fuck$|^Fuk$|^Phuc$|^Phuck$|^Phuk$|^Twat$/')) {
                //vt.reason = 'needs a timeout'
                return true
            }
        }
        return false
    }

    //  TODO: use locale
    const day: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const md: number[] = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    const mon: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    export function date2days(date: string): number {
        let days: number
        let month: number
        let day: number
        let year: number
        let pieces: string[]

        if (date.search('/') > 0) {
            pieces = date.split('/')
            month = whole(pieces[0])
            day = whole(pieces[1])
            year = whole(pieces[2])
        }
        else if (date.search('-') > 0) {
            pieces = date.split('-')
            month = whole(pieces[0])
            day = whole(pieces[1])
            if (day == 0) {
                day = month
                for (month = 0; month < 12 && mon[month].toLowerCase() == pieces[1].substr(0, 3).toLowerCase(); month++) { }
                month++
            }
            year = whole(pieces[2])
        }
        else if (whole(date) > 18991231) {
            year = whole(date.substr(0, 4))
            month = whole(date.substr(4, 2))
            day = whole(date.substr(6, 2))
        }
        else {
            month = whole(date.substr(0, 2))
            day = whole(date.substr(2, 2))
            year = whole(date.substr(4, 4))
        }

        month = (month < 1) ? 1 : (month > 12) ? 12 : month
        day = (day < 1) ? 1 : (day > 31) ? 31 : day
        year = (year < 100) ? year + 1900 : year

        if (isNaN(day) || isNaN(month) || isNaN(year))
            return NaN

        days = (year * 365) + int(year / 4) + md[month - 1] + (day - 1)
        if ((((year % 4) == 0) && (((year % 100) != 0) || ((year % 400) == 0))) && (month < 3))
            days--

        return days
    }

    //  returns 'Day dd-Mon-yyyy'
    export function date2full(days: number): string {
        let date = date2str(days)
        return sprintf('%.3s %.2s-%.3s-%.4s', day[(days - 1) % 7], date.substr(6, 2), mon[+date.substr(4, 2) - 1], date)
    }

    //  returns 'yyyymmdd'
    export function date2str(days: number): string {
        let month: number
        let day: number
        let year: number

        year = int(days / 1461) * 4 + int((days % 1461) / 365)
        days = days - ((year * 365) + int(year / 4)) + 1
        month = 0

        while (days > md[month + 1] - ((((year % 4) == 0) && (((year % 100) != 0) || ((year % 400) == 0))) && month == 0 ? 1 : 0) && month < 11)
            month++

        days -= md[month++]
        day = days
        if ((((year % 4) == 0) && (((year % 100) != 0) || ((year % 400) == 0))) && month < 3)
            day++

        return sprintf('%04d%02d%02d', year, month, day)
    }

    export function dice(faces: number): number {
        return int(Math.random() * whole(faces)) + 1
    }

    //  normalize as an integer
    export function int(n: any): number {
        n = (+n || 0).valueOf()
        n = Math.trunc(n)   //  strip any fractional part
        if (n == 0) n = 0   //  strip any negative sign (really)
        return n
    }

    export function isActive(arg: any): arg is active {
        return (<active>arg).user !== undefined
    }

    export function money(level: number): number {
        return int(Math.pow(2, (level - 1) / 2) * 10 * (101 - level) / 100)
    }

    export function now(): { date: number, time: number } {
        const today = date2days(new Date().toLocaleString('en-US').split(',')[0])
        const now = new Date().toTimeString().slice(0, 5).replace(/:/g, '')
        return { date: +today, time: +now }
    }

    export function pathTo(folder = '', file = ''): string {
        return path.resolve(PATH, folder, file)
    }

    //  non-negative integer
    export function whole(n: string | number): number {
        const i = int(n)
        return (i < 0) ? 0 : i
    }
}

export = sys
