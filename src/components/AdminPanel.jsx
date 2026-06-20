import { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import ProductsTab from './admin/ProductsTab';
import CategoriesTab from './admin/CategoriesTab';
import HomepageTab from './admin/HomepageTab';
import FaqTab from './admin/FaqTab';
import NewsletterTab from './admin/NewsletterTab';

export default function AdminPanel({ showToast, setActivePage }) {
  const { lang } = useTranslation();
  const [activeTab, setActiveTab] = useState('products'); // default to products CMS
  const [editProductId, setEditProductId] = useState(null);

  const handleEditProductFromOtherTab = (productId) => {
    setEditProductId(productId);
    setActiveTab('products');
  };

  const handleShowToastPlaceholder = (msg, type) => {
    if (showToast) {
      showToast(msg, type);
    } else {
      alert(msg);
    }
  };

  const tabsConfig = [
    { id: 'products', name_cz: 'Správa produktů', name_en: 'Products CMS' },
    { id: 'categories', name_cz: 'Správa kategorií', name_en: 'Categories CMS' },
    { id: 'homepage', name_cz: 'Správa úvodní stránky', name_en: 'Homepage CMS' },
    { id: 'faq', name_cz: 'Správa FAQ', name_en: 'FAQ CMS' },
    { id: 'newsletter', name_cz: 'Newsletter', name_en: 'Newsletter' },
  ];

  return (
    <div className="container fade-in" style={{ paddingTop: '48px', paddingBottom: '64px' }}>
      <h1 className="sr-only">
        {lang === 'CZ' ? 'Administrační rozhraní NORTHVALE' : 'NORTHVALE Administration Panel'}
      </h1>

      {/* Header section matching A _ Floating _ Minimal */}
      <div className="adf-mhead">
        <div className="adf-mhead-left">
          <div className="nv-eyebrow">
            {activeTab === 'categories'
              ? (lang === 'CZ' ? 'Administrace · Katalog' : 'Administration · Catalog')
              : (lang === 'CZ' ? 'Centrální ovládací panel' : 'Central Control Panel')}
          </div>
          <h2 className="adf-mtitle">
            {activeTab === 'categories' ? (
              lang === 'CZ' ? 'Správa kategorií' : 'Categories CMS'
            ) : (
              <>
                {lang === 'CZ' ? 'Administrace ' : 'Administration '}
                <span className="adf-mtitle-gold">Northvale</span>
              </>
            )}
          </h2>
        </div>
        <button 
          type="button"
          className="adf-mhead-user-btn"
          onClick={() => setActivePage && setActivePage('profile')}
          title={lang === 'CZ' ? 'Zpět na nastavení účtu' : 'Back to account settings'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>{lang === 'CZ' ? 'Nastavení účtu' : 'Account Settings'}</span>
        </button>
      </div>

      {/* Shell layout matching A _ Floating _ Minimal */}
      <div className="adf-shell">
        {/* Navigation Sidebar */}
        <nav className="adf-nav">
          {tabsConfig.map(tab => (
            <button
              key={tab.id}
              className={`adf-nav-item ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.id === 'products' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <path d="M3 7l9-4 9 4v10l-9 4-9-4z"></path>
                  <path d="M3 7l9 4 9-4M12 11v10"></path>
                </svg>
              ) : tab.id === 'categories' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                </svg>
              ) : tab.id === 'homepage' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
              ) : tab.id === 'faq' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              ) : tab.id === 'newsletter' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              ) : null}
              <span>{lang === 'CZ' ? tab.name_cz : tab.name_en}</span>
            </button>
          ))}
        </nav>

        {/* Content Pane */}
        <main className="adf-main">
          {activeTab === 'products' && (
            <ProductsTab 
              showToast={handleShowToastPlaceholder} 
              initialEditProductId={editProductId}
              onClearInitialEditProduct={() => setEditProductId(null)}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesTab 
              showToast={handleShowToastPlaceholder} 
            />
          )}

          {activeTab === 'homepage' && (
            <HomepageTab 
              showToast={handleShowToastPlaceholder} 
              onEditProduct={handleEditProductFromOtherTab}
            />
          )}

          {activeTab === 'faq' && (
            <FaqTab 
              showToast={handleShowToastPlaceholder} 
            />
          )}

          {activeTab === 'newsletter' && (
            <NewsletterTab 
              showToast={handleShowToastPlaceholder} 
            />
          )}
        </main>
      </div>
    </div>
  );
}
