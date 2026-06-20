import { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { supabase } from '../../supabase';
import { fetchSubscribers, deleteSubscriber } from '../../services/newsletter';

export default function NewsletterTab({ showToast }) {
  const { lang } = useTranslation();
  const [subscribers, setSubscribers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [content, setContent] = useState('');
  const [buttonText, setButtonText] = useState('Prohlížet nabídku');
  const [buttonUrl, setButtonUrl] = useState('https://northvaletcg.eu');
  const [isSending, setIsSending] = useState(false);

  // Modals state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, targetEmail: null });

  useEffect(() => {
    loadSubscribers();
    loadCampaigns();
  }, []);

  const loadSubscribers = async () => {
    setLoadingSubs(true);
    try {
      const data = await fetchSubscribers();
      setSubscribers(data);
    } catch (err) {
      console.error(err);
      showToast(lang === 'CZ' ? 'Chyba při načítání odběratelů.' : 'Error loading subscribers.', 'error');
    } finally {
      setLoadingSubs(false);
    }
  };

  const loadCampaigns = async () => {
    setLoadingCamps(true);
    try {
      // Call Edge Function with GET request to fetch campaigns history
      const { data, error } = await supabase.functions.invoke('send-newsletter', {
        method: 'GET'
      });
      if (error) throw error;
      setCampaigns(data?.campaigns || []);
    } catch (err) {
      console.error(err);
      // Suppress alert for fallback since the Brevo template may not be set up yet
    } finally {
      setLoadingCamps(false);
    }
  };

  const handleDeleteSubscriber = async () => {
    const email = deleteConfirm.targetEmail;
    if (!email) return;
    try {
      await deleteSubscriber(email);
      showToast(lang === 'CZ' ? 'Odběratel byl úspěšně odebrán.' : 'Subscriber was successfully removed.', 'success');
      loadSubscribers();
    } catch (err) {
      console.error(err);
      showToast(lang === 'CZ' ? 'Chyba při odebírání odběratele.' : 'Error removing subscriber.', 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, targetEmail: null });
    }
  };

  const handleSendNewsletter = async (e) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    setIsConfirmOpen(false);
    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-newsletter', {
        body: {
          campaignName,
          subject,
          bannerUrl,
          content,
          buttonText,
          buttonUrl
        }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      showToast(lang === 'CZ' ? 'Newsletter byl úspěšně rozeslán všem odběratelům!' : 'Newsletter successfully sent to all subscribers!', 'success');
      
      // Reset form
      setCampaignName('');
      setSubject('');
      setBannerUrl('');
      setContent('');
      setButtonText('Prohlížet nabídku');
      setButtonUrl('https://northvaletcg.eu');

      loadCampaigns();
    } catch (err) {
      console.error(err);
      showToast(lang === 'CZ' ? `Chyba při odesílání: ${err.message}` : `Send error: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (subscribers.length === 0) return;
    const headers = ['Email', 'Created At', 'Confirmed'];
    const rows = subscribers.map(sub => [
      sub.email,
      new Date(sub.created_at).toLocaleString(),
      sub.confirmed ? 'Yes' : 'No'
    ]);

    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `subscribers_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSubscribers = subscribers.filter(sub => 
    sub.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="ctf-shell" style={{ display: 'flex', gap: '32px', minHeight: '500px', flexDirection: 'row', textAlign: 'left' }}>
      
      {/* LEFT COLUMN: Subscribers Overview & Campaign History */}
      <section className="ctf-tree-col" style={{ flex: '1.2 1 0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Subscribers card */}
        <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.06)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                {lang === 'CZ' ? 'Odběratelé newsletteru' : 'Newsletter Subscribers'}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                {lang === 'CZ' ? `Celkem: ${subscribers.length} aktivních e-mailů` : `Total: ${subscribers.length} active emails`}
              </p>
            </div>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ fontSize: '11px', padding: '6px 12px' }}
              disabled={subscribers.length === 0}
              onClick={handleExportCSV}
            >
              📥 {lang === 'CZ' ? 'Export CSV' : 'Export CSV'}
            </button>
          </div>

          <input 
            type="text" 
            placeholder={lang === 'CZ' ? 'Vyhledat e-mail...' : 'Search email...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ctf-input"
            style={{ width: '100%', boxSizing: 'border-box', marginBottom: '12px', padding: '8px 12px', fontSize: '13px' }}
          />

          {loadingSubs ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{lang === 'CZ' ? 'Načítání e-mailů...' : 'Loading emails...'}</p>
          ) : filteredSubscribers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', margin: '16px 0' }}>
              {lang === 'CZ' ? 'Žádní odběratelé nenalezeni.' : 'No subscribers found.'}
            </p>
          ) : (
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-muted)' }}>E-mail</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-muted)', width: '120px' }}>Datum</th>
                    <th style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)', width: '60px' }}>Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscribers.map(sub => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '8px', color: '#fff' }}>{sub.email}</td>
                      <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{new Date(sub.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button 
                          type="button" 
                          onClick={() => setDeleteConfirm({ isOpen: true, targetEmail: sub.email })}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', padding: 0 }}
                          title={lang === 'CZ' ? 'Odebrat odběratele' : 'Remove subscriber'}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* History card */}
        <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.06)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#fff' }}>
            {lang === 'CZ' ? 'Odeslané kampaně v Brevu' : 'Sent Campaigns in Brevo'}
          </h3>

          {loadingCamps ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{lang === 'CZ' ? 'Načítání historie...' : 'Loading history...'}</p>
          ) : campaigns.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>
              {lang === 'CZ' ? 'Žádné odeslané kampaně nenalezeny.' : 'No sent campaigns found.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {campaigns.slice(0, 5).map(camp => (
                <div key={camp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px', color: '#fff' }}>{camp.name}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{camp.subject}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-gold)', fontWeight: 'bold' }}>
                    {camp.sentDate ? new Date(camp.sentDate).toLocaleDateString() : 'Sent'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* RIGHT COLUMN: Campaign Composer Form */}
      <section className="ctf-form-col" style={{ flex: '1 1 0', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.06)', padding: '24px', boxSizing: 'border-box' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: 'var(--color-gold)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
          {lang === 'CZ' ? 'Vytvořit a rozeslat newsletter' : 'Create & Send Newsletter'}
        </h3>

        <form onSubmit={handleSendNewsletter} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {lang === 'CZ' ? 'Název kampaně (vnitřní)' : 'Campaign Name (internal)'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text" 
              className="ctf-input"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder={lang === 'CZ' ? 'např. Letní slevová akce 2026' : 'e.g., Summer Discount Campaign 2026'}
              style={{ width: '100%', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {lang === 'CZ' ? 'Předmět e-mailu' : 'Email Subject'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text" 
              className="ctf-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={lang === 'CZ' ? 'např. Získejte 15% slevu na Pokémon příslušenství!' : 'e.g., Get 15% off Pokémon accessories!'}
              style={{ width: '100%', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {lang === 'CZ' ? 'URL Hlavního banneru (obrázek)' : 'Main Banner URL (image)'}
            </label>
            <input 
              type="url" 
              className="ctf-input"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://example.com/banner.jpg"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {lang === 'CZ' ? 'Obsah e-mailu (Zpráva)' : 'Email Body (Message)'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea 
              className="ctf-textarea"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={lang === 'CZ' ? 'Zde napište text vašeho newsletteru...' : 'Write the text of your newsletter here...'}
              style={{ width: '100%', boxSizing: 'border-box', height: '140px', resize: 'vertical' }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {lang === 'CZ' ? 'Text tlačítka (CTA)' : 'Button Text (CTA)'}
              </label>
              <input 
                type="text" 
                className="ctf-input"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1.5 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {lang === 'CZ' ? 'Odkaz tlačítka (CTA)' : 'Button Link (CTA)'}
              </label>
              <input 
                type="url" 
                className="ctf-input"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', fontWeight: 'bold', marginTop: '8px' }}
            disabled={isSending}
          >
            {isSending 
              ? (lang === 'CZ' ? 'Odesílání kampaně...' : 'Sending campaign...') 
              : (lang === 'CZ' ? '🚀 ROZESLAT VŠEM ODBĚRATELŮM' : '🚀 SEND TO ALL SUBSCRIBERS')
            }
          </button>
        </form>
      </section>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-secondary, #141416)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: '0 0 12px 0' }}>
              {lang === 'CZ' ? 'Smazat odběratele?' : 'Remove Subscriber?'}
            </h4>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              {lang === 'CZ' 
                ? `Opravdu chcete odebrat e-mail "${deleteConfirm.targetEmail}" ze seznamu odběratelů?`
                : `Are you sure you want to remove email "${deleteConfirm.targetEmail}" from the subscriber list?`}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 16px' }}
                onClick={() => setDeleteConfirm({ isOpen: false, targetEmail: null })}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#ef4444', color: '#fff', padding: '8px 16px' }}
                onClick={handleDeleteSubscriber}
              >
                {lang === 'CZ' ? 'Odebrat' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sending Confirmation Modal */}
      {isConfirmOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-secondary, #141416)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>✉️</span>
            <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', margin: '0 0 12px 0' }}>
              {lang === 'CZ' ? 'Opravdu odeslat newsletter?' : 'Confirm Email Blast?'}
            </h4>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              {lang === 'CZ' 
                ? `Tento krok vytvoří kampaň v Brevu a okamžitě ji odešle na všech ${subscribers.length} aktivních e-mailů. Tuto akci nelze vzít zpět ani zastavit.`
                : `This will trigger a campaign in Brevo and immediately dispatch it to all ${subscribers.length} active email addresses. This action cannot be undone or stopped.`}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '10px 20px', flex: 1 }}
                onClick={() => setIsConfirmOpen(false)}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '10px 20px', flex: 1.5, background: 'var(--color-gold)', color: '#000' }}
                onClick={handleConfirmSend}
              >
                {lang === 'CZ' ? 'Odeslat hromadně' : 'Send Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
