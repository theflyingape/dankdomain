/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  ITEM authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/

import $ = require('./common')
import xvt = require('xvt')

module Items
{

export class Access {

    name: access[]

    constructor () {
        this.name = require('./items/access.json')
    }
}

/*
if(ARMOR(rpc)->Class == ARMOR(enemy)->Class || rpc->user.ACmod != 0 || rpc->armor_origin || enemy->armor_origin) {
    if(rpc == ONLINE) {
        sprintf(prompt, "%sDo you want %s %s (Y/N)? ", fore(CYN), enemy->his, ARMOR(enemy)->Name);
        OUT(prompt);
        while(!strchr("YN", (c = inkey('N', 'N'))))
            RUBOUT;
        NL;
        flag = (c == 'Y');
    }
    else {
        if((ARMOR(rpc)->Class + rpc->user.ACmod) < ARMOR(enemy)->Class + enemy->user.ACmod / 2)
            flag = TRUE;
    }
}
else
    flag = TRUE;
if(flag) {
    sprintf(line[numline++],"%s also took %s %s.",(rpc==ONLINE ? "and" : "You"),(rpc==ONLINE ? "your" : PLAYER.Gender=='M' ? "his" : PLAYER.Gender=='F' ? "her" : "its"),ARMOR(enemy)->Name);
    sprintf(outbuf,"%s take%s %s %s.",rpc->He,(rpc!=ONLINE ? "s" : ""),enemy->his,ARMOR(enemy)->Name);
    OUT(outbuf);NL;
}
if((from=='A' || from=='M' || from=='S') && rpc==ONLINE && !strlen(enemy->user.ID)) {
    d=value(ARMOR(enemy)->Value,rpc->CHA);
    if(enemy->user.ACmod!=0)
        modf(d*(ARMOR(enemy)->Class+enemy->user.ACmod)/ARMOR(enemy)->Class,&d);
    if(enemy->ToAC<0)
        modf(d*(ARMOR(enemy)->Class+enemy->ToAC)/ARMOR(enemy)->Class,&d);
    if(enemy->armor_origin==0 && enemy->armor_type==0)
        d=0.;
    if(d>0.) {
        PLAYER.Gold+=d;
        sprintf(outbuf,"You get %s for selling its %s",money(d,ANSI),ARMOR(enemy)->Name);
        OUT(outbuf);
        if(enemy->user.ACmod || enemy->ToAC) {
            sprintf(outbuf," %s(%s%+d%s,%s%+d%s)",fore(MAG),fore(enemy->user.ACmod>0 ? YELLOW : enemy->user.ACmod<0 ? BRED : GRY),enemy->user.ACmod,fore(GRY),fore(enemy->ToAC>0 ? YELLOW : enemy->ToAC<0 ? BRED : GRY),enemy->ToAC,fore(MAG));
            OUT(outbuf);
            NORMAL;
        }
        OUT(".");NL;
    }
}
*/

export class Armor {

    name: armor[]
    gift: string[] = []
    merchant: string[] = []
    special: string[] = []

    constructor () {
        this.name = require('./items/armor.json')
        for (let i in this.name) {
            if (this.name[i].armoury)
                this.merchant.push(i)
            else if (this.name[i].gift)
                this.gift.push(i)
            else
                this.special.push(i)
        }
    }

    baseAC(name: string|number): number {
        let ac = 0
        if (typeof this.name[name] === 'undefined')
            ac = Math.abs(+name)
        else
            ac = this.name[name].ac
        return ac
    }

    buffAC(rpc: active): number {
        let ac = this.baseAC(rpc.user.armor) + rpc.toAC + rpc.user.toAC
        return ac
    }

    equip(rpc: active, what: string|number, worth?: string) {
        let armor: armor

        if (isNaN(+what)) {
            rpc.user.armor = what
            armor = this.name[what]
            if (worth) armor.value = worth
        }
        else {
            rpc.user.armor = +what
            armor = <armor>{ ac:what, value:worth ? worth : '0c' }
        }
        rpc.user.toAC = 0
        rpc.armor = armor
        rpc.toAC = 0
        rpc.altered = true
    }

    swap(winner: active, loser: active, sell = true): boolean {
        // real item?
        if (!isNaN(+winner.user.armor) || !isNaN(+loser.user.armor))
            return false

        // is common armor better?
        if (winner.armor.armoury && loser.armor.armoury && winner.user.toAC >= 0 && winner.armor.ac > loser.armor.ac) {
            return false
        }

        //  swap
        [winner.armor, loser.armor] = [loser.armor, winner.armor];
        [winner.user.armor, loser.user.armor] = [loser.user.armor, winner.user.armor];
        [winner.user.toAC, loser.user.toAC] = [loser.user.toAC, winner.user.toAC]
        winner.toAC = 0
        if (winner.user.toAC > 0)
            winner.user.toAC >>= 1
        loser.toAC = 0
        if (loser.user.toAC > 0)
            loser.user.toAC >>= 1
        winner.altered = true
        loser.altered = true

        //sprintf(line[numline++],"%s also took %s %s.",(rpc==ONLINE ? "and" : "You"),(rpc==ONLINE ? "your" : PLAYER.Gender=='M' ? "his" : PLAYER.Gender=='F' ? "her" : "its"),ARMOR(enemy)->Name);
        return true
    }

