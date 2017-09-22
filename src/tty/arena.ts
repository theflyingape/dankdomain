/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  ARENA authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import {sprintf} from 'sprintf-js'

import $ = require('../common')
import db = require('../database')
import xvt = require('xvt')
import Battle = require('../battle')

module Arena
{
/*	let monsters: monster[] = [
		{ name:'Kobold', level:1, pc:'Lizard', weapon:'Dagger', armor:'Wooden Shield', money:'5c' },
		{ name:'Orc', level:3, pc:'Beast', weapon:'Staff', armor:'Wooden Shield', money:'50c' },
		{ name:'Ogre', level:5, pc:'Beast', weapon:'Club', armor:'Large Shield', money:'100c' },
		{ name:'Gnoll', level:7, pc:'Beast', weapon:'Mace', armor:'Leather', money:'500c' },
		{ name:'Troglodyte', level:9, pc:'Beast', weapon:'Spear', armor:'Padded Leather', money:'1000c' },
		{ name:'Gargoyle', level:12, pc:'Demon', weapon:'Axe', armor:-6, money:'10000c',
			spells: [ 'Teleport' ] },
		{ name:'Troll', level:23, pc:'Beast', weapon:'Heavy Crossbow', armor:-12, money:'1s',
			spells:[ 'Heal' ] },
		{ name:'Hydra', 'level':34, pc:'Dragon', weapon:-25, armor:'Dragon Scale Mail', money:'1000s',
			spells: [ 'Heal', 'Teleport', 'Blast' ] },
		{ name:'Nycadaemon', level:41, pc:'Demon', weapon:'Staff of Striking', armor:-18, money:'10g',
			spells: [ 'Heal', 'Teleport', 'Blast' ] },
		{ name:'Red Dragon', level:44, pc:'Dragon', weapon:-32, armor:-20, money:'500g',
			spells: [ 'Heal', 'Teleport', 'Blast' ] },
		{ name:'Lich', level:47, pc:'Undead', weapon:-35, armor:-23, money:'2500g',
			spells: [ 'Heal', 'Teleport', 'Blast' ] },
		{ name:'Beholder', level:50, pc:'Beast', weapon:-40, armor:-25, money:'1p',
			spells: [ 'Heal', 'Teleport', 'Blast' ] },
		{ name:'Demogorgon', level:99, pc:'Beast', weapon:'Staff of the Magi', armor:-25, money:'1000p',
			spells: [ 'Heal', 'Teleport', 'Blast', 'Confusion', 'Transmute', 'Cure', 'Illusion', 'Disintegrate' ] }
	]
*/
	let monsters: monster[] = require('../etc/arena.json')
	let arena: choices = {
		'U': { description:'User fights' },
		'M': { description:'Monster fights' },
		'J': { description:'Joust users' },
		'C': { description:'Cast a spell' },
		'P': { description:'Poison your weapon' },
		'G': { description:'Goto the square' },
		'Y': { description:'Your status' }
	}

export function menu(suppress = false) {
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('arena', xvt.Red, xvt.red, suppress, arena)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = true
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(arena[choice]))
        if (xvt.validator.isNotEmpty(arena[choice].description)) xvt.out(' - ', arena[choice].description, '\n')

