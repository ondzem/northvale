import { createContext, useContext, useState } from 'react';
import { translations } from '../localization/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('northvale-lang');
    return saved === 'EN' ? 'EN' : 'CZ';
  });

  const setLang = (newLang) => {
    const verifiedLang = newLang === 'EN' ? 'EN' : 'CZ';
    setLangState(verifiedLang);
    localStorage.setItem('northvale-lang', verifiedLang);
  };

  const t = (key) => {
    const keys = key.split('.');
    let dict = translations[lang];
    
    for (const k of keys) {
      if (dict && dict[k] !== undefined) {
        dict = dict[k];
      } else {
        // Fallback to key if translation is missing
        return key;
      }
    }
    
    return dict;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
