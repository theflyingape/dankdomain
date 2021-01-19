/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  PATH authored by: Robert Hurst <theflyingape@gmail.com>                    *
\*****************************************************************************/

import fs = require('fs')
import path = require('path')

let PATH = process.cwd()
while (!fs.existsSync(`${PATH}/etc`)) PATH = path.resolve(PATH, '..')

export default function pathTo(folder = '', file = ''): string {
    return path.resolve(PATH, folder, file)
}
