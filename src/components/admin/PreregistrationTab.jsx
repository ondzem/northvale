import { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { supabase } from '../../supabase';
import { fetchSubscribers, deleteSubscriber } from '../../services/newsletter';

export default function PreregistrationTab({ showToast }) {
  const { lang } = useTranslation();
  const [preregistrations, setPreregistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, targetEmail: null });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    loadPreregistrations();
  }, []);

  const loadPreregistrations = async () => {
    setLoading(true);
    try {
      const data = await fetchSubscribers();
      // Filter only pre-registration source subscribers
      const preregs = data.filter(sub => sub.source === 'preregistration');
      setPreregistrations(preregs);
    } catch (err) {
      console.error(err);
      showToast(
        lang === 'CZ' 
          ? 'Chyba při načítání předregistrací.' 
          : 'Error loading pre-registrations.', 
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const email = deleteConfirm.targetEmail;
    if (!email) return;

    try {
      const result = await deleteSubscriber(email);
      if (result.success) {
        showToast(
          lang === 'CZ' 
            ? 'Předregistrace byla úspěšně smazána.' 
            : 'Pre-registration deleted successfully.', 
          'success'
        );
        loadPreregistrations();
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error(err);
      showToast(
        lang === 'CZ' 
          ? 'Chyba při mazání předregistrace.' 
          : 'Error deleting pre-registration.', 
        'error'
      );
    } finally {
      setDeleteConfirm({ isOpen: false, targetEmail: null });
    }
  };

  const exportToCSV = () => {
    if (preregistrations.length === 0) {
      showToast(
        lang === 'CZ' ? 'Žádná data k exportu.' : 'No data to export.', 
        'info'
      );
      return;
    }

    const headers = ['Email', 'Language', 'Registered At'];
    const rows = preregistrations.map(sub => [
      sub.email,
      sub.lang || 'CZ',
      sub.created_at ? new Date(sub.created_at).toLocaleString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `northvale_preregistrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter subscribers based on search query
  const filtered = preregistrations.filter(sub => 
    sub.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  const totalCount = preregistrations.length;
  const czCount = preregistrations.filter(sub => (sub.lang || 'CZ').toUpperCase() === 'CZ').length;
  const enCount = preregistrations.filter(sub => (sub.lang || 'CZ').toUpperCase() === 'EN').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Banner Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
        gap: '16px' 
      }}>
        <div style={{ 
          background: 'var(--bg-secondary)', 
          border: '1px solid rgba(255, 255, 255, 0.05)', 
          borderRadius: 'var(--radius-lg)', 
          padding: '20px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px' 
        }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
            {lang === 'CZ' ? 'Celkem předregistrací' : 'Total Pre-registrations'}
          </span>
          <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-gold, #FDBD16)' }}>
            {totalCount}
          </span>
        </div>
        <div style={{ 
          background: 'var(--bg-secondary)', 
          border: '1px solid rgba(255, 255, 255, 0.05)', 
          borderRadius: 'var(--radius-lg)', 
          padding: '20px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px' 
        }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
            {lang === 'CZ' ? 'Čeština (CZ)' : 'Czech (CZ)'}
          </span>
          <span style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff' }}>
            {czCount} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '400' }}>({totalCount > 0 ? Math.round((czCount / totalCount) * 100) : 0}%)</span>
          </span>
        </div>
        <div style={{ 
          background: 'var(--bg-secondary)', 
          border: '1px solid rgba(255, 255, 255, 0.05)', 
          borderRadius: 'var(--radius-lg)', 
          padding: '20px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px' 
        }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
            {lang === 'CZ' ? 'Angličtina (EN)' : 'English (EN)'}
          </span>
          <span style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff' }}>
            {enCount} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '400' }}>({totalCount > 0 ? Math.round((enCount / totalCount) * 100) : 0}%)</span>
          </span>
        </div>
      </div>

      {/* Main List Container */}
      <div style={{ 
        background: 'var(--bg-secondary)', 
        border: '1px solid rgba(255, 255, 255, 0.05)', 
        borderRadius: 'var(--radius-lg)', 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        
        {/* Search & Export Toolbar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: '16px',
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          <input 
            type="text" 
            placeholder={lang === 'CZ' ? 'Hledat e-mail...' : 'Search email...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid rgba(255, 255, 255, 0.08)', 
              borderRadius: 'var(--radius-sm)', 
              padding: '10px 14px', 
              fontSize: '13px', 
              color: '#ffffff', 
              outline: 'none',
              width: isMobile ? '100%' : '300px'
            }}
          />

          <button 
            type="button" 
            onClick={exportToCSV}
            className="btn"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 18px', 
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              alignSelf: isMobile ? 'stretch' : 'auto'
            }}
          >
            📥 {lang === 'CZ' ? 'Exportovat do CSV' : 'Export to CSV'}
          </button>
        </div>

        {/* Table View */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <div className="pr-spinner" style={{ margin: '0 auto 12px auto' }}></div>
            {lang === 'CZ' ? 'Načítání předregistrací...' : 'Loading pre-registrations...'}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            color: 'var(--text-muted)', 
            border: '1px dashed rgba(255, 255, 255, 0.06)',
            borderRadius: 'var(--radius-md)'
          }}>
            {searchQuery 
              ? (lang === 'CZ' ? 'Žádné shodné e-maily nebyly nalezeny.' : 'No matching emails found.')
              : (lang === 'CZ' ? 'Zatím se nikdo nepředregistroval.' : 'No pre-registrations yet.')
            }
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-sm)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>E-mail</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', width: '80px', textAlign: 'center' }}>Jazyk</th>
                  {!isMobile && <th style={{ padding: '12px 16px', color: 'var(--text-muted)', width: '200px' }}>Datum přihlášení</th>}
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', width: '60px', textAlign: 'center' }}>Akce</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sub => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s ease' }} className="tr-hover">
                    <td style={{ padding: '12px 16px', color: '#ffffff', fontWeight: '500', wordBreak: 'break-all' }}>{sub.email}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <span style={{ 
                        background: 'rgba(255, 255, 255, 0.04)', 
                        padding: '3px 8px', 
                        borderRadius: '10px', 
                        fontSize: '11px',
                        fontWeight: '700'
                      }}>
                        {(sub.lang || 'CZ').toUpperCase()}
                      </span>
                    </td>
                    {!isMobile && (
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                        {sub.created_at ? new Date(sub.created_at).toLocaleString('cs-CZ', {
                          day: 'numeric',
                          month: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </td>
                    )}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm({ isOpen: true, targetEmail: sub.email })}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: 0 }}
                        title={lang === 'CZ' ? 'Odebrat předregistraci' : 'Remove pre-registration'}
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

      {/* Delete Confirmation Modal Overlay */}
      {deleteConfirm.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 11000,
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '400px',
            width: '100%',
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <h4 style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: 'bold' }}>
              {lang === 'CZ' ? 'Potvrdit smazání' : 'Confirm Deletion'}
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {lang === 'CZ' 
                ? `Opravdu chcete smazat e-mail ${deleteConfirm.targetEmail} z předregistrace?`
                : `Are you sure you want to delete ${deleteConfirm.targetEmail} from pre-registration?`
              }
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setDeleteConfirm({ isOpen: false, targetEmail: null })}
                style={{ fontSize: '12px', padding: '8px 16px', cursor: 'pointer' }}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button 
                type="button" 
                className="btn" 
                onClick={handleDelete}
                style={{ fontSize: '12px', padding: '8px 16px', background: '#ef4444', color: '#fff', cursor: 'pointer' }}
              >
                {lang === 'CZ' ? 'Smazat' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