    wearing(rpc: active, text = true): string {
        let result = ''
        if (isNaN(+rpc.user.armor)) {
            if (text) result = rpc.armor.text + ' '
            result = result + rpc.user.armor
        }
        return result
    }
}

export class Magic {

    spells: spell[]
    merchant: string[] = []
    special: string[] = []

    constructor () {
        this.spells = require('./items/magic.json')
        for (let i in this.spells) {
            if (this.spells[i].cost)
                this.merchant.push(i)
            else
                this.special.push(i)
        }
    }

    ability(spell: string, rpc: active, nme?: active): { fail:number, backfire:number } {
        let fail: number
        let backfire: number

        fail = rpc.int + Math.trunc(rpc.user.level / 10) - (this.spells[spell].cast < 17 ? this.spells[spell].cast : this.spells[spell].cast - 10)
        if (xvt.validator.isDefined(nme) && [ 9,11,14,15,16,19,20,21,22 ].indexOf(this.spells[spell].cast) >= 0)
            fail += rpc.int - nme.int
        fail = (fail < 5) ? 5 : (fail > 99) ? 99 : fail
        backfire = 50 + (fail>>1)
        return { fail, backfire }
    }

    add(spells: number[], n: number|string) {
        let m = +n
        if (isNaN(m)) {
            for (let i in this.spells) {
                if (n === i) {
                    n = this.spells[i].cast
                    break
                }
            }
        }
        if (+n) {
            if (!this.have(spells, n)) {
                spells.push(+n)
                spells.sort((n1,n2) => n1 - n2)
            }
        }
    }

    have(spells: number[], n: number|string): boolean {
        let have = false
        if (typeof n === 'number' && spells.indexOf(n) >= 0)
            have = true
        else {
            for (let i = 0; i < spells.length; i++) {
                if (n === this.pick(spells[i])) {
                    have = true
                    break
                }
            }
        }
        return have
    }

    pick(n: number): string {
        let name = ''
        if (n > 0 && n <= Object.keys(this.spells).length)
            for (let key in this.spells)
                if (n == this.spells[key].cast) {
                    name = key
                    break
                }
        return name
    }

    remove(spells: number[], n:number) {
        let i = spells.indexOf(n)
        if (i >= 0) spells.splice(i, 1)
    }
}

export class Poison {

    vials: poison[]
    merchant: string[] = []

    constructor () {
        this.vials = require('./items/poison.json')
        for (let i in this.vials) {
            if (this.vials[i].cost)
                this.merchant.push(i)
        }
    }

    add(vials: number[], n:number) {
        n = +n
        if (!this.have(vials, n)) {
            vials.push(n)
            vials.sort((n1,n2) => n1 - n2)
        }
    }

    have(vials: number[], n: number|string): boolean {
        let have = false
        if (typeof n === 'number' && vials.indexOf(n) >= 0)
            have = true
        else {
            for (let i = 0; i < vials.length; i++) {
                if (n === this.pick(vials[i])) {
                    have = true
                    break
                }
            }
        }
        return have
    }

    pick(n: number): string {
        let name = ''
        if (n > 0 && n <= Object.keys(this.vials).length)
            for (let key in this.vials)
                if (n == this.vials[key].power) {
                    name = key
                    break
                }
        return name
    }

