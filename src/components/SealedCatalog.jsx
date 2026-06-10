import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import DealOfTheDay from './DealOfTheDay';

const gameInfo = {
  'Pokémon': {
    title: 'Pokémon',
    desc: 'Objevte širokou nabídku Pokémon produktů. Od Booster Boxů a Elite Trainer Boxů až po speciální kolekce a dárková balení. Všechny produkty pocházejí z oficiální distribuce s garancí pravosti.'
  },
  'Lorcana': {
    title: 'Disney Lorcana',
    desc: 'Boxy, Trove boxy a boostery Disney Lorcana. Otevřete bránu do magického světa s originálními produkty a rozšiřte svou sbírku o vzácné Enchanted karty.'
  },
  'One Piece': {
    title: 'One Piece',
    desc: 'Kompletní nabídka booster boxů a boosterů pro One Piece Card Game. Pořiďte si originální balení s garancí kvality a neotevřeného stavu.'
  },
  'Riftbound': {
    title: 'Riftbound',
    desc: 'Booster boxy, boostery a startovní Trial decky hry Riftbound. Vše, co potřebujete pro okamžitý vstup do této strategické fantasy hry.'
  },
  'Accessories': {
    title: 'Herní Příslušenství',
    desc: 'Alba na karty, obaly, toploadery a další nezbytné doplňky pro ochranu a organizaci vaší sbírky. Udržujte své karty v bezpečí a perfektním stavu.'
  },
  'Acrylics': {
    title: 'Prémiové Akrylové Boxy',
    desc: 'Vysoce kvalitní akrylové obaly s UV ochranou pro vaše cenné booster boxy, Elite Trainer Boxy a graded karty. Dokonalá ochrana a prezentace.'
  }
};

