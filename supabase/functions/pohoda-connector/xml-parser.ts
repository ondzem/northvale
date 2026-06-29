import { XMLParser } from "npm:fast-xml-parser";

interface ParsedStockItem {
  sku: string;      // Kód zásoby v Pohodě
  stock: number;    // Počet kusů na skladě
  price?: number;   // Volitelně prodejní cena
}

/**
 * Vyčistí XML od problematických znaků a převede ho na JavaScriptový objekt
 */
function parseXmlToJs(xmlString: string): any {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true, // Odstraní jmenné prostory (např. sto:code -> code)
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
  });
  return parser.parse(xmlString);
}

/**
 * Rekurzivně vyhledá všechny uzly typu "stock" v objektu
 */
function findStockElements(obj: any): any[] {
  const stocks: any[] = [];
  
  function traverse(current: any) {
    if (!current || typeof current !== "object") return;
    
    // Pokud objekt obsahuje klíč 'stock', přidáme ho do výsledku
    if (current.stock) {
      if (Array.isArray(current.stock)) {
        stocks.push(...current.stock);
      } else {
        stocks.push(current.stock);
      }
    }
    
    // Procházíme podřízené uzly
    for (const key of Object.keys(current)) {
      if (key !== "stock") {
        traverse(current[key]);
      }
    }
  }
  
  traverse(obj);
  return stocks;
}

/**
 * Zpracuje stažené XML ze zásob a vrátí pole spárovaných položek (SKU, sklad)
 */
export function parseStockXml(xmlString: string): ParsedStockItem[] {
  if (!xmlString || xmlString.trim() === "") {
    throw new Error("Empty XML content received.");
  }
  
  const jsObj = parseXmlToJs(xmlString);
  const stockElements = findStockElements(jsObj);
  
  const parsedItems: ParsedStockItem[] = [];
  
  for (const element of stockElements) {
    const header = element.stockHeader;
    if (!header) continue;
    
    // Získání kódu zásoby (SKU)
    const sku = header.code || header.kod;
    if (!sku) continue;
    
    // Získání množství na skladě
    // Pohoda exportuje stav zásob v elementu 'count', 'countValue' nebo 'stock'
    let stock = 0;
    if (header.count !== undefined) {
      stock = Number(header.count);
    } else if (header.countValue !== undefined) {
      stock = Number(header.countValue);
    } else if (header.stockCount !== undefined) {
      stock = Number(header.stockCount);
    } else if (header.quantity !== undefined) {
      stock = Number(header.quantity);
    }
    
    // Získání prodejní ceny (volitelné)
    let price: number | undefined = undefined;
    if (header.sellingPrice !== undefined) {
      price = Number(header.sellingPrice);
    } else if (header.price !== undefined) {
      price = Number(header.price);
    }
    
    parsedItems.push({
      sku: String(sku).trim(),
      stock: isNaN(stock) ? 0 : stock,
      price: price !== undefined && !isNaN(price) ? price : undefined,
    });
  }
  
  return parsedItems;
}
