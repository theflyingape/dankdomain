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
    emulation?: string
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
    weapon?: string
    toWC?: number
    armor?: string
    toAC?: number
    spells?: number[]
    poisons?: number[]
    realestate?: string
    security?: string
    hull?: number
    cannon?: number
    ram?: boolean

    //  statistics
    wins?: number
    immortal?: number
    rating?: number
}

interface choice {
    description?: string
}
interface choices {
    [key: string]: choice
}

interface entry {
    type: string
    default?: number|string
    min?: number
    max?: number
    nl?: boolean
    other?: string
    prompt?: string
}

interface dungeon {
    name: string
    pc: string
    spells?: string[]
}

interface monster {
	name: string
    level: number
    pc: string
    weapon: string|number
    armor: string|number
    money: string|number
    spells?: string[]
}

interface access {
    calls: number
    minutes: number
    promote: number
    verify: boolean
    bulletin: boolean
    roleplay: boolean
    sysop?: boolean
    weekend?: boolean
}

interface armor {
    value: string
    ac: number
    armoury?: boolean
    gift?: boolean
    ego_blessed?: string
    ego_cursed?: string
    vs_magic?: number
    vs_melee?: number
}

interface coins {
    value: number
    amount: string
    carry(): string
    pouch(number): string
}

interface poison {
    power: number
    cost: string
    vial: string
}

interface realestate {
    cost: string
}

interface security {
    cost: string
}

interface spell {
    cast: number
    mana: number
    echanted: number
    cost?: string
    wand?: string
}

interface weapon {
    value: string
    wc: number
    hit: string
    smash: string
    stab: string
    plunge: string
    shoppe?: boolean
    gift?: boolean
    ego_blessed?: string
    ego_cursed?: string
    vs_magic?: number
    vs_melee?: number
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
    toStr: number       //  0-2
    toInt: number       //  0-2
    toDex: number       //  0-2
    toCha: number       //  0-2
    maxStr: number      //  baseStr-99
    maxInt: number      //  baseInt-99
    maxDex: number      //  baseDex-99
    maxCha: number      //  baseCha-99
    description?: string[]
}

interface active {
    user: user
    altered?: boolean
    pc?: character
    weapon?: weapon
    armor?: armor
    toAC?: number
    toWC?: number
    str?: number
    int?: number
    dex?: number
    cha?: number
    confused?: boolean
    bp?: number
    hp?: number
    sp?: number
    hull?: number
}

/*
interface PCRunTime {
    id?: string
    name: string
    pc: character
    money: coins
    weapon: weapon
    armor: armor
    poison: number
    spells: string[]
    level: number
    str: number
    int: number
    dex: number
    cha: number
    confused: boolean
    bp: number
    hp: number
    sp: number
    toAC: number
    toWC: number
    hull: number

    levelup(pc: character): void
    reroll(pc: character, level?: number): void
    spawn(dungeon: dungeon, level?: number): void
}

interface PCFactory {
    new(name: string): PCFactory
    (rt: PCRunTime)
}
*/