    remove(vials: number[], n:number) {
        let i = vials.indexOf(n)
        if (i >= 0) vials.splice(i, 1)
    }
}

/*
if(WEAPON(rpc)->Class == WEAPON(enemy)->Class || rpc->user.WCmod != 0 || rpc->weapon_origin || enemy->weapon_origin) {
    if(rpc == ONLINE) {
        sprintf(prompt, "%sDo you want %s %s (Y/N)? ", fore(CYN), enemy->his, WEAPON(enemy)->Name);
        OUT(prompt);
        while(!strchr("YN", (c = inkey('N', 'N'))))
            RUBOUT;
        NL;
        flag = (c == 'Y');
    }
    else {
        if((WEAPON(rpc)->Class + rpc->user.WCmod) < WEAPON(enemy)->Class + enemy->user.WCmod / 2)
            flag = TRUE;
        else {
            d = value(WEAPON(rpc)->Value, rpc->CHA);
            if(rpc->user.WCmod)
                modf(d * (WEAPON(rpc)->Class + rpc->user.WCmod / (rpc->user.MyPoison + 1)) / WEAPON(rpc)->Class, &d);
            if(d < value(WEAPON(enemy)->Value, rpc->CHA))
                flag = TRUE;
        }
    }
}
else
    flag = TRUE;
if(flag) {
    sprintf(line[numline++],"%s also took %s %s.",(rpc==ONLINE ? "and" : "You"),(rpc==ONLINE ? "your" : PLAYER.Gender=='M' ? "his" : PLAYER.Gender=='F' ? "her" : "its"),WEAPON(enemy)->Name);
    sprintf(outbuf,"%s take%s %s %s%s.",rpc->He,(rpc!=ONLINE ? "s" : ""),enemy->his,(enemy->user.Gender=='I' && enemy->user.WCmod>0 ? "super " : ""),WEAPON(enemy)->Name);
    OUT(outbuf);NL;
}
if((from=='A' || from=='M' || from=='S') && rpc==ONLINE && !strlen(enemy->user.ID)) {
    d=value(WEAPON(enemy)->Value,rpc->CHA);
    if(enemy->user.WCmod!=0)
        modf(d*(WEAPON(enemy)->Class+enemy->user.WCmod)/WEAPON(enemy)->Class,&d);
    if(enemy->ToWC<0)
        modf(d*(WEAPON(enemy)->Class+enemy->ToWC)/WEAPON(enemy)->Class,&d);
    if(enemy->weapon_origin==0 && enemy->weapon_type==0)
        d=0.;
    if(d>0.) {
        PLAYER.Gold+=d;
        sprintf(outbuf,"You get %s for selling its %s",money(d,ANSI),WEAPON(enemy)->Name);
        OUT(outbuf);
        if(enemy->user.WCmod || enemy->ToWC) {
            sprintf(outbuf," %s(%s%+d%s,%s%+d%s)",fore(MAG),fore(enemy->user.WCmod>0 ? YELLOW : enemy->user.WCmod<0 ? BRED : GRY),enemy->user.WCmod,fore(GRY),fore(enemy->ToWC>0 ? YELLOW : enemy->ToWC<0 ? BRED : GRY),enemy->ToWC,fore(MAG));
            OUT(outbuf);
            NORMAL;
        }
        OUT(".");NL;
    }
}
*/
export class Weapon {
    name: weapon[]
    gift: string[] = []
    merchant: string[] = []
    special: string[] = []

    constructor () {
        this.name = require('./items/weapon.json')
        for (let i in this.name) {
            if (this.name[i].shoppe)
                this.merchant.push(i)
            else if (this.name[i].gift)
                this.gift.push(i)
            else
                this.special.push(i)
        }
    }

    baseWC(name: string|number): number {
        let wc = 0
        if (typeof this.name[name] === 'undefined')
            wc = Math.abs(+name)
        else
            wc = this.name[name].wc
        return wc
    }

    buffWC(rpc: active): number {
        let wc = this.baseWC(rpc.user.weapon) + rpc.toWC + rpc.user.toWC
        return wc
    }

    equip(rpc: active, what: string|number, worth?: string) {
        let weapon: weapon

        if (isNaN(+what)) {
            rpc.user.weapon = what
            weapon = this.name[what]
            if (worth) weapon.value = worth
        }
        else {
            rpc.user.weapon = +what
            weapon = <weapon>{ wc:what, value:worth ? worth : '0c', hit:'hit', stab:'stab', smash:'smash', plunge:'plunge' }
        }

        rpc.user.toWC = 0
        rpc.weapon = weapon
        rpc.toWC = 0
        rpc.altered = true
    }

    swap(winner: active, loser: active, sell = true): boolean {
        // real item?
        if (!isNaN(+winner.user.weapon) || !isNaN(+loser.user.weapon))
            return false

        // is common weapon better?
        if (winner.weapon.shoppe && loser.weapon.shoppe && winner.user.toAC >= 0 && winner.weapon.wc > loser.weapon.wc) {
            return false
        }

        //  swap
        [winner.weapon, loser.weapon] = [loser.weapon, winner.weapon];
        [winner.user.weapon, loser.user.weapon] = [loser.user.weapon, winner.user.weapon];
        [winner.user.toWC, loser.user.toWC] = [loser.user.toWC, winner.user.toWC];
        winner.toWC = 0
        if (winner.user.toWC > 0)
            winner.user.toWC >>= 1
        loser.toWC = 0
        if (loser.user.toWC > 0)
            loser.user.toWC >>= 1
        winner.altered = true
        loser.altered = true

        //sprintf(line[numline++],"%s also took %s %s.",(rpc==ONLINE ? "and" : "You"),(rpc==ONLINE ? "your" : PLAYER.Gender=='M' ? "his" : PLAYER.Gender=='F' ? "her" : "its"),WEAPON(enemy)->Name);
        return true
    }

    wearing(rpc: active, text = true): string {
        let result = ''
        if (isNaN(+rpc.user.weapon)) {
            if (text) result = rpc.weapon.text + ' '
            result = result + rpc.user.weapon
        }
        return result
    }
}

export class RealEstate {

    name: realestate[]
    merchant: string[] = []

    constructor () {
        this.name = require('./items/realestate.json')
        for (let i in this.name)
            this.merchant.push(i)
    }
}

export class Security {

    name: security[]
    merchant: string[] = []

    constructor () {
        this.name = require('./items/security.json')
        for (let i in this.name)
            this.merchant.push(i)
    }
}

}

export = Items
