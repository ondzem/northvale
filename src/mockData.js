export const mockProducts = [
  // --- SINGLES (Pokémon) ---
  {
    id: 'charizard-ex-sv3',
    name: 'Charizard ex (Special Illustration Rare)',
    type: 'single',
    game: 'Pokémon',
    edition: 'Obsidian Flames',
    rarity: 'Special Illustration Rare',
    image: 'https://images.pokemontcg.io/sv3/223.png',
    backImage: 'https://images.pokemontcg.io/unbroken_bonds/back.png',
    desc: 'Jedna z nejcennějších karet ze setu Scarlet & Violet - Obsidian Flames. Karta zobrazuje Charizarda v jeho Tera krystalické podobě.',
    variants: [
      { id: 'ch-1', condition: 'NM', lang: 'EN', foil: true, price: 1850, stock: 3 },
      { id: 'ch-2', condition: 'EX', lang: 'EN', foil: true, price: 1600, stock: 1 },
      { id: 'ch-3', condition: 'NM', lang: 'JP', foil: true, price: 2100, stock: 2 }
    ]
  },
  {
    id: 'pikachu-vmax-swsh4',
    name: 'Pikachu VMAX (Rainbow Rare)',
    type: 'single',
    game: 'Pokémon',
    edition: 'Vivid Voltage',
    rarity: 'Rainbow Rare',
    image: 'https://images.pokemontcg.io/swsh4/188.png',
    backImage: 'https://images.pokemontcg.io/unbroken_bonds/back.png',
    desc: 'Ikonický „Fat Pikachu“ v duhovém provedení ze setu Vivid Voltage. Vyhledávaný sběratelský artikl.',
    variants: [
      { id: 'pk-1', condition: 'NM', lang: 'EN', foil: true, price: 3200, stock: 1 },
      { id: 'pk-2', condition: 'LP', lang: 'EN', foil: true, price: 2600, stock: 1 }
    ]
  },
  {
    id: 'umbreon-vmax-alt',
    name: 'Umbreon VMAX (Alternate Art Secret Rare)',
    type: 'single',
    game: 'Pokémon',
    edition: 'Evolving Skies',
    rarity: 'Alternate Art Secret Rare',
    image: 'https://images.pokemontcg.io/swsh7/215.png',
    backImage: 'https://images.pokemontcg.io/unbroken_bonds/back.png',
    desc: 'Legendární „Moonbreon“ z edice Evolving Skies. Karta s nejvyšším růstem ceny za poslední roky zobrazující Umbreona sahajícího po měsíci.',
    variants: [
      { id: 'um-1', condition: 'NM', lang: 'EN', foil: true, price: 19500, stock: 1 }
    ]
  },
  {
    id: 'giratina-v-alt',
    name: 'Giratina V (Alternate Art)',
    type: 'single',
    game: 'Pokémon',
    edition: 'Lost Origin',
    rarity: 'Alternate Art',
    image: 'https://images.pokemontcg.io/swsh11/186.png',
    backImage: 'https://images.pokemontcg.io/unbroken_bonds/back.png',
    desc: 'Nádherná a detailně ilustrovaná karta Giratiny z edice Lost Origin. Mistrovské dílo moderního TCG designu.',
    variants: [
      { id: 'gi-1', condition: 'NM', lang: 'EN', foil: true, price: 7900, stock: 2 },
      { id: 'gi-2', condition: 'EX', lang: 'EN', foil: true, price: 7100, stock: 1 }
    ]
  },
  {
    id: 'rayquaza-vmax-alt',
    name: 'Rayquaza VMAX (Alternate Art Secret Rare)',
    type: 'single',
    game: 'Pokémon',
    edition: 'Evolving Skies',
    rarity: 'Alternate Art Secret Rare',
    image: 'https://images.pokemontcg.io/swsh7/218.png',
    backImage: 'https://images.pokemontcg.io/unbroken_bonds/back.png',
    desc: 'Jedna z nejvyhledávanějších a nejkrásnějších karet moderní éry ze setu Evolving Skies zobrazující Rayquazu obtáčející se kolem věže.',
    variants: [
      { id: 'ra-1', condition: 'NM', lang: 'EN', foil: true, price: 14500, stock: 1 }
    ]
  },
 
  // --- SEALED PRODUCTS (Pokémon) ---
  {
    id: 'deal-of-the-day',
    name: 'Pokémon Scarlet & Violet - 151 Booster Box (JPN)',
    type: 'sealed',
    game: 'Pokémon',
    edition: '151',
    price: 1790,
    originalPrice: 2690,
    image: '/Akce - NORTHVALE.png',
    preorder: false,
    investment: false,
    lang: 'JP',
    desc: 'Oblíbený japonský booster box edice 151. Obsahuje 20 booster balíčků po 7 kartách s garancí tajných vzácných karet a šancí na legendárního Mew ex.',
    stock: 5
  },
  {
    id: 'pokemon-151-etb',
    name: 'Pokémon Scarlet & Violet - 151 Elite Trainer Box',
    type: 'sealed',
    game: 'Pokémon',
    edition: '151',
    price: 1399,
    image: 'https://tcgplayer-cdn.tcgplayer.com/product/506307_in_1000x1000.jpg',
    imagePlaceholderEmoji: '🎁',
    preorder: false,
    investment: true,
    lang: 'EN',
    desc: 'Elite Trainer Box (ETB) z oblíbené edice 151. Obsahuje 9 boosterů, promo kartu Snorlaxe, obaly na karty, kostky, žetony a sběratelského průvodce. Bezchybný stav krabice, ideální na sbírku.',
    stock: 8
  },
  {
    id: 'stellar-crown-booster-box',
    name: 'Pokémon Scarlet & Violet - Stellar Crown Booster Box',
    type: 'sealed',
    game: 'Pokémon',
    edition: 'Stellar Crown',
    price: 3290,
    image: 'https://tcgplayer-cdn.tcgplayer.com/product/552309_in_1000x1000.jpg',
    imagePlaceholderEmoji: '📦',
    preorder: true,
    investment: false,
    lang: 'EN',
    desc: 'Předobjednávka booster boxu chystané edice Stellar Crown. Odesíláme ve čtvrtek před oficiálním pátkem vydání, abyste měli box na víkend doma.',
    stock: 50
  },
  {
    id: 'surging-sparks-booster-box',
    name: 'Pokémon Scarlet & Violet - Surging Sparks Booster Box',
    type: 'sealed',
    game: 'Pokémon',
    edition: 'Surging Sparks',
    price: 3190,
    image: 'https://tcgplayer-cdn.tcgplayer.com/product/567990_in_1000x1000.jpg',
    imagePlaceholderEmoji: '⚡',
    preorder: true,
    investment: false,
    lang: 'EN',
    desc: 'Předobjednávka booster boxu chystané edice Surging Sparks. Odesíláme s předstihem před oficiálním dnem vydání.',
    stock: 45
  },
  {
    id: 'prismatic-evolutions-etb',
    name: 'Pokémon Scarlet & Violet - Prismatic Evolutions Elite Trainer Box',
    type: 'sealed',
    game: 'Pokémon',
    edition: 'Prismatic Evolutions',
    price: 1490,
    image: 'https://tcgplayer-cdn.tcgplayer.com/product/578608_in_1000x1000.jpg',
    imagePlaceholderEmoji: '💎',
    preorder: true,
    investment: false,
    lang: 'EN',
    desc: 'Předobjednávka speciálního Elite Trainer Boxu z edice Prismatic Evolutions.',
    stock: 60
  },
  {
    id: 'mtg-duskmourn-booster-box',
    name: 'Magic: The Gathering: Duskmourn: House of Horror - Play Booster Display',
    type: 'sealed',
    game: 'Magic',
    edition: 'Duskmourn',
    price: 3890,
    image: 'https://tcgplayer-cdn.tcgplayer.com/product/557876_in_1000x1000.jpg',
    imagePlaceholderEmoji: '👻',
    preorder: true,
    investment: false,
    lang: 'EN',
    desc: 'Předobjednávka Play Booster Boxu z chystané edice Duskmourn: House of Horror.',
    stock: 25
  },
  {
    id: 'op-08-booster-box',
    name: 'One Piece Card Game: Two Legends Booster Box (OP-08)',
    type: 'sealed',
    game: 'One Piece',
    edition: 'Two Legends',
    price: 3490,
    image: 'https://tcgplayer-cdn.tcgplayer.com/product/544321_in_1000x1000.jpg',
    imagePlaceholderEmoji: '⚔️',
    preorder: true,
    investment: false,
    lang: 'EN',
    desc: 'Předobjednávka anglického booster boxu OP-08 Two Legends.',
    stock: 30
  },
  {
    id: 'shiny-treasure-ex-box',
    name: 'Pokémon shiny Treasure ex Booster Box (JPN)',
    type: 'sealed',
    game: 'Pokémon',
    edition: 'Shiny Treasure ex',
    price: 1590,
    image: 'https://tcgplayer-cdn.tcgplayer.com/product/524823_in_1000x1000.jpg',
    imagePlaceholderEmoji: '🇯🇵',
    preorder: false,
    investment: false,
    lang: 'JP',
    desc: 'Japonský booster box speciálního High Class setu Shiny Treasure ex. Obsahuje 10 boosterů po 10 kartách s garancí ex karet a šancí na Shiny Pokémonů.',
    stock: 12
  },
  {
    id: 'pokemon-classic-case',
    name: 'Pokémon Classic Collection - Sealed Case',
    type: 'sealed',
    game: 'Pokémon',
    edition: 'Classic Collection',
    price: 24500,
    image: 'https://tcgplayer-cdn.tcgplayer.com/product/496229_in_1000x1000.jpg',
    imagePlaceholderEmoji: '💼',
    preorder: false,
    investment: true,
    lang: 'EN',
    desc: 'Originální sealed case obsahující 2 kompletní sady Pokémon Classic Collection přímo od výrobce. Perfektní investiční produkt zajištěný originální páskou.',
    stock: 2
  },
 
  // --- MAGIC THE GETHERING (MTG) ---
  {
    id: 'mtg-mh3-booster-box',
    name: 'Magic the Gathering: Modern Horizons 3 - Play Booster Box',
    type: 'sealed',
    game: 'Magic',
    edition: 'Modern Horizons 3',
    price: 6890,
    image: 'https://tcgplayer-cdn.tcgplayer.com/product/544336_in_1000x1000.jpg',
    imagePlaceholderEmoji: '🧙‍♂️',
    desc: 'Zapečetěný booster box obsahující 36 Play boosterů z přelomové edice Modern Horizons 3. Určeno pro hráče formátů Modern a Commander.',
    stock: 5
  },
  {
    id: 'mtg-otj-commander-deck',
    name: 'Magic the Gathering: Outlaws of Thunder Junction - Commander Deck (Quick Draw)',
    type: 'sealed',
    game: 'Magic',
    edition: 'Outlaws of Thunder Junction',
    price: 1090,
    image: 'https://tcgplayer-cdn.tcgplayer.com/product/542211_in_1000x1000.jpg',
    imagePlaceholderEmoji: '🤠',
    desc: 'Předpřipravený herní balíček o 100 kartách připravený k okamžitému hraní formátu Commander. Velmi silný balíček postavený na sesílání instantů a sorcery.',
    stock: 10
  },
 
  // --- ONE PIECE ---
  {
    id: 'op-07-booster-box',
    name: 'One Piece Card Game: 500 Years in the Future Booster Box (OP-07)',
    type: 'sealed',
    game: 'One Piece',
    edition: '500 Years in the Future',
    price: 3690,
    image: 'https://tcgplayer-cdn.tcgplayer.com/product/544320_in_1000x1000.jpg',
    imagePlaceholderEmoji: '🏴‍☠️',
    desc: 'Velmi žádaný zapečetěný box karetní hry One Piece obsahující 24 boosterů. Obsahuje karty ze ságy Egghead.',
    stock: 6
  },
 
  // --- RIFTBOUND ---
  {
    id: 'riftbound-trial-deck',
    name: 'Riftbound: Trial Deck - Základní sada',
    type: 'sealed',
    game: 'Riftbound',
    edition: 'Základní hra',
    price: 490,
    image: '/Riftbound.webp',
    imagePlaceholderEmoji: '☄️',
    desc: 'Ideální startovní sada pro začínající hráče Riftbound. Obsahuje předpřipravený balíček a pravidla pro rychlé naučení hry.',
    stock: 15
  },
 
  // --- ACCESSORIES ---
  {
    id: 'dragon-shield-matte-clear',
    name: 'Dragon Shield Matte Clear (100 obalů)',
    type: 'accessory',
    game: 'Accessories',
    subcat: 'Matte sleeves',
    price: 249,
    image: 'https://tcgplayer-cdn.tcgplayer.com/product/122159_in_1000x1000.jpg',
    imagePlaceholderEmoji: '🛡️',
    desc: 'Nejlepší matné herní obaly na světě od dánského výrobce Dragon Shield. Vynikající pro ochranu karet při hraní a skvělý pocit při míchání balíčku.',
    stock: 100
  },
  {
    id: 'penny-sleeves-100',
    name: 'Ultra Pro Soft Card Sleeves (Penny sleeves, 100ks)',
    type: 'accessory',
    game: 'Accessories',
    subcat: 'Penny sleeves',
    price: 39,
    image: 'https://tcgplayer-cdn.tcgplayer.com/product/95743_in_1000x1000.jpg',
    imagePlaceholderEmoji: '📄',
    desc: 'Základní měkké obaly na ochranu karet před poškrábáním. Nezbytné pro ukládání karet do toploaderů.',
    stock: 500
  },
  {
    id: 'toploaders-25',
    name: 'Ultra Pro Toploader 3"x4" (25ks)',
    type: 'accessory',
    game: 'Accessories',
    subcat: 'Toploaders',
    price: 119,
    image: 'https://tcgplayer-cdn.tcgplayer.com/product/142981_in_1000x1000.jpg',
    imagePlaceholderEmoji: '📇',
    desc: 'Pevné plastové obaly na drahé karty. Poskytují vynikající ochranu před ohybem a poškozením rohů.',
    stock: 150
  },
  {
    id: 'acrylic-etb-box',
    name: 'Akrylový ochranný box pro Elite Trainer Box',
    type: 'accessory',
    game: 'Accessories',
    subcat: 'Acrylic Boxes',
    price: 690,
    image: '/acrylic-etb-box.png',
    imagePlaceholderEmoji: '💎',
    desc: 'Prémiový box z vysoce kvalitního 4mm akrylátu s magnetickým víkem a UV ochranou. Navržen speciálně pro dlouhodobou ochranu sealed ETB boxů před prachem a poškozením.',
    stock: 15
  },
  {
    id: 'ultra-pro-pro-binder-9-pocket',
    name: 'Ultra Pro 9-Pocket PRO-Binder (Černý)',
    type: 'accessory',
    game: 'Accessories',
    subcat: 'Binders',
    price: 650,
    image: 'https://tcgplayer-cdn.tcgplayer.com/product/142827_in_1000x1000.jpg',
    imagePlaceholderEmoji: '📘',
    desc: 'Prémiové album na 360 karet s elastickým páskem a bočním vkládáním pro maximální bezpečí tvé sbírky.',
    stock: 20
  },
 
  // --- SLABS (Graded Cards) ---
  {
    id: 'slab-charizard-psa10',
    name: 'Charizard ex 223/197 - PSA 10 Gem Mint',
    type: 'slab',
    game: 'Pokémon',
    edition: 'Obsidian Flames',
    price: 4900,
    company: 'PSA',
    grade: 10,
    certNumber: '89423189',
    image: 'https://images.pokemontcg.io/sv3/223.png',
    backImage: 'https://images.pokemontcg.io/unbroken_bonds/back.png',
    desc: 'Certifikovaná karta v pouzdře PSA s nejvyšším možným hodnocením 10 Gem Mint. Bezchybná centrace, hrany i povrch.',
    stock: 1
  },
  {
    id: 'slab-pikachu-bgs95',
    name: 'Pikachu VMAX 188/185 - Beckett 9.5 Gem Mint',
    type: 'slab',
    game: 'Pokémon',
    edition: 'Vivid Voltage',
    price: 6200,
    company: 'Beckett',
    grade: 9.5,
    certNumber: '10048291',
    image: 'https://images.pokemontcg.io/swsh4/188.png',
    backImage: 'https://images.pokemontcg.io/unbroken_bonds/back.png',
    desc: 'Certifikovaná karta v pouzdře Beckett (BGS) se známkou 9.5 Gem Mint. Sub-grades: Centering 9.5, Edges 9.5, Corners 9.5, Surface 10.',
    stock: 1
  },
  {
    id: 'slab-umbreon-psa10',
    name: 'Umbreon VMAX 215/203 - PSA 10 Gem Mint',
    type: 'slab',
    game: 'Pokémon',
    edition: 'Evolving Skies',
    price: 38900,
    company: 'PSA',
    grade: 10,
    certNumber: '92184310',
    image: 'https://images.pokemontcg.io/swsh7/215.png',
    backImage: 'https://images.pokemontcg.io/unbroken_bonds/back.png',
    desc: 'Certifikovaná karta v pouzdře PSA s nejvyšším možným hodnocením 10 Gem Mint. Legendární Moonbreon.',
    stock: 1
  },
  {
    id: 'slab-giratina-psa10',
    name: 'Giratina V 186/196 - PSA 10 Gem Mint',
    type: 'slab',
    game: 'Pokémon',
    edition: 'Lost Origin',
    price: 18900,
    company: 'PSA',
    grade: 10,
    certNumber: '75429188',
    image: 'https://images.pokemontcg.io/swsh11/186.png',
    backImage: 'https://images.pokemontcg.io/unbroken_bonds/back.png',
    desc: 'Certifikovaná karta v pouzdře PSA s nejvyšším možným hodnocením 10 Gem Mint. Nádherný kus s dokonalým stavem.',
    stock: 1
  },
  {
    id: 'slab-lugia-psa10',
    name: 'Lugia V 186/195 - PSA 10 Gem Mint',
    type: 'slab',
    game: 'Pokémon',
    edition: 'Silver Tempest',
    price: 11900,
    company: 'PSA',
    grade: 10,
    certNumber: '68421990',
    image: 'https://images.pokemontcg.io/swsh12/186.png',
    backImage: 'https://images.pokemontcg.io/unbroken_bonds/back.png',
    desc: 'Certifikovaná karta v pouzdře PSA s nejvyšším možným hodnocením 10 Gem Mint. Vyhledávaná alternativní ilustrace Lugia V.',
    stock: 1
  }
];

export const bulkRates = [
  { id: '1', game: 'Pokémon', type: 'Common / Uncommon', cashRate: 0.3, creditRate: 0.38 },
  { id: '2', game: 'Pokémon', type: 'Rare / Holo Rare', cashRate: 1.5, creditRate: 1.88 },
  { id: '3', game: 'Pokémon', type: 'Ultra Rare (ex/V/VMAX)', cashRate: 10.0, creditRate: 12.5 },
  { id: '4', game: 'Magic', type: 'Bulk Rare', cashRate: 2.0, creditRate: 2.5 },
  { id: '5', game: 'One Piece', type: 'Common / Uncommon / Leader', cashRate: 0.2, creditRate: 0.25 }
];
