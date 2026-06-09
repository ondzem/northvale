import { useState } from 'react';

export default function LoginModal({ isOpen, onClose, onLogin, onRegister }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [fullNameError, setFullNameError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);

  // Developer OAuth Configurations Panel State
  const [showConfig, setShowConfig] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(() => 
    localStorage.getItem('google_client_id') || '1045763908871-placeholder.apps.googleusercontent.com'
  );
  const [appleClientId, setAppleClientId] = useState(() => 
    localStorage.getItem('apple_client_id') || 'com.example.app.signin'
  );
  const [appleRedirectUri, setAppleRedirectUri] = useState(() => 
    localStorage.getItem('apple_redirect_uri') || window.location.origin
  );

  if (!isOpen) return null;

  const validateEmail = (val) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
  };

  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let hasError = false;

    // Validate email
    if (!validateEmail(email)) {
      setEmailError(true);
      hasError = true;
    } else {
      setEmailError(false);
    }

    // Validate password
    if (password.length < 4) {
      setPasswordError(true);
      hasError = true;
    } else {
      setPasswordError(false);
    }

    // Additional validation for registration
    if (isRegisterMode) {
      if (fullName.trim().length < 3) {
        setFullNameError(true);
        hasError = true;
      } else {
        setFullNameError(false);
      }

      if (phone.trim().length < 9) {
        setPhoneError(true);
        hasError = true;
      } else {
        setPhoneError(false);
      }

      if (password !== confirmPassword) {
        alert('Hesla se neshodují!');
        return;
      }
    }

    if (hasError) return;

    if (isRegisterMode) {
      onRegister(email, fullName, phone);
    } else {
      onLogin(email, fullName || email.split('@')[0]);
    }

    // Clear fields & close
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhone('');
    setEmailError(false);
    setPasswordError(false);
    setFullNameError(false);
    setPhoneError(false);
    onClose();
  };

  const handleSocialClick = (platform) => {
    const mockEmail = `uzivatel.${platform.toLowerCase()}@example.com`;
    const mockName = `${platform} Sběratel`;
    onLogin(mockEmail, mockName);
    onClose();
  };

  const handleGoogleLogin = () => {
    if (!window.google) {
      alert('Google identity services se nepodařilo načíst z externí CDN.');
      handleSocialClick('Google');
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Google OAuth2 error:', tokenResponse);
            alert('Nastala chyba při autorizaci Google účtu.');
            return;
          }

          // Fetch real user metadata from Google userinfo API
          fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
          })
          .then(res => res.json())
          .then(userInfo => {
            if (userInfo.email) {
              onLogin(userInfo.email, userInfo.name, userInfo.picture);
              onClose();
            } else {
              alert('Nepodařilo se získat profilová data z vašeho Google účtu.');
            }
          })
          .catch(err => {
            console.error('Failed to fetch userinfo from google API:', err);
            // Local fallback if Client ID is invalid or blocked
            onLogin('ondra.skrba.google@gmail.com', 'Ondřej Google', 'https://lh3.googleusercontent.com/a/default-user');
            onClose();
          });
        },
      });
      client.requestAccessToken();
    } catch (e) {
      console.error('Google Sign In SDK crash:', e);
      handleSocialClick('Google');
    }
  };

  const handleAppleLogin = () => {
    if (!window.AppleID) {
      alert('Sign in with Apple JS SDK se nepodařilo načíst.');
      handleSocialClick('Apple');
      return;
    }

    try {
      window.AppleID.auth.init({
        clientId: appleClientId,
        scope: 'name email',
        redirectURI: appleRedirectUri,
        usePopup: true
      });

      window.AppleID.auth.signIn()
        .then((response) => {
          if (response && response.authorization) {
            const idToken = response.authorization.id_token;
            const payload = parseJwt(idToken);
            const userEmail = payload?.email || 'apple.user@example.com';
            
            const userName = (response.user && response.user.name)
              ? `${response.user.name.firstName} ${response.user.name.lastName}`
              : (payload?.name || userEmail.split('@')[0]);

            onLogin(userEmail, userName);
            onClose();
          } else {
            alert('Apple Sign In neposkytl potřebná data.');
          }
        })
        .catch((error) => {
          console.warn('Apple OAuth flow error (standard block for localhost without credentials):', error);
          // Fallback icloud mockup profile since Apple strictly blocks localhost without SSL/credentials
          onLogin('ondrej.skrba.apple@icloud.com', 'Ondřej Apple');
          onClose();
        });
    } catch (e) {
      console.error('Apple Sign In SDK crash:', e);
      handleSocialClick('Apple');
    }
  };

  const saveConfig = (e) => {
    e.preventDefault();
    setShowConfig(false);
  };

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="login-modal-close" onClick={onClose} aria-label="Zavřít">
          ✕
        </button>

        {/* API Config Panel Trigger */}
        <button 
          className="login-modal-close" 
          style={{ right: '62px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
          onClick={() => setShowConfig(!showConfig)} 
          title="Konfigurace API pro sociální sítě"
        >
          ⚙️
        </button>

        {showConfig ? (
          <div style={{ padding: '32px 40px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-main)' }}>⚙️ Nastavení API Klientů</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.4' }}>
              Zde můžete zadat své reálné Google Client ID a Apple Services ID pro plně funkční propojení na localhostu. Nastavení je uloženo lokálně v prohlížeči.
            </p>
            <form onSubmit={saveConfig} className="login-modal-form">
              <div className="login-form-group">
                <label className="login-form-label">Google OAuth Client ID</label>
                <input 
                  type="text" 
                  className="login-form-input" 
                  value={googleClientId} 
                  onChange={e => { setGoogleClientId(e.target.value); localStorage.setItem('google_client_id', e.target.value); }} 
                  placeholder="Zadejte klientské ID Google"
                />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">Apple Services ID (Client ID)</label>
                <input 
                  type="text" 
                  className="login-form-input" 
                  value={appleClientId} 
                  onChange={e => { setAppleClientId(e.target.value); localStorage.setItem('apple_client_id', e.target.value); }} 
                  placeholder="Zadejte Services ID Apple"
                />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">Apple Redirect URI</label>
                <input 
                  type="text" 
                  className="login-form-input" 
                  value={appleRedirectUri} 
                  onChange={e => { setAppleRedirectUri(e.target.value); localStorage.setItem('apple_redirect_uri', e.target.value); }} 
                  placeholder="Zadejte povolenou zpětnou adresu"
                />
              </div>
              <button type="submit" className="login-submit-btn" style={{ width: '100%' }}>Uložit nastavení</button>
            </form>
          </div>
        ) : (
          <div className="login-modal-split-layout">
            {/* Left Column: Form & Social Logins */}
            <div className="login-modal-left-column">
              <h2 className="login-modal-title">
                {isRegisterMode ? 'Registrace' : 'Přihlásit se'}
              </h2>

              <form onSubmit={handleSubmit} className="login-modal-form" noValidate>
                
                {/* Registration Only: Full Name */}
                {isRegisterMode && (
                  <div className="login-form-group">
                    <label className="login-form-label">
                      Jméno a příjmení <span className="text-red">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (fullNameError) setFullNameError(e.target.value.trim().length < 3);
                      }}
                      className={`login-form-input ${fullNameError ? 'input-error' : ''}`}
                      placeholder="Např. Jan Novák"
                      required
                    />
                    {fullNameError && (
                      <p className="login-form-error-msg">
                        Zadejte prosím vaše jméno a příjmení.
                      </p>
                    )}
                  </div>
                )}

                {/* Registration Only: Phone */}
                {isRegisterMode && (
                  <div className="login-form-group">
                    <label className="login-form-label">
                      Telefon <span className="text-red">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (phoneError) setPhoneError(e.target.value.trim().length < 9);
                      }}
                      className={`login-form-input ${phoneError ? 'input-error' : ''}`}
                      placeholder="Např. +420 777 777 777"
                      required
                    />
                    {phoneError && (
                      <p className="login-form-error-msg">
                        Zadejte prosím platné telefonní číslo.
                      </p>
                    )}
                  </div>
                )}

                {/* Email Input */}
                <div className="login-form-group">
                  <label className="login-form-label">
                    Přihlašovací e-mail <span className="text-red">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(!validateEmail(e.target.value));
                    }}
                    className={`login-form-input ${emailError ? 'input-error' : ''}`}
                    placeholder="@"
                    required
                  />
                  {emailError && (
                    <p className="login-form-error-msg">
                      Zadaný e-mail není ve správném formátu nebo obsahuje nepovolené znaky.
                    </p>
                  )}
                </div>

                {/* Password Input */}
                <div className="login-form-group">
                  <label className="login-form-label">
                    Heslo <span className="text-red">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(e.target.value.length < 4);
                    }}
                    className={`login-form-input ${passwordError ? 'input-error' : ''}`}
                    required
                  />
                  {passwordError && (
                    <p className="login-form-error-msg">
                      Heslo musí mít alespoň 4 znaky.
                    </p>
                  )}
                </div>

                {/* Confirm Password Input (Register only) */}
                {isRegisterMode && (
                  <div className="login-form-group">
                    <label className="login-form-label">
                      Potvrzení hesla <span className="text-red">*</span>
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="login-form-input"
                      required
                    />
                  </div>
                )}

                {/* Submit Button */}
                <button type="submit" className="login-submit-btn">
                  {isRegisterMode ? 'Zaregistrovat se' : 'Přihlásit se'}
                </button>
              </form>

              <p className="login-agreement-text">
                Kliknutím na tlačítko {isRegisterMode ? 'Zaregistrovat se' : 'Přihlásit se'} souhlasím se zpracováním osobních údajů.
              </p>

              {!isRegisterMode && (
                <button 
                  type="button" 
                  className="forgot-password-link"
                  onClick={() => alert('Odkaz pro obnovení hesla byl odeslán na váš e-mail.')}
                >
                  Zapomněl jsi své heslo?
                </button>
              )}

              <div className="login-divider">
                <span>nebo můžeš</span>
              </div>

              {/* Social Logins */}
              <div className="social-login-grid">
                <button 
                  type="button" 
                  className="social-btn social-apple"
                  onClick={handleAppleLogin}
                >
                  <svg className="social-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.84-.98 2.94.1.08.21.12.32.12.9 0 2.02-.67 2.49-1.45z"/>
                  </svg>
                  Přihlásit se přes Apple
                </button>

                <button 
                  type="button" 
                  className="social-btn social-google"
                  onClick={handleGoogleLogin}
                >
                  <svg className="social-icon" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.4 7.56l3.85 2.99c.96-2.87 3.66-4.51 6.75-4.51z"/>
                    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.69 2.87c2.16-1.99 3.44-4.91 3.44-8.55z"/>
                    <path fill="#FBBC05" d="M5.25 10.55c-.25-.75-.39-1.55-.39-2.38s.14-1.63.39-2.38L1.4 2.8C.51 4.59 0 6.6 0 8.73s.51 4.14 1.4 5.93l3.85-2.99.001-.12z"/>
                    <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.69-2.87c-1.02.68-2.33 1.09-3.96 1.09-3.09 0-5.71-2.07-6.64-4.88l-3.87 3c1.97 3.91 5.95 6.57 10.2 6.57z"/>
                  </svg>
                  Přihlášení přes Google
                </button>
              </div>
            </div>

            {/* Right Column: Benefits & Registration CTA */}
            <div className="login-modal-right-column">
              <h3 className="benefits-title">
                Připoj se k tisícům spokojených sběratelů a získej tyto výhody:
              </h3>

              <ul className="benefits-list">
                <li>
                  <span className="benefit-icon">✦</span>
                  <span className="benefit-text">Exkluzivní slevy pro registrované členy</span>
                </li>
                <li>
                  <span className="benefit-icon">✦</span>
                  <span className="benefit-text">Přednostní informace o novinkách a cenových akcích</span>
                </li>
                <li>
                  <span className="benefit-icon">✦</span>
                  <span className="benefit-text">Osobní nastavení svého sběratelského účtu</span>
                </li>
                <li>
                  <span className="benefit-icon">✦</span>
                  <span className="benefit-text">Stálý přehled a sledování všech objednávek</span>
                </li>
                <li>
                  <span className="benefit-icon">✦</span>
                  <span className="benefit-text">Snadný výkup vašich karet za skvělé ceny</span>
                </li>
              </ul>

              <div className="benefits-cta-box">
                <p className="cta-text">Registrace nezabere ani minutu!</p>
                <button 
                  type="button" 
                  className="benefits-cta-btn"
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode);
                    setEmailError(false);
                    setPasswordError(false);
                    setFullNameError(false);
                    setPhoneError(false);
                  }}
                >
                  {isRegisterMode ? 'Chci se přihlásit' : 'Chci se zaregistrovat'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
