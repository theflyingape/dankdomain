//  the power TypeScript provides to simplify it all

type ABILITY = string | 'str' | 'int' | 'dex' | 'cha'
type POWER = string | 'buff' | 'cast' | 'degrade' | 'hp' | 'identify' | 'initiate' | 'joust' | 'melee' | 'resist' | 'resurrect' | 'ring' | 'skip' | 'sp' | 'steal' | 'taxes' | 'teleport' | 'upgrade'
type POWTO = 'ability' | 'magic' | 'melee' | 'pc' | 'spell'
type GIFT = '' | 'armor' | 'chest' | 'magic' | 'map' | 'poison' | 'potion' | 'ring' | 'weapon' | 'xmagic'
type MAP = '' | 'map' | 'magic map' | `Marauder's map`
type NPC = '' | 'cleric' | 'wizard' | 'trapdoor' | 'thief' | 'portal' | 'well' | 'wheel' | 'dwarf'
type ROOM = '' | 'n-s' | 'w-e' | 'cavern'
type SUIT = '⚜' | '♠' | '♥' | '♣' | '♦'
type TTY = 'rlogin' | 'telnet' | 'web'
type EMULATION = 'dumb' | 'VT' | 'PC' | 'XT'

interface argument {
    who?: string
    text?: string
}

interface caller {
    who?: string
    reason?: string
}

interface user {
    id: string
    handle?: string

    //  real
    name?: string
    email?: string
    password?: string
    dob?: number
    sex?: string
    joined?: number
    expires?: number
    lastdate?: number
    lasttime?: number
    calls?: number
    today?: number
    expert?: boolean
    emulation?: EMULATION
    rows?: number
    access?: string
    remote?: string

    //  playing character
    pc?: string
    gender?: string
    novice?: boolean

    //  current standing
    level?: number
    xp?: number
    xplevel?: number
    status?: string
    blessed?: string
    cursed?: string
    coward?: boolean
    bounty?: coins
    who?: string
    gang?: string
    keyseq?: string
    keyhints?: string[]

    //  character class attributes
    melee?: number
    backstab?: number
    poison?: number
    magic?: number
    steal?: number
    hp?: number
    sp?: number
    str?: number
    maxstr?: number
    int?: number
    maxint?: number
    dex?: number
    maxdex?: number
    cha?: number
    maxcha?: number

    //  character materials
    coin?: coins
    bank?: coins
    loan?: coins
    weapon?: string | number
    toWC?: number
    armor?: string | number
    toAC?: number
    spells?: number[]
    poisons?: number[]
    rings?: string[]
    realestate?: string
    security?: string
    hull?: number
    cannon?: number
    ram?: boolean

    //  statistics
    wins?: number
    immortal?: number
    //  per roll
    plays?: number
    jl?: number
    jw?: number
    killed?: number
    kills?: number
    retreats?: number
    steals?: number
    tl?: number
    tw?: number
}

interface gang {
    name: string
    members: string[]
    handles: string[]
    genders: string[]
    melee: number[]
    status: string[]
    validated: boolean[]
    win: number
    loss: number
    banner: number
    trim: number
    back: number
    fore: number
}

interface deed {
    pc: string
    deed: string
    date: number
    hero: string
    value: number
}

interface deeds {
    name: string
    description: string
    starting: number
}

interface choice {
    description?: string
}
interface choices {
    [key: string]: choice
}

interface monster {
    name: string
    pc: string
    adept?: number
    hit?: string
    smash?: string
    poisons?: string[]
    rings?: string[]
    spells?: string[]
    level?: number
    weapon?: string | number
    armor?: string | number
    money?: string | number
    effect?: string
}

interface naval {
    name: string
    int: number
    hull: number
    shot: number
    powder: number
    ram: boolean
    money?: string | number
}

interface access {
    F?: string
    M?: string
    bot?: boolean
    calls: number
    minutes: number
    promote: number
    verify: boolean
    roleplay: boolean
    sysop?: boolean
    emoji?: string
}

interface armor {
    text: string
    value: string
    ac: number
    armoury?: boolean
    dwarf?: boolean
}

interface cards {
    face: string
    suit: SUIT
    value: number
    uni: string
}

interface coins {
    value: number
    amount: string
    carry?(number?, boolean?): string
    pieces?(string?): string
    pouch?(number): string
}

interface ddd {
    cleric: active
    rooms: [room[]]	//	7-10
    map: MAP
    moves: number       //  hero steps (2x backtracking)
    spawn: number       //  2-23
    width: number		//	7-13
}

interface poison {
    power: number
    cost: string
    vial: string
}

interface realestate {
    value: string
    protection: number
}

interface ring {
    unique: boolean
    description: string
    emoji: string
    ability: [{
        id: string
        power: boolean
        magic?: number
        pc?: string
        spell?: string
    }]
}

interface room {
    map: boolean		//	explored?
    occupant: NPC
    type: ROOM
    giftItem?: GIFT
    giftValue?: number | string
    giftID?: boolean	//	undefined, or identified?
    giftIcon?: string
    monster?: active[]
}

interface security {
    value: string
    protection: number
}

interface spell {
    cast: number
    mana: number
    enchanted: number
    cost?: string
    wand?: string
}

interface vial {
    potion: number
    identified: boolean
    image: string
    description: string
}

interface weapon {
    text: string
    value: string
    wc: number
    hit: string
    smash: string
    stab: string
    plunge: string
    shoppe?: boolean
    dwarf?: boolean
}

interface character {
    melee: number       //  0-4
    backstab: number    //  0-4
    poison: number      //  0-4
    magic: number       //  0-4
    steal: number       //  0-4
    baseStr: number     //  20-80
    baseInt: number     //  20-80
    baseDex: number     //  20-80
    baseCha: number     //  20-80
    toStr: number       //  0-4
    toInt: number       //  0-4
    toDex: number       //  0-4
    toCha: number       //  0-4
    maxStr: number      //  baseStr-99
    maxInt: number      //  baseInt-99
    maxDex: number      //  baseDex-99
    maxCha: number      //  baseCha-99
    unicode: string     //  dungeon map symbol
    color?: number      //  symbol's color
    skip?: string       //  action
    difficulty?: string //  playing level
    specialty?: string  //  meta
    description?: string[]
    bonusStr?: number    //  0-2
    bonusInt?: number    //  0-2
    bonusDex?: number    //  0-2
    bonusCha?: number    //  0-2
}

interface who {
    He: string
    he: string
    him: string
    His: string
    his: string
    self: string
    You: string
    you: string
}

interface active {
    user: user
    altered?: boolean
    pc?: character
    who?: who
    weapon?: weapon
    armor?: armor
    toAC?: number
    toWC?: number
    adept?: number      //  0 - 5: situational modifiers
    str?: number
    int?: number
    dex?: number
    cha?: number
    confused?: boolean
    bp?: number
    hp?: number         //  <0=retreated, 0=killed, >0=alive
    sp?: number
    hull?: number
    monster?: monster
    effect?: string
}
