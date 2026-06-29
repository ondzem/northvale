import { Client } from "npm:basic-ftp";

const FTP_HOST = Deno.env.get("FTP_HOST") || "";
const FTP_PORT = parseInt(Deno.env.get("FTP_PORT") || "21");
const FTP_USER = Deno.env.get("FTP_USER") || "";
const FTP_PASS = Deno.env.get("FTP_PASS") || "";

function getClient() {
  const client = new Client();
  // Nastavíme rozumný timeout v milisekundách (např. 15 vteřin)
  client.ftp.timeout = 15000;
  return client;
}

async function connectClient(client: Client) {
  if (!FTP_HOST || !FTP_USER || !FTP_PASS) {
    throw new Error("Missing FTP credentials in environment variables (FTP_HOST, FTP_USER, FTP_PASS).");
  }
  await client.access({
    host: FTP_HOST,
    port: FTP_PORT,
    user: FTP_USER,
    password: FTP_PASS,
    secure: false // Nastavte true, pokud váš FTP server vyžaduje FTPS (Explicit TLS)
  });
}

/**
 * Nahraje XML fakturu na FTP server do složky /pohoda/import/
 */
export async function uploadInvoiceXml(fileName: string, xmlContent: string): Promise<void> {
  const client = getClient();
  try {
    await connectClient(client);
    
    // Vytvoříme buffer z textu
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlContent);
    
    // Ujistíme se, že složka existuje a přepneme se do ní
    try {
      await client.ensureDir("/pohoda/import");
    } catch {
      // Pokud nelze vytvořit celou cestu absolutně, zkusíme relativní přístup
      await client.ensureDir("pohoda");
      await client.ensureDir("pohoda/import");
    }
    
    // Převod ArrayBuffer na ReadableStream, což basic-ftp podporuje
    const readableStream = new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      }
    });

    // Nahrajeme soubor
    await client.uploadFrom(readableStream, fileName);
  } finally {
    client.close();
  }
}

/**
 * Stáhne XML soubor zásob z FTP serveru ze složky /pohoda/export/
 */
export async function downloadStockXml(fileName: string = "zasoby.xml"): Promise<string> {
  const client = getClient();
  try {
    await connectClient(client);
    
    // Přepneme se do složky export
    await client.cd("/pohoda/export");
    
    // Stáhneme data do paměti jako stream a převedeme na text
    const chunks: Uint8Array[] = [];
    const writableStream = new WritableStream({
      write(chunk) {
        chunks.push(chunk);
      }
    });
    
    await client.downloadTo(writableStream, fileName);
    
    const totalLength = chunks.reduce((acc, val) => acc + val.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    const decoder = new TextDecoder("utf-8"); // nebo windows-1250 podle kódování Pohody
    return decoder.decode(result);
  } finally {
    client.close();
  }
}

/**
 * Přesune soubor zásob na FTP do složky /pohoda/archive/ a přejmenuje ho s časovým razítkem
 */
export async function archiveStockXml(sourceFileName: string = "zasoby.xml", archiveFileName: string): Promise<void> {
  const client = getClient();
  try {
    await connectClient(client);
    
    // Ujistíme se, že existuje archivní složka
    await client.ensureDir("/pohoda/archive");
    
    // Přejmenování/přesun souboru (standardní FTP příkaz RENAME)
    await client.rename(`/pohoda/export/${sourceFileName}`, `/pohoda/archive/${archiveFileName}`);
  } finally {
    client.close();
  }
}

/**
 * Otestuje připojení k FTP serveru a vypíše seznam souborů v rootu
 */
export async function testFtpConnection(): Promise<string[]> {
  const client = getClient();
  try {
    await connectClient(client);
    const list = await client.list();
    return list.map(item => `${item.isDirectory ? "[DIR]" : "[FILE]"} ${item.name} (${item.size} B)`);
  } finally {
    client.close();
  }
}
