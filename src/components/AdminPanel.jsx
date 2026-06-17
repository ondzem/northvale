import { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import ProductsTab from './admin/ProductsTab';
import CategoriesTab from './admin/CategoriesTab';

export default function AdminPanel({ showToast }) {
  const { lang } = useTranslation();
  const [activeTab, setActiveTab] = useState('products'); // default to products CMS

  const handleShowToastPlaceholder = (msg, type) => {
    if (showToast) {
      showToast(msg, type);
    } else {
      alert(msg);
    }
  };

  const tabsConfig = [
    { id: 'products', name_cz: 'Správa produktů', name_en: 'Products CMS', icon: '📦' },
    { id: 'categories', name_cz: 'Správa kategorií', name_en: 'Categories CMS', icon: '📁' },
  ];

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">
        {lang === 'CZ' ? 'Administrační rozhraní NORTHVALE' : 'NORTHVALE Administration Panel'}
      </h1>

      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <h2 style={styles.title}>{lang === 'CZ' ? 'Administrace NORTHVALE' : 'NORTHVALE Administration'}</h2>
          <p style={styles.subtitle}>
            {lang === 'CZ' 
              ? 'Vítejte v centrálním ovládacím panelu e-shopu.' 
              : 'Welcome to the central store control panel.'}
          </p>
        </div>
      </div>

      <div style={styles.layout}>
        {/* Navigation Sidebar */}
        <div style={styles.sidebar} className="glass-panel">
          {tabsConfig.map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tabBtn,
                backgroundColor: activeTab === tab.id ? 'rgba(253, 189, 22, 0.1)' : 'transparent',
                borderColor: activeTab === tab.id ? 'var(--color-gold)' : 'transparent',
                color: activeTab === tab.id ? 'var(--color-gold)' : 'var(--text-muted)'
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              <span style={styles.tabIcon}>{tab.icon}</span>
              <span>{lang === 'CZ' ? tab.name_cz : tab.name_en}</span>
            </button>
          ))}
        </div>

        {/* Content Pane */}
        <div style={styles.contentPane}>
          {activeTab === 'products' && (
            <ProductsTab 
              showToast={handleShowToastPlaceholder} 
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesTab 
              showToast={handleShowToastPlaceholder} 
            />
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '30px',
    paddingBottom: '50px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'left',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '20px',
  },
  titleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    margin: 0,
    fontFamily: 'var(--font-heading)',
    color: 'var(--text-main)',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: 0,
  },
  layout: {
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap',
  },
  sidebar: {
    flex: '1 1 240px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignSelf: 'flex-start',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '700',
    background: 'none',
    borderLeft: '3px solid',
    borderTop: 'none',
    borderRight: 'none',
    borderBottom: 'none',
    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  tabIcon: {
    fontSize: '16px',
  },
  contentPane: {
    flex: '3 1 600px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  }
};
