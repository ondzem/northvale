import { useState, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';

export default function CookieConsent() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: true,
    marketing: true,
    preferences: true
  });

  useEffect(() => {
    const consent = localStorage.getItem('northvale-cookie-consent');
    const savedPrefs = localStorage.getItem('northvale-cookie-preferences');
    
    if (consent) {
      setConsentGiven(true);
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
      }
    } else {
      // Show consent modal after a 5 seconds delay on land
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen to open-cookie-settings custom event (e.g. from footer)
  useEffect(() => {
    const handleOpenSettings = () => {
      setIsOpen(true);
      setShowSettings(true);
    };
    window.addEventListener('open-cookie-settings', handleOpenSettings);
    return () => {
      window.removeEventListener('open-cookie-settings', handleOpenSettings);
    };
  }, []);

  const handleAcceptAll = () => {
    const allPrefs = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    };
    setPreferences(allPrefs);
    localStorage.setItem('northvale-cookie-consent', 'true');
    localStorage.setItem('northvale-cookie-preferences', JSON.stringify(allPrefs));
    setConsentGiven(true);
    setIsOpen(false);
  };

  const handleAcceptNecessary = () => {
    const necessaryPrefs = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };
    setPreferences(necessaryPrefs);
    localStorage.setItem('northvale-cookie-consent', 'true');
    localStorage.setItem('northvale-cookie-preferences', JSON.stringify(necessaryPrefs));
    setConsentGiven(true);
    setIsOpen(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('northvale-cookie-consent', 'true');
    localStorage.setItem('northvale-cookie-preferences', JSON.stringify(preferences));
    setConsentGiven(true);
    setIsOpen(false);
  };

  const togglePreference = (key) => {
    if (key === 'necessary') return;
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('cookie-consent-overlay')) {
      setShowSettings(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`cookie-consent-overlay ${showSettings ? 'settings-open' : ''}`}
      onClick={handleOverlayClick}
    >
      {!showSettings ? (
        <div className="ckA-bar">
          <div className="container cookie-bar-inner">
            <div className="ckA-copy">
              <p className="ckA-title">{t('CookieConsent.title')}</p>
              <p className="ckA-text">
                {t('CookieConsent.text')}
              </p>
            </div>

            <div className="ckA-actions">
              <button className="ck-btn-text" onClick={openSettings}>
                {t('CookieConsent.btnEdit')}
              </button>
              <button className="ck-btn-ghost" onClick={handleAcceptNecessary}>
                {t('CookieConsent.btnNecessary')}
              </button>
              <button className="ck-btn-gold" onClick={handleAcceptAll}>
                {t('CookieConsent.btnAcceptAll')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="ckD-card fade-in-scale">
          <span className="ck-micro">Cookies · {t('CookieConsent.btnEdit')}</span>
          <p className="ckD-title">{t('CookieConsent.settingsTitle')}</p>
          <p className="ckD-sub">{t('CookieConsent.settingsSub')}</p>
          
          <div className="ckD-list">
            <div className="ckD-item">
              <div className="ckD-item-copy">
                <p className="ckD-item-name">{t('CookieConsent.catNecessary')}</p>
                <p className="ckD-item-desc">{t('CookieConsent.descNecessary')}</p>
              </div>
              <span className="ckD-always">{t('CookieConsent.alwaysActive')}</span>
            </div>

            <div className="ckD-item">
              <div className="ckD-item-copy">
                <p className="ckD-item-name">{t('CookieConsent.catAnalytics')}</p>
                <p className="ckD-item-desc">{t('CookieConsent.descAnalytics')}</p>
              </div>
              <button 
                type="button"
                className="ckD-toggle" 
                data-on={preferences.analytics}
                onClick={() => togglePreference('analytics')}
                aria-label={t('CookieConsent.catAnalytics') + ' cookies'}
              />
            </div>

            <div className="ckD-item">
              <div className="ckD-item-copy">
                <p className="ckD-item-name">{t('CookieConsent.catMarketing')}</p>
                <p className="ckD-item-desc">{t('CookieConsent.descMarketing')}</p>
              </div>
              <button 
                type="button"
                className="ckD-toggle" 
                data-on={preferences.marketing}
                onClick={() => togglePreference('marketing')}
                aria-label={t('CookieConsent.catMarketing') + ' cookies'}
              />
            </div>
          </div>

          <div className="ckD-actions">
            <button className="ck-btn-gold" onClick={handleSavePreferences}>
              {t('CookieConsent.btnSave')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
