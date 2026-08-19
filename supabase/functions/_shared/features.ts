/**
 * Přepínače chování serverových funkcí.
 *
 * AUTO_INVOICES — automatické vystavování faktur zákazníkům.
 *
 * Dočasně vypnuto: faktury zatím vystavuje a rozesílá provozovatel ručně ze
 * svého účetního systému (tlačítko „Odeslat fakturu“ u objednávky v adminu),
 * protože eshop zatím není propojený s účetnictvím a docházelo k nesouladu.
 *
 * Když je vypnuto:
 *   - nevystavuje se automaticky PDF faktura k objednávce,
 *   - zákazníkovi nechodí faktura v příloze ani odkaz na její stažení,
 *   - v e-mailu je místo toho informace, že fakturu zašleme dodatečně.
 *
 * Zpětné zapnutí = přepnout na true a nasadit finalize-order + send-order-email.
 * Pozor: hodnotu je potřeba držet stejnou i v src/config.js (FEATURE_FLAGS.autoInvoices),
 * aby web nenabízel faktury, které server negeneruje.
 */
export const AUTO_INVOICES = false;
