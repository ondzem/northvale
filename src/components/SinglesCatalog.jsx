import { useState, useEffect } from 'react';
import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';
import ProductCard from './ProductCard';
import DealOfTheDay from './DealOfTheDay';
import { fetchCategoriesFromDB, mockCategories } from '../services/categories';

function getGameFallbackLogo(game) {
  switch (game) {
    case 'Pokémon': return '/Pokemon.webp';
    case 'Lorcana': return '/lorcana logo.webp';
    case 'One Piece': return '/One piece.webp';
    case 'Riftbound': return '/Riftbound.webp';
    case 'Accessories': return '/Prislusentstvi.webp';
    case 'Acrylics': return '/acrylic-etb-box.png';
    default: return '/Northvale Logo.webp';
  }
}

export function getHistoricalFilterForCategory(catId) {
  const mapping = {
    'pokemon-booster-box': { packagingType: 'Booster Box' },
    'pokemon-etb': { packagingType: 'Elite Trainer Box' },
    'pokemon-bundles': { packagingType: 'Booster Bundle' },
    'pokemon-boostery': { packagingType: 'Booster' },
    'pokemon-special': { packagingType: 'Special Collection' },
    'pokemon-other': { packagingType: 'Other' },
    
    'lorcana-booster-box': { packagingType: 'Booster Box' },
    'lorcana-trove-box': { packagingType: 'Trove Box' },
    'lorcana-boostery': { packagingType: 'Booster' },
    'lorcana-other': { packagingType: 'Other' },
    
    'onepiece-booster-box': { packagingType: 'Booster Box' },
    'onepiece-boostery': { packagingType: 'Booster' },
    'onepiece-other': { packagingType: 'Other' },
    
    'riftbound-booster-box': { packagingType: 'Booster Box' },
    'riftbound-boostery': { packagingType: 'Booster' },
    'riftbound-trial-decky': { packagingType: 'Trial Deck' },
    'riftbound-other': { packagingType: 'Other' },
    
    'cat-sleeves': { subcat: 'Sleeves' },
    'cat-toploaders': { subcat: 'Toploaders' },
    'cat-binders': { subcat: 'Binders' },
    'cat-other-acc': { subcat: 'Other' },
    
    'acc-albums-cards': { subcat: 'Binders', subsubcat: 'cards' },
    'acc-albums-toploaders': { subcat: 'Binders', subsubcat: 'toploaders' },
    'acc-albums-graded': { subcat: 'Binders', subsubcat: 'graded' },
    
    // Sub-subcategories for sealed
    'pokemon-draft-booster-box': { subsubcategory: 'Draft Booster Box' },
    'pokemon-collector-booster-box': { subsubcategory: 'Collector Booster Box' },
    'pokemon-set-booster-box': { subsubcategory: 'Set Booster Box' },
    'pokemon-jumpstart-booster-box': { subsubcategory: 'Jumpstart Booster Box' },
    'pokemon-japanese-booster-box': { subsubcategory: 'Japanese Booster Box' },
    'pokemon-chinese-booster-box': { subsubcategory: 'Chinese Booster Box' },
    'pokemon-standard-etb': { subsubcategory: 'Standard ETB' },
    'pokemon-center-etb': { subsubcategory: 'Pokémon Center ETB' },
    'pokemon-booster-bundle': { subsubcategory: 'Booster Bundle' },
    'pokemon-standard-booster': { subsubcategory: 'Standard Booster' },
    'pokemon-japanese-booster': { subsubcategory: 'Japanese Booster' },
    'pokemon-chinese-booster': { subsubcategory: 'Chinese Booster' },
    'pokemon-premium-collection': { subsubcategory: 'Premium Collection' },
    'pokemon-japanese-special-set': { subsubcategory: 'Japanese Special Set' },
    'pokemon-sealed-case': { subsubcategory: 'Sealed Case' },
    'pokemon-japanese-other': { subsubcategory: 'Japanese Other' },
    
    'lorcana-standard-booster-box': { subsubcategory: 'Standard Booster Box' },
    'lorcana-illumineers-trove': { subsubcategory: 'Illumineer\'s Trove' },
    'lorcana-standard-booster': { subsubcategory: 'Standard Booster' },
    'lorcana-starter-deck': { subsubcategory: 'Starter Deck' },
    
    'onepiece-english-booster-box': { subsubcategory: 'English Booster Box' },
    'onepiece-english-booster-pack': { subsubcategory: 'English Booster Pack' },
    'onepiece-starter-deck': { subsubcategory: 'Starter Deck' },
    
    'riftbound-standard-booster-box': { subsubcategory: 'Standard Booster Box' },
    'riftbound-standard-booster-pack': { subsubcategory: 'Standard Booster Pack' },
    'riftbound-standard-trial-deck': { subsubcategory: 'Standard Trial Deck' },
    'riftbound-official-playmat': { subsubcategory: 'Official Playmat' },
  };
  
  return mapping[catId] || null;
}

export function matchesHistoricalCategory(product, catId) {
  if (product.category_id === catId) {
    return true;
  }
  
  const hist = getHistoricalFilterForCategory(catId);
  if (!hist) {
    const nameLower = product.name?.toLowerCase() || '';
    switch (catId) {
      case 'cat-acrylics-booster':
        return product.category === 'Acrylics' && nameLower.includes('booster box');
      case 'cat-acrylics-etb':
        return product.category === 'Acrylics' && (nameLower.includes('elite trainer') || nameLower.includes('etb'));
      case 'cat-acrylics-trove':
        return product.category === 'Acrylics' && nameLower.includes('trove');
      case 'cat-acrylics-slabs':
        return product.category === 'Acrylics' && (nameLower.includes('slab') || nameLower.includes('graded') || nameLower.includes('stojánky'));
      case 'acrylic-pokemon-booster':
        return product.category === 'Acrylics' && product.game === 'Pokémon' && nameLower.includes('booster box');
      case 'acrylic-pokemon-etb':
        return product.category === 'Acrylics' && product.game === 'Pokémon' && (nameLower.includes('elite trainer') || nameLower.includes('etb'));
      case 'acrylic-lorcana-trove':
        return product.category === 'Acrylics' && product.game === 'Lorcana' && nameLower.includes('trove');
      default:
        return false;
    }
  }
  
  for (const [key, val] of Object.entries(hist)) {
    if (product[key] !== val) return false;
  }
  return true;
}

export function getCategoryAndDescendantIds(catId, categories) {
  const ids = [catId];
  const queue = [catId];
  while (queue.length > 0) {
    const current = queue.shift();
    const children = categories.filter(c => c.parent_id === current);
    for (const child of children) {
      if (!ids.includes(child.id)) {
        ids.push(child.id);
        queue.push(child.id);
      }
    }
  }
  return ids;
}

export function resolveActiveCategoryFromFilters(game, filters, categories) {
  if (filters.category_id) {
    return filters.category_id;
  }
  
  const gameCats = categories.filter(c => c.game === game);
  for (const cat of gameCats) {
    const hist = getHistoricalFilterForCategory(cat.id);
    if (hist) {
      let match = true;
      for (const [key, val] of Object.entries(hist)) {
        const filterVal = filters[key] || (key === 'packagingType' ? filters.type : null) || (key === 'subcat' ? filters.subcat : null) || (key === 'subsubcat' ? filters.subsubcat : null);
        if (filterVal !== val) {
          match = false;
          break;
        }
      }
      if (match) return cat.id;
    }
  }
  return 'all';
}

