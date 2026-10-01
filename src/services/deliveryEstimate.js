/**
 * Odhad doručení — „u vás obvykle do pondělí 6. 10.“
 *
 * Vychází ze slibu e-shopu „odeslání do 48 hodin“ (= 2 pracovní dny)
 * a doby dopravy DPD/GLS (obvykle 1 pracovní den od odeslání).
 * Víkendy a české státní svátky se přeskakují. Je to horní odhad
 * („obvykle do“), ne garance — ať je slib pravdivý i v horším případě.
 */

export const DISPATCH_BUSINESS_DAYS = 2;   // „odeslání do 48 hodin“
export const CARRIER_BUSINESS_DAYS = 1;    // DPD / GLS po odeslání

/** Velikonoční neděle (anonymní gregoriánský algoritmus). */
function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const key = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const holidayCache = {};

/** České státní svátky a dny pracovního klidu pro daný rok. */
function czechHolidays(year) {
  if (holidayCache[year]) return holidayCache[year];
  const fixed = [[1, 1], [5, 1], [5, 8], [7, 5], [7, 6], [9, 28], [10, 28], [11, 17], [12, 24], [12, 25], [12, 26]];
  const set = new Set(fixed.map(([m, d]) => key(new Date(year, m - 1, d))));
  const easter = easterSunday(year);
  set.add(key(new Date(year, easter.getMonth(), easter.getDate() - 2))); // Velký pátek
  set.add(key(new Date(year, easter.getMonth(), easter.getDate() + 1))); // Velikonoční pondělí
  holidayCache[year] = set;
  return set;
}

export function isBusinessDay(date) {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !czechHolidays(date.getFullYear()).has(key(date));
}

/** Přičte n pracovních dní (dnešek se nepočítá). */
export function addBusinessDays(from, n) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (isBusinessDay(d)) added++;
  }
  return d;
}

/**
 * Nejpozdější obvyklé datum doručení pro objednávku vytvořenou v `now`.
 * @param {{ personalPickup?: boolean }} opts osobní odběr = jen odeslání/příprava
 */
export function estimateDeliveryDate(now = new Date(), opts = {}) {
  const days = DISPATCH_BUSINESS_DAYS + (opts.personalPickup ? 0 : CARRIER_BUSINESS_DAYS);
  return addBusinessDays(now, days);
}

/** „pondělí 6. 10.“ / „Monday 6 Oct“ */
export function formatDeliveryDate(date, lang = 'CZ') {
  if (lang === 'CZ') {
    return `${date.toLocaleDateString('cs-CZ', { weekday: 'long' })} ${date.getDate()}. ${date.getMonth() + 1}.`;
  }
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}
