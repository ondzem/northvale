import { useState, useRef } from 'react';
import { supabase } from '../../supabase';

/**
 * Ruční odeslání faktury zákazníkovi.
 *
 * Eshop faktury nevystavuje (viz FEATURE_FLAGS.autoInvoices) — provozovatel je
 * dělá ve svém účetnictví. Tady je nahraje a odešle zákazníkovi ve firemní
 * šabloně, aby e-mail vypadal stejně jako ostatní zprávy z eshopu.
 *
 * Soubor se nikam neukládá, jen projde na server a odejde e-mailem.
 */

// Musí odpovídat ALLOWED_EXTENSIONS v supabase/functions/send-invoice-email.
const ALLOWED_EXTENSIONS = [
  'pdf',
  'isdoc', 'isdocx',
  'xml',
  'zip',
  'png', 'jpg', 'jpeg', 'webp', 'heic',
  'doc', 'docx', 'odt',
  'txt', 'csv'
];

const MAX_FILES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;

const fileExtension = (name) => {
  const parts = String(name || '').toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Načte soubor jako base64 bez hlavičky "data:...;base64,". */
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || '');
    const comma = result.indexOf(',');
    resolve(comma >= 0 ? result.slice(comma + 1) : result);
  };
  reader.onerror = () => reject(new Error(`Soubor ${file.name} se nepodařilo načíst.`));
  reader.readAsDataURL(file);
});