    switch (choice) {
		case 'C':
			if ($.reason) break
			Battle.cast($.online, menu)
			return

		case 'G':
            require('./square').menu($.player.expert)
            return

		case 'J':
			if (!$.joust) {
				xvt.out('\nYou have run out of jousts.\n')
				break
			}
			Battle.user('Joust', (opponent: active) => {
				if (opponent.user.id === '') {
					menu(!$.player.expert)
					return
				}
				if (opponent.user.id === $.player.id) {
					opponent.user.id = ''
					xvt.out('You can\'t joust a wimp like ', $.who(opponent.user, true, false, false), '.\n')
					menu(true)
					return
				}
				if ($.player.level - opponent.user.level > 3) {
					xvt.out('You can only joust someone higher or up to three levels below you.\n')
					menu(true)
					return
				}

				let ability = $.online.dex * $.player.level / 10 + 2 * $.player.jw - $.player.jl + 10
				let versus = opponent.dex * opponent.user.level / 10 + 2 * opponent.user.jw - opponent.user.jl + 10
				let factor = (100 - ($.player.level > opponent.user.level ? $.player.level : opponent.user.level)) / 10 + 3
				let jw = 0
				let jl = 0
				let pass = 0

				if (!$.Access.name[opponent.user.access].roleplay || versus < 1 || opponent.user.level
 > 1 && (opponent.user.jw + 3 * opponent.user.level) < opponent.user.jl) {
					xvt.out('That knight is out practicing right now.\n')
					menu(true)
					return
				}

				xvt.out('\nJousting ability:\n\n', xvt.bright)
				xvt.out(xvt.green, sprintf('%-25s', opponent.user.handle), xvt.white, sprintf('%4d', versus), '\n')
				xvt.out(xvt.green, sprintf('%-25s', $.player.handle), xvt.white, sprintf('%4d', ability), '\n')
				xvt.out(xvt.reset, '\n')
				if((ability + factor * $.player.level) < (versus + 1)) {
					xvt.out(opponent.user.handle, ' laughs rudely in your face!\n\n')
					menu(true)
					return
				}

				xvt.app.form = {
					'compete': { cb:() => {
						xvt.out('\n')
						if (/Y/i.test(xvt.entry)) {
							$.joust--
							$.online.altered = true
							xvt.out('\nThe trumpets blare! You and your opponent ride into the arena. The crowd roars!\n')
							round()
							xvt.app.focus = 'joust'
							return
						}
						menu(true)
						return
					}, prompt:'Are you sure (Y/N)? ', enter:'N', eol:false, match:/Y|N/i },
					'joust': { cb:() => {
						if (/F/i.test(xvt.entry)) {
							xvt.out('\n\nThe crowd throws rocks at you as you ride out of the arena.\n')
							$.player.jl++
							opponent.user.jw++
							db.saveUser(opponent)
							menu(true)
							return
						}
						if (/J/i.test(xvt.entry)) {
							xvt.out('\n\nYou spur the horse.  The tension mounts.\n')
							xvt.waste(250)
							let result = 0
							while(!result)
								result = (ability + $.dice(factor * $.player.level)) - (versus + $.dice(factor * opponent.user.level))
							if(result > 0) {
								xvt.out(xvt.green, '-*>', xvt.bright, xvt.white, ' Thud! ', xvt.nobright, xvt.green,'<*-  ', xvt.reset, 'A hit!  You win this pass!\n')
								if (++jw == 3) {
									xvt.out('\nYou have won the joust!\n')
									xvt.waste(250)
									xvt.out('The crowd cheers!\n')
									xvt.waste(250)
									let reward = new $.coins($.money(opponent.user.level))
									xvt.out('You win ', reward.carry(), '!\n')
									$.player.coin.value += reward.value
									$.player.jw++
									opponent.user.jl++
									db.saveUser(opponent)
									menu(true)
									return
								}
							}
							else {
								xvt.out(xvt.magenta, '^>', xvt.bright, xvt.white, ' Oof! ', xvt.nobright, xvt.magenta,'<^  ', xvt.reset, $.who(opponent.user, true, true, false), 'hits!  You lose this pass!\n')
								if (++jl == 3) {
									xvt.out('\nYou have lost the joust!\n')
									xvt.waste(250)
									xvt.out('The crowd boos you!\n')
									xvt.waste(250)
									let reward = new $.coins($.money($.player.level))
									xvt.out(opponent.user.handle, ' spits on your face.\n')
									$.player.jl++
									opponent.user.coin.value += reward.value
									opponent.user.jw++
									db.saveUser(opponent)
									menu(true)
									return
								}
							}
							round()
						}
						xvt.app.refocus()
					}, prompt:xvt.attr('        ', $.bracket('J', false), xvt.bright, xvt.yellow, ' Joust', xvt.nobright, xvt.magenta, ' * ', $.bracket('F', false), xvt.bright, xvt.yellow, ' Forfeit: '), cancel:'F', enter:'J', eol:false, match:/F|J/i }
				}
				xvt.out('You grab a horse and prepare yourself to joust.\n')
				xvt.app.focus = 'compete'

				function round() {
					xvt.out('\n', xvt.green, '--=:)) Round ', ['I', 'II', 'III', 'IV', 'V'][pass++], ' of V: Won:', xvt.bright, xvt.white, jw.toString(), xvt.nobright, xvt.magenta, ' ^', xvt.green, ' Lost:', xvt.bright, xvt.white, jl.toString(), xvt.nobright, xvt.green, ' ((:=--')
				}
			})
			return

		case 'M':
			if (!$.arena) {
				xvt.out('\nYou have no more arena fights.\n')
				break
			}
			xvt.app.form = {
				pick: { cb: () => {
					MonsterFights()
					menu(suppress)
				}, min:1, max:2 }
			}
			xvt.app.form['pick'].prompt = 'Fight what monster (1-' + monsters.length 
				+ ', ' + $.bracket('D', false) + 'emon)? '
			xvt.app.focus = 'pick'
			return

		case 'P':
			if ($.reason) break
			Battle.poison($.online, menu)
			return

        case 'Q':
			require('./main').menu($.player.expert)
			return

		case 'U':
			if (!$.arena) {
				xvt.out('\nYou have no more arena fights.\n')
				break
			}
			Battle.user('Fight', (opponent: active) => {
				if (opponent.user.id === '') {
					menu(!$.player.expert)
					return
				}
				if (opponent.user.id === $.player.id) {
					opponent.user.id = ''
					xvt.out('You can\'t fight a wimp like ', $.who(opponent.user, true, false, false), '.\n')
					menu(true)
					return
				}
				if ($.player.level - opponent.user.level > 3) {
					xvt.out('You can only fight someone higher or up to three levels below you.\n')
					menu(true)
					return
				}
				Battle.engage($.online[0], opponent[0], () => {})
			})
			break

		case 'Y':
			Battle.yourstats()
			break

		default:
			xvt.beep()
    	    suppress = false
	}
	menu(suppress)
}