const subSubcategoriesConfig = {
  'Pokémon': {
    'Booster Box': {
      title: 'Pokémon TCG Booster Boxy',
      desc: 'Booster Boxy jsou královskou disciplínou pro všechny sběratele a investory do Pokémon karet. Každý standardní anglický booster box obsahuje 36 neotevřených booster balíčků po 10 kartách, což z něj činí cenově nejvýhodnější způsob nákupu většího množství karet. V japonských a čínských verzích booster boxů obvykle najdete 20 až 30 balíčků. Všechny naše booster boxy pocházejí z oficiální distribuce a jsou dodávány v originální smršťovací fólii (shrink wrap) s logem Pokémon Company, což zaručuje jejich pravost a netknutý stav.',
      subsubcats: [
        { id: 'all', name: 'Všechny Booster Boxy', icon: '📦' },
        { id: 'Draft Booster Box', name: 'Draft Booster Box', icon: '📦' },
        { id: 'Collector Booster Box', name: 'Collector Booster Box', icon: '✨' },
        { id: 'Set Booster Box', name: 'Set Booster Box', icon: '🎨' },
        { id: 'Jumpstart Booster Box', name: 'Jumpstart Booster Box', icon: '🚀' },
        { id: 'Japanese Booster Box', name: 'Japonský Booster Box', icon: '🇯🇵' },
        { id: 'Chinese Booster Box', name: 'Čínský Booster Box', icon: '🇨🇳' }
      ]
    },
    'Elite Trainer Box': {
      title: 'Pokémon TCG Elite Trainer Boxy',
      desc: 'Elite Trainer Box (ETB) je skvělým dárkovým a sběratelským balením, které obsahuje vše, co potřebujete pro hraní i sbírání. Standardní balení nabízí 8 až 10 boosterů, exkluzivní foilovou promo kartu s originální ilustrací, 65 obalů na karty s motivem edice, kostky pro počítání zranění, akrylové žetony a praktického průvodce sadou. Pokémon Center edice ETB navíc obsahují ještě více boosterů a speciální promo kartu s logem Pokémon Center. ETB je ideální volbou pro začátek sběratelské cesty i jako estetický kousek na poličku.',
      subsubcats: [
        { id: 'all', name: 'Všechny ETB', icon: '👑' },
        { id: 'Standard ETB', name: 'Standard ETB', icon: '🏆' },
        { id: 'Pokémon Center ETB', name: 'Pokémon Center ETB', icon: '🏬' }
      ]
    },
    'Booster Bundle': {
      title: 'Pokémon TCG Booster Bundles',
      desc: 'Booster Bundles představují čistou radost z rozbalování balíčků bez zbytečného příslušenství okolo. Každá krabička obsahuje přesně 6 booster balíčků vybrané edice. Jedná se o skvělou a cenově dostupnou možnost, pokud chcete otestovat své štěstí v nové edici, aniž byste kupovali celý velký Booster Box nebo dárkový Elite Trainer Box.',
      subsubcats: [
        { id: 'all', name: 'Všechny Bundly', icon: '🗳️' },
        { id: 'Booster Bundle', name: 'Standard Bundle', icon: '🎁' }
      ]
    },
    'Booster': {
      title: 'Pokémon TCG Samostatné Boostery',
      desc: 'Základní stavební kámen sbírání Pokémon karet. Samostatný booster balíček obsahuje náhodně namíchanou sadu karet (obvykle 10 v anglické verzi, 5 až 10 v japonské a čínské verzi). Můžete v nich najít cenné karty jako jsou Pokémon ex, Illustration Rare nebo dokonce Secret Rare. Nabízíme jak standardní anglické boostery, tak specifické japonské a čínské edice pro fajnšmekry.',
      subsubcats: [
        { id: 'all', name: 'Všechny Boostery', icon: '🃏' },
        { id: 'Standard Booster', name: 'Standard Booster', icon: '🇬🇧' },
        { id: 'Japanese Booster Pack', name: 'Japonský Booster', icon: '🇯🇵' },
        { id: 'Chinese Booster Pack', name: 'Čínský Booster', icon: '🇨🇳' }
      ]
    },
    'Special Collection': {
      title: 'Pokémon TCG Speciální Kolekce',
      desc: 'Speciální dárkové sety (Collection Boxes, Premium Collections, Tins) jsou navrženy pro maximální vizuální zážitek a radost z rozbalování. Tyto produkty zpravidla obsahují jednu nebo více garantovaných promo karet oblíbených Pokémonů, nekolik booster balíčků z různých edic a tematické bonusové předměty jako jsou sběratelské mince, figurky, odznáčky nebo herní podložky.',
      subsubcats: [
        { id: 'all', name: 'Všechny Kolekce', icon: '🧸' },
        { id: 'Premium Collection', name: 'Premium Collection', icon: '💎' },
        { id: 'Japanese Special Set', name: 'Japonský Speciální Set', icon: '🇯🇵' }
      ]
    },
    'Other': {
      title: 'Pokémon TCG Ostatní',
      desc: 'V této kategorii naleznete nezařazené sběratelské produkty jako jsou sealed cased (celé krabice s více kusy produktů přímo z továrny), předpřipravené balíčky (Theme Decks / Battle Decks) nebo limitované sběratelské edice, které tvoří unikátní součást sběratelského světa.',
      subsubcats: [
        { id: 'all', name: 'Všechno ostatní', icon: '🔮' },
        { id: 'Sealed Case', name: 'Sealed Case', icon: '📦' },
        { id: 'Japanese Other', name: 'Japonské ostatní', icon: '🇯🇵' }
      ]
    }
  },
  'Lorcana': {
    'Booster Box': {
      title: 'Disney Lorcana Booster Boxy',
      desc: 'Booster boxy pro Disney Lorcana obsahují 24 booster balíčků po 12 kartách. Otevírání celého boxu vám dává nejlepší šanci na získání vzácných legendárních a extrémně cenných Enchanted karet s bezrámovou foilovou ilustrací.',
      subsubcats: [
        { id: 'all', name: 'Všechny Booster Boxy', icon: '🏰' },
        { id: 'Standard Booster Box', name: 'Standard Booster Box', icon: '📦' }
      ]
    },
    'Trove Box': {
      title: 'Disney Lorcana Illumineer\'s Trove Boxy',
      desc: 'Illumineer\'s Trove je vlajkovou lodí dárkových sad pro hru Disney Lorcana. Každý Trove box obsahuje 8 boosterů, dvě papírové krabičky na balíčky, 15 žetonů poškození, sběratelského průvodce sadou a pevnou úložnou krabici s krásným celoplošným potiskem pro archivaci vaší rozrůstající se sbírky.',
      subsubcats: [
        { id: 'all', name: 'Všechny Trove Boxy', icon: '💎' },
        { id: 'Illumineer\'s Trove', name: 'Illumineer\'s Trove', icon: '📦' }
      ]
    },
    'Booster': {
      title: 'Disney Lorcana Boostery',
      desc: 'Samostatný booster balíček obsahuje 12 náhodných karet (6 běžných, 3 neobvyklé, 2 vzácné/epické/legendární a 1 garantovanou foilovou kartu libovolné vzácnosti). Skvělá a rychlá možnost, jak otestovat své štěstí při hledání oblíbených postav od Disneyho.',
      subsubcats: [
        { id: 'all', name: 'Všechny Boostery', icon: '🃏' },
        { id: 'Standard Booster', name: 'Standard Booster', icon: '🇬🇧' }
      ]
    },
    'Other': {
      title: 'Disney Lorcana Ostatní Produkty',
      desc: 'Startovní balíčky (Starter Decks) obsahující předpřipravený 60-kartový balíček připravený k okamžité hře, dárkové sety s promo kartami a doplňkové herní sety pro začínající i pokročilé hráče.',
      subsubcats: [
        { id: 'all', name: 'Vše ostatní', icon: '🎭' },
        { id: 'Starter Deck', name: 'Starter Deck', icon: '⚔️' }
      ]
    }
  },
  'One Piece': {
    'Booster Box': {
      title: 'One Piece TCG Booster Boxy',
      desc: 'Booster Boxy One Piece Card Game obsahují 24 booster balíčků. Tyto boxy jsou vysoce vyhledávané kvůli možnosti otevření extrémně vzácných Manga Rare karet a speciálních verzí karet vůdců (Alternate Art Leaders).',
      subsubcats: [
        { id: 'all', name: 'Všechny Booster Boxy', icon: '🏴‍☠️' },
        { id: 'English Booster Box', name: 'English Booster Box', icon: '🇬🇧' }
      ]
    },
    'Booster': {
      title: 'One Piece TCG Samostatné Boostery',
      desc: 'Booster balíčky pro oblíbenou karetní hru na motivy anime One Piece. Každý balíček obsahuje náhodně namíchané karty postav, událostí a stage karet pro sestavení vašeho vysněného pirátského balíčku.',
      subsubcats: [
        { id: 'all', name: 'Všechny Boostery', icon: '🪙' },
        { id: 'English Booster Pack', name: 'English Booster Pack', icon: '🇬🇧' }
      ]
    },
    'Other': {
      title: 'One Piece TCG Ostatní Produkty',
      desc: 'Startovní balíčky (Starter Decks) pro okamžitý start hry, speciální limitované edice a dárkové krabičky ze světa One Piece.',
      subsubcats: [
        { id: 'all', name: 'Vše ostatní', icon: '🧭' },
        { id: 'Starter Deck', name: 'Starter Deck', icon: '⚔️' }
      ]
    }
  },
  'Riftbound': {
    'Booster Box': {
      title: 'Riftbound TCG Booster Boxy',
      desc: 'Zapečetěné boxy s 24 booster balíčky české strategické fantasy hry Riftbound. Skvělý nákup pro získání kompletní sady karet a posílení vašich elementárních balíčků.',
      subsubcats: [
        { id: 'all', name: 'Všechny Booster Boxy', icon: '🌀' },
        { id: 'Standard Booster Box', name: 'Standard Booster Box', icon: '📦' }
      ]
    },
    'Booster': {
      title: 'Riftbound TCG Samostatné Boostery',
      desc: 'Samostatné boostery s kartami hry Riftbound pro postupné vylepšování balíčku.',
      subsubcats: [
        { id: 'all', name: 'Všechny Boostery', icon: '⚡' },
        { id: 'Standard Booster Pack', name: 'Standard Booster Pack', icon: '📦' }
      ]
    },
    'Trial Deck': {
      title: 'Riftbound TCG Trial Decky',
      desc: 'Předpřipravené startovní Trial decky hry Riftbound navržené tak, aby dva hráči mohli okamžitě usednout k hernímu stolu a začít hrát.',
      subsubcats: [
        { id: 'all', name: 'Všechny Trial Decky', icon: '⚔️' },
        { id: 'Standard Trial Deck', name: 'Standard Trial Deck', icon: '📦' }
      ]
    },
    'Other': {
      title: 'Riftbound TCG Ostatní',
      desc: 'Oficiální herní podložky (playmaty) s fantastickými ilustracemi a další doplňkové materiály k Riftbound TCG.',
      subsubcats: [
        { id: 'all', name: 'Vše ostatní', icon: '💫' },
        { id: 'Official Playmat', name: 'Official Playmat', icon: '🎨' }
      ]
    }
  },
  'Accessories': {
    'cards': {
      title: 'Alba na TCG karty',
      desc: 'Prémiová alba s bočním vkládáním karet pro maximální bezpečí a ochranu před vypadnutím. Ideální pro uspořádání a prezentaci vaší sbírky vzácných karet.',
      subsubcats: [
        { id: 'all', name: 'Všechna alba', icon: '📘' },
        { id: 'cards', name: 'Alba na karty', icon: '🃏' }
      ]
    },
    'toploaders': {
      title: 'Alba na toploadery',
      desc: 'Speciálně navržená alba s širšími kapsami pro bezpečné uložení a pohodlné prohlížení karet, které máte uložené v pevných toploaderech. Dvojnásobné bezpečí pro vaše nejcennější kousky.',
      subsubcats: [
        { id: 'all', name: 'Všechna alba na toploadery', icon: '📁' },
        { id: 'toploaders', name: 'Alba na toploadery', icon: '🛡️' }
      ]
    },
    'graded': {
      title: 'Alba a kufříky na graded karty',
      desc: 'Profesionální alba a kufříky s pevnými stěnami navržené pro bezpečné skladování a snadnou prezentaci graded karet v plastových pouzdrech (slabech) typu PSA nebo Beckett.',
      subsubcats: [
        { id: 'all', name: 'Všechna alba na slabs', icon: '💼' },
        { id: 'graded', name: 'Alba na graded karty', icon: '💎' }
      ]
    },
    'Sleeves': {
      title: 'Obaly na karty (Sleeves)',
      desc: 'Obaly na karty od předních světových výrobců jako Dragon Shield a Ultra Pro. Chrání karty před prachem, poškrábáním povrchu a poškozením hran při míchání a manipulaci.',
      subsubcats: [
        { id: 'all', name: 'Všechny obaly', icon: '✉️' },
        { id: 'Sleeves', name: 'Standard Sleeves', icon: '🛡️' }
      ]
    },
    'Toploaders': {
      title: 'Pevné toploadery na karty',
      desc: 'Pevné plastové obaly (toploadery) pro nekompromisní ochranu cennějších karet před ohnutím a nárazy. Ideální pro karty určené k vystavení nebo bezpečné přepravě.',
      subsubcats: [
        { id: 'all', name: 'Všechny toploadery', icon: '🛡️' },
        { id: 'Toploaders', name: 'Standard Toploaders', icon: '🔒' }
      ]
    },
    'Other': {
      title: 'Ostatní příslušenství',
      desc: 'Krabičky na balíčky (deck boxy), kostky, počítadla a další užitečné doplňky pro hráče a sběratele stolních karetních her.',
      subsubcats: [
        { id: 'all', name: 'Všechno ostatní', icon: '🎲' },
        { id: 'Other', name: 'Standardní příslušenství', icon: '📦' }
      ]
    }
  },
  'Acrylics': {
    'Pokémon': {
      title: 'Akrylové boxy pro Pokémon',
      desc: 'Vysoce kvalitní akrylové ochranné boxy s magnetickým víkem navržené speciálně na míru pro Pokémon Booster Boxy a Elite Trainer Boxy. Nabízejí UV ochranu a prémiový vzhled pro vaše investiční produkty.',
      subsubcats: [
        { id: 'all', name: 'Všechny akryly pro Pokémon', icon: '💎' },
        { id: 'Pokémon', name: 'Pokémon akryly', icon: '📦' }
      ]
    },
    'Lorcana': {
      title: 'Akrylové boxy pro Disney Lorcana',
      desc: 'Prémiové ochranné boxy z masivního akrylátu s magnetickým uzávěrem vytvořené přesně podle rozměrů Lorcana Trove boxů. Skvělá UV ochrana pro cenné edice.',
      subsubcats: [
        { id: 'all', name: 'Všechny akryly pro Lorcana', icon: '🏰' },
        { id: 'Lorcana', name: 'Lorcana akryly', icon: '📦' }
      ]
    },
    'Riftbound': {
      title: 'Akrylové boxy pro Riftbound',
      desc: 'Akrylové obaly s vysokou čistotou a magnetickým víkem pro bezpečné uložení a výstavku sealed booster boxů hry Riftbound.',
      subsubcats: [
        { id: 'all', name: 'Všechny akryly pro Riftbound', icon: '🌀' },
        { id: 'Riftbound', name: 'Riftbound akryly', icon: '📦' }
      ]
    },
    'PSA': {
      title: 'Akrylové stojánky na PSA slabs',
      desc: 'Prémiové stojánky a rámečky pro vystavení a dodatečnou ochranu vašich nejlepších graded karet od společnosti PSA.',
      subsubcats: [
        { id: 'all', name: 'Všechny akryly pro PSA', icon: '🌟' },
        { id: 'PSA', name: 'PSA akryly', icon: '🛡️' }
      ]
    }
  }
};

