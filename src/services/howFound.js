/** Volby dotazníku „Jak jste se o nás dozvěděli?“ (potvrzení objednávky, admin přehled). */
// Klíče musí sedět s HOW_FOUND v supabase/functions/order-view/index.ts
export const HOW_FOUND_OPTIONS = [
  { key: 'vyhledavac', cz: 'Google / Seznam', en: 'Google / Seznam' },
  { key: 'instagram', cz: 'Instagram', en: 'Instagram' },
  { key: 'facebook', cz: 'Facebook', en: 'Facebook' },
  { key: 'tiktok', cz: 'TikTok', en: 'TikTok' },
  { key: 'youtube', cz: 'YouTube', en: 'YouTube' },
  { key: 'komunita', cz: 'Discord / komunita', en: 'Discord / community' },
  { key: 'srovnavac', cz: 'Heureka / Zboží.cz', en: 'Heureka / Zboží.cz' },
  { key: 'doporuceni', cz: 'Doporučení od známého', en: 'A friend recommended you' },
  { key: 'akce', cz: 'Turnaj / akce', en: 'Tournament / event' },
  { key: 'ai', cz: 'ChatGPT / AI', en: 'ChatGPT / AI' },
  { key: 'jinak', cz: 'Jinak', en: 'Other' }
];
