import { useState, useEffect } from 'react';
import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';
import ProductCard from './ProductCard';
import DealOfTheDay from './DealOfTheDay';
import { fetchCategoriesFromDB, mockCategories, getCachedCategories, getCategoryIcon } from '../services/categories';

function getGameFallbackLogo(game) {
  switch (game) {
    case 'Pokémon': return '/Pokemon.webp';
    case 'Lorcana': return '/lorcana logo.webp';
    case 'One Piece': return '/One piece.webp';
    case 'Ostatní TCG': return '/Logo_Ostatni_TCG.webp';
    case 'Accessories': return '/Prislusentstvi.webp';
    case 'Acrylics': return '/acrylic-etb-box.webp';
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
    
    'ostatni-booster-box': { packagingType: 'Booster Box' },
    'ostatni-boostery': { packagingType: 'Booster' },
    'ostatni-trial-decky': { packagingType: 'Trial Deck' },
    'ostatni-other': { packagingType: 'Other' },
    
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
    
    'ostatni-standard-booster-box': { subsubcategory: 'Standard Booster Box' },
    'ostatni-standard-booster-pack': { subsubcategory: 'Standard Booster Pack' },
    'ostatni-standard-trial-deck': { subsubcategory: 'Standard Trial Deck' },
    'ostatni-official-playmat': { subsubcategory: 'Official Playmat' },
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
      icon: <img src={getGameFallbackLogo(game)} alt="" className="subcategory-img" width="44" height="44" />
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
        { id: 'all', name: 'Pokémon TCG', icon: <img src="/Pokemon.webp" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Alternate Art', name: 'Alternate Art', icon: <img src="https://images.pokemontcg.io/swsh11/186.png" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Special Illustration Rare', name: 'Special Illustration', icon: <img src="https://images.pokemontcg.io/sv3/223.png" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Secret Rare', name: 'Secret Rare', icon: <img src="https://images.pokemontcg.io/swsh7/218.png" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Rainbow Rare', name: 'Rainbow Rare', icon: <img src="https://images.pokemontcg.io/swsh4/188.png" alt="" className="subcategory-img" width="44" height="44" /> },
      ];
    } else if (game === 'Lorcana') {
      return [
        { id: 'all', name: 'Lorcana TCG', icon: <img src="/lorcana logo.webp" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Common', name: 'Common', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Uncommon', name: 'Uncommon', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Rare', name: 'Rare', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Super Rare', name: 'Super Rare', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Legendary', name: 'Legendary', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Enchanted', name: 'Enchanted', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" width="44" height="44" /> },
      ];
    } else if (game === 'One Piece') {
      return [
        { id: 'all', name: 'One Piece TCG', icon: <img src="/One piece.webp" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Common', name: 'Common', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Uncommon', name: 'Uncommon', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Rare', name: 'Rare', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Super Rare', name: 'Super Rare', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Secret Rare', name: 'Secret Rare', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Leader', name: 'Leader', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" width="44" height="44" /> },
        { id: 'Alternate Art', name: 'Alternate Art', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" width="44" height="44" /> },
      ];
    }
  }
  
  const formatted = [
    {
      id: 'all',
      name: lang === 'CZ' ? root.name_cz : root.name_en,
      icon: <img src={getCategoryIcon(root)} alt={lang === 'CZ' ? `${root.name_cz || root.name} - Northvale TCG` : `${root.name_en || root.name} - Northvale TCG`} title={lang === 'CZ' ? (root.name_cz || root.name) : (root.name_en || root.name)} className="subcategory-img" width="44" height="44" />
    }
  ];
  
  children.forEach(child => {
    formatted.push({
      id: child.id,
      name: lang === 'CZ' ? child.name_cz : child.name_en,
      icon: <img src={getCategoryIcon(child)} alt={lang === 'CZ' ? `${child.name_cz || child.name} - Northvale TCG` : `${child.name_en || child.name} - Northvale TCG`} title={lang === 'CZ' ? (child.name_cz || child.name) : (child.name_en || child.name)} className="subcategory-img" width="44" height="44" />
    });
  });
  
  return formatted;
}

const gameInfo = {
  'Pokémon': {
    title: 'Pokémon',
    desc: `Objevte svět originálních Pokémon produktů, které oslovují hráče i sběratele napříč generacemi. Ať už hledáte chybějící karty do své sbírky, chcete si udělat radost novou edicí, nebo zvažujete dlouhodobé uchování hodnoty, z naší nabídky si vyberete.

Co nabízíme: Široký výběr Booster Boxů, Elite Trainer Boxů, speciálních kolekcí a prémiových boxů z nejnovějších i historických edic.
Proč investovat: Vybrané Pokémon produkty představují stabilní alternativní aktivum. Sběratelská hodnota neotevřených boxů má po ukončení distribuce dané edice historicky rostoucí tendenci.
Proč nakoupit u nás: Garantujeme 100% originální původ z oficiální distribuce. Každý produkt balíme s maximální péčí do ochranné fólie a pevných kartonů, aby k vám dorazil v perfektním sběratelském stavu.`,
    enTitle: 'Pokémon',
    enDesc: `Discover the world of authentic Pokémon products that appeal to players and collectors across generations. Whether you are searching for missing cards for your collection, enjoying a new release, or considering long-term value preservation, you will find what you need in our selection.

What we offer: A wide selection of Booster Boxes, Elite Trainer Boxes, special collections, and premium boxes from recent and historic expansion sets.
Why invest: Select Pokémon products represent a stable alternative asset. The collectible value of unopened boxes historically tends to appreciate once a set goes out of print.
Why choose us: We guarantee 100% authentic products sourced directly from official distribution networks. Every item is packaged with ultimate care using protective film and sturdy boxes to ensure it arrives in pristine collector condition.`
  },
  'Lorcana': {
    title: 'Disney Lorcana',
    desc: `Disney Lorcana spojuje jedinečné umělecké zpracování a moderní herní mechaniky. Tato sběratelská hra nabízí výjimečný vizuální zážitek pro všechny fanoušky i sběratele, kteří chtějí vlastnit prémiové edice z tohoto oblíbeného světa.

Co nabízíme: Originální Booster Boxy, vyhledávané dárkové Illumineer's Trove boxy, startovní balíčky a samostatné boostery.
Proč investovat: Silné duševní vlastnictví Disney a limitované tiskové edice zaručují stálou poptávku na sekundárním trhu. Raritní varianty karet představují zajímavou příležitost ke zhodnocení.
Proč nakoupit u nás: Jako specializovaný prodejce odebíráme zboží výhradně z oficiální distribuce. Garantujeme rychlé zpracování objednávek a profesionální balení, které chrání rohy a hrany boxů před poškozením během přepravy.`,
    enTitle: 'Disney Lorcana',
    enDesc: `Disney Lorcana combines unique artwork and modern gameplay mechanics. This trading card game offers an exceptional visual experience for fans and collectors wishing to own premium editions from this beloved universe.

What we offer: Original Booster Boxes, highly sought-after Illumineer's Trove boxes, starter decks, and booster packs.
Why invest: The strong Disney intellectual property and limited print runs ensure steady demand on the secondary market. Rare card variations present an interesting appreciation opportunity.
Why choose us: As a specialized retailer, we source our stock exclusively through official distribution channels. We guarantee rapid order processing and professional packaging to protect corners and edges from transit damage.`
  },
  'One Piece': {
    title: 'One Piece',
    desc: `Vstupte do světa globálního fenoménu One Piece Card Game. Tato dynamická strategická hra přitahuje hráče a sběratele po celém světě díky svému zpracování, věrnosti předloze a vysoké poptávce po limitovaných edicích.

Co nabízíme: Originální anglické Booster Boxy, exkluzivní dárkové sety, startovní balíčky a samostatné boostery.
Proč investovat: Kvůli limitovaným tiskovým alokacím a mimořádné celosvětové popularitě se neotevřené produkty stávají vzácnými. Uložení neporušených boxů tak nabízí zajímavý investiční potenciál.
Proč nakoupit u nás: Všechny boxy držíme v neotevřeném, neváženém a neupravovaném stavu (unsearched/unopened). Zásilky balíme tak, aby spolehlivě odolaly přepravním vlivům a dorazily bez jakéhokoliv mechanického znehodnocení.`,
    enTitle: 'One Piece',
    enDesc: `Enter the world of the global phenomenon that is the One Piece Card Game. This dynamic strategic game attracts players and collectors worldwide thanks to its high-quality design, fidelity to the source material, and strong demand for limited editions.

What we offer: Original English Booster Boxes, exclusive gift sets, starter decks, and booster packs.
Why invest: Due to limited print allocations and extraordinary global popularity, unopened products quickly become rare. Holding intact boxes offers appealing investment potential.
Why choose us: All our booster boxes are kept in completely original, unweighted, and unsearched condition. We pack every order securely to withstand shipping stresses and ensure zero mechanical degradation.`
  },
  'Ostatní TCG': {
    title: 'Ostatní TCG',
    desc: `Objevte další populární sběratelské karetní hry z celého světa. V této kategorii najdete vybrané produkty pro ostatní TCG, jako je Magic: The Gathering, Flesh & Blood, Star Wars: Unlimited a další sběratelsky zajímavé tituly.

Co nabízíme: Originální Booster Boxy, startovní balíčky, samostatné boostery a doplňkové edice pro různé karetní hry.
Proč investovat: Mnoho vedlejších a nezávislých TCG projektů disponuje velmi nízkými tiskovými náklady a silnou komunitou, což dává jejich prvním edicím obrovský sběratelský a dlouhodý zhodnocovací potenciál.
Proč nakoupit u nás: Garantujeme 100% originalitu veškerého zboží, pečlivé balení proti poškození při přepravě a profesionální přístup k vaší sbírce.`,
    enTitle: 'Other TCGs',
    enDesc: `Discover other popular trading card games from around the world. In this category, you will find curated products for other TCGs such as Magic: The Gathering, Flesh & Blood, Star Wars: Unlimited, and other collectible card games.

What we offer: Original Booster Boxes, starter decks, single booster packs, and special editions for various card games.
Why invest: Many secondary and independent TCG projects have low print runs combined with a highly dedicated community, giving their early editions strong collector appeal and long-term appreciation potential.
Why choose us: We guarantee 100% authenticity of all products, secure packing to prevent shipping damage, and a professional attitude toward your collection.`
  },
  'Accessories': {
    title: 'Herní Příslušenství',
    desc: `Fyzický stav karty určuje její hodnotu i estetický dojem ze sbírky. Chraňte své karty a prezentujte je na profesionální úrovni s naší nabídkou prémiového herního příslušenství.

Co nabízíme: Široký výběr ochranných obalů (sleeves), pevných toploaderů, sběratelských alb na karty a specializovaných pořadačů navržených pro toploadery a graded slabs.
Proč investovat: Nevhodný způsob skladování vede k nevratnému poškození karet (opotřebení hran, povrchové škrábance, průhyb vlivem vlhkosti). Použití profesionálních alb a obalů pomáhá uchovat původní sběratelskou hodnotu po desítky let.
Proč nakoupit u nás: Nabízíme výhradně certifikované produkty renomovaných značek (Dragon Shield, Ultra Pro) a specializované vybavení pro uložení investičních karet s okamžitou expedicí z našeho skladu.`,
    enTitle: 'Gaming Accessories',
    enDesc: `A card's physical condition determines its value and aesthetic appeal. Protect your cards and showcase your collection professionally with our premium gaming accessories.

What we offer: A wide range of protective card sleeves, rigid toploaders, card binders, as well as specialized albums designed specifically for storing toploaders and graded slabs.
Why invest: Suboptimal storage leads to permanent degradation of a card's grade (edge wear, surface scratches, moisture-induced warping). Using professional accessories preserves your collection's financial value for decades.
Why choose us: We stock only trusted industry brands (Dragon Shield, Ultra Pro) and specialized protection equipment for high-value cards, with all items ready for immediate dispatch.`
  },
  'Acrylics': {
    title: 'Prémiové Akrylové Boxy',
    desc: `Prémiové sběratelské kousky si zaslouží dokonalou prezentaci a ochranu. Zabezpečte své Booster Boxy a Elite Trainer Boxy a zachovejte jejich neporušený stav pro radost ze sbírky i budoucí zhodnocení.

Co nabízíme: Vysoce kvalitní akrylové ochranné boxy vyrobené na míru pro Pokémon Booster Boxy, Elite Trainer Boxy a Lorcana Trove boxy.
Proč investovat: Dlouhodobé působení prachu, vlhkosti a škodlivého UV záření znehodnocuje originální fólii a barvy na boxech. Naše 4mm akrylové obaly s 99% UV filtrem a magnetickým uzavíráním zamezují poškození vnějším vlivům a udržují produkty ve špičkovém stavu.
Proč nakoupit u nás: Naše akrylové boxy disponují dokonale čirými hranami, extra silnými magnety a přesnými rozměry, které eliminují volný pohyb boxu uvnitř obalu a zamezují poškrábání.`,
    enTitle: 'Premium Acrylic Cases',
    enDesc: `Premium collectible pieces deserve perfect presentation and protection. Secure your Booster Boxes and Elite Trainer Boxes and preserve their intact condition for collecting pleasure and future appreciation.

What we offer: Premium, heavy-duty acrylic display cases custom-sized for Pokémon Booster Boxes, ETBs, and Disney Lorcana Trove boxes.
Why invest: Long-term exposure to dust, moisture, and UV light degrades original packaging and fades box artwork. Our 4mm thick cases with 99% UV protection and secure magnetic lids shield your items from environmental hazards.
Why choose us: Our display cases feature crystal-clear polished edges, strong magnetic closures, and snug dimensions to keep your products secure without shifting inside.`
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
      desc: 'V této kategorii naleznete nezařazené sběratelské produkty jako jsou sady boxů v celku (celé krabice s více kusy produktů přímo z továrny), předpřipravené balíčky (Theme Decks / Battle Decks) nebo limitované sběratelské edice, které tvoří unikátní součást sběratelského světa.',
      subsubcats: [
        { id: 'all', name: 'Všechno ostatní', icon: '🔮' },
        { id: 'Sealed Case', name: 'Sady boxů (Case)', icon: '📦' },
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
  'Ostatní TCG': {
    'Booster Box': {
      title: 'Ostatní TCG Booster Boxy',
      desc: 'Originální uzavřené booster boxy pro ostatní sběratelské karetní hry. Skvělá příležitost pro sběratele k otevření nebo dlouhodobému uložení.',
      subsubcats: [
        { id: 'all', name: 'Všechny Booster Boxy', icon: '🌀' },
        { id: 'Standard Booster Box', name: 'Standard Booster Box', icon: '📦' }
      ]
    },
    'Booster': {
      title: 'Ostatní TCG Samostatné Boostery',
      desc: 'Samostatné doplňkové booster balíčky pro různorodé karetní hry z celého světa.',
      subsubcats: [
        { id: 'all', name: 'Všechny Boostery', icon: '⚡' },
        { id: 'Standard Booster Pack', name: 'Standard Booster Pack', icon: '📦' }
      ]
    },
    'Trial Deck': {
      title: 'Ostatní TCG Startovní Decky',
      desc: 'Předpřipravené startovní a trial balíčky (Starter / Structure Decks), se kterými můžete okamžitě začít hrát.',
      subsubcats: [
        { id: 'all', name: 'Všechny Startovní Decky', icon: '⚔️' },
        { id: 'Standard Trial Deck', name: 'Standard Trial Deck', icon: '📦' }
      ]
    },
    'Other': {
      title: 'Ostatní TCG Ostatní Produkty',
      desc: 'Limitované dárkové sady, oficiální herní podložky a další specifické doplňky z ostatních karetních her.',
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
      desc: 'Prémiové ochranné boxy z masivního akrylátu s magnetickým víkem navržené speciálně na míru pro Disney Lorcana TCG. Nabízejí UV ochranu a prémiový vzhled pro vaše investiční produkty.',
      subsubcats: [
        { id: 'all', name: 'Všechny akryly pro Lorcana', icon: '💎' },
        { id: 'Lorcana', name: 'Lorcana akryly', icon: '📦' }
      ]
    }
  }
};

const translateSubcatName = (sub, lang) => {
  if (!sub) return '';
  if (lang === 'CZ') return sub.name;
  const mapping = {
    'Booster Boxy': 'Booster Boxes',
    'Elite Trainer Boxy': 'Elite Trainer Boxes',
    'Bundles': 'Booster Bundles',
    'Boostery': 'Booster Packs',
    'Speciální kolekce': 'Special Collections',
    'Ostatní': 'Others',
    'Trove Boxy': 'Trove Boxes',
    'Trial Decky': 'Trial Decks',
    'Všechno příslušenství': 'All Accessories',
    'Na karty': 'For Cards',
    'Na toploadery': 'For Toploaders',
    'Na graded karty': 'For Graded Cards',
    'Sleevy': 'Sleeves',
    'Toploadery': 'Toploaders',
    'Všechny akryly': 'All Acrylic Cases',
    'Psa karty': 'PSA Cards',
    'Všechny produkty': 'All Products',
    'Pokémon TCG': 'Pokémon TCG',
    'Lorcana TCG': 'Lorcana TCG',
    'One Piece TCG': 'One Piece TCG',
    'Ostatní TCG': 'Other TCG',
    'Na graded karty': 'For Graded Cards',
    'Všechny Booster Boxy': 'All Booster Boxes',
    'Všechny ETB': 'All ETBs',
    'Všechny Bundly': 'All Bundles',
    'Všechny Boostery': 'All Boosters',
    'Všechny Kolekce': 'All Collections',
    'Všechno ostatní': 'All Others',
    'Všechny Trove Boxy': 'All Trove Boxes',
    'Vše ostatní': 'All Others',
    'Všechny Trial Decky': 'All Trial Decks',
    'Všechna alba': 'All Albums',
    'Alba na karty': 'Card Albums',
    'Všechna alba na toploadery': 'All Toploader Albums',
    'Alba na toploadery': 'Toploader Albums',
    'Všechna alba na slabs': 'All Slab Albums',
    'Alba na graded karty': 'Graded Card Albums',
    'Všechny obaly': 'All Sleeves',
    'Všechny toploadery': 'All Toploaders',
    'Standardní příslušenství': 'Standard Accessories',
    'Všechny akryly pro Pokémon': 'All Pokémon Acrylics',
    'Pokémon akryly': 'Pokémon Acrylics',
    'Všechny akryly pro Lorcana': 'All Lorcana Acrylics',
    'Lorcana akryly': 'Lorcana Acrylics',
    'Sady boxů (Case)': 'Cases (Master Boxes)'
  };
  return mapping[sub.name] || sub.name;
};

const getSubSubcatTitle = (game, subcat, lang) => {
  const c = subSubcategoriesConfig[game]?.[subcat];
  if (!c) return '';
  if (lang === 'CZ') return c.title;
  const titles = {
    'Pokémon TCG Booster Boxy': 'Pokémon TCG Booster Boxes',
    'Pokémon TCG Elite Trainer Boxy': 'Pokémon TCG Elite Trainer Boxes',
    'Pokémon TCG Booster Bundles': 'Pokémon TCG Booster Bundles',
    'Pokémon TCG Samostatné Boostery': 'Pokémon TCG Single Booster Packs',
    'Pokémon TCG Speciální Kolekce': 'Pokémon TCG Special Collections',
    'Pokémon TCG Ostatní': 'Pokémon TCG Others',
    'Disney Lorcana Booster Boxy': 'Disney Lorcana Booster Boxes',
    'Disney Lorcana Illumineer\'s Trove Boxy': 'Disney Lorcana Illumineer\'s Trove Boxes',
    'Disney Lorcana Boostery': 'Disney Lorcana Booster Packs',
    'Disney Lorcana Ostatní Produkty': 'Disney Lorcana Other Products',
    'One Piece TCG Booster Boxy': 'One Piece TCG Booster Boxes',
    'One Piece TCG Samostatné Boostery': 'One Piece TCG Single Booster Packs',
    'One Piece TCG Ostatní Produkty': 'One Piece TCG Other Products',
    'Ostatní TCG Booster Boxy': 'Other TCG Booster Boxes',
    'Ostatní TCG Samostatné Boostery': 'Other TCG Single Booster Packs',
    'Ostatní TCG Startovní Decky': 'Other TCG Starter Decks',
    'Ostatní TCG Ostatní Produkty': 'Other TCG Other Products',
    'Alba na TCG karty': 'Albums for TCG Cards',
    'Alba na toploadery': 'Albums for Toploaders',
    'Alba a kufříky na graded karty': 'Albums & Cases for Graded Cards',
    'Obaly na karty (Sleeves)': 'Card Sleeves',
    'Pevné toploadery na karty': 'Rigid Toploaders for Cards',
    'Ostatní příslušenství': 'Other Accessories',
    'Akrylové boxy pro Pokémon': 'Acrylic Cases for Pokémon',
    'Akrylové boxy pro Disney Lorcana': 'Acrylic Cases for Disney Lorcana'
  };
  return titles[c.title] || c.title;
};

const getSubSubcatDesc = (game, subcat, lang) => {
  const c = subSubcategoriesConfig[game]?.[subcat];
  if (!c) return '';
  if (lang === 'CZ') return c.desc;
  const descs = {
    'Booster Boxy jsou královskou disciplínou pro všechny sběratele a investory do Pokémon karet. Každý standardní anglický booster box obsahuje 36 neotevřených booster balíčků po 10 kartách, což z něj činí cenově nejvýhodnější způsob nákupu většího množství karet. V japonských a čínských verzích booster boxů obvykle najdete 20 až 30 balíčků. Všechny naše booster boxy pocházejí z oficiální distribuce a jsou dodávány v originální smršťovací fólii (shrink wrap) s logem Pokémon Company, což zaručuje jejich pravost a netknutý stav.':
      'Booster Boxes are the premier format for Pokémon collectors and investors. Each standard English booster box contains 36 sealed booster packs of 10 cards, making it the most cost-effective way to purchase cards in bulk. Japanese and Chinese booster boxes typically contain 20 to 30 packs. All our booster boxes are sourced from official distribution and arrive in their original manufacturer shrink wrap with the Pokémon Company logo, ensuring authenticity and mint condition.',
    'Elite Trainer Box (ETB) je skvělá dárková sada obsahující booster balíčky, obaly na karty, promo kartu a herní doplňky. Ideální pro začínající sběratele i zkušené hráče.':
      'An Elite Trainer Box (ETB) is a fantastic gift and collector bundle containing booster packs, card sleeves, a promo card, and gameplay accessories. Perfect for both beginners and experienced players alike.',
    'Booster Bundles představují čistou radost z rozbalování balíčků bez zbytečného příslušenství okolo. Každá krabička obsahuje přesně 6 booster balíčků vybrané edice. Jedná se o skvělou a cenově dostupnou možnost, pokud chcete otestovat své štěstí v nové edici, aniž byste kupovali celý velký Booster Box nebo dárkový Elite Trainer Box.':
      'Booster Bundles deliver the pure joy of opening packs without unnecessary extra accessories. Each bundle box contains exactly 6 booster packs of the selected set. It is a great and budget-friendly option if you want to test your luck on a new set without buying a full booster box.',
    'Základní stavební kámen sbírání Pokémon karet. Samostatný booster balíček obsahuje náhodně namíchanou sadu karet (obvykle 10 v anglické verzi, 5 až 10 v japonské a čínské verzi). Můžete v nich najít cenné karty jako jsou Pokémon ex, Illustration Rare nebo dokonce Secret Rare. Nabízíme jak standardní anglické boostery, tak specifické japonské a čínské edice pro fajnšmekry.':
      'The foundational unit of TCG collecting. An individual booster pack contains a randomized selection of cards (typically 10 in English sets, 5 to 10 in Japanese/Chinese editions). They offer a chance to pull valuable cards like Pokémon ex, Illustration Rares, or Secret Rares. We stock standard English packs as well as special Japanese and Chinese print runs.',
    'Speciální dárkové sety (Collection Boxes, Premium Collections, Tins) jsou navrženy pro maximální vizuální zážitek a radost z rozbalování. Tyto produkty zpravidla obsahují jednu nebo více garantovaných promo karet oblíbených Pokémonů, nekolik booster balíčků z různých edic a tematické bonusové předměty jako jsou sběratelské mince, figurky, odznáčky nebo herní podložky.':
      'Special gift sets (Collection Boxes, Premium Collections, Tins) are designed for a great opening experience. These products generally feature one or more guaranteed promo cards of popular characters, several booster packs from various sets, and themed bonus items like collector coins, figures, pins, or playmats.',
    'V této kategorii naleznete nezařazené sběratelské produkty jako jsou sady boxů v celku (celé krabice s více kusy produktů přímo z továrny), předpřipravené balíčky (Theme Decks / Battle Decks) nebo limitované sběratelské edice, které tvoří unikátní součást sběratelského světa.':
      'In this category, you will find other TCG items like cases (entire master cases direct from the factory), pre-built starter decks, and limited collector editions that form a unique part of the collecting hobby.',
    'Booster boxy pro Disney Lorcana obsahují 24 booster balíčků po 12 kartách. Otevírání celého boxu vám dává nejlepší šanci na získání vzácných legendárních a extrémně cenných Enchanted karet s bezrámovou foilovou ilustrací.':
      'Booster boxes for Disney Lorcana contain 24 booster packs of 12 cards each. Opening a full box offers the best value and chances for rare legendary pulls or highly coveted Enchanted borderless cards.',
    'Illumineer\'s Trove je vlajkovou lodí dárkových sad pro hru Disney Lorcana. Každý Trove box obsahuje 8 boosterů, dvě papírové krabičky na balíčky, 15 žetonů poškození, sběratelského průvodce sadou a pevnou úložnou krabici s krásným celoplošným potiskem pro archivaci vaší rozrůstající se sbírky.':
      'The Illumineer\'s Trove is the flagship gift bundle for Disney Lorcana. Each Trove contains 8 booster packs, two deck boxes, 15 damage counters, a player guide, and a heavy-duty cardboard storage box featuring full-art prints to archive your collection.',
    'Samostatný booster balíček obsahuje 12 náhodných karet (6 běžných, 3 neobvyklé, 2 vzácné/epické/legendární a 1 garantovanou foilovou kartu libovolné vzácnosti). Skvělá a rychlá možnost, jak otestovat své štěstí při hledání oblíbených postav od Disneyho.':
      'A single booster pack contains 12 random cards (6 commons, 3 uncommons, 2 rares/epics/legendaries, and 1 guaranteed foil card of any rarity). A quick and fun option to test your luck and find your favorite Disney characters.',
    'Startovní balíčky (Starter Decks) obsahující předpřipravený 60-kartový balíček připravený k okamžité hře, dárkové sety s promo kartami a doplňkové herní sety pro začínající i pokročilé hráče.':
      'Pre-built 60-card starter decks ready for immediate play, gift sets featuring exclusive promo cards, and special bundle sets for casual and competitive players alike.',
    'Booster Boxy One Piece Card Game obsahují 24 booster balíčků. Tyto boxy jsou vysoce vyhledávané kvůli možnosti otevření extrémně vzácných Manga Rare karet a speciálních verzí karet vůdců (Alternate Art Leaders).':
      'One Piece Card Game booster boxes contain 24 booster packs. These boxes are highly sought-after for the chance of pulling extremely rare Manga Rares or Alternate Art Leaders.',
    'Booster balíčky pro oblíbenou karetní hru na motivy anime One Piece. Každý balíček obsahuje náhodně namíchané karty postav, událostí a stage karet pro sestavení vašeho vysněného pirátského balíčku.':
      'Booster packs for the hit anime-based One Piece Card Game. Each pack contains a random mix of character, event, and stage cards to assemble your crew deck.',
    'Startovní balíčky (Starter Decks) pro okamžitý start hry, speciální limitované edice a dárkové krabičky ze světa One Piece.':
      'Starter decks for immediate out-of-the-box play, special limited release runs, and themed gift boxes from the world of One Piece.',
    'Originální boxy s 24 booster balíčky české strategické fantasy hry Riftbound. Skvělý nákup pro získání kompletní sady karet a posílení vašich elementárních balíčků.':
      'Boxes containing 24 booster packs for the Czech strategic fantasy game Riftbound. A great purchase to compile a playset and reinforce your elemental decks.',
    'Samostatné boostery s kartami hry Riftbound pro postupné vylepšování balíčku.':
      'Individual booster packs containing Riftbound cards to gradually upgrade your decks.',
    'Předpřipravené startovní Trial decky hry Riftbound navržené tak, aby dva hráči mohli okamžitě usednout k hernímu stolu a začít hrát.':
      'Pre-constructed starter Trial decks designed for two players to immediately open and play against each other.',
    'Oficiální herní podložky (playmaty) s fantastickými ilustracemi a další doplňkové materiály k Riftbound TCG.':
      'Official playmats featuring stunning fantasy artwork and additional accessory materials for the Riftbound TCG.',
    'Prémiová alba s bočním vkládáním karet pro maximální bezpečí a ochranu před vypadnutím. Ideální pro uspořádání a prezentaci vaší sbírky vzácných karet.':
      'Premium side-loading pocket binders designed for maximum protection and ease of storage. Perfect to organize and showcase your card sets.',
    'Speciálně navržená alba s širšími kapsami pro bezpečné uložení a pohodlné prohlížení karet, které máte uložené v pevných toploaderech. Dvojnásobné bezpečí pro vaše nejcennější kousky.':
      'Specially designed albums with extra-wide pockets to hold cards inside standard rigid toploaders. Double security for your most prized assets.',
    'Profesionální alba a kufříky s pevnými stěnami navržené pro bezpečné skladování a snadnou prezentaci graded karet v plastových pouzdrech (slabech) typu PSA nebo Beckett.':
      'Professional heavy-duty binders and carrying cases designed for safe storage and easy viewing of graded cards (slabs) like PSA or Beckett.',
    'Obaly na karty od předních světových výrobců jako Dragon Shield a Ultra Pro. Chrání karty před prachem, poškrábáním povrchu a poškozením hran při míchání a manipulaci.':
      'Card sleeves from industry leaders like Dragon Shield and Ultra Pro. Protects cards from dust, scratching, and edge wear during gameplay.',
    'Pevné plastové obaly (toploadery) pro nekompromisní ochranu cennějších karet před ohnutím a nárazy. Ideální pro karty určené k vystavení nebo bezpečné přepravě.':
      'Rigid plastic toploaders for robust protection of your single cards against bending or impacts. Perfect for transit or display.',
    'Krabičky na balíčky (deck boxy), kostky, počítadla a další užitečné doplňky pro hráče a sběratele stolních karetních her.':
      'Deck boxes, dice, counters, and other gameplay accessories for tabletop trading card game players.',
    'Vysoce kvalitní akrylové ochranné boxy s magnetickým víkem navržené speciálně na míru pro Pokémon Booster Boxy a Elite Trainer Boxy. Nabízejí UV ochranu a prémiový vzhled pro vaše investiční produkty.':
      'Premium thick acrylic protector display cases with secure magnetic lids custom-sized for Pokémon booster boxes or ETBs. Offers UV protection and display aesthetics.',
    'Prémiové ochranné boxy z masivního akrylátu s magnetickým víkem navržené speciálně na míru pro Disney Lorcana TCG. Nabízejí UV ochranu a prémiový vzhled pro vaše investiční produkty.':
      'Premium thick acrylic protector display cases with secure magnetic lids custom-sized for Lorcana TCG. Offers UV protection and display aesthetics.'
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

const renderFormattedDescription = (text) => {
  if (!text) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  return lines.map((line, index) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0 && colonIndex < 25) {
      const header = line.substring(0, colonIndex).trim();
      const content = line.substring(colonIndex + 1).trim();
      
      const lowerHeader = header.toLowerCase();
      const isHeader = lowerHeader.includes('nabíz') || 
                       lowerHeader.includes('invest') || 
                       lowerHeader.includes('u nás') || 
                       lowerHeader.includes('nás') || 
                       lowerHeader.includes('offer') || 
                       lowerHeader.includes('choose') || 
                       lowerHeader.includes('guar') || 
                       lowerHeader.includes('koupit') || 
                       lowerHeader.includes('nekoupit');
                       
      if (isHeader) {
        return (
          <p key={index} style={{ marginTop: '28px', marginBottom: '8px', color: 'var(--text-muted, rgba(255,255,255,0.75))', lineHeight: '1.6', fontSize: '14px' }}>
            <strong style={{ 
              fontWeight: '700', 
              color: 'var(--text-main, #ffffff)', 
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginRight: '6px'
            }}>
              {header}:
            </strong>
            {content}
          </p>
        );
      }
    }
    
    return (
      <p key={index} style={{ margin: '0 0 12px 0', color: 'var(--text-muted, rgba(255,255,255,0.75))', lineHeight: '1.6', fontSize: '14px' }}>
        {line}
      </p>
    );
  });
};

export default function SealedCatalog({ products, addToCart, setSelectedProductId, setActivePage, filters, setFilters, searchQuery, setSearchQuery }) {
  const { lang, t } = useTranslation();
  const [selectedGame, setSelectedGame] = useState(filters.game || 'all');
  const [selectedLangs, setSelectedLangs] = useState(filters.lang ? [filters.lang] : []);
  const [priceRange, setPriceRange] = useState(25000);
  
  // Custom states for filters
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyPreorder, setOnlyPreorder] = useState(false);
  const [selectedEditions, setSelectedEditions] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCompatibilities, setSelectedCompatibilities] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedThicknesses, setSelectedThicknesses] = useState([]);
  const [selectedClosingTypes, setSelectedClosingTypes] = useState([]);
  const [selectedPackagingTypes, setSelectedPackagingTypes] = useState(filters.type ? [filters.type] : []);

  const [activeSubcategory, setActiveSubcategory] = useState('all');
  const [activeSubsubcategory, setActiveSubsubcategory] = useState('all');

  // Aspect ratio tracking for cards
  const [loadedRatios, setLoadedRatios] = useState({});
  const handleAspectRatioLoaded = (productId, ratio) => {
    setLoadedRatios(prev => {
      if (prev[productId] === ratio) return prev;
      return { ...prev, [productId]: ratio };
    });
  };

  // Reset ratios when filter states change
  useEffect(() => {
    setLoadedRatios({});
  }, [selectedGame, selectedLangs, priceRange, onlyInStock, onlyPreorder, selectedEditions, selectedBrands, selectedCompatibilities, selectedColors, selectedThicknesses, selectedClosingTypes, selectedPackagingTypes, activeSubcategory, activeSubsubcategory, searchQuery]);


  const [dbCategories, setDbCategories] = useState(() => {
    const cached = getCachedCategories();
    return cached.length > 0 ? cached : [];
  });
  const [categoriesLoaded, setCategoriesLoaded] = useState(true);

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
      if (matchedCat && matchedCat.parent_id && matchedCat.parent_id !== 'game-pokemon' && matchedCat.parent_id !== 'game-lorcana' && matchedCat.parent_id !== 'game-onepiece' && matchedCat.parent_id !== 'game-ostatni' && matchedCat.parent_id !== 'game-accessories' && matchedCat.parent_id !== 'game-acrylics') {
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
        icon: <img src={getCategoryIcon(child)} alt={lang === 'CZ' ? `${child.name_cz || child.name} - Northvale TCG` : `${child.name_en || child.name} - Northvale TCG`} title={lang === 'CZ' ? (child.name_cz || child.name) : (child.name_en || child.name)} className="subcategory-img" width="18" height="18" style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'cover' }} />
      });
    });
    return formatted;
  };

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    search: true,
    stock: true,
    lang: false,
    packaging: true,
    editions: false,
    brand: false,
    compatibility: false,
    color: false,
    thickness: false,
    closing: false,
    price: true
  });

  const toggleSection = (sec) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Reset other filters when game changes
  const [prevGame, setPrevGame] = useState(selectedGame);
  if (selectedGame !== prevGame) {
    setPrevGame(selectedGame);
    setSelectedLangs([]);
    setOnlyInStock(false);
    setOnlyPreorder(false);
    setSelectedEditions([]);
    setSelectedBrands([]);
    setSelectedCompatibilities([]);
    setSelectedColors([]);
    setSelectedThicknesses([]);
    setSelectedClosingTypes([]);
    setSelectedPackagingTypes([]);
    setActiveSubcategory('all');
    setActiveSubsubcategory('all');
  }

  // Prev filters sync
  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    const nextGame = filters.game || 'all';
    setSelectedGame(nextGame);
    setSelectedLangs(filters.lang ? [filters.lang] : []);
    
    // Resolve active subcategory & subsubcategory
    let subcat = 'all';
    let subsubcat = 'all';
    if (filters.category_id) {
      const cat = dbCategories.find(c => c.id === filters.category_id);
      if (cat) {
        if (cat.parent_id && cat.parent_id !== 'game-pokemon' && cat.parent_id !== 'game-lorcana' && cat.parent_id !== 'game-onepiece' && cat.parent_id !== 'game-ostatni' && cat.parent_id !== 'game-accessories' && cat.parent_id !== 'game-acrylics') {
          subcat = cat.parent_id;
          subsubcat = cat.id;
        } else {
          subcat = cat.id;
        }
      }
    } else {
      const resolved = resolveActiveCategoryFromFilters(nextGame, filters, dbCategories);
      const cat = dbCategories.find(c => c.id === resolved);
      if (cat) {
        if (cat.parent_id && cat.parent_id !== 'game-pokemon' && cat.parent_id !== 'game-lorcana' && cat.parent_id !== 'game-onepiece' && cat.parent_id !== 'game-ostatni' && cat.parent_id !== 'game-accessories' && cat.parent_id !== 'game-acrylics') {
          subcat = cat.parent_id;
          subsubcat = cat.id;
        } else {
          subcat = cat.id;
        }
      }
    }
    
    setActiveSubcategory(subcat);
    setActiveSubsubcategory(subsubcat);
    
    // Set packaging types based on category_id or type
    if (filters.category_id) {
      const cat = dbCategories.find(c => c.id === filters.category_id);
      if (cat) {
        const isLevel2 = cat.parent_id === 'game-pokemon' || cat.parent_id === 'game-lorcana' || cat.parent_id === 'game-onepiece' || cat.parent_id === 'game-ostatni';
        if (isLevel2) {
          setSelectedPackagingTypes([cat.id]);
        } else if (cat.parent_id) {
          setSelectedPackagingTypes([cat.parent_id]);
        }
      }
    } else if (filters.type) {
      const root = dbCategories.find(c => c.game === nextGame && c.parent_id === null);
      if (root) {
        const matchedSubcat = dbCategories.find(c => c.parent_id === root.id && getHistoricalFilterForCategory(c.id)?.packagingType === filters.type);
        if (matchedSubcat) {
          setSelectedPackagingTypes([matchedSubcat.id]);
        }
      }
    } else {
      setSelectedPackagingTypes([]);
    }
  }

  const getSubcategoryCount = (catId) => {
    const matchedIds = getCategoryAndDescendantIds(catId, dbCategories);
    return baseSealed.filter(product => {
      if (product.category_id) {
        return matchedIds.includes(product.category_id);
      } else {
        return matchedIds.some(cid => matchesHistoricalCategory(product, cid));
      }
    }).length;
  };

  const handlePackagingTypeToggle = (catId) => {
    setSelectedPackagingTypes(prev => {
      const next = prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId];
      
      if (next.length === 1) {
        setActiveSubcategory(next[0]);
        setActiveSubsubcategory('all');
        setFilters(f => ({ 
          ...f, 
          category_id: next[0], 
          type: undefined, 
          subcat: undefined, 
          subsubcat: undefined, 
          gameFilter: undefined 
        }));
      } else {
        setActiveSubcategory('all');
        setActiveSubsubcategory('all');
        setFilters(f => ({ 
          ...f, 
          category_id: undefined, 
          type: undefined, 
          subcat: undefined, 
          subsubcat: undefined, 
          gameFilter: undefined 
        }));
      }
      
      return next;
    });
  };


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

  // Get sealed products
  const sealedProducts = products.filter(p => {
    if (p.type !== 'sealed' && p.type !== 'accessory') return false;
    if (!FEATURE_FLAGS.showSlabs) {
      if (p.subsubcat === 'graded' || p.subcat === 'graded') return false;
      if (p.category === 'Acrylics' && p.game === 'PSA') return false;
    }
    return true;
  });

  // Base list for active game / type
  const baseSealed = sealedProducts.filter(p => {
    if (selectedGame === 'all') return true;
    if (selectedGame === 'Accessories') return p.type === 'accessory' && p.category !== 'Acrylics';
    if (selectedGame === 'Acrylics') return p.category === 'Acrylics';
    return p.game === selectedGame && p.category !== 'Acrylics';
  });



  // Helper mappings
  const getProductBrand = (p) => {
    const nameLower = p.name.toLowerCase();
    const descLower = (p.desc || '').toLowerCase();
    if (nameLower.includes('dragon shield') || descLower.includes('dragon shield')) return 'Dragon Shield';
    if (nameLower.includes('ultra pro') || descLower.includes('ultra pro')) return 'Ultra PRO';
    if (nameLower.includes('ultimate guard') || descLower.includes('ultimate guard')) return 'Ultimate Guard';
    if (nameLower.includes('gamegenic') || descLower.includes('gamegenic')) return 'Gamegenic';
    return 'Other';
  };

  const getProductCompatibility = (p) => {
    const nameLower = p.name.toLowerCase();
    const descLower = (p.desc || '').toLowerCase();
    if (nameLower.includes('japanese') || descLower.includes('japanese') || nameLower.includes('small size')) return 'Japanese cards';
    if (nameLower.includes('booster box') || descLower.includes('booster box')) return 'Booster Box case';
    if (nameLower.includes('etb') || nameLower.includes('elite trainer box') || descLower.includes('etb') || descLower.includes('elite trainer box')) return 'ETB case';
    if (nameLower.includes('graded') || nameLower.includes('slab') || descLower.includes('graded') || descLower.includes('slab')) return 'Graded cards';
    if (nameLower.includes('standard') || descLower.includes('standard') || p.subcat === 'Sleeves') return 'Standard cards';
    return 'Other';
  };

  const getProductColor = (p) => {
    const nameLower = p.name.toLowerCase();
    const descLower = (p.desc || '').toLowerCase();
    if (nameLower.includes('černý') || nameLower.includes('černá') || nameLower.includes('black') || descLower.includes('černá') || descLower.includes('black')) return 'Black';
    if (nameLower.includes('červený') || nameLower.includes('červená') || nameLower.includes('red') || descLower.includes('červená') || descLower.includes('red')) return 'Red';
    if (nameLower.includes('modrý') || nameLower.includes('modrá') || nameLower.includes('blue') || descLower.includes('modrá') || descLower.includes('blue')) return 'Blue';
    if (nameLower.includes('zelený') || nameLower.includes('zelená') || nameLower.includes('green') || descLower.includes('zelená') || descLower.includes('green')) return 'Green';
    if (nameLower.includes('clear') || nameLower.includes('průhledný') || nameLower.includes('průhledná') || nameLower.includes('transparent') || nameLower.includes('soft') || descLower.includes('clear') || descLower.includes('průhledná')) return 'Clear';
    return 'Other';
  };

  const getAcrylicThickness = (p) => {
    const nameLower = p.name.toLowerCase();
    const descLower = (p.desc || '').toLowerCase();
    if (p.acrylicThickness === 4 || nameLower.includes('4mm') || descLower.includes('4mm')) return '4mm';
    if (p.acrylicThickness === 3 || nameLower.includes('3mm') || descLower.includes('3mm')) return '3mm';
    return 'Other';
  };

  const getAcrylicClosingType = (p) => {
    const nameLower = p.name.toLowerCase();
    const descLower = (p.desc || '').toLowerCase();
    if (p.closingType === 'Magnetické víko' || nameLower.includes('magnet') || descLower.includes('magnet')) return 'Magnetic';
    if (p.closingType === 'Nasouvací systém' || nameLower.includes('nasouvací') || nameLower.includes('slip-in') || nameLower.includes('stojánek') || descLower.includes('nasouvací') || descLower.includes('slip-in')) return 'Slip-in';
    return 'Other';
  };



  const getBrandCount = (br) => {
    return baseSealed.filter(p => getProductBrand(p) === br).length;
  };

  const getCompatibilityCount = (comp) => {
    return baseSealed.filter(p => getProductCompatibility(p) === comp).length;
  };

  const getColorCount = (col) => {
    return baseSealed.filter(p => getProductColor(p) === col).length;
  };

  const getLangCount = (lang) => {
    return baseSealed.filter(p => p.lang === lang).length;
  };

  const getThicknessCount = (th) => {
    return baseSealed.filter(p => getAcrylicThickness(p) === th).length;
  };

  const getClosingTypeCount = (ct) => {
    return baseSealed.filter(p => getAcrylicClosingType(p) === ct).length;
  };

  const getStockCount = (stockType) => {
    if (stockType === 'inStock') {
      return baseSealed.filter(p => p.stock > 0).length;
    }
    if (stockType === 'preorder') {
      return baseSealed.filter(p => p.preorder === true).length;
    }
    return 0;
  };

  // Filter logic
  const filteredProducts = sealedProducts.filter(product => {
    // Search query filter
    if (searchQuery && 
        !product.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !(product.edition && product.edition.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false;
    }

    // Game selection
    if (selectedGame !== 'all') {
      if (selectedGame === 'Accessories') {
        if (product.type !== 'accessory' || product.category === 'Acrylics') return false;
      } else if (selectedGame === 'Acrylics') {
        if (product.category !== 'Acrylics') return false;
      } else {
        if (product.game !== selectedGame || product.category === 'Acrylics') return false;
      }
    }

    // Language selection (multiple)
    if (selectedLangs.length > 0 && !selectedLangs.includes(product.lang)) return false;

    // Price range
    if (product.price > priceRange) return false;

    // Hiding out of stock products automatically
    if (product.type === 'single') {
      const hasStock = product.variants && product.variants.some(v => (v.stock || 0) > 0);
      if (!hasStock) return false;
    } else {
      if ((product.stock || 0) <= 0) return false;
    }
    if (onlyPreorder && !product.preorder) return false;

    // Subcategories matching helper (tabs at the top)
    if (activeSubcategory !== 'all') {
      const targetCatId = activeSubsubcategory !== 'all' ? activeSubsubcategory : activeSubcategory;
      const matchedCatIds = getCategoryAndDescendantIds(targetCatId, dbCategories);
      
      let catMatch = false;
      if (product.category_id) {
        catMatch = matchedCatIds.includes(product.category_id);
      } else {
        // Fallback using historical fields
        catMatch = matchedCatIds.some(catId => matchesHistoricalCategory(product, catId));
      }
      
      if (!catMatch) return false;
    }

    // Packaging Type filter (multiple checkboxes in sidebar - using category IDs and descendants)
    if (selectedGame !== 'Accessories' && selectedGame !== 'Acrylics' && selectedGame !== 'all') {
      if (selectedPackagingTypes.length > 0) {
        const matchesAnyChecked = selectedPackagingTypes.some(catId => {
          const matchedIds = getCategoryAndDescendantIds(catId, dbCategories);
          if (product.category_id) {
            return matchedIds.includes(product.category_id);
          } else {
            return matchedIds.some(cid => matchesHistoricalCategory(product, cid));
          }
        });
        if (!matchesAnyChecked) return false;
      }
    }


    // Edition filter (multiple checkboxes in sidebar)
    if (selectedEditions.length > 0 && !selectedEditions.includes(product.edition)) return false;

    // Brand filter (multiple checkboxes in sidebar)
    if (selectedBrands.length > 0 && !selectedBrands.includes(getProductBrand(product))) return false;

    // Compatibility filter (multiple checkboxes in sidebar)
    if (selectedCompatibilities.length > 0 && !selectedCompatibilities.includes(getProductCompatibility(product))) return false;

    // Color filter (multiple checkboxes in sidebar)
    if (selectedColors.length > 0 && !selectedColors.includes(getProductColor(product))) return false;

    // Thickness filter (multiple checkboxes in sidebar)
    if (selectedThicknesses.length > 0 && !selectedThicknesses.includes(getAcrylicThickness(product))) return false;

    // Closing Type filter (multiple checkboxes in sidebar)
    if (selectedClosingTypes.length > 0 && !selectedClosingTypes.includes(getAcrylicClosingType(product))) return false;

    return true;
  });

  // Sort logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'expensive') return b.price - a.price;
    if (sortBy === 'cheap') return a.price - b.price;
    if (sortBy === 'new') return b.id.localeCompare(a.id); // mock sort
    return 0; // Default: top
  });

  // Determine subcategories to show based on game
  const subcategories = categoriesLoaded 
    ? getDisplaySubcategories(selectedGame, 'sealed', dbCategories, lang)
    : [];

  // Sidebar Layout rendering functions
  const renderStockFilter = () => {
    const list = [
      { id: 'inStock', name: lang === 'CZ' ? 'Pouze skladem' : 'Only in Stock' }
      // { id: 'preorder', name: lang === 'CZ' ? 'Možnost předobjednávky' : 'Pre-order available' }
    ];
    return (
      <div className="sidebar-filter-section">
        <h4 className={`sidebar-filter-title collapsible ${expandedSections.stock ? 'active' : ''}`} onClick={() => toggleSection('stock')}>
          Skladová dostupnost
          <ChevronIcon />
        </h4>
        {expandedSections.stock && (
          <div className="sidebar-checkbox-list">
            {list.map(st => {
              const count = getStockCount(st.id);
              const isDisabled = count === 0;
              const isChecked = st.id === 'inStock' ? onlyInStock : onlyPreorder;
              const handleToggle = () => {
                if (st.id === 'inStock') {
                  setOnlyInStock(!onlyInStock);
                } else {
                  setOnlyPreorder(!onlyPreorder);
                }
              };
              return (
                <label key={st.id} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={handleToggle}
                    disabled={isDisabled}
                    className="sidebar-checkbox"
                  />
                  <span>{st.name}</span>
                  <span className="filter-badge">{count}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderLangFilter = () => {
    const list = [
      { code: 'EN', name: 'Angličtina (ENG) 🇬🇧' },
      { code: 'JP', name: 'Japonština (JPN) 🇯🇵' },
      { code: 'CN', name: 'Čínština (CHN) 🇨🇳' },
      { code: 'KR', name: 'Korejština (KOR) 🇰🇷' }
    ];
    return (
      <div className="sidebar-filter-section">
        <h4 className={`sidebar-filter-title collapsible ${expandedSections.lang ? 'active' : ''}`} onClick={() => toggleSection('lang')}>
          Jazyk balení
          <ChevronIcon />
        </h4>
        {expandedSections.lang && (
          <div className="sidebar-checkbox-list">
            {list.map(lang => {
              const count = getLangCount(lang.code);
              const isDisabled = count === 0;
              return (
                <label key={lang.code} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedLangs.includes(lang.code)}
                    onChange={() => {
                      setSelectedLangs(prev =>
                        prev.includes(lang.code) ? prev.filter(l => l !== lang.code) : [...prev, lang.code]
                      );
                    }}
                    disabled={isDisabled}
                    className="sidebar-checkbox"
                  />
                  <span>{lang.name}</span>
                  <span className="filter-badge">{count}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderPackagingFilter = () => {
    if (selectedGame === 'all' || selectedGame === 'Accessories' || selectedGame === 'Acrylics') {
      return null;
    }

    const root = dbCategories.find(c => c.game === selectedGame && c.parent_id === null);
    if (!root) return null;

    const gameSubcats = dbCategories.filter(c => c.parent_id === root.id && (c.type === 'sealed' || c.type === 'accessory'));
    if (gameSubcats.length === 0) return null;

    return (
      <div className="sidebar-filter-section">
        <h4 className={`sidebar-filter-title collapsible ${expandedSections.packaging ? 'active' : ''}`} onClick={() => toggleSection('packaging')}>
          {lang === 'CZ' ? 'Typ balení' : 'Packaging Type'}
          <ChevronIcon />
        </h4>
        {expandedSections.packaging && (
          <div className="sidebar-checkbox-list">
            {gameSubcats.map(sub => {
              const count = getSubcategoryCount(sub.id);
              const isDisabled = count === 0;
              const isChecked = selectedPackagingTypes.includes(sub.id);
              return (
                <label key={sub.id} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handlePackagingTypeToggle(sub.id)}
                    disabled={isDisabled}
                    className="sidebar-checkbox"
                  />
                  <span>{lang === 'CZ' ? sub.name_cz : sub.name_en}</span>
                  <span className="filter-badge">{count}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderTcgFilters = () => {
    return (
      <>
        {renderStockFilter()}
        {renderPackagingFilter()}
        {renderLangFilter()}
      </>
    );
  };


  const renderAccessoriesFilters = () => {
    const brandsList = ['Dragon Shield', 'Ultra PRO', 'Ultimate Guard', 'Gamegenic'];
    const compatibilityList = ['Standard cards', 'Japanese cards', 'Booster Box case', 'ETB case', 'Graded cards'];
    const colorsList = [
      { name: 'Black', color: '#1f2937', label: 'Černá (Black) ⬛' },
      { name: 'Red', color: '#ef4444', label: 'Červená (Red) 🟥' },
      { name: 'Blue', color: '#3b82f6', label: 'Modrá (Blue) 🟦' },
      { name: 'Green', color: '#10b981', label: 'Zelená (Green) 🟩' },
      { name: 'Clear', color: '#f3f4f6', label: 'Průhledná (Clear) ⚪' }
    ];

    return (
      <>
        {renderStockFilter()}
        <div className="sidebar-filter-section">
          <h4 className={`sidebar-filter-title collapsible ${expandedSections.brand ? 'active' : ''}`} onClick={() => toggleSection('brand')}>
            Výrobce / Značka
            <ChevronIcon />
          </h4>
          {expandedSections.brand && (
            <div className="sidebar-checkbox-list">
              {brandsList.map(br => {
                const count = getBrandCount(br);
                const isDisabled = count === 0;
                return (
                  <label key={br} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(br)}
                      onChange={() => {
                        setSelectedBrands(prev =>
                          prev.includes(br) ? prev.filter(b => b !== br) : [...prev, br]
                        );
                      }}
                      disabled={isDisabled}
                      className="sidebar-checkbox"
                    />
                    <span>{br}</span>
                    <span className="filter-badge">{count}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="sidebar-filter-section">
          <h4 className={`sidebar-filter-title collapsible ${expandedSections.compatibility ? 'active' : ''}`} onClick={() => toggleSection('compatibility')}>
            Určeno pro (Kompatibilita)
            <ChevronIcon />
          </h4>
          {expandedSections.compatibility && (
            <div className="sidebar-checkbox-list">
              {compatibilityList.map(comp => {
                const count = getCompatibilityCount(comp);
                const isDisabled = count === 0;
                return (
                  <label key={comp} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedCompatibilities.includes(comp)}
                      onChange={() => {
                        setSelectedCompatibilities(prev =>
                          prev.includes(comp) ? prev.filter(c => c !== comp) : [...prev, comp]
                        );
                      }}
                      disabled={isDisabled}
                      className="sidebar-checkbox"
                    />
                    <span>{comp === 'Standard cards' ? 'Standardní velikost' : comp === 'Japanese cards' ? 'Japonská velikost' : comp === 'Booster Box case' ? 'Booster Box Case' : comp === 'ETB case' ? 'Elite Trainer Box Case' : 'Graded slabs'}</span>
                    <span className="filter-badge">{count}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="sidebar-filter-section">
          <h4 className={`sidebar-filter-title collapsible ${expandedSections.color ? 'active' : ''}`} onClick={() => toggleSection('color')}>
            Barva doplňku
            <ChevronIcon />
          </h4>
          {expandedSections.color && (
            <div className="sidebar-checkbox-list">
              {colorsList.map(col => {
                const count = getColorCount(col.name);
                const isDisabled = count === 0;
                return (
                  <label key={col.name} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedColors.includes(col.name)}
                      onChange={() => {
                        setSelectedColors(prev =>
                          prev.includes(col.name) ? prev.filter(c => c !== col.name) : [...prev, col.name]
                        );
                      }}
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
      </>
    );
  };

  const renderAcrylicsFilters = () => {
    const compatibilityList = ['Pokémon', 'Lorcana', 'Ostatní TCG', 'PSA'];
    const thicknessList = ['4mm', '3mm'];
    const closingTypeList = ['Magnetic', 'Slip-in'];

    return (
      <>
        {renderStockFilter()}
        <div className="sidebar-filter-section">
          <h4 className={`sidebar-filter-title collapsible ${expandedSections.compatibility ? 'active' : ''}`} onClick={() => toggleSection('compatibility')}>
            Kompatibilita boxu
            <ChevronIcon />
          </h4>
          {expandedSections.compatibility && (
            <div className="sidebar-checkbox-list">
              {compatibilityList.map(comp => {
                const count = baseSealed.filter(p => p.game === comp).length;
                const isDisabled = count === 0;
                return (
                  <label key={comp} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={activeSubcategory === comp}
                      onChange={() => {
                        if (activeSubcategory === comp) {
                          setActiveSubcategory('all');
                        } else {
                          setActiveSubcategory(comp);
                        }
                      }}
                      disabled={isDisabled}
                      className="sidebar-checkbox"
                    />
                    <span>{comp}</span>
                    <span className="filter-badge">{count}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="sidebar-filter-section">
          <h4 className={`sidebar-filter-title collapsible ${expandedSections.thickness ? 'active' : ''}`} onClick={() => toggleSection('thickness')}>
            Tloušťka akrylu
            <ChevronIcon />
          </h4>
          {expandedSections.thickness && (
            <div className="sidebar-checkbox-list">
              {thicknessList.map(th => {
                const count = getThicknessCount(th);
                const isDisabled = count === 0;
                return (
                  <label key={th} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedThicknesses.includes(th)}
                      onChange={() => {
                        setSelectedThicknesses(prev =>
                          prev.includes(th) ? prev.filter(t => t !== th) : [...prev, th]
                        );
                      }}
                      disabled={isDisabled}
                      className="sidebar-checkbox"
                    />
                    <span>{th}</span>
                    <span className="filter-badge">{count}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="sidebar-filter-section">
          <h4 className={`sidebar-filter-title collapsible ${expandedSections.closing ? 'active' : ''}`} onClick={() => toggleSection('closing')}>
            Systém zavírání
            <ChevronIcon />
          </h4>
          {expandedSections.closing && (
            <div className="sidebar-checkbox-list">
              {closingTypeList.map(ct => {
                const count = getClosingTypeCount(ct);
                const isDisabled = count === 0;
                return (
                  <label key={ct} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedClosingTypes.includes(ct)}
                      onChange={() => {
                        setSelectedClosingTypes(prev =>
                          prev.includes(ct) ? prev.filter(c => c !== ct) : [...prev, ct]
                        );
                      }}
                      disabled={isDisabled}
                      className="sidebar-checkbox"
                    />
                    <span>{ct === 'Magnetic' ? 'Magnetické víko 🧲' : 'Nasouvací systém 🔓'}</span>
                    <span className="filter-badge">{count}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="container fade-in" style={{ paddingTop: '20px', paddingBottom: '40px' }}>
      <h1 className="sr-only">Katalog TCG produktů a příslušenství</h1>

      {/* Breadcrumbs Navigation */}
      {(selectedGame !== 'all' || activeSubcategory !== 'all') && (
        <nav className="breadcrumbs-nav" aria-label="Drobečková navigace">
          <span className="breadcrumb-item" onClick={() => setActivePage('home')}>{t('common.home')}</span>
          
          {selectedGame !== 'all' && (
            <>
              <span className="breadcrumb-separator">/</span>
              {activeSubcategory === 'all' ? (
                <span className="breadcrumb-item active">{selectedGame === 'Accessories' ? 'Příslušenství' : selectedGame === 'Acrylics' ? 'Akryly' : selectedGame}</span>
              ) : (
                <span 
                  className="breadcrumb-item" 
                  onClick={() => { 
                    setActiveSubcategory('all'); 
                    setActiveSubsubcategory('all'); 
                    setFilters(prev => ({ ...prev, type: undefined, subcat: undefined, subsubcat: undefined, gameFilter: undefined })); 
                  }}
                >
                  {selectedGame === 'Accessories' ? 'Příslušenství' : selectedGame === 'Acrylics' ? 'Akryly' : selectedGame}
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
                {dbCategories.find(s => s.id === activeSubsubcategory)?.[lang === 'CZ' ? 'name_cz' : 'name_en'] || activeSubsubcategory}
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
          {selectedGame === 'all' && (
            <div className="sidebar-filter-section">
              <h4 className="sidebar-filter-title">{lang === 'CZ' ? 'Karetní hra' : 'Card Game'}</h4>
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="sidebar-select"
              >
                <option value="all">{lang === 'CZ' ? 'Všechny sekce' : 'All sections'}</option>
                <option value="Pokémon">Pokémon TCG</option>
                <option value="Lorcana">Disney Lorcana</option>
                <option value="One Piece">One Piece TCG</option>
                <option value="Ostatní TCG">{lang === 'CZ' ? 'Ostatní TCG' : 'Other TCG'}</option>
                <option value="Accessories">{lang === 'CZ' ? 'Příslušenství' : 'Accessories'}</option>
                <option value="Acrylics">{lang === 'CZ' ? 'Akryly' : 'Acrylic Cases'}</option>
              </select>
            </div>
          )}


          {/* Filter: Search within category */}
          <div className="sidebar-filter-section">
            <h4 className={`sidebar-filter-title collapsible ${expandedSections.search ? 'active' : ''}`} onClick={() => toggleSection('search')}>
              {lang === 'CZ' ? 'Hledat produkt' : 'Search Product'}
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

          {/* Render category specific filters */}
          {selectedGame === 'Accessories' ? (
            renderAccessoriesFilters()
          ) : selectedGame === 'Acrylics' ? (
            renderAcrylicsFilters()
          ) : (
            renderTcgFilters()
          )}

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
              setSelectedGame('all');
              setSelectedLangs([]);
              setPriceRange(25000);
              setOnlyInStock(false);
              setOnlyPreorder(false);
              setSelectedEditions([]);
              setSelectedBrands([]);
              setSelectedCompatibilities([]);
              setSelectedColors([]);
              setSelectedThicknesses([]);
              setSelectedClosingTypes([]);
              setSelectedPackagingTypes([]);
              setActiveSubcategory('all');
              setActiveSubsubcategory('all');
              setExpandedSections({
                search: true,
                stock: true,
                lang: false,
                packaging: false,
                editions: false,
                brand: false,
                compatibility: false,
                color: false,
                thickness: false,
                closing: false,
                price: true
              });
              setSearchQuery('');
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
              <h2 className="category-title">{(lang === 'CZ' ? gameInfo[selectedGame]?.title : gameInfo[selectedGame]?.enTitle) || (lang === 'CZ' ? 'Katalog produktů' : 'Products Catalog')}</h2>
              <div className="category-description-wrapper">
                <div className={`category-description-text ${!isDescExpanded ? 'collapsed' : ''}`}>
                  {renderFormattedDescription((lang === 'CZ' ? gameInfo[selectedGame]?.desc : gameInfo[selectedGame]?.enDesc) || (lang === 'CZ' ? 'Vstupte do světa originálních Pokémon, Disney Lorcana, One Piece a dalších TCG produktů, herního příslušenství a prémiových akrylových boxů. Nabízíme široký výběr booster boxů, dárkových Elite Trainer Boxů, Trove boxů, booster bundlů i samostatných balíčků.' : 'Enter the world of original Pokémon, Disney Lorcana, One Piece, and other TCG products, gaming accessories, and premium acrylic cases. We stock booster boxes, gift Elite Trainer Boxes, Trove boxes, bundles, and single booster packs.'))}
                </div>
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
              const title = currentCat ? (lang === 'CZ' ? currentCat.name_cz : currentCat.name_en) : activeSubcategory;
              const desc = currentCat ? (lang === 'CZ' ? currentCat.description_cz : currentCat.description_en) : '';
              
              return (
                <div className="category-intro-box">
                  <h2 className="category-title">
                    {title}
                  </h2>
                  {desc && (
                    <div className="category-description-wrapper">
                      <div className={`category-description-text ${!isDescExpanded ? 'collapsed' : ''}`}>
                        {renderFormattedDescription(desc)}
                      </div>
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
                  )}
                </div>
              );
            })()
          )}

          {/* Subcategories or Sub-subcategories Grid Selection */}
          {activeSubcategory === 'all' ? (
            subcategories.length > 0 && (
              <>
                <div className="subcategories-section-title">
                  {selectedGame === 'Accessories' ? (lang === 'CZ' ? 'Vyberte kategorii doplňků' : 'Select Accessory Category') : selectedGame === 'Acrylics' ? (lang === 'CZ' ? 'Kompatibilita akrylového boxu' : 'Select Acrylic Category') : (lang === 'CZ' ? 'Vyberte typ balení' : 'Select Packaging Type')}
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
                            category_id: sub.id === 'all' ? undefined : sub.id, 
                            type: undefined,
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
              const subsubcatsList = currentSubsubcats.filter(sub => sub.id !== 'all');
              return currentSubsubcats.length > 0 && activeSubsubcategory === 'all' && (
                <>
                  <div className="subcategories-section-title">
                    {lang === 'CZ' ? 'Upřesněte typ balení' : 'Refine Packaging Type'}
                  </div>
                  <div className="subcategory-grid" style={isMobile && subsubcatsList.length > 6 ? { marginBottom: '12px' } : { marginBottom: '48px' }}>
                    {((isMobile && !showAllSubsubcats) ? subsubcatsList.slice(0, 6) : subsubcatsList).map(sub => {
                      const isEmoji = typeof sub.icon === 'string';
                      return (
                        <div
                          key={sub.id}
                          className={`subcategory-box ${activeSubsubcategory === sub.id ? 'active' : ''}`}
                          onClick={() => {
                            setActiveSubsubcategory(sub.id);
                            setFilters(prev => ({
                              ...prev,
                              category_id: sub.id === 'all' ? activeSubcategory : sub.id,
                              subsubcat: undefined
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
                  {isMobile && subsubcatsList.length > 6 && (
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
                {lang === 'CZ' ? 'Celkem nalezeno: ' : 'Total found: '}<strong>{sortedProducts.length}</strong> {lang === 'CZ' ? 'produktů' : 'products'}
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
          {sortedProducts.length === 0 ? (
            <div className="glass-panel" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center' }}>
              <span style={{ fontSize: '56px' }}>📦</span>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>{lang === 'CZ' ? 'Nebyly nalezeny žádné produkty' : 'No products found'}</h3>
            </div>
          ) : (
            (() => {
              // Standard card width is 240px desktop, 200px mobile.
              // Find the tallest image (minimum ratio = width / height).
              // Ensure we filter ratios to only currently visible products in sortedProducts.
              const visibleRatios = sortedProducts
                .map(p => loadedRatios[p.id])
                .filter(Boolean);

              // Standard card default height is 442px with 300px image height.
              // Standard card ratio is ~0.7.
              // If there's a taller card, minRatio will be smaller (e.g. 0.55).
              // Let's compute custom height variables if we find a taller card.
              let artHDesktop = 300;
              let artHMobile = 250;
              let infoMt = 12;

              if (visibleRatios.length > 0) {
                const minRatio = Math.min(...visibleRatios);
                // If the aspect ratio indicates a tall vertical image (ratio < 0.72)
                if (minRatio < 0.72) {
                  // Keep width fixed (240px desktop, 200px mobile) and calculate height based on tallest image aspect ratio
                  artHDesktop = Math.min(420, Math.round(240 / minRatio));
                  artHMobile = Math.min(350, Math.round(200 / minRatio));
                  infoMt = 20; // Pushing title away from tall image
                }
              }

              // Base info block + buttons height is ~130px desktop, ~120px mobile.
              // We add the dynamic infoMt margin to avoid overflows.
              const cardHDesktop = artHDesktop + 130 + infoMt;
              const cardHMobile = artHMobile + 120 + (infoMt - 2); // 18px on mobile if tall, 10px if standard

              const gridStyle = {
                '--art-h-desktop': `${artHDesktop}px`,
                '--art-h-mobile': `${artHMobile}px`,
                '--card-h-desktop': `${cardHDesktop}px`,
                '--card-h-mobile': `${cardHMobile}px`,
                '--info-mt': `${infoMt}px`
              };

              return (
                <div className="catalog-product-grid" style={gridStyle}>
                  {sortedProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      addToCart={addToCart}
                      setSelectedProductId={setSelectedProductId}
                      setActivePage={setActivePage}
                      onAspectRatioLoaded={handleAspectRatioLoaded}
                    />
                  ))}
                </div>
              );
            })()
          )}
        </main>
      </div>
    </div>
  );
}