export default function SendInvoiceModal({ order, lang = 'CZ', showToast, onClose, onSent }) {
  const cz = lang === 'CZ';
  const [email, setEmail] = useState(order?.email || order?.customerEmail || '');
  const [name, setName] = useState(order?.customerName || '');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const orderId = order?.id || order?.orderId || '';
  const alreadySentAt = order?.rawJson?.order?.invoice_sent_at || null;

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  const addFiles = (incoming) => {
    const list = Array.from(incoming || []);
    if (list.length === 0) return;

    const accepted = [];
    for (const file of list) {
      const ext = fileExtension(file.name);

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        showToast?.(cz
          ? `Formát „.${ext}“ nepodporujeme. Povolené: ${ALLOWED_EXTENSIONS.join(', ')}.`
          : `Format ".${ext}" is not supported.`, 'error');
        continue;
      }

      if (file.size > MAX_FILE_BYTES) {
        showToast?.(cz
          ? `Soubor „${file.name}“ je větší než 5 MB.`
          : `File "${file.name}" exceeds 5 MB.`, 'error');
        continue;
      }

      // Stejný soubor nepřidávat dvakrát
      if (files.some(f => f.name === file.name && f.size === file.size)) continue;

      accepted.push(file);
    }

    const combined = [...files, ...accepted];

    if (combined.length > MAX_FILES) {
      showToast?.(cz ? `Najednou lze poslat nejvýše ${MAX_FILES} souborů.` : `At most ${MAX_FILES} files.`, 'error');
      return;
    }

    if (combined.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_BYTES) {
      showToast?.(cz ? 'Přílohy dohromady přesahují 8 MB.' : 'Attachments exceed 8 MB in total.', 'error');
      return;
    }

    setFiles(combined);
  };

  const removeFile = (index) => setFiles(files.filter((_, i) => i !== index));

  const handleSend = async () => {
    if (sending) return;

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      showToast?.(cz ? 'Zadejte platnou e-mailovou adresu.' : 'Enter a valid e-mail address.', 'error');
      return;
    }

    if (files.length === 0) {
      showToast?.(cz ? 'Přiložte alespoň jeden soubor s fakturou.' : 'Attach at least one invoice file.', 'error');
      return;
    }

    setSending(true);
    try {
      const attachments = [];
      for (const file of files) {
        attachments.push({ name: file.name, content: await fileToBase64(file) });
      }

      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: { orderId, email: email.trim(), name: name.trim(), note: note.trim(), attachments }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || (cz ? 'Odeslání selhalo.' : 'Sending failed.'));
      }

      showToast?.(cz ? `Faktura byla odeslána na ${email.trim()}.` : `Invoice sent to ${email.trim()}.`, 'success');
      onSent?.(data.sentAt || new Date().toISOString(), email.trim());
      onClose?.();
    } catch (err) {
      console.error('Send invoice failed:', err);
      showToast?.(cz ? `Chyba při odesílání: ${err.message}` : `Sending error: ${err.message}`, 'error');
    } finally {
      setSending(false);
    }
  };

  const labelStyle = { display: 'block', fontSize: '12px', color: '#8a8a92', marginBottom: '6px', fontWeight: 600 };
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)',
    color: '#f0f0f0', fontSize: '13.5px', boxSizing: 'border-box'
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose?.(); }}
    >
      <div style={{
        background: '#15161a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
        width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '26px'
      }}>
        <h3 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '18px', fontWeight: 800 }}>
          🧾 {cz ? 'Odeslat fakturu zákazníkovi' : 'Send invoice to customer'}
        </h3>
        <p style={{ margin: '0 0 20px 0', color: '#8a8a92', fontSize: '12.5px' }}>
          {cz
            ? `Objednávka #${orderId} — e-mail odejde ve firemní šabloně eshopu.`
            : `Order #${orderId} — sent using the store e-mail template.`}
        </p>

        {alreadySentAt && (
          <div style={{
            background: 'rgba(253,189,22,0.1)', border: '1px solid rgba(253,189,22,0.25)',
            borderRadius: '8px', padding: '10px 12px', marginBottom: '18px',
            color: '#fdbd16', fontSize: '12.5px'
          }}>
            ⚠️ {cz
              ? `Faktura už byla odeslána ${new Date(alreadySentAt).toLocaleString('cs-CZ')}.`
              : `An invoice was already sent on ${new Date(alreadySentAt).toLocaleString('en-US')}.`}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>{cz ? 'E-mail příjemce' : 'Recipient e-mail'}</label>
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={sending} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>{cz ? 'Jméno příjemce' : 'Recipient name'}</label>
          <input style={inputStyle} type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={sending} />
        </div>

        {/* Přílohy */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>{cz ? 'Soubor s fakturou' : 'Invoice file'}</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); if (!sending) addFiles(e.dataTransfer.files); }}
            onClick={() => !sending && inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#fdbd16' : 'rgba(255,255,255,0.16)'}`,
              borderRadius: '10px', padding: '22px', textAlign: 'center', cursor: sending ? 'default' : 'pointer',
              background: dragging ? 'rgba(253,189,22,0.06)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: '26px', marginBottom: '6px' }}>📎</div>
            <div style={{ color: '#f0f0f0', fontSize: '13px', fontWeight: 600 }}>
              {cz ? 'Přetáhněte sem soubor nebo klikněte' : 'Drag a file here or click'}
            </div>
            <div style={{ color: '#8a8a92', fontSize: '11.5px', marginTop: '6px', lineHeight: 1.5 }}>
              {cz
                ? 'PDF, ISDOC, XML, ZIP, sken i fotka · max. 5 souborů, 5 MB každý'
                : 'PDF, ISDOC, XML, ZIP, scans and photos · max 5 files, 5 MB each'}
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.map(e => `.${e}`).join(',')}
            style={{ display: 'none' }}
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
          />

          {files.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {files.map((file, i) => (
                <div key={`${file.name}-${i}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px', padding: '8px 12px'
                }}>
                  <span style={{ color: '#f0f0f0', fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📄 {file.name} <span style={{ color: '#8a8a92' }}>({formatSize(file.size)})</span>
                  </span>
                  {!sending && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: '0 0 0 10px' }}
                      title={cz ? 'Odebrat' : 'Remove'}
                    >×</button>
                  )}
                </div>
              ))}
              <div style={{ color: '#8a8a92', fontSize: '11.5px', textAlign: 'right' }}>
                {cz ? 'Celkem' : 'Total'}: {formatSize(totalBytes)} / 8 MB
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '22px' }}>
          <label style={labelStyle}>{cz ? 'Poznámka pro zákazníka (nepovinné)' : 'Note to customer (optional)'}</label>
          <textarea
            style={{ ...inputStyle, minHeight: '70px', resize: 'vertical', fontFamily: 'inherit' }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={sending}
            maxLength={1500}
            placeholder={cz ? 'Např. důvod dodatečného zaslání…' : 'e.g. reason for sending…'}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => !sending && onClose?.()}
            disabled={sending}
            style={{
              padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.14)',
              background: 'transparent', color: '#8a8a92', fontSize: '13px', fontWeight: 600,
              cursor: sending ? 'not-allowed' : 'pointer'
            }}
          >
            {cz ? 'Zrušit' : 'Cancel'}
          </button>
          <button
            onClick={handleSend}
            disabled={sending || files.length === 0}
            style={{
              padding: '10px 22px', borderRadius: '8px', border: 'none',
              background: sending || files.length === 0 ? 'rgba(253,189,22,0.35)' : '#fdbd16',
              color: '#111111', fontSize: '13px', fontWeight: 800,
              cursor: sending || files.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {sending ? (cz ? 'Odesílám…' : 'Sending…') : (cz ? 'Odeslat fakturu' : 'Send invoice')}
          </button>
        </div>
      </div>
    </div>
  );
}
