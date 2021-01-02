/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  SYS authored by: Robert Hurst <theflyingape@gmail.com>                   *
\*****************************************************************************/

module sys {

    const day: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const md: number[] = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    const mon: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    //  dependencies
    export const got = require('got')
    export const romanize = require('romanize')
    export const sprintf = require('sprintf-js').sprintf
    export const titlecase = require('title-case').titleCase

    export function an(item: string, show = true) {
        return ' ' + (/a|e|i|o|u/i.test(item[0]) ? 'an' : 'a') + ' ' + (show ? item : '')
    }

    export function date2days(date: string): number {
        var days: number
        var month: number
        var day: number
        var year: number


        if (date.search('/') > 0) {
            let pieces = date.split('/')
            month = +pieces[0]
            day = +pieces[1]
            year = +pieces[2]
        }
        else if (date.search('-') > 0) {
            let pieces = date.split('/')
            month = +pieces[0]
            day = +pieces[1]
            if (day == 0) {
                day = month
                for (month = 0; month < 12 && mon[month].toLowerCase() == pieces[1].substr(0, 3).toLowerCase(); month++) { }
                month++
            }
            year = +pieces[2]
        }
        else if (+date > 18991231) {
            year = +date.substr(0, 4)
            month = +date.substr(4, 2)
            day = +date.substr(6, 2)
        }
        else {
            month = +date.substr(0, 2)
            day = +date.substr(2, 2)
            year = +date.substr(4, 4)
        }

        month = (month < 1) ? 1 : (month > 12) ? 12 : month
        day = (day < 1) ? 1 : (day > 31) ? 31 : day
        year = (year < 100) ? year + 1900 : year

        if (isNaN(day) || isNaN(month) || isNaN(year))
            return NaN

        days = (year * 365) + Math.trunc(year / 4) + md[month - 1] + (day - 1)
        if ((((year % 4) == 0) && (((year % 100) != 0) || ((year % 400) == 0))) && (month < 3))
            days--

        return days
    }

    //  returns 'Day dd-Mon-yyyy'
    export function date2full(days: number): string {
        var date = date2str(days)
        return sprintf('%.3s %.2s-%.3s-%.4s', day[(days - 1) % 7], date.substr(6, 2), mon[+date.substr(4, 2) - 1], date)
    }

    //  returns 'yyyymmdd'
    export function date2str(days: number): string {
        var month: number
        var day: number
        var year: number

        year = Math.trunc(days / 1461) * 4 + Math.trunc((days % 1461) / 365)
        days = days - ((year * 365) + Math.trunc(year / 4)) + 1
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
        return int(Math.random() * int(faces, true)) + 1
    }

    //  normalize as an integer, optional as a whole number (non-negative)
    export function int(n: string | number, whole = false): number {
        n = (+n).valueOf()
        if (isNaN(n)) n = 0
        n = Math.trunc(n)   //  strip any fractional part
        if (n == 0) n = 0   //  strip any negative sign (really)
        return (whole && n < 0) ? 0 : n
    }

    export function isActive(arg: any): arg is active {
        return (<active>arg).user !== undefined
    }

    export function money(level: number): number {
        return int(Math.pow(2, (level - 1) / 2) * 10 * (101 - level) / 100)
    }

    export function now(): { date: number, time: number } {
        let today = date2days(new Date().toLocaleString('en-US').split(',')[0])
        let now = new Date().toTimeString().slice(0, 5).replace(/:/g, '')
        return { date: +today, time: +now }
    }

    export function time(t: number): string {
        const ap = t < 1200 ? 'am' : 'pm'
        const m = t % 100
        const h = int((t < 100 ? t + 1200 : t >= 1300 ? t - 1200 : t) / 100)
        return sprintf('%u:%02u%s', h, m, ap)
    }

    export function worth(n: number, p: number): number {
        return int(n * p / 100)
    }
}

export = sys
