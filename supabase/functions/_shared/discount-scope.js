/**
 * Na které položky platí slevový kód. Stejný kód používá košík, pokladna
 * i server (finalize-order) — musí počítat shodně, jinak kontrola ceny
 * objednávku zamítne. Čistý JS, aby šel načíst ve Vite i v Deno.
 *
 * line = { productId, categoryId, amount }
 * code.scope: 'all' | 'products' | 'categories'
 */
export function codeCoversLine(code, line) {
  const scope = code?.scope || 'all';
  if (scope === 'products') return (code.scope_products || []).includes(line.productId);
  if (scope === 'categories') return !!line.categoryId && (code.scope_categories || []).includes(line.categoryId);
  return true;
}

/** Hodnota položek, ze kterých se sleva počítá. */
export function eligibleSubtotal(lines, code) {
  return (lines || []).reduce((sum, line) => (codeCoversLine(code, line) ? sum + line.amount : sum), 0);
}