export function getDisplaySubcategories(game, type, categories, lang) {
  const root = categories.find(c => c.game === game && c.parent_id === null);
  if (!root) {
    return [{
      id: 'all',
      name: game ? `${game} TCG` : 'Všechny',
      icon: <img src={getGameFallbackLogo(game)} alt="" className="subcategory-img" />
    }];
  }
  
  let children = categories.filter(c => c.parent_id === root.id);
  
  if (type === 'single') {
    children = children.filter(c => c.type === 'single');
  } else if (type === 'sealed') {
    children = children.filter(c => c.type === 'sealed' || c.type === 'accessory');
  }
  
  if (children.length === 0 && type === 'single') {
    if (game === 'Pokémon') {
      return [
        { id: 'all', name: 'Pokémon TCG', icon: <img src="/Pokemon.webp" alt="" className="subcategory-img" /> },
        { id: 'Alternate Art', name: 'Alternate Art', icon: <img src="https://images.pokemontcg.io/swsh11/186.png" alt="" className="subcategory-img" /> },
        { id: 'Special Illustration Rare', name: 'Special Illustration', icon: <img src="https://images.pokemontcg.io/sv3/223.png" alt="" className="subcategory-img" /> },
        { id: 'Secret Rare', name: 'Secret Rare', icon: <img src="https://images.pokemontcg.io/swsh7/218.png" alt="" className="subcategory-img" /> },
        { id: 'Rainbow Rare', name: 'Rainbow Rare', icon: <img src="https://images.pokemontcg.io/swsh4/188.png" alt="" className="subcategory-img" /> },
      ];
    } else if (game === 'Lorcana') {
      return [
        { id: 'all', name: 'Lorcana TCG', icon: <img src="/lorcana logo.webp" alt="" className="subcategory-img" /> },
        { id: 'Common', name: 'Common', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
        { id: 'Uncommon', name: 'Uncommon', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
        { id: 'Rare', name: 'Rare', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
        { id: 'Super Rare', name: 'Super Rare', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
        { id: 'Legendary', name: 'Legendary', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
        { id: 'Enchanted', name: 'Enchanted', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      ];
    } else if (game === 'One Piece') {
      return [
        { id: 'all', name: 'One Piece TCG', icon: <img src="/One piece.webp" alt="" className="subcategory-img" /> },
        { id: 'Common', name: 'Common', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
        { id: 'Uncommon', name: 'Uncommon', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
        { id: 'Rare', name: 'Rare', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
        { id: 'Super Rare', name: 'Super Rare', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
        { id: 'Secret Rare', name: 'Secret Rare', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
        { id: 'Leader', name: 'Leader', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
        { id: 'Alternate Art', name: 'Alternate Art', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      ];
    }
  }
  
  const formatted = [
    {
      id: 'all',
      name: lang === 'CZ' ? root.name_cz : root.name_en,
      icon: <img src={root.image_url || getGameFallbackLogo(game)} alt="" className="subcategory-img" />
    }
  ];
  
  children.forEach(child => {
    formatted.push({
      id: child.id,
      name: lang === 'CZ' ? child.name_cz : child.name_en,
      icon: <img src={child.image_url || getGameFallbackLogo(game)} alt="" className="subcategory-img" />
    });
  });
  
  return formatted;
}

const gameInfo = {
  'Pokémon': {
    title: 'Pokémon Kusovky',
    desc: 'Objevte širokou nabídku Pokémon kusových karet z nejnovějších i starších edicí. Od běžných karet po extrémně vzácné kousky Alternate Art a Special Illustration Rare. Garantujeme 100% originalitu a precizní posouzení stavu každé nabízené karty. Naše nabídka Pokémon kusovek je denně aktualizována. Každá karta prochází přísnou kontrolou kvality, abychom zajistili přesné zařazení do stavových kategorií. Využijte náš pokročilý filtr pro rychlé nalezení konkrétních karet do vašeho herního balíčku nebo sbírky. Pro turnajové hráče doporučujeme použít náš inovativní Decklist Importer, se kterým naplníte košík celým seznamem karet během několika sekund.',
    enTitle: 'Pokémon Singles',
    enDesc: 'Discover a wide selection of Pokémon single cards from the latest and vintage sets. From common cards to extremely rare Alternate Art and Special Illustration Rare pieces. We guarantee 100% authenticity and precise condition grading for every card. Our inventory of Pokémon singles is updated daily. Every card undergoes a strict quality control inspection to ensure correct condition grading. Use our advanced filter system to quickly find specific cards for your deck or collection. For tournament players, we recommend using our innovative Decklist Importer, which fills your cart with a complete list of cards in seconds.'
  },
  'Lorcana': {
    title: 'Disney Lorcana Kusovky',
    desc: 'Prozkoumejte naši nabídku kusových karet Disney Lorcana. Najděte chybějící karty do své sbírky nebo herního balíčku, od běžných karet až po vzácné Enchanted verze oblíbených postav. Zaručujeme kvalitu a originalitu všech karet, které pečlivě třídíme podle stavu a edic. Prozkoumejte magický svět Lorcana s našimi prémiovými kartami.',
    enTitle: 'Disney Lorcana Singles',
    enDesc: 'Explore our selection of Disney Lorcana singles. Find the missing cards for your collection or deck, from common cards to rare Enchanted versions of popular characters. We guarantee the quality and authenticity of all cards, which are carefully sorted by condition and set. Explore the magical world of Lorcana with our premium cards.'
  },
  'One Piece': {
    title: 'One Piece Kusovky',
    desc: 'Kompletní výběr kusových karet z One Piece Card Game. Od základních karet po Alternate Art a Secret Rare sběratelské kusy. Všechny karty jsou detailně zkontrolovány, abychom zaručili jejich stav a pravost. Sestavte si svůj pirátský balíček s nejlepšími lídry a charaktery.',
    enTitle: 'One Piece Singles',
    enDesc: 'A complete selection of single cards from the One Piece Card Game. From basic cards to Alternate Art and Secret Rare collector pieces. All cards are inspected in detail to guarantee their condition and authenticity. Build your pirate crew deck with the best leaders and characters.'
  },
  'Riftbound': {
    title: 'Riftbound Kusovky',
    desc: 'Najděte ty správné kusové karty pro taktickou hru Riftbound. Doplňte svůj balíček o klíčové jednotky a kouzla. Garantujeme rychlé doručení a výborný stav všech herních karet. Získejte převahu na bojišti s těmi správnými strategickými kartami.',
    enTitle: 'Riftbound Singles',
    enDesc: 'Find the right single cards for the tactical game Riftbound. Complete your deck with key units and spells. We guarantee fast delivery and excellent condition for all game cards. Gain the upper hand on the battlefield with the right strategic cards.'
  }
};

const subSubcategoriesConfig = {
  'Pokémon': {
    'Alternate Art': {
      title: 'Pokémon Alternate Art karty',
      desc: 'Alternate Art (Alt Art) karty jsou jedny z nejvyhledávanějších a nejcennějších karet moderní éry Pokémon TCG. Tyto karty nahrazují tradiční zobrazení Pokémona detailní, celoplošnou uměleckou ilustrací, která často vypráví příběh nebo zachycuje Pokémona v jeho přirozeném prostředí. Mají extrémně nízký poměr otevírání z boosterů a představují skvělou sběratelskou i investiční příležitost.',
      subsubcats: [
        { id: 'all', name: 'Všechny Alt Arty', icon: '🎨' },
        { id: 'Alternate Art', name: 'Standard Alt Art', icon: '✨' },
        { id: 'Alternate Art Secret Rare', name: 'Secret Rare Alt Art', icon: '👑' }
      ]
    },
    'Special Illustration Rare': {
      title: 'Pokémon Special Illustration Rare karty',
      desc: 'Special Illustration Rare (SIR) jsou zlatým standardem moderních sérií ze éry Scarlet & Violet. Tyto karty se vyznačují dechberoucími celoplošnými kresbami od renomovaných ilustrátorů, které přetvářejí ikonické Pokémony do uměleckých děl. Každá karta je opatřena jedinečnou texturou a foilovým efektem.',
      subsubcats: [
        { id: 'all', name: 'Všechny SIR', icon: '🌟' },
        { id: 'Special Illustration', name: 'Special Illustration', icon: '🎨' }
      ]
    },
    'Secret Rare': {
      title: 'Pokémon Secret Rare karty',
      desc: 'Secret Rare karty jsou karty, jejichž číslo edice přesahuje oficiální počet karet v setu (např. 215/198). Tyto karty bývají vyvedeny ve zlatém provedení, s duhovým efektem nebo jako speciální celoplošné ilustrace. Jsou ozdobou každého sběratelského alba.',
      subsubcats: [
        { id: 'all', name: 'Všechny Secret Rare', icon: '🔑' },
        { id: 'Alternate Art Secret Rare', name: 'Secret Rare Alt Art', icon: '✨' }
      ]
    },
    'Rainbow Rare': {
      title: 'Pokémon Rainbow Rare karty',
      desc: 'Rainbow Rare (duhové) karty byly představeny v éře Sun & Moon a pokračovaly v éře Sword & Shield. Tyto karty mají charakteristický stříbřitě duhový třpytivý povrch s výraznou texturou, který pokrývá celou plochu karty. Jsou vysoce ceněny pro svůj unikátní estetický vzhled.',
      subsubcats: [
        { id: 'all', name: 'Všechny Rainbow Rare', icon: '🌈' },
        { id: 'Rainbow Rare', name: 'Rainbow Rare', icon: '✨' }
      ]
    }
  },
  'Lorcana': {
    'Enchanted': {
      title: 'Disney Lorcana Enchanted karty',
      desc: 'Enchanted karty jsou nejvzácnějšími a sběratelsky nejcennějšími kartami v Disney Lorcana. Mají nádhernou bezrámovou alternativní ilustraci pokrytou speciálním duhovým „foil“ efektem. Pravděpodobnost otevření Enchanted karty z boosteru je extrémně nízká, což z nich dělá vysoce ceněné sběratelské klenoty.',
      subsubcats: [
        { id: 'all', name: 'Všechny Enchanted', icon: '✨' },
        { id: 'Enchanted', name: 'Enchanted', icon: '🦄' }
      ]
    },
    'Legendary': {
      title: 'Disney Lorcana Legendary karty',
      desc: 'Legendary karty představují nejvyšší standardní vzácnost v balíčcích Disney Lorcana (před Enchanted). Tyto karty mají silné herní schopnosti a nádherný foilový nebo nefoilový vzhled. Jsou klíčové pro stavbu kompetitivních herních balíčků.',
      subsubcats: [
        { id: 'all', name: 'Všechny Legendary', icon: '🐉' },
        { id: 'Legendary', name: 'Legendary', icon: '💎' }
      ]
    },
    'Super Rare': {
      title: 'Disney Lorcana Super Rare karty',
      desc: 'Super Rare karty jsou další významnou úrovní vzácnosti v Disney Lorcana. Často obsahují velmi užitečné postavy a akční karty, které tvoří pilíře mnoha herních strategií.',
      subsubcats: [
        { id: 'all', name: 'Všechny Super Rare', icon: '🌟' }
      ]
    },
    'Rare': {
      title: 'Disney Lorcana Rare karty',
      desc: 'Rare (vzácné) karty jsou v každém boosteru garantovány v počtu dvou kusů (pokud nejsou nahrazeny vyšší vzácností). Nabízejí pestrou škálu zajímavých efektů a postav.',
      subsubcats: [
        { id: 'all', name: 'Všechny Rare', icon: '🛡️' }
      ]
    },
    'Uncommon': {
      title: 'Disney Lorcana Uncommon karty',
      desc: 'Uncommon (neobvyklé) karty doplňují herní balíčky o důležité synergické karty a postavy.',
      subsubcats: [
        { id: 'all', name: 'Všechny Uncommon', icon: '⚡' }
      ]
    },
    'Common': {
      title: 'Disney Lorcana Common karty',
      desc: 'Common (běžné) karty tvoří základní kostru každého herního balíčku a sbírky. Obsahují základní verze mnoha oblíbených postav.',
      subsubcats: [
        { id: 'all', name: 'Všechny Common', icon: '🍃' }
      ]
    }
  },
  'One Piece': {
    'Alternate Art': {
      title: 'One Piece Alternate Art karty',
      desc: 'Alternate Art (Alt Art) karty v One Piece Card Game se vyznačují exkluzivními ilustracemi postav a vůdců, které se liší od standardních verzí v setu. Nejvzácnější z nich jsou takzvané Manga Rare karty, které mají na pozadí ikonické panely z manga předlohy Eiichira Ody. Jsou svatým grálem pro všechny fanoušky Slamáků.',
      subsubcats: [
        { id: 'all', name: 'Všechny Alt Arty', icon: '🏴‍☠️' },
        { id: 'Alternate Art', name: 'Standard Alt Art', icon: '✨' }
      ]
    },
    'Secret Rare': {
      title: 'One Piece Secret Rare karty',
      desc: 'Secret Rare (SEC) karty jsou nejvyšší standardní vzácností v každém setu One Piece Card Game. Mají úchvatné zpracování a jsou velmi silné v samotné hře.',
      subsubcats: [
        { id: 'all', name: 'Všechny Secret Rare', icon: '🪙' }
      ]
    },
    'Leader': {
      title: 'One Piece Leader karty',
      desc: 'Leader (vůdce) karty určují barvu a strategii vašeho celého One Piece balíčku. Nabízíme jak standardní Leader karty, tak jejich vzácné Alternate Art verze s celoplošným zobrazením obličeje postavy.',
      subsubcats: [
        { id: 'all', name: 'Všechny Leadery', icon: '👑' }
      ]
    },
    'Super Rare': {
      title: 'One Piece Super Rare karty',
      desc: 'Super Rare (SR) karty tvoří klíčové bojovníky a události pro sestavení konkurenceschopného balíčku.',
      subsubcats: [
        { id: 'all', name: 'Všechny Super Rare', icon: '🌟' }
      ]
    },
    'Rare': {
      title: 'One Piece Rare karty',
      desc: 'Vzácné (R) karty v One Piece Card Game přinášejí důležité efekty a podporu pro vaše pirátské posádky.',
      subsubcats: [
        { id: 'all', name: 'Všechny Rare', icon: '🛡️' }
      ]
    },
    'Uncommon': {
      title: 'One Piece Uncommon karty',
      desc: 'Neobvyklé (UC) karty poskytují nezbytné synergie a doplňkové postavy pro stabilní hru.',
      subsubcats: [
        { id: 'all', name: 'Všechny Uncommon', icon: '⚡' }
      ]
    },
    'Common': {
      title: 'One Piece Common karty',
      desc: 'Běžné (C) karty tvoří základ každé edice a jsou základním stavebním kamenem pro začínající hráče.',
      subsubcats: [
        { id: 'all', name: 'Všechny Common', icon: '🍃' }
      ]
    }
  }
};

const translateSubsubcatName = (sub, lang) => {
  if (lang === 'CZ') return sub.name;
  const mapping = {
    'Všechny Alt Arty': 'All Alt Arts',
    'Standard Alt Art': 'Standard Alt Art',
    'Secret Rare Alt Art': 'Secret Rare Alt Art',
    'Všechny SIR': 'All SIRs',
    'Special Illustration': 'Special Illustration',
    'Všechny Secret Rare': 'All Secret Rares',
    'Všechny Rainbow Rare': 'All Rainbow Rares',
    'Rainbow Rare': 'Rainbow Rare',
    'Všechny Enchanted': 'All Enchanteds',
    'Enchanted': 'Enchanted',
    'Všechny Legendary': 'All Legendaries',
    'Legendary': 'Legendary',
    'Všechny Super Rare': 'All Super Rares',
    'Všechny Rare': 'All Rares',
    'Všechny Uncommon': 'All Uncommons',
    'Všechny Common': 'All Commons',
    'Všechny Leadery': 'All Leaders',
    'Leader': 'Leader',
    'Všechno ostatní': 'All Others',
    'Sealed Case': 'Sealed Case',
    'Japonské ostatní': 'Japanese Others',
    'Japonský Booster Box': 'Japanese Booster Box',
    'Čínský Booster Box': 'Chinese Booster Box',
    'Japonský Booster': 'Japanese Booster Pack',
    'Čínský Booster': 'Chinese Booster Pack',
    'Japonský Speciální Set': 'Japanese Special Set'
  };
  return mapping[sub.name] || sub.name;
};

const getSubSubcatTitle = (game, subcat, lang) => {
  const c = subSubcategoriesConfig[game]?.[subcat];
  if (!c) return '';
  if (lang === 'CZ') return c.title;
  
  const titles = {
    'Pokémon Alternate Art karty': 'Pokémon Alternate Art Cards',
    'Pokémon Special Illustration Rare karty': 'Pokémon Special Illustration Rare Cards',
    'Pokémon Secret Rare karty': 'Pokémon Secret Rare Cards',
    'Pokémon Rainbow Rare karty': 'Pokémon Rainbow Rare Cards',
    'Disney Lorcana Enchanted karty': 'Disney Lorcana Enchanted Cards',
    'Disney Lorcana Legendary karty': 'Disney Lorcana Legendary Cards',
    'Disney Lorcana Super Rare karty': 'Disney Lorcana Super Rare Cards',
    'Disney Lorcana Rare karty': 'Disney Lorcana Rare Cards',
    'Disney Lorcana Uncommon karty': 'Disney Lorcana Uncommon Cards',
    'Disney Lorcana Common karty': 'Disney Lorcana Common Cards',
    'One Piece Alternate Art karty': 'One Piece Alternate Art Cards',
    'One Piece Secret Rare karty': 'One Piece Secret Rare Cards',
    'One Piece Leader karty': 'One Piece Leader Cards',
    'One Piece Super Rare karty': 'One Piece Super Rare Cards',
    'One Piece Rare karty': 'One Piece Rare Cards',
    'One Piece Uncommon karty': 'One Piece Uncommon Cards',
    'One Piece Common karty': 'One Piece Common Cards'
  };
  return titles[c.title] || c.title;
};

const getSubSubcatDesc = (game, subcat, lang) => {
  const c = subSubcategoriesConfig[game]?.[subcat];
  if (!c) return '';
  if (lang === 'CZ') return c.desc;
  
  const descs = {
    'Alternate Art (Alt Art) karty jsou jedny z nejvyhledávanějších a nejcennějších karet moderní éry Pokémon TCG. Tyto karty nahrazují tradiční zobrazení Pokémona detailní, celoplošnou uměleckou ilustrací, která často vypráví příběh nebo zachycuje Pokémona v jeho přirozeném prostředí. Mají extrémně nízký poměr otevírání z boosterů a představují skvělou sběratelskou i investiční příležitost.':
      'Alternate Art (Alt Art) cards are some of the most sought-after and valuable cards of the modern Pokémon TCG era. These cards replace the traditional artwork with a detailed, full-art illustration that often tells a story or depicts the Pokémon in its natural habitat. They have extremely low pull rates from booster packs and represent a great collecting and investment opportunity.',
    'Special Illustration Rare (SIR) jsou zlatým standardem moderních sérií ze éry Scarlet & Violet. Tyto karty se vyznačují dechberoucími celoplošnými kresbami od renomovaných ilustrátorů, které přetvářejí ikonické Pokémony do uměleckých děl. Každá karta je opatřena jedinečnou texturou a foilovým efektem.':
      'Special Illustration Rare (SIR) cards are the gold standard of modern Scarlet & Violet series. These cards feature breathtaking full-art illustrations by renowned artists, transforming iconic Pokémon into works of art. Each card is finished with a unique texture and foil effect.',
    'Secret Rare karty jsou karty, jejichž číslo edice přesahuje oficiální počet karet v setu (např. 215/198). Tyto karty bývají vyvedeny ve zlatém provedení, s duhovým efektem nebo jako speciální celoplošné ilustrace. Jsou ozdobou každého sběratelského alba.':
      'Secret Rare cards are cards whose set number exceeds the official set size (e.g., 215/198). These cards are typically designed in gold, with a rainbow pattern, or as special full-art illustrations. They are the crowning jewel of any collector album.',
    'Rainbow Rare (duhové) karty byly představeny v éře Sun & Moon a pokračovaly v éře Sword & Shield. Tyto karty mají charakteristický stříbrytě duhový třpytivý povrch s výraznou texturou, který pokrývá celou plochu karty. Jsou vysoce ceněny pro svůj unikátní estetický vzhled.':
      'Rainbow Rare cards were introduced in the Sun & Moon era and continued through the Sword & Shield era. These cards feature a signature silvery-rainbow shimmering surface with a distinct texture covering the entire card. They are highly valued for their unique aesthetic.',
    'Enchanted karty jsou nejvzácnějšími a sběratelsky nejcennějšími kartami v Disney Lorcana. Mají nádhernou bezrámovou alternativní ilustraci pokrytou speciálním duhovým „foil“ efektem. Pravděpodobnost otevření Enchanted karty z boosteru je extrémně nízká, což z nich dělá vysoce ceněné sběratelské klenoty.':
      'Enchanted cards are the rarest and most collectible cards in Disney Lorcana. They feature beautiful borderless alternative artwork with a special shimmering foil effect. The probability of opening an Enchanted card from a booster pack is extremely low, making them highly prized collector gems.',
    'Legendary karty představují nejvyšší standardní vzácnost v balíčcích Disney Lorcana (před Enchanted). Tyto karty mají silné herní schopnosti a nádherný foilový nebo nefoilový vzhled. Jsou klíčové pro stavbu kompetitivních herních balíčků.':
      'Legendary cards represent the highest standard rarity in Disney Lorcana booster packs (below Enchanted). These cards feature powerful gameplay abilities and a beautiful foil or non-foil finish. They are key to building competitive decks.',
    'Super Rare karty jsou další významnou úrovní vzácnosti v Disney Lorcana. Často obsahují velmi užitečné postavy a akční karty, které tvoří pilíře mnoha herních strategií.':
      'Super Rare cards are another key rarity tier in Disney Lorcana. They often contain very useful characters and action cards that form the backbone of many game strategies.',
    'Rare (vzácné) karty jsou v každém boosteru garantovány v počtu dvou kusů (pokud nejsou nahrazeny vyšší vzácností). Nabízejí pestrou škálu zajímavých efektů a postav.':
      'Rare cards are guaranteed at a rate of two per booster pack (unless replaced by a higher rarity). They offer a wide range of interesting effects and characters.',
    'Uncommon (neobvyklé) karty doplňují herní balíčky o důležité synergické karty a postavy.':
      'Uncommon cards supply decks with important synergistic cards and characters.',
    'Common (běžné) karty tvoří základní kostru každého herního balíčku a sbírky. Obsahují základní verze mnoha oblíbených postav.':
      'Common cards form the core of every game deck and collection. They contain basic versions of many fan-favorite characters.',
    'Alternate Art (Alt Art) karty v One Piece Card Game se vyznačují exkluzivními ilustracemi postav a vůdců, které se liší od standardních verzí v setu. Nejvzácnější z nich jsou takzvané Manga Rare karty, které mají na pozadí ikonické panely z manga předlohy Eiichira Ody. Jsou svatým grálem pro všechny fanoušky Slamáků.':
      'Alternate Art (Alt Art) cards in the One Piece Card Game feature exclusive artwork for characters and leaders that differ from the standard set prints. The rarest of these are the Manga Rare cards, which feature iconic manga panels by author Eiichiro Oda in the background. They are the holy grail for all Straw Hat crew fans.',
    'Secret Rare (SEC) karty jsou nejvyšší standardní vzácností v každém setu One Piece Card Game. Mají úchvatné zpracování a jsou velmi silné v samotné hře.':
      'Secret Rare (SEC) cards are the highest standard rarity in each One Piece Card Game set. They have stunning artwork and are very powerful in gameplay.',
    'Leader (vůdce) karty určují barvu a strategii vašeho celého One Piece balíčku. Nabízíme jak standardní Leader karty, tak jejich vzácné Alternate Art verze s celoplošným zobrazením obličeje postavy.':
      'Leader cards determine the color and strategy of your entire One Piece deck. We offer both standard Leader cards and their rare Alternate Art versions with full-face illustrations.',
    'Super Rare (SR) karty tvoří klíčové bojovníky a události pro sestavení konkurenceschopného balíčku.':
      'Super Rare (SR) cards form key combatants and events for constructing competitive decks.',
    'Vzácné (R) karty v One Piece Card Game přinášejí důležité efekty a podporu pro vaše pirátské posádky.':
      'Rare (R) cards in the One Piece Card Game bring key effects and support to your pirate crews.',
    'Neobvyklé (UC) karty poskytují nezbyčnou synergie a doplňkové postavy pro stabilní hru.':
      'Uncommon (UC) cards provide essential synergy and supporting characters for stable play.',
    'Běžné (C) karty tvoří základ každé edice a jsou základním stavebním kamenem pro začínající hráče.':
      'Common (C) cards form the foundation of each expansion and are the basic building blocks for beginning players.'
  };
  return descs[c.desc] || c.desc;
};

function ChevronIcon() {
  return (
    <span className="chevron-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="10" 
        height="10" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </span>
  );
}

export default function SinglesCatalog({ products, addToCart, setSelectedProductId, setActivePage, filters, setFilters, searchQuery, setSearchQuery }) {
  const { lang, t } = useTranslation();
  const [selectedGame, setSelectedGame] = useState(filters.game || 'Pokémon');
  const [selectedEditions, setSelectedEditions] = useState(filters.edition ? [filters.edition] : []);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedLangs, setSelectedLangs] = useState(filters.lang ? [filters.lang] : []);
  const [selectedRarities, setSelectedRarities] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedFinishes, setSelectedFinishes] = useState([]); // 'foil', 'non-foil', 'reverse-holo'
  const [priceRange, setPriceRange] = useState(25000);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    search: true,
    editions: false,
    rarity: false,
    finish: false,
    condition: false,
    lang: false,
    color: false,
    price: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  // Reset other filters when game changes
  const [prevGame, setPrevGame] = useState(selectedGame);
  if (selectedGame !== prevGame) {
    setPrevGame(selectedGame);
    setSelectedEditions([]);
    setSelectedConditions([]);
    setSelectedLangs([]);
    setSelectedRarities([]);
    setSelectedColors([]);
    setSelectedFinishes([]);
  }

  // Decklist Importer states
  const [showImporter, setShowImporter] = useState(false);
  const [decklistText, setDecklistText] = useState('');

  const handleImportDecklist = () => {
    if (!decklistText.trim()) {
      alert(lang === 'CZ' ? 'Vložte prosím nějaké karty do seznamu.' : 'Please enter some cards in the list.');
      return;
    }

    const lines = decklistText.split('\n');
    let addedCount = 0;
    let missingCards = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const match = trimmed.match(/^(\d+)\s+(.+)$/);
      let quantity = 1;
      let cardName = trimmed;

      if (match) {
        quantity = parseInt(match[1], 10);
        cardName = match[2].trim();
      }

      const foundProduct = products.find(p => 
        (p.type === 'single' || p.type === 'slab') && 
        p.name.toLowerCase().includes(cardName.toLowerCase())
      );

      if (foundProduct) {
        if (foundProduct.type === 'single' && foundProduct.variants && foundProduct.variants.length > 0) {
          const inStockVariants = foundProduct.variants.filter(v => v.stock > 0);
          const activeVariant = inStockVariants.length > 0 ? inStockVariants[0] : foundProduct.variants[0];
          addToCart(activeVariant, foundProduct, quantity);
          addedCount += quantity;
        } else {
          addToCart(null, foundProduct, quantity);
          addedCount += quantity;
        }
      } else {
        missingCards.push(cardName);
      }
    });

    if (addedCount > 0) {
      const msg = lang === 'CZ'
        ? `Úspěšně naimportováno ${addedCount} ks karet do košíku.`
        : `Successfully imported ${addedCount} pcs of cards to your cart.`;
      
      if (missingCards.length > 0) {
        const missingMsg = lang === 'CZ'
          ? `\n\nNásledující karty nebyly nalezeny:\n- ${missingCards.join('\n- ')}`
          : `\n\nFollowing cards could not be found:\n- ${missingCards.join('\n- ')}`;
        alert(msg + missingMsg);
      } else {
        alert(msg);
      }
      setDecklistText('');
      setShowImporter(false);
    } else {
      alert(lang === 'CZ' 
        ? 'Nepodařilo se najít žádné karty ze seznamu v naší nabídce.' 
        : 'Could not find any cards from the list in our store.');
    }
  };
  
  // Expandable description state
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Active subcategory (rarity filter)
  const [dbCategories, setDbCategories] = useState(mockCategories);
  const [categoriesLoaded, setCategoriesLoaded] = useState(true);

  const [activeSubcategory, setActiveSubcategory] = useState('all');
  const [activeSubsubcategory, setActiveSubsubcategory] = useState('all');

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showAllSubcats, setShowAllSubcats] = useState(false);
  const [showAllSubsubcats, setShowAllSubsubcats] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const data = await fetchCategoriesFromDB();
      if (active) {
        setDbCategories(data || []);
        setCategoriesLoaded(true);
      }
    }
    load();

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      active = false;
      window.removeEventListener('resize', handleResize);
    };
  }, []);


  useEffect(() => {
    if (categoriesLoaded && dbCategories.length > 0) {
      const resolved = resolveActiveCategoryFromFilters(selectedGame, filters, dbCategories);
      const matchedCat = dbCategories.find(c => c.id === resolved);
      if (matchedCat && matchedCat.parent_id && matchedCat.parent_id !== 'game-pokemon' && matchedCat.parent_id !== 'game-lorcana' && matchedCat.parent_id !== 'game-onepiece' && matchedCat.parent_id !== 'game-riftbound' && matchedCat.parent_id !== 'game-accessories' && matchedCat.parent_id !== 'game-acrylics') {
        setActiveSubcategory(matchedCat.parent_id);
        setActiveSubsubcategory(matchedCat.id);
      } else {
        setActiveSubcategory(resolved);
        setActiveSubsubcategory('all');
      }
    }
  }, [filters, selectedGame, dbCategories, categoriesLoaded]);

  const getSubSubcategories = (parentCatId) => {
    if (parentCatId === 'all') return [];
    const children = dbCategories.filter(c => c.parent_id === parentCatId);
    if (children.length === 0) return [];
    
    const formatted = [
      { id: 'all', name: lang === 'CZ' ? 'Všechny' : 'All', icon: '💎' }
    ];
    children.forEach(child => {
      formatted.push({
        id: child.id,
        name: lang === 'CZ' ? child.name_cz : child.name_en,
        icon: child.image_url ? <img src={child.image_url} alt="" className="subcategory-img" style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'cover' }} /> : '📁'
      });
    });
    return formatted;
  };

  // Sorting
  const [sortBy, setSortBy] = useState('top');

  // Mobile filters sidebar open/close
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

  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    if (filters.game) setSelectedGame(filters.game);
    if (filters.lang) {
      setSelectedLangs([filters.lang]);
    } else {
      setSelectedLangs([]);
    }
    if (filters.edition) {
      setSelectedEditions([filters.edition]);
    } else {
      setSelectedEditions([]);
    }
    setActiveSubcategory(filters.rarity || 'all');
    setActiveSubsubcategory(filters.subsubcat || 'all');
  }

  // Get only singles and slabs (slab products are also single cards but graded!)
  const singles = products.filter(p => p.type === 'single' || (FEATURE_FLAGS.showSlabs && p.type === 'slab'));

  // Available filters options
  const baseSingles = singles.filter(s => s.game === selectedGame);

  const conditions = ['NM', 'EX', 'GD', 'LP', 'PL', 'PO'];
  const langs = ['EN', 'JP', 'CN', 'KR'];

  // Helper mappings
  const getCardColor = (card) => {
    if (card.color) return card.color;
    if (card.ink) return card.ink;
    if (card.element) return card.element;
    if (card.game === 'Pokémon') {
      if (card.id.includes('charizard')) return 'Fire';
      if (card.id.includes('pikachu')) return 'Lightning';
      if (card.id.includes('umbreon')) return 'Darkness';
      if (card.id.includes('giratina')) return 'Psychic';
      if (card.id.includes('rayquaza')) return 'Dragon';
      return 'Grass';
    }
    if (card.game === 'Lorcana') {
      if (card.id.includes('elsa')) return 'Amethyst';
      return 'Steel';
    }
    if (card.game === 'One Piece') {
      if (card.id.includes('luffy')) return 'Purple';
      return 'Red';
    }
    return 'Void';
  };

  const getCardRarityGroup = (card) => {
    const r = card.rarity || '';
    if (card.game === 'Pokémon') {
      if (r === 'Common' || r === 'Uncommon') return 'Common / Uncommon';
      if (r === 'Rare') return 'Rare';
      if (card.id.includes('ex') || card.id.includes('v') || card.id.includes('vstar') || card.id.includes('vmax')) return 'ex / V / VSTAR / VMAX';
      if (r === 'Special Illustration Rare' || r === 'Special Illustration') return 'Special Illustration Rare (SIR)';
      if (r === 'Alternate Art Secret Rare' || r === 'Secret Rare') return 'Alternate Art / Secret Rare';
      if (r === 'Rainbow Rare') return 'Rainbow Rare';
      if (r === 'Gold') return 'Gold';
    }
    if (card.game === 'Lorcana') {
      if (r === 'Common' || r === 'Uncommon') return 'Common / Uncommon';
      if (r === 'Rare' || r === 'Super Rare') return 'Rare / Super Rare';
      if (r === 'Legendary') return 'Legendary';
      if (r === 'Enchanted') return 'Enchanted';
    }
    if (card.game === 'One Piece') {
      if (r === 'Common' || r === 'Uncommon') return 'Common / Uncommon';
      if (r === 'Rare' || r === 'Super Rare') return 'Rare';
      if (card.id.includes('st') || r === 'Leader') return 'Leader';
      if (r === 'Alternate Art') return 'Alternate Art';
      if (r === 'Secret Rare') return 'Secret Rare';
    }
    return 'Other';
  };



  const getRarityCount = (rarityGroup) => {
    return baseSingles.filter(card => getCardRarityGroup(card) === rarityGroup).length;
  };

  const getConditionCount = (cond) => {
    return baseSingles.filter(card => {
      if (card.type === 'slab') return cond === 'NM';
      return card.variants?.some(v => v.condition === cond);
    }).length;
  };

  const getLangCount = (langCode) => {
    return baseSingles.filter(card => {
      if (card.type === 'slab') {
        const slabLang = card.name.toLowerCase().includes('japanese') || card.name.toLowerCase().includes('jp') ? 'JP' : 'EN';
        return slabLang === langCode;
      }
      return card.variants?.some(v => v.lang === langCode);
    }).length;
  };

  const getFinishCount = (finish) => {
    return baseSingles.filter(card => {
      if (card.type === 'slab') return finish === 'non-foil';
      return card.variants?.some(v => {
        if (finish === 'foil') return v.foil === true;
        if (finish === 'non-foil') return v.foil === false;
        if (finish === 'reverse-holo') return v.reverseHolo === true;
        return false;
      });
    }).length;
  };

  const getColorCount = (col) => {
    return baseSingles.filter(card => getCardColor(card) === col).length;
  };

  // Dynamic subcategories setup
  const subcategories = categoriesLoaded 
    ? getDisplaySubcategories(selectedGame, 'single', dbCategories, lang)
    : [];



  const handleConditionToggle = (cond) => {
    setSelectedConditions(prev => 
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
  };

  const handleLangToggle = (lang) => {
    setSelectedLangs(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleRarityToggle = (rarity) => {
    setSelectedRarities(prev => 
      prev.includes(rarity) ? prev.filter(r => r !== rarity) : [...prev, rarity]
    );
  };

  const handleColorToggle = (color) => {
    setSelectedColors(prev => 
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  const handleFinishToggle = (finish) => {
    setSelectedFinishes(prev => 
      prev.includes(finish) ? prev.filter(f => f !== finish) : [...prev, finish]
    );
  };

  // Filter logic
  const filteredSingles = singles.filter(product => {
    // Game filter
    if (selectedGame && product.game !== selectedGame) {
      return false;
    }
    // Search query filter
    if (searchQuery && 
        !product.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !product.edition.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Edition filter
    if (selectedEditions.length > 0 && !selectedEditions.includes(product.edition)) {
      return false;
    }

    // Rarity checkbox filter
    if (selectedRarities.length > 0 && !selectedRarities.includes(getCardRarityGroup(product))) {
      return false;
    }

    // Color / Element checkbox filter
    if (selectedColors.length > 0 && !selectedColors.includes(getCardColor(product))) {
      return false;
    }

    // Subcategory (Rarity) filter
    if (activeSubcategory !== 'all') {
      const targetCatId = activeSubsubcategory !== 'all' ? activeSubsubcategory : activeSubcategory;
      const matchedCatIds = getCategoryAndDescendantIds(targetCatId, dbCategories);
      
      let catMatch = false;
      if (product.category_id) {
        catMatch = matchedCatIds.includes(product.category_id);
      } else {
        // Fallback using historical fields or rarity matching
        catMatch = matchedCatIds.some(catId => {
          if (product.rarity === catId) return true;
          return matchesHistoricalCategory(product, catId);
        });
      }
      
      if (!catMatch) return false;
    }

    // Variants matching filters
    if (product.type === 'slab') {
      if (selectedFinishes.length > 0 && !selectedFinishes.includes('non-foil')) return false;
      if (product.price > priceRange) return false;
      if (selectedLangs.length > 0) {
        const slabLang = product.name.toLowerCase().includes('japanese') || product.name.toLowerCase().includes('jp') ? 'JP' : 'EN';
        if (!selectedLangs.includes(slabLang)) return false;
      }
      if (selectedConditions.length > 0 && !selectedConditions.includes('NM')) return false;
      return true;
    }

    const matchingVariants = product.variants ? product.variants.filter(variant => {
      if (selectedConditions.length > 0 && !selectedConditions.includes(variant.condition)) {
        return false;
      }
      if (selectedLangs.length > 0 && !selectedLangs.includes(variant.lang)) {
        return false;
      }
      if (selectedFinishes.length > 0) {
        const finishMatches = selectedFinishes.some(f => {
          if (f === 'foil') return variant.foil === true;
          if (f === 'non-foil') return variant.foil === false;
          if (f === 'reverse-holo') return variant.reverseHolo === true;
          return false;
        });
        if (!finishMatches) return false;
      }
      if (variant.price > priceRange) return false;
      return true;
    }) : [];

    return matchingVariants.length > 0;
  });

  // Sort logic
  const sortedSingles = [...filteredSingles].sort((a, b) => {
    if (sortBy === 'expensive') return b.price - a.price;
    if (sortBy === 'cheap') return a.price - b.price;
    if (sortBy === 'new') return b.id.localeCompare(a.id); // mock sort
    return 0; // Default: top
  });

  const renderRarityFilter = () => {
    let list = [];
    if (selectedGame === 'Pokémon') {
      list = ['Common / Uncommon', 'Rare', 'ex / V / VSTAR / VMAX', 'Special Illustration Rare (SIR)', 'Alternate Art / Secret Rare', 'Rainbow Rare', 'Gold'];
    } else if (selectedGame === 'Lorcana') {
      list = ['Common / Uncommon', 'Rare / Super Rare', 'Legendary', 'Enchanted'];
    } else if (selectedGame === 'One Piece') {
      list = ['Common / Uncommon', 'Rare', 'Leader', 'Alternate Art', 'Secret Rare'];
    } else {
      return null;
    }

    return (
      <div className="sidebar-filter-section">
        <h4 className={`sidebar-filter-title collapsible ${expandedSections.rarity ? 'active' : ''}`} onClick={() => toggleSection('rarity')}>
          {lang === 'CZ' ? 'Rarita' : 'Rarity'}
          <ChevronIcon />
        </h4>
        {expandedSections.rarity && (
          <div className="sidebar-checkbox-list">
          {list.map(rar => {
            const count = getRarityCount(rar);
            const isDisabled = count === 0;
            return (
              <label key={rar} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedRarities.includes(rar)}
                  onChange={() => handleRarityToggle(rar)}
                  disabled={isDisabled}
                  className="sidebar-checkbox"
                />
                <span>{rar}</span>
                <span className="filter-badge">{count}</span>
              </label>
            );
          })}
        </div>
        )}
      </div>
    );
  };

  const renderColorFilter = () => {
    let list = [];
    if (selectedGame === 'Pokémon') {
      list = [
        { name: 'Fire', color: '#ff3e3e', label: lang === 'CZ' ? 'Ohnivá (Fire) 🔥' : 'Fire 🔥' },
        { name: 'Lightning', color: '#ffcd30', label: lang === 'CZ' ? 'Blesková (Lightning) ⚡' : 'Lightning ⚡' },
        { name: 'Darkness', color: '#5c4084', label: lang === 'CZ' ? 'Temná (Darkness) 👁️' : 'Darkness 👁️' },
        { name: 'Psychic', color: '#ec54ac', label: lang === 'CZ' ? 'Psychická (Psychic) 🔮' : 'Psychic 🔮' },
        { name: 'Dragon', color: '#d4a373', label: lang === 'CZ' ? 'Dračí (Dragon) 🐉' : 'Dragon 🐉' },
        { name: 'Grass', color: '#4ade80', label: lang === 'CZ' ? 'Travní (Grass) 🍃' : 'Grass 🍃' },
        { name: 'Water', color: '#60a5fa', label: lang === 'CZ' ? 'Vodní (Water) 💧' : 'Water 💧' },
        { name: 'Fighting', color: '#e76f51', label: lang === 'CZ' ? 'Bojová (Fighting) ✊' : 'Fighting ✊' },
        { name: 'Metal', color: '#9ca3af', label: lang === 'CZ' ? 'Kovová (Metal) 🛡️' : 'Metal 🛡️' },
        { name: 'Colorless', color: '#f3f4f6', label: lang === 'CZ' ? 'Bezbarvá (Colorless) ⚪' : 'Colorless ⚪' }
      ];
    } else if (selectedGame === 'Lorcana') {
      list = [
        { name: 'Amber', color: '#f59e0b', label: lang === 'CZ' ? 'Amber (Jantar) 🟨' : 'Amber 🟨' },
        { name: 'Amethyst', color: '#8b5cf6', label: lang === 'CZ' ? 'Amethyst (Ametyst) 🟪' : 'Amethyst 🟪' },
        { name: 'Emerald', color: '#10b981', label: lang === 'CZ' ? 'Emerald (Smaragd) 🟩' : 'Emerald 🟩' },
        { name: 'Ruby', color: '#ef4444', label: lang === 'CZ' ? 'Ruby (Rubín) 🟥' : 'Ruby 🟥' },
        { name: 'Sapphire', color: '#3b82f6', label: lang === 'CZ' ? 'Sapphire (Safír) 🟦' : 'Sapphire 🟦' },
        { name: 'Steel', color: '#6b7280', label: lang === 'CZ' ? 'Steel (Ocel) ⬜' : 'Steel ⬜' }
      ];
    } else if (selectedGame === 'One Piece') {
      list = [
        { name: 'Red', color: '#ef4444', label: lang === 'CZ' ? 'Červená (Red) 🟥' : 'Red 🟥' },
        { name: 'Blue', color: '#3b82f6', label: lang === 'CZ' ? 'Modrá (Blue) 🟦' : 'Blue 🟦' },
        { name: 'Green', color: '#10b981', label: lang === 'CZ' ? 'Zelená (Green) 🟩' : 'Green 🟩' },
        { name: 'Purple', color: '#8b5cf6', label: lang === 'CZ' ? 'Fialová (Purple) 🟪' : 'Purple 🟪' },
        { name: 'Black', color: '#1f2937', label: lang === 'CZ' ? 'Černá (Black) ⬛' : 'Black ⬛' },
        { name: 'Yellow', color: '#f59e0b', label: lang === 'CZ' ? 'Žlutá (Yellow) 🟨' : 'Yellow 🟨' }
      ];
    } else if (selectedGame === 'Riftbound') {
      list = [
        { name: 'Fire', color: '#ff3e3e', label: lang === 'CZ' ? 'Oheň (Fire) 🔥' : 'Fire 🔥' },
        { name: 'Water', color: '#60a5fa', label: lang === 'CZ' ? 'Voda (Water) 💧' : 'Water 💧' },
        { name: 'Air', color: '#a5f3fc', label: lang === 'CZ' ? 'Vzduch (Air) 🌪️' : 'Air 🌪️' },
        { name: 'Earth', color: '#78350f', label: lang === 'CZ' ? 'Země (Earth) ⛰️' : 'Earth ⛰️' },
        { name: 'Void', color: '#4b5563', label: lang === 'CZ' ? 'Prázdnota (Void) 🌌' : 'Void 🌌' }
      ];
    } else {
      return null;
    }

    const title = lang === 'CZ'
      ? (selectedGame === 'Lorcana' ? 'Barva inkoustu' : selectedGame === 'One Piece' ? 'Barva karty' : 'Element / Typ')
      : (selectedGame === 'Lorcana' ? 'Ink Color' : selectedGame === 'One Piece' ? 'Card Color' : 'Element / Type');

    return (
      <div className="sidebar-filter-section">
        <h4 className={`sidebar-filter-title collapsible ${expandedSections.color ? 'active' : ''}`} onClick={() => toggleSection('color')}>
          {title}
          <ChevronIcon />
        </h4>
        {expandedSections.color && (
          <div className="sidebar-checkbox-list">
          {list.map(col => {
            const count = getColorCount(col.name);
            const isDisabled = count === 0;
            return (
              <label key={col.name} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedColors.includes(col.name)}
                  onChange={() => handleColorToggle(col.name)}
                  disabled={isDisabled}
                  className="sidebar-checkbox"
                />
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span className="color-dot-indicator" style={{ backgroundColor: col.color }} />
                  {col.label}
                </span>
                <span className="filter-badge">{count}</span>
              </label>
            );
          })}
        </div>
        )}
      </div>
    );
  };

  const renderFinishFilter = () => {
    const finishes = [
      { name: 'non-foil', label: lang === 'CZ' ? 'Matné (Non-Foil) ▱' : 'Non-Foil ▱' },
      { name: 'foil', label: lang === 'CZ' ? 'Třpytivé (Foil) ✨' : 'Foil ✨' }
    ];
    if (selectedGame === 'Pokémon') {
      finishes.push({ name: 'reverse-holo', label: 'Reverse Holo 💎' });
    }

    return (
      <div className="sidebar-filter-section">
        <h4 className={`sidebar-filter-title collapsible ${expandedSections.finish ? 'active' : ''}`} onClick={() => toggleSection('finish')}>
          {lang === 'CZ' ? 'Provedení' : 'Finish'}
          <ChevronIcon />
        </h4>
        {expandedSections.finish && (
          <div className="sidebar-checkbox-list">
          {finishes.map(f => {
            const count = getFinishCount(f.name);
            const isDisabled = count === 0;
            return (
              <label key={f.name} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedFinishes.includes(f.name)}
                  onChange={() => handleFinishToggle(f.name)}
                  disabled={isDisabled}
                  className="sidebar-checkbox"
                />
                <span>{f.label}</span>
                <span className="filter-badge">{count}</span>
              </label>
            );
          })}
        </div>
        )}
      </div>
    );
  };

  return (
    <div className="container fade-in" style={{ paddingTop: '20px', paddingBottom: '40px' }}>
      <h1 className="sr-only">
        {lang === 'CZ' 
          ? `Katalog kusových TCG karet - ${selectedGame} Kusovky` 
          : `Catalog of TCG Singles - ${selectedGame} Singles`}
      </h1>

      {/* Decklist Importer Toggle Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => setShowImporter(!showImporter)}
          style={{ fontSize: '13px' }}
        >
          {showImporter ? (lang === 'CZ' ? '✕ Zavřít importér' : '✕ Close Importer') : (lang === 'CZ' ? '📥 Importovat Decklist (pro turnajové hráče)' : '📥 Import Decklist (for tournament players)')}
        </button>
      </div>

      {/* Decklist Importer Box */}
      {showImporter && (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'left', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 6px 0' }}>Decklist Importer</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
            {lang === 'CZ' 
              ? 'Vložte seznam karet (každou kartu na nový řádek ve formátu: množství název, např. 4 Charizard). Automaticky vyhledáme a přidáme nejlepší dostupné varianty do košíku.'
              : 'Paste a card list (each card on a new line in format: quantity name, e.g. 4 Charizard). We will automatically find and add the best available variants to your cart.'
            }
          </p>
          <textarea
            rows="5"
            placeholder={lang === 'CZ' 
              ? "Příklad:\n4 Charizard ex\n2 Pikachu VMAX" 
              : "Example:\n4 Charizard ex\n2 Pikachu VMAX"
            }
            value={decklistText}
            onChange={(e) => setDecklistText(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-page)',
              border: '1px solid var(--border-light)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              fontSize: '13px',
              fontFamily: 'monospace',
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <button className="btn btn-primary" onClick={handleImportDecklist} style={{ marginTop: '12px' }}>
            {lang === 'CZ' ? 'Importovat do košíku' : 'Import to Cart'}
          </button>
        </div>
      )}

      {/* Breadcrumbs Navigation */}
      {(selectedGame !== 'all' || activeSubcategory !== 'all') && (
        <nav className="breadcrumbs-nav" aria-label={lang === 'CZ' ? 'Drobečková navigace' : 'Breadcrumbs'}>
          <span className="breadcrumb-item" onClick={() => setActivePage('home')}>{t('common.home')}</span>
          
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
                    setFilters(prev => ({ ...prev, rarity: undefined, subsubcat: undefined })); 
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
                  {subcategories.find(s => s.id === activeSubcategory)?.name || activeSubcategory}
                </span>
              ) : (
                <span 
                  className="breadcrumb-item" 
                  onClick={() => { 
                    setActiveSubsubcategory('all'); 
                    setFilters(prev => ({ ...prev, subsubcat: undefined })); 
                  }}
                >
                  {subcategories.find(s => s.id === activeSubcategory)?.name || activeSubcategory}
                </span>
              )}
            </>
          )}

          {activeSubsubcategory !== 'all' && (
            <>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item active">
                {dbCategories.find(s => s.id === activeSubsubcategory)?.[lang === 'CZ' ? 'name_cz' : 'name_en'] || translateSubsubcatName({ name: activeSubsubcategory }, lang)}
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
            <h3 className="catalog-sidebar-title">{lang === 'CZ' ? 'Filtry a akce' : 'Filters & Actions'}</h3>
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

          {/* Filter: {lang === 'CZ' ? 'Karetní hra' : 'Card Game'} */}
          <div className="sidebar-filter-section">
            <h4 className="sidebar-filter-title">{lang === 'CZ' ? 'Karetní hra' : 'Card Game'}</h4>
            <select
              value={selectedGame}
              onChange={(e) => {
                setSelectedGame(e.target.value);
                setFilters(prev => ({ ...prev, game: e.target.value }));
              }}
              className="sidebar-select"
            >
              <option value="Pokémon">Pokémon TCG</option>
              <option value="Lorcana">Disney Lorcana</option>
              <option value="One Piece">One Piece TCG</option>
              <option value="Riftbound">Riftbound</option>
            </select>
          </div>

          {/* Filter: Search within category */}
          <div className="sidebar-filter-section">
            <h4 className={`sidebar-filter-title collapsible ${expandedSections.search ? 'active' : ''}`} onClick={() => toggleSection('search')}>
              {lang === 'CZ' ? 'Hledat název karty' : 'Search Card Name'}
              <ChevronIcon />
            </h4>
            {expandedSections.search && (
              <input 
                type="text" 
                placeholder={lang === 'CZ' ? 'Zadejte název...' : 'Search by name...'} 
                value={searchQuery || ''} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="sidebar-search-input"
              />
            )}
          </div>


          {/* Filter: Rarity */}
          {renderRarityFilter()}

          {/* Filter: {lang === 'CZ' ? '{lang === 'CZ' ? 'Provedení' : 'Finish'} / Finish' : 'Foiling / Finish'} */}
          {renderFinishFilter()}

          {/* Filter: Condition checkboxes */}
          <div className="sidebar-filter-section">
            <h4 className={`sidebar-filter-title collapsible ${expandedSections.condition ? 'active' : ''}`} onClick={() => toggleSection('condition')}>
              {lang === 'CZ' ? 'Stav karty' : 'Card Condition'}
              <ChevronIcon />
            </h4>
            {expandedSections.condition && (
              <>
                <div className="sidebar-checkbox-list">
                  {conditions.map(cond => {
                    const count = getConditionCount(cond);
                    const isDisabled = count === 0;
                    return (
                      <label key={cond} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedConditions.includes(cond)} 
                          onChange={() => handleConditionToggle(cond)}
                          disabled={isDisabled}
                          className="sidebar-checkbox"
                        />
                        <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{cond}</span>
                        <span className="filter-badge">{count}</span>
                      </label>
                    );
                  })}
                </div>
                {FEATURE_FLAGS.showGrading && (
                  <span 
                    onClick={() => { setActivePage('grading-guide'); setMobileFiltersOpen(false); }}
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-gold)',
                      cursor: 'pointer',
                      fontWeight: '600',
                      textDecoration: 'underline',
                      textAlign: 'left'
                    }}
                  >
                    {lang === 'CZ' ? 'Průvodce stavy karet' : 'Condition Guide'}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Filter: Language checkboxes */}
          <div className="sidebar-filter-section">
            <h4 className={`sidebar-filter-title collapsible ${expandedSections.lang ? 'active' : ''}`} onClick={() => toggleSection('lang')}>
              {lang === 'CZ' ? 'Jazyk' : 'Language'}
              <ChevronIcon />
            </h4>
            {expandedSections.lang && (
              <div className="sidebar-checkbox-list">
                {langs.map(langCode => {
                  const count = getLangCount(langCode);
                  const isDisabled = count === 0;
                  return (
                    <label key={langCode} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedLangs.includes(langCode)} 
                        onChange={() => handleLangToggle(langCode)}
                        disabled={isDisabled}
                        className="sidebar-checkbox"
                      />
                      <span>{lang === 'EN' ? (langCode === 'EN' ? 'English (EN) 🇬🇧' : langCode === 'JP' ? 'Japanese (JP) 🇯🇵' : langCode === 'CN' ? 'Chinese (CN) 🇨🇳' : 'Korean (KR) 🇰🇷') : (langCode === 'EN' ? 'Angličtina (EN) 🇬🇧' : langCode === 'JP' ? 'Japonština (JP) 🇯🇵' : langCode === 'CN' ? 'Čínština (CN) 🇨🇳' : 'Korejština (KR) 🇰🇷')}</span>
                      <span className="filter-badge">{count}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter: Color / Element */}
          {renderColorFilter()}

          {/* Filter: Price Range slider */}
          <div className="sidebar-filter-section">
            <h4 className={`sidebar-filter-title collapsible ${expandedSections.price ? 'active' : ''}`} onClick={() => toggleSection('price')}>
              {lang === 'CZ' ? 'Maximální cena' : 'Max Price'}
              <ChevronIcon />
            </h4>
            {expandedSections.price && (
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
                <span className="sidebar-range-value">{priceRange.toLocaleString()} {lang === 'CZ' ? 'Kč' : 'CZK'}</span>
              </div>
            )}
          </div>

          {/* Clear Filters Button */}
          <button 
            className="btn btn-secondary sidebar-reset-btn"
            onClick={() => {
              setSelectedEditions([]);
              setSelectedConditions([]);
              setSelectedLangs([]);
              setSelectedRarities([]);
              setSelectedColors([]);
              setSelectedFinishes([]);
              setPriceRange(25000);
              setSearchQuery('');
              setActiveSubcategory('all');
              setFilters({});
              setMobileFiltersOpen(false);
            }}
          >
            {lang === 'CZ' ? 'Smazat filtry' : 'Clear Filters'}
          </button>
        </aside>

        {/* RIGHT COLUMN: Headers, Subcategories, Toolbar & Products Grid */}
        <main className="catalog-main">
          
          {/* Header Introduction Box */}
          {activeSubcategory === 'all' ? (
            <div className="category-intro-box">
              <div style={{ fontSize: '11px', color: 'var(--color-gold)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>
                {lang === 'CZ' ? 'Kusové karty' : 'Singles'}
              </div>
              <h2 className="category-title">
                {(lang === 'CZ' ? gameInfo[selectedGame]?.title : gameInfo[selectedGame]?.enTitle) || (lang === 'CZ' ? 'Kusové TCG karty' : 'TCG Singles')}
              </h2>
              <div className="category-description-wrapper">
                <p className={`category-description-text ${!isDescExpanded ? 'collapsed' : ''}`}>
                  {(lang === 'CZ' ? gameInfo[selectedGame]?.desc : gameInfo[selectedGame]?.enDesc) || (lang === 'CZ' ? 'Vyberte si ze širokého katalogu kusových karet pro různé karetní hry (Pokémon, Lorcana, One Piece, Riftbound). Garantujeme 100% originalitu a perfektní servis.' : 'Select from our wide catalog of single cards for various card games (Pokémon, Lorcana, One Piece, Riftbound). We guarantee 100% authenticity and perfect service.')}
                </p>
                <button 
                  className="description-toggle-btn"
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                >
                  <span>{isDescExpanded ? (lang === 'CZ' ? 'Méně informací' : 'Less info') : (lang === 'CZ' ? 'Více informací' : 'More info')}</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="12" 
                    height="12" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    style={{ 
                      transition: 'transform 0.25s ease', 
                      transform: isDescExpanded ? 'rotate(180deg)' : 'rotate(0deg)' 
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            (() => {
              const currentCat = dbCategories.find(c => c.id === (activeSubsubcategory !== 'all' ? activeSubsubcategory : activeSubcategory));
              const title = currentCat 
                ? (lang === 'CZ' ? currentCat.name_cz : currentCat.name_en) 
                : (getSubSubcatTitle(selectedGame, activeSubcategory, lang) || `${selectedGame} - ${translateSubsubcatName(subcategories.find(s => s.id === activeSubcategory), lang)}`);
              const desc = currentCat 
                ? (lang === 'CZ' ? currentCat.description_cz : currentCat.description_en) 
                : getSubSubcatDesc(selectedGame, activeSubcategory, lang);
              
              const displayDesc = desc || (lang === 'CZ' ? 'Detailní popis vzácnosti se připravuje.' : 'Detailed description is being prepared.');
              
              return (
                <div className="category-intro-box">
                  <h2 className="category-title">
                    {title}
                  </h2>
                  <div className="category-description-wrapper">
                    <p className={`category-description-text ${!isDescExpanded ? 'collapsed' : ''}`}>
                      {displayDesc}
                    </p>
                    <button
                      className="description-toggle-btn"
                      onClick={() => setIsDescExpanded(!isDescExpanded)}
                    >
                      <span>{isDescExpanded ? (lang === 'CZ' ? 'Méně informací' : 'Less info') : (lang === 'CZ' ? 'Více informací' : 'More info')}</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        style={{ 
                          transition: 'transform 0.25s ease', 
                          transform: isDescExpanded ? 'rotate(180deg)' : 'rotate(0deg)' 
                        }}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })()
          )}

          {/* Subcategories or Sub-subcategories Grid Selection */}
          {activeSubcategory === 'all' ? (
            subcategories.length > 0 && (
              <>
                <div className="subcategories-section-title">
                  {selectedGame === 'Pokémon' ? (lang === 'CZ' ? 'Populární kategorie vzácností' : 'Popular Rarity Categories') : (lang === 'CZ' ? `Vyberte vzácnost (${selectedGame})` : `Select Rarity (${selectedGame})`)}
                </div>
                 <div className="subcategory-grid" style={isMobile && subcategories.length > 6 ? { marginBottom: '12px' } : { marginBottom: '48px' }}>
                   {((isMobile && !showAllSubcats) ? subcategories.slice(0, 6) : subcategories).map(sub => {
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
                             rarity: sub.id === 'all' ? undefined : sub.id,
                             subsubcat: undefined 
                           }));
                         }}
                       >
                         <span className={`subcategory-icon ${hasImage ? 'clean-img-container' : ''}`}>
                           {sub.icon}
                         </span>
                         <span className="subcategory-name">{translateSubsubcatName(sub, lang)}</span>
                       </div>
                     );
                   })}
                 </div>
                 {isMobile && subcategories.length > 6 && (
                   <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '48px', marginTop: '8px' }}>
                     <button
                       onClick={() => setShowAllSubcats(!showAllSubcats)}
                       className="show-more-categories-btn"
                       style={{
                         background: 'none',
                         backgroundColor: 'transparent',
                         border: 'none',
                         color: 'var(--color-gold)',
                         fontSize: '13.5px',
                         fontWeight: '700',
                         display: 'inline-flex',
                         alignItems: 'center',
                         gap: '6px',
                         cursor: 'pointer',
                         padding: '4px 12px'
                       }}
                     >
                       <span>{showAllSubcats ? (lang === 'CZ' ? 'Zobrazit méně' : 'Show less') : (lang === 'CZ' ? 'Zobrazit více' : 'Show more')}</span>
                       <svg 
                         xmlns="http://www.w3.org/2000/svg" 
                         width="14" 
                         height="14" 
                         viewBox="0 0 24 24" 
                         fill="none" 
                         stroke="currentColor" 
                         strokeWidth="2.5" 
                         strokeLinecap="round" 
                         strokeLinejoin="round" 
                         style={{ 
                           transition: 'transform 0.25s ease', 
                           transform: showAllSubcats ? 'rotate(180deg)' : 'rotate(0deg)' 
                         }}
                       >
                         <polyline points="6 9 12 15 18 9"></polyline>
                       </svg>
                     </button>
                   </div>
                 )}
              </>
            )
          ) : (
            (() => {
              const currentSubsubcats = getSubSubcategories(activeSubcategory);
              const hasDbSubsubcats = currentSubsubcats.length > 0;
              const displaySubsubcats = hasDbSubsubcats 
                ? currentSubsubcats.filter(sub => sub.id !== 'all')
                : subSubcategoriesConfig[selectedGame]?.[activeSubcategory]?.subsubcats?.filter(sub => sub.id !== 'all') || [];

              if (displaySubsubcats.length === 0) return null;

              return (
                <>
                  <div className="subcategories-section-title">
                    {lang === 'CZ' ? 'Upřesněte vzácnost' : 'Refine Rarity'}
                  </div>
                  <div className="subcategory-grid" style={isMobile && displaySubsubcats.length > 6 ? { marginBottom: '12px' } : { marginBottom: '48px' }}>
                    {((isMobile && !showAllSubsubcats) ? displaySubsubcats.slice(0, 6) : displaySubsubcats).map(sub => {
                      const isEmoji = typeof sub.icon === 'string';
                      const hasImage = sub.icon && sub.icon.props && sub.icon.props.src;
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
                          <span className={`subcategory-icon ${hasImage ? 'clean-img-container' : ''}`} style={{ fontSize: isEmoji ? '24px' : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {sub.icon}
                          </span>
                          <span className="subcategory-name">
                            {hasDbSubsubcats ? sub.name : translateSubsubcatName(sub, lang)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {isMobile && displaySubsubcats.length > 6 && (
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '48px', marginTop: '8px' }}>
                      <button
                        onClick={() => setShowAllSubsubcats(!showAllSubsubcats)}
                        className="show-more-categories-btn"
                        style={{
                          background: 'none',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: 'var(--color-gold)',
                          fontSize: '13.5px',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          padding: '4px 12px'
                        }}
                      >
                        <span>{showAllSubsubcats ? (lang === 'CZ' ? 'Zobrazit méně' : 'Show less') : (lang === 'CZ' ? 'Zobrazit více' : 'Show more')}</span>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="14" 
                          height="14" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          style={{ 
                            transition: 'transform 0.25s ease', 
                            transform: showAllSubsubcats ? 'rotate(180deg)' : 'rotate(0deg)' 
                          }}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              );
            })()
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
                  {lang === 'CZ' ? 'Nejdražší' : 'Price: High to Low'}
                </button>
                <button 
                  className={`sort-tab-btn ${sortBy === 'cheap' ? 'active' : ''}`}
                  onClick={() => setSortBy('cheap')}
                >
                  {lang === 'CZ' ? 'Nejlevnější' : 'Price: Low to High'}
                </button>
                <button 
                  className={`sort-tab-btn ${sortBy === 'new' ? 'active' : ''}`}
                  onClick={() => setSortBy('new')}
                >
                  {lang === 'CZ' ? 'Novinky' : 'New Releases'}
                </button>
              </div>
            </div>

            <div className="toolbar-right-group">
              {/* Counter */}
              <span className="results-counter">
                {lang === 'CZ' ? 'Celkem nalezeno: ' : 'Total found: '}<strong>{sortedSingles.length}</strong> {lang === 'CZ' ? 'karet' : 'cards'}
              </span>

              {/* Filters Trigger (Mobile only) */}
              <button 
                className="mobile-filters-trigger"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                {lang === 'CZ' ? 'Filtry' : 'Filters'}
              </button>
            </div>
          </div>

          {/* Products Grid */}
          {sortedSingles.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '48px' }}>🔍</span>
              <h3>{lang === 'CZ' ? 'Nebyly nalezeny žádné kusové karty' : 'No singles cards found'}</h3>
              <p style={{ color: 'var(--text-muted)' }}>{lang === 'CZ' ? 'Zkuste změnit výběr filtrů nebo vyhledávaný výraz.' : 'Try changing your filter selection or search query.'}</p>
            </div>
          ) : (
            <div className="catalog-product-grid">
              {sortedSingles.map(product => (
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

    </div>
  );
}