export default function SealedCatalog({ products, addToCart, setSelectedProductId, setActivePage, filters, setFilters }) {
  const [selectedGame, setSelectedGame] = useState(filters.game || 'all');
  const [selectedLang, setSelectedLang] = useState(filters.lang || 'all');
  const [investmentOnly, setInvestmentOnly] = useState(filters.investment || false);
  const [priceRange, setPriceRange] = useState(25000);
  const [activeSubcategory, setActiveSubcategory] = useState(filters.type || filters.subsubcat || filters.subcat || filters.gameFilter || 'all');
  const [activeSubsubcategory, setActiveSubsubcategory] = useState(filters.subsubcat || 'all');

  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setSelectedGame(filters.game || 'all');
    setSelectedLang(filters.lang || 'all');
    setInvestmentOnly(filters.investment || false);
    setActiveSubcategory(filters.type || filters.subsubcat || filters.subcat || filters.gameFilter || 'all');
    setActiveSubsubcategory(filters.subsubcat || 'all');
  }

  // Expandable description state
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('top');

  // Mobile filters sidebar
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (mobileFiltersOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [mobileFiltersOpen]);



  const sealedProducts = products.filter(p => p.type === 'sealed' || p.type === 'accessory');

  // Dynamic subcategories setup
  let subcategories = [];
  if (selectedGame === 'Pokémon') {
    subcategories = [
      { id: 'all', name: 'Pokémon TCG', icon: <img src="/Pokemon.webp" alt="" className="subcategory-img" /> },
      { id: 'Booster Box', name: 'Booster Boxy', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/552309_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Elite Trainer Box', name: 'Elite Trainer Boxy', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/506307_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Booster Bundle', name: 'Bundles', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/530267_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Booster', name: 'Boostery', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/550201_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Special Collection', name: 'Speciální kolekce', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/561990_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Other', name: 'Ostatní', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/450463_in_1000x1000.jpg" alt="" className="subcategory-img" /> }
    ];
  } else if (selectedGame === 'Lorcana') {
    subcategories = [
      { id: 'all', name: 'Lorcana TCG', icon: <img src="/lorcana logo.webp" alt="" className="subcategory-img" /> },
      { id: 'Booster Box', name: 'Booster Boxy', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/501783_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Trove Box', name: 'Trove Boxy', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/559441_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Booster', name: 'Boostery', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/482406_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Other', name: 'Ostatní', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/482407_in_1000x1000.jpg" alt="" className="subcategory-img" /> }
    ];
  } else if (selectedGame === 'One Piece') {
    subcategories = [
      { id: 'all', name: 'One Piece TCG', icon: <img src="/One piece.webp" alt="" className="subcategory-img" /> },
      { id: 'Booster Box', name: 'Booster Boxy', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/532107_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Booster', name: 'Boostery', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/536109_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Other', name: 'Ostatní', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/513361_in_1000x1000.jpg" alt="" className="subcategory-img" /> }
    ];
  } else if (selectedGame === 'Riftbound') {
    subcategories = [
      { id: 'all', name: 'Riftbound TCG', icon: <img src="/Riftbound.webp" alt="" className="subcategory-img" /> },
      { id: 'Booster Box', name: 'Booster Boxy', icon: <img src="/Riftbound.webp" alt="" className="subcategory-img" /> },
      { id: 'Booster', name: 'Boostery', icon: <img src="/Riftbound.webp" alt="" className="subcategory-img" /> },
      { id: 'Trial Deck', name: 'Trial Decky', icon: <img src="/Riftbound.webp" alt="" className="subcategory-img" /> },
      { id: 'Other', name: 'Ostatní', icon: <img src="/Riftbound.webp" alt="" className="subcategory-img" /> }
    ];
  } else if (selectedGame === 'Accessories') {
    subcategories = [
      { id: 'all', name: 'Všechno příslušenství', icon: <img src="/Prislusentstvi.webp" alt="" className="subcategory-img" /> },
      { id: 'cards', name: 'Na karty', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/142827_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'toploaders', name: 'Na toploadery', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/142827_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'graded', name: 'Na graded karty', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/142827_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Sleeves', name: 'Sleevy', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/122159_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Toploaders', name: 'Toploadery', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/142981_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Other', name: 'Ostatní', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/142827_in_1000x1000.jpg" alt="" className="subcategory-img" /> }
    ];
  } else if (selectedGame === 'Acrylics') {
    subcategories = [
      { id: 'all', name: 'Všechny akryly', icon: <img src="/acrylic-etb-box.png" alt="" className="subcategory-img" /> },
      { id: 'Pokémon', name: 'Pokémon', icon: <img src="/acrylic-etb-box.png" alt="" className="subcategory-img" /> },
      { id: 'Lorcana', name: 'Lorcana', icon: <img src="/acrylic-etb-box.png" alt="" className="subcategory-img" /> },
      { id: 'Riftbound', name: 'Riftbound', icon: <img src="/acrylic-etb-box.png" alt="" className="subcategory-img" /> },
      { id: 'PSA', name: 'Psa karty', icon: <img src="/acrylic-etb-box.png" alt="" className="subcategory-img" /> }
    ];
  } else {
    subcategories = [
      { id: 'all', name: 'Všechny produkty', icon: <img src="/Pokemon.webp" alt="" className="subcategory-img" /> }
    ];
  }

  // Filter logic
  const filteredProducts = sealedProducts.filter(product => {
    // Game selection
    if (selectedGame !== 'all') {
      if (selectedGame === 'Accessories') {
        if (product.type !== 'accessory' || product.category === 'Acrylics') return false;
      } else if (selectedGame === 'Acrylics') {
        if (product.category !== 'Acrylics') return false;
        if (filters.gameFilter && product.game !== filters.gameFilter) return false;
      } else {
        if (product.game !== selectedGame || product.category === 'Acrylics') return false;
      }
    }

    // Language selection
    if (selectedLang !== 'all' && product.lang !== selectedLang) return false;

    // Investment checkbox
    if (investmentOnly && !product.investment) return false;

    // Price range
    if (product.price > priceRange) return false;

    // Subcategories matching helper
    if (activeSubcategory !== 'all') {
      if (selectedGame === 'Accessories') {
        if (activeSubcategory === 'cards' || activeSubcategory === 'toploaders' || activeSubcategory === 'graded') {
          if (product.subcat !== 'Binders' || product.subsubcat !== activeSubcategory) return false;
        } else {
          if (product.subcat !== activeSubcategory) return false;
        }
      } else if (selectedGame === 'Acrylics') {
        if (product.game !== activeSubcategory) return false;
      } else {
        if (product.packagingType !== activeSubcategory) return false;
      }
    }

    // Subsubcategory matching helper
    if (activeSubsubcategory !== 'all') {
      if (product.subsubcategory !== activeSubsubcategory) return false;
    }

    return true;
  });

  // Sort logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'expensive') return b.price - a.price;
    if (sortBy === 'cheap') return a.price - b.price;
    if (sortBy === 'new') return b.id.localeCompare(a.id); // mock sort
    return 0; // Default: top
  });

  return (
    <div className="container fade-in" style={{ paddingTop: '20px', paddingBottom: '40px' }}>
      <h1 className="sr-only">Katalog zapečetěných TCG produktů - Sealed & Příslušenství</h1>

      {/* Breadcrumbs Navigation */}
      {(selectedGame !== 'all' || activeSubcategory !== 'all') && (
        <nav className="breadcrumbs-nav" aria-label="Drobečková navigace">
          <span className="breadcrumb-item" onClick={() => setActivePage('home')}>Domů</span>
          
          {selectedGame !== 'all' && (
            <>
              <span className="breadcrumb-separator">/</span>
              {activeSubcategory === 'all' ? (
                <span className="breadcrumb-item active">{selectedGame}</span>
              ) : (
                <span 
                  className="breadcrumb-item" 
                  onClick={() => { 
                    setActiveSubcategory('all'); 
                    setActiveSubsubcategory('all'); 
                    setFilters(prev => ({ ...prev, type: undefined, subcat: undefined, subsubcat: undefined, gameFilter: undefined })); 
                  }}
                >
                  {selectedGame}
                </span>
              )}
            </>
          )}

          {activeSubcategory !== 'all' && (
            <>
              <span className="breadcrumb-separator">/</span>
              {activeSubsubcategory === 'all' ? (
                <span className="breadcrumb-item active">
                  {subcategories.find(s => s.id === activeSubcategory)?.name}
                </span>
              ) : (
                <span 
                  className="breadcrumb-item" 
                  onClick={() => { 
                    setActiveSubsubcategory('all'); 
                    setFilters(prev => ({ ...prev, subsubcat: undefined })); 
                  }}
                >
                  {subcategories.find(s => s.id === activeSubcategory)?.name}
                </span>
              )}
            </>
          )}

          {activeSubsubcategory !== 'all' && (
            <>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item active">
                {subSubcategoriesConfig[selectedGame]?.[activeSubcategory]?.subsubcats?.find(s => s.id === activeSubsubcategory)?.name || activeSubsubcategory}
              </span>
            </>
          )}
        </nav>
      )}

      {/* Main Split Layout */}
      <div className="catalog-split-container">

        {/* LEFT COLUMN: Sidebar Filters & Deal of the Day */}
        <aside className={`catalog-sidebar ${mobileFiltersOpen ? 'mobile-open' : ''}`}>

          {/* Mobile Sidebar Close Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="catalog-sidebar-title">Filtry a akce</h3>
            <button
              className="mobile-only-close-btn"
              onClick={() => setMobileFiltersOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Deal of the Day Sidebar Widget */}
          <DealOfTheDay
            products={products}
            addToCart={addToCart}
            setSelectedProductId={setSelectedProductId}
            setActivePage={setActivePage}
          />

          {/* Filter: Karetní hra */}
          <div className="sidebar-filter-section">
            <h4 className="sidebar-filter-title">Karetní hra</h4>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="sidebar-select"
            >
              <option value="all">Všechny hry</option>
              <option value="Pokémon">Pokémon TCG</option>
              <option value="Lorcana">Disney Lorcana</option>
              <option value="One Piece">One Piece TCG</option>
              <option value="Riftbound">Riftbound</option>
              <option value="Accessories">Příslušenství</option>
              <option value="Acrylics">Akryly</option>
            </select>
          </div>

          {/* Filter: Jazyk */}
          <div className="sidebar-filter-section">
            <h4 className="sidebar-filter-title">Jazyk balení</h4>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="sidebar-select"
            >
              <option value="all">Všechny jazyky</option>
              <option value="EN">Angličtina (ENG) 🇬🇧</option>
              <option value="JP">Japonština (JPN) 🇯🇵</option>
              <option value="CN">Čínština (CHN) 🇨🇳</option>
              <option value="KR">Korejština (KOR) 🇰🇷</option>
            </select>
          </div>

          {/* Filter: Investiční edice */}
          <div className="sidebar-filter-section">
            <label className="sidebar-checkbox-label" style={{ fontWeight: '700' }}>
              <input
                type="checkbox"
                checked={investmentOnly}
                onChange={(e) => setInvestmentOnly(e.target.checked)}
                className="sidebar-checkbox"
              />
              <span>Pouze investiční edice 💎</span>
            </label>
          </div>

          {/* Filter: Price Range slider */}
          <div className="sidebar-filter-section">
            <h4 className="sidebar-filter-title">Maximální cena</h4>
            <div className="sidebar-range-box">
              <input
                type="range"
                min="0"
                max="25000"
                step="250"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="sidebar-range-input"
              />
              <span className="sidebar-range-value">{priceRange.toLocaleString()} Kč</span>
            </div>
          </div>

          {/* Clear Filters Button */}
          <button
            className="btn btn-secondary sidebar-reset-btn"
            onClick={() => {
              setSelectedGame('all');
              setSelectedLang('all');
              setInvestmentOnly(false);
              setPriceRange(25000);
              setActiveSubcategory('all');
              setFilters({});
              setMobileFiltersOpen(false);
            }}
          >
            Smazat filtry
          </button>
        </aside>

        {/* RIGHT COLUMN: Headers, Subcategories, Toolbar & Products Grid */}
        <main className="catalog-main">

          {/* Header Introduction Box */}
          {activeSubcategory === 'all' ? (
            <div className="category-intro-box">
              <h2 className="category-title">{gameInfo[selectedGame]?.title || 'Katalog'}</h2>
              <div className="category-description-wrapper">
                <p className={`category-description-text ${!isDescExpanded ? 'collapsed' : ''}`}>
                  {gameInfo[selectedGame]?.desc || 'Vstupte do světa originálních zapečetěných Pokémon, Disney Lorcana, One Piece, Riftbound produktů, herního příslušenství a prémiových akrylových boxů. Nabízíme široký výběr booster boxů, dárkových Elite Trainer Boxů, Trove boxů, booster bundlů i samostatných balíčků.'}
                </p>
                <button
                  className="description-toggle-btn"
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                >
                  {isDescExpanded ? 'Méně informací ▲' : 'Více informací ▼'}
                </button>
              </div>
            </div>
          ) : activeSubsubcategory !== 'all' ? (
            <div className="category-intro-box">
              <h2 className="category-title">
                {`${selectedGame === 'Pokémon' ? 'Pokémon TCG' : selectedGame} ${subSubcategoriesConfig[selectedGame]?.[activeSubcategory]?.subsubcats?.find(s => s.id === activeSubsubcategory)?.name}`}
              </h2>
            </div>
          ) : (
            <div className="category-intro-box">
              <h2 className="category-title">
                {subSubcategoriesConfig[selectedGame]?.[activeSubcategory]?.title || `${selectedGame} - ${subcategories.find(s => s.id === activeSubcategory)?.name}`}
              </h2>
              <div className="category-description-wrapper">
                <p className={`category-description-text ${!isDescExpanded ? 'collapsed' : ''}`}>
                  {subSubcategoriesConfig[selectedGame]?.[activeSubcategory]?.desc || 'Detailní popis subkategorie se připravuje.'}
                </p>
                <button
                  className="description-toggle-btn"
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                >
                  {isDescExpanded ? 'Méně informací ▲' : 'Více informací ▼'}
                </button>
              </div>
            </div>
          )}

          {/* Subcategories or Sub-subcategories Grid Selection */}
          {activeSubcategory === 'all' ? (
            subcategories.length > 0 && (
              <>
                <div className="subcategories-section-title">
                  {selectedGame === 'Accessories' ? 'Vyberte kategorii doplňků' : selectedGame === 'Acrylics' ? 'Kompatibilita akrylového boxu' : 'Vyberte typ balení'}
                </div>
                <div className="subcategory-grid">
                  {subcategories.map(sub => {
                    const hasImage = sub.icon && sub.icon.props && sub.icon.props.src;
                    return (
                      <div
                        key={sub.id}
                        className={`subcategory-box ${activeSubcategory === sub.id ? 'active' : ''}`}
                        onClick={() => {
                          setActiveSubcategory(sub.id);
                          setActiveSubsubcategory('all');
                          setFilters(prev => ({ 
                            ...prev, 
                            type: sub.id === 'all' ? undefined : sub.id, 
                            subcat: undefined, 
                            subsubcat: undefined, 
                            gameFilter: undefined 
                          }));
                        }}
                      >
                        <span className={`subcategory-icon ${hasImage ? 'clean-img-container' : ''}`}>
                          {sub.icon}
                        </span>
                        <span className="subcategory-name">{sub.name}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          ) : (
            subSubcategoriesConfig[selectedGame]?.[activeSubcategory]?.subsubcats && activeSubsubcategory === 'all' && (
              <>
                <div className="subcategories-section-title">
                  Upřesněte typ balení
                </div>
                <div className="subcategory-grid">
                  {subSubcategoriesConfig[selectedGame][activeSubcategory].subsubcats.filter(sub => sub.id !== 'all').map(sub => {
                    const isEmoji = typeof sub.icon === 'string';
                    return (
                      <div
                        key={sub.id}
                        className={`subcategory-box ${activeSubsubcategory === sub.id ? 'active' : ''}`}
                        onClick={() => {
                          setActiveSubsubcategory(sub.id);
                          setFilters(prev => ({
                            ...prev,
                            subsubcat: sub.id === 'all' ? undefined : sub.id
                          }));
                        }}
                      >
                        <span className="subcategory-icon" style={{ fontSize: isEmoji ? '24px' : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {sub.icon}
                        </span>
                        <span className="subcategory-name">{sub.name}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          )}

          {/* Toolbar panel */}
          <div className="catalog-toolbar">
            <div className="toolbar-left-group">
              {/* Sort Tabs */}
              <div className="sort-tabs-list">
                <button
                  className={`sort-tab-btn ${sortBy === 'top' ? 'active' : ''}`}
                  onClick={() => setSortBy('top')}
                >
                  TOP
                </button>
                <button
                  className={`sort-tab-btn ${sortBy === 'expensive' ? 'active' : ''}`}
                  onClick={() => setSortBy('expensive')}
                >
                  Nejdražší
                </button>
                <button
                  className={`sort-tab-btn ${sortBy === 'cheap' ? 'active' : ''}`}
                  onClick={() => setSortBy('cheap')}
                >
                  Nejlevnější
                </button>
                <button
                  className={`sort-tab-btn ${sortBy === 'new' ? 'active' : ''}`}
                  onClick={() => setSortBy('new')}
                >
                  Novinky
                </button>
              </div>
            </div>

            <div className="toolbar-right-group">
              {/* Counter */}
              <span className="results-counter">
                Celkem nalezeno: <strong>{sortedProducts.length}</strong> produktů
              </span>

              {/* Filters Trigger (Mobile only) */}
              <button
                className="mobile-filters-trigger"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Filtry
              </button>
            </div>
          </div>

          {/* Products Grid */}
          {sortedProducts.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '48px' }}>📦</span>
              <h3>Nebyly nalezeny žádné produkty</h3>
              <p style={{ color: 'var(--text-muted)' }}>Zkuste změnit výběr filtrů nebo subkategorií.</p>
            </div>
          ) : (
            <div className="catalog-product-grid">
              {sortedProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  addToCart={addToCart}
                  setSelectedProductId={setSelectedProductId}
                  setActivePage={setActivePage}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Lightbox Modal overlay for subcategory icon zoom */}
    </div>
  );
}