function MonsterFights() {

	let cost: $.coins
	let monster: active
	let n: number
	xvt.out(xvt.reset, '\n\n')

	if (/D/i.test(xvt.entry)) {
		if ($.player.level < 50) {
			xvt.out('You are not powerful enough to fight demons yet.  Go fight some monsters.\n')
			return
		}

		cost = new $.coins(new $.coins($.money($.player.level)).carry(1, true))

		xvt.out('The ancient necromancer will summon you a demon for ', cost.carry(), '\n\n')
		if ($.player.coin.value < cost.value) {
			xvt.out('You don\'t have enough!\n')
			return
		}

		xvt.app.form = {
			'pay': { cb:() => {
				xvt.out('\n')
				if (/Y/i.test(xvt.entry)) {
					$.player.coin.value -= cost.value
					$.online.altered = true
					xvt.out('As you hand him the money, it disappears into thin air.\n\n')
					xvt.waste(500)
					xvt.out('The old necromancer summons you a demon.\n\n')
					xvt.waste(500)

					monster = <active>{}
					monster.user = <user>{}
					Object.assign(monster.user, require('../etc/summoned demon.json'))
					monster.user.level = $.player.level + $.dice(7) - 4
					if (monster.user.level > 99)
						monster.user.level = 99
					$.reroll(monster.user
						, ($.dice(($.online.int + $.online.cha) / 50) > 1) ? monster.user.pc : $.PC.random()
						, monster.user.level)
					console.log(monster)

					cost.value += $.money(monster.user.level)

					let n = Math.trunc($.Weapon.merchant.length * monster.user.level / 100) + $.dice(3) - 2
					n = (n >= $.Weapon.merchant.length) ? $.Weapon.merchant.length - 1 : n
					monster.weapon = <weapon>{wc:n}
					cost.value += $.worth(new $.coins($.Weapon.name[$.Weapon.merchant[n]].value).value, $.player.cha)

					n = Math.trunc($.Armor.merchant.length * monster.user.level / 100) + $.dice(3) - 2
					n = (n >= $.Armor.merchant.length) ? $.Armor.merchant.length - 1 : n
					monster.armor = <armor>{ac:n}
					cost.value += $.worth(new $.coins($.Armor.name[$.Armor.merchant[n]].value).value, $.player.cha)

					if (monster.user.magic) {
						for (let i = 0; i < Object.keys($.Magic.spells).length; i++) {
							if ($.dice($.player.cha/2 + 5*i) == 1) {
								let spell = $.Magic.pick(i)
								if (!$.Magic.have($.player.spells, spell))
									$.Magic.add($.player.spells, i)
							}
						}
					}

					monster.user.coin.value += cost.value

					$.cat('arena/' + monster.user.handle)
					xvt.out('The ', monster.user.handle, ' is a level ', monster.user.level, ' ', monster.user.pc, '.\n\n')
					if (isNaN(+monster.user.weapon)) {
						xvt.out($.who(monster.user, true, true, false), ' is carrying a ', monster.user.weapon, '.\n\n')
					}
					if (isNaN(+monster.user.armor)) {
						xvt.out($.who(monster.user, true, true, false), ' is wearing a ', monster.user.armor, '.\n\n')
					}
	
					xvt.app.focus = 'fight'
					return
				}
				xvt.out(xvt.cyan, 'His eyes glow ', xvt.bright, xvt.red, 'red', xvt.nobright
					, xvt.cyan, ' and he says, "', xvt.bright, xvt.white, 'I don\'t make deals!'
					, xvt.nobright, xvt.cyan, '"\n\n', xvt.reset)
				menu(true)
				return
			}, prompt:'Will you pay (Y/N)? ', enter:'N', eol:false, match:/Y|N/i },
			'fight': { cb:() => {
				if (/Y/i.test(xvt.entry)) {
					$.arena--
					Battle.engage($.online[0], monster[0], () => {})
				}
				menu(true)
				return
			}, prompt:'Will you fight (Y/N)? ', enter:'N', eol:false, match:/Y|N/i }
		}
		xvt.app.focus = 'pay'
	}

/*
					if(i) {
						i--;
						strcpy(ENEMY.Handle,ARENA(i)->Name);
						strcpy(ENEMY.Class,ARENA(i)->Class);
						ENEMY.Gender='I';
						ENEMY.Level=ARENA(i)->Level;
						strcpy(ENEMY.Weapon,ARENA(i)->Weapon);
						strcpy(ENEMY.Armor,ARENA(i)->Armor);
						ENEMY.Gold=ARENA(i)->Gold;
						ENEMY.Spell=ARENA(i)->Spell;
						CreateRPC(RPC[1][0]);
					}
				sprintf(filename,"pix/Arena/%s",ENEMY.Handle);
				type(filename,FALSE);
				sprintf(outbuf,"The %s is a level %u %s.",ENEMY.Handle,ENEMY.ExpLevel,CLASS(RPC[1][0])->Name);
				OUT(outbuf);NL;NL;
				if(RPC[1][0]->weapon_origin<NUMWEAPON) {
					sprintf(outbuf,"%s is carrying %s%s.",RPC[1][0]->He,AN(WEAPON(RPC[1][0])->Name),WEAPON(RPC[1][0])->Name);
					OUT(outbuf);NL;NL;
				}
				if(RPC[1][0]->armor_origin<NUMWEAPON) {
					sprintf(outbuf,"%s is wearing %s%s.",RPC[1][0]->He,AN(ARMOR(RPC[1][0])->Name),ARMOR(RPC[1][0])->Name);
					OUT(outbuf);NL;NL;
				}
				displayview();
				sprintf(prompt,"%sWill you fight the %s (Y/N)? ",fore(CYN),ENEMY.Handle);
				OUT(prompt);
				c=inkey('N','N');
				NL;
				if(c=='Y') {
					NL;
					sprintf(outbuf,"combat%d",arena--);
					sound2(outbuf,0);
					Battle();
					if(!RPC[1][0]->HP) {
						modf(EXP(ENEMY.ExpLevel-1)/3.,&d);
						PLAYER.Experience+=d;
						sprintf(outbuf,"You get %.8g experience.",d);
						OUT(outbuf);NL;
						if(ENEMY.Gold>0.) {
							sprintf(line[numline++],"%s got %s you were carrying.",ONLINE->He,money(ENEMY.Gold,ENEMY.Emulation));
							PLAYER.Gold+=ENEMY.Gold;
							sprintf(outbuf,"You get %s %s was carrying.",money(ENEMY.Gold,ANSI),RPC[1][0]->he);
							OUT(outbuf);NL;
						}
						ExchangeWeapon(ONLINE,RPC[1][0]);
						ExchangeArmor(ONLINE,RPC[1][0]);
						note(ENEMY.ID);
						sprintf(outbuf,"%sdefeated a level %s%u %s",fore(CYN),fore(WHITE),ENEMY.Level,ENEMY.Handle);
						news(outbuf);
						paws=!PLAYER.Expert;
					}
					if(!ONLINE->HP) {
						if(PLAYER.Gold>0.) {
							ENEMY.Gold+=PLAYER.Gold;
							sprintf(outbuf,"%s takes %s you were carrying.",RPC[1][0]->He,money(PLAYER.Gold,ANSI));
							OUT(outbuf);NL;NL;
							PLAYER.Gold=0.;
						}
					}
					break;
				}
*/
}

}

export = Arena
