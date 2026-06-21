import { useState, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { FEATURE_FLAGS } from '../config';
import { supabase } from '../supabase';

export default function LoginModal({ isOpen, onClose, onLogin, onRegister, showToast }) {
  const { lang, t } = useTranslation();

  const triggerAlert = (message, type = 'error') => {
    if (showToast) {
      showToast(message, type);
    } else {
      alert(message);
    }
  };
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [newsletter, setNewsletter] = useState(false);

  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [fullNameError, setFullNameError] = useState(false);
  const [localMessage, setLocalMessage] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setLocalMessage(null);
      setIsResetting(false);
      setEmailError(false);
      setPasswordError(false);
      setFullNameError(false);
    }
  }, [isOpen]);

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

  const handleSubmit = async (e) => {
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

      if (password !== confirmPassword) {
        triggerAlert(t('LoginModal.passwordsDoNotMatch'), 'error');
        return;
      }
    }

    if (hasError) return;

    if (isRegisterMode) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            newsletter: newsletter
          }
        }
      });

      if (error) {
        triggerAlert(lang === 'CZ' ? `Chyba registrace: ${error.message}` : `Registration error: ${error.message}`, 'error');
        return;
      }

      onRegister(email, fullName);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        triggerAlert(lang === 'CZ' ? `Chyba přihlášení: ${error.message}` : `Login error: ${error.message}`, 'error');
        return;
      }

      onLogin(email, data.user?.user_metadata?.full_name || email.split('@')[0]);
    }

    // Clear fields & close
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setNewsletter(false);
    setEmailError(false);
    setPasswordError(false);
    setFullNameError(false);
    onClose();
  };

  const handleForgotPassword = async () => {
    if (!validateEmail(email)) {
      setEmailError(true);
      setLocalMessage({
        text: lang === 'CZ' ? 'Zadejte prosím platný přihlašovací e-mail do pole výše.' : 'Please enter a valid login email in the field above.',
        type: 'error'
      });
      return;
    }
    setEmailError(false);
    setLocalMessage(null);
    setIsResetting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });

      if (error) throw error;

      setLocalMessage({
        text: t('LoginModal.resetLinkSent'),
        type: 'success'
      });
    } catch (err) {
      console.error('Password reset error:', err);
      setLocalMessage({
        text: lang === 'CZ' ? `Chyba při odesílání: ${err.message}` : `Error sending reset link: ${err.message}`,
        type: 'error'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSocialClick = (platform) => {
    const mockEmail = `uzivatel.${platform.toLowerCase()}@example.com`;
    const mockName = `${platform} Sběratel`;
    onLogin(mockEmail, mockName);
    onClose();
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      console.error('Google login error:', error);
      triggerAlert(lang === 'CZ' ? `Chyba Google přihlášení: ${error.message}` : `Google login error: ${error.message}`, 'error');
    } else {
      onClose();
    }
  };

  const handleFacebookLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      console.error('Facebook login error:', error);
      triggerAlert(lang === 'CZ' ? `Chyba Facebook přihlášení: ${error.message}` : `Facebook login error: ${error.message}`, 'error');
    } else {
      onClose();
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
        <button className="login-modal-close" onClick={onClose} aria-label={t('common.close')}>
          ✕
        </button>



        {showConfig ? (
          <div style={{ padding: '32px 40px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-main)' }}>{t('LoginModal.apiSettingsTitle')}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.4' }}>
              {t('LoginModal.apiSettingsDesc')}
            </p>
            <form onSubmit={saveConfig} className="login-modal-form">
              <div className="login-form-group">
                <label className="login-form-label">{t('LoginModal.googleClientIdLabel')}</label>
                <input 
                  type="text" 
                  className="login-form-input" 
                  value={googleClientId} 
                  onChange={e => { setGoogleClientId(e.target.value); localStorage.setItem('google_client_id', e.target.value); }} 
                  placeholder={t('LoginModal.googleClientIdPlaceholder')}
                />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">{t('LoginModal.appleClientIdLabel')}</label>
                <input 
                  type="text" 
                  className="login-form-input" 
                  value={appleClientId} 
                  onChange={e => { setAppleClientId(e.target.value); localStorage.setItem('apple_client_id', e.target.value); }} 
                  placeholder={t('LoginModal.appleClientIdPlaceholder')}
                />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">{t('LoginModal.appleRedirectUriLabel')}</label>
                <input 
                  type="text" 
                  className="login-form-input" 
                  value={appleRedirectUri} 
                  onChange={e => { setAppleRedirectUri(e.target.value); localStorage.setItem('apple_redirect_uri', e.target.value); }} 
                  placeholder={t('LoginModal.appleRedirectUriPlaceholder')}
                />
              </div>
              <button type="submit" className="login-submit-btn" style={{ width: '100%' }}>{t('LoginModal.saveSettingsBtn')}</button>
            </form>
          </div>
        ) : (
          <div className="login-modal-split-layout">
            {/* Left Column: Form & Social Logins */}
            <div className="login-modal-left-column">
              <h2 className="login-modal-title">
                {isRegisterMode ? t('LoginModal.tabRegister') : t('LoginModal.tabLogin')}
              </h2>

              {localMessage && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  marginBottom: '20px',
                  border: '1px solid',
                  borderColor: localMessage.type === 'success' ? '#2e7d32' : '#c62828',
                  backgroundColor: localMessage.type === 'success' ? 'rgba(46, 125, 50, 0.1)' : 'rgba(198, 40, 40, 0.1)',
                  color: localMessage.type === 'success' ? '#81c784' : '#e57373',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <span style={{ fontSize: '16px' }}>{localMessage.type === 'success' ? '✓' : '⚠'}</span>
                  <span style={{ flex: 1 }}>{localMessage.text}</span>
                  <button 
                    type="button"
                    onClick={() => setLocalMessage(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '0 4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="login-modal-form" noValidate>
                
                {/* Registration Only: Full Name */}
                {isRegisterMode && (
                  <div className="login-form-group">
                    <label className="login-form-label">
                      {t('LoginModal.fullNameLabel')} <span className="text-red">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (fullNameError) setFullNameError(e.target.value.trim().length < 3);
                      }}
                      className={`login-form-input ${fullNameError ? 'input-error' : ''}`}
                      placeholder={t('LoginModal.fullNamePlaceholder')}
                      required
                    />
                    {fullNameError && (
                      <p className="login-form-error-msg">
                        {t('LoginModal.fullNameError')}
                      </p>
                    )}
                  </div>
                )}



                {/* Email Input */}
                <div className="login-form-group">
                  <label className="login-form-label">
                    {t('LoginModal.emailLabel')} <span className="text-red">*</span>
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
                      {t('LoginModal.emailError')}
                    </p>
                  )}
                </div>

                {/* Password Input */}
                <div className="login-form-group">
                  <label className="login-form-label">
                    {t('LoginModal.passwordLabel')} <span className="text-red">*</span>
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
                      {t('LoginModal.passwordError')}
                    </p>
                  )}
                </div>

                {/* Confirm Password Input (Register only) */}
                {isRegisterMode && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="login-form-group">
                      <label className="login-form-label">
                        {t('LoginModal.confirmPasswordLabel')} <span className="text-red">*</span>
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="login-form-input"
                        required
                      />
                    </div>

                    {/* Newsletter Checkbox Option */}
                    {FEATURE_FLAGS.showNewsletter && (
                      <div className="login-form-group" style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-start' }}>
                        <input 
                          type="checkbox" 
                          id="register-newsletter" 
                          checked={newsletter} 
                          onChange={(e) => setNewsletter(e.target.checked)} 
                          style={{ marginTop: '3px', cursor: 'pointer' }} 
                        />
                        <label htmlFor="register-newsletter" style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: '1.4', fontWeight: '500', textTransform: 'none' }}>
                          {t('LoginModal.newsletterOptIn')}
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <button type="submit" className="login-submit-btn">
                  {isRegisterMode ? t('LoginModal.btnRegister') : t('LoginModal.btnLogin')}
                </button>
              </form>

              <p className="login-agreement-text">
                {t('LoginModal.agreementText')
                  .replace('Zaregistrovat se / Přihlásit se', isRegisterMode ? t('LoginModal.btnRegister') : t('LoginModal.btnLogin'))
                  .replace('Sign In / Register Account', isRegisterMode ? t('LoginModal.btnRegister') : t('LoginModal.btnLogin'))}
              </p>

              {!isRegisterMode && (
                <button 
                  type="button" 
                  className="forgot-password-link"
                  disabled={isResetting}
                  onClick={handleForgotPassword}
                >
                  {isResetting 
                    ? (lang === 'CZ' ? 'Odesílání...' : 'Sending...') 
                    : t('LoginModal.forgotPasswordLink')}
                </button>
              )}

              <div className="login-divider">
                <span>{t('LoginModal.orYouCan')}</span>
              </div>

              {/* Social Logins */}
              <div className="social-login-grid" style={{ gridTemplateColumns: '1fr' }}>
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
                  {t('LoginModal.signInGoogle')}
                </button>
              </div>
            </div>

            {/* Right Column: Benefits & Registration CTA */}
            <div className="login-modal-right-column">
              <h3 className="benefits-title">
                {t('LoginModal.benefitsTitle')}
              </h3>

              <ul className="benefits-list">
                <li>
                  <span className="benefit-icon">✦</span>
                  <span className="benefit-text">{t('LoginModal.benefit1')}</span>
                </li>
                <li>
                  <span className="benefit-icon">✦</span>
                  <span className="benefit-text">{t('LoginModal.benefit2')}</span>
                </li>
                <li>
                  <span className="benefit-icon">✦</span>
                  <span className="benefit-text">{t('LoginModal.benefit3')}</span>
                </li>
                <li>
                  <span className="benefit-icon">✦</span>
                  <span className="benefit-text">{t('LoginModal.benefit4')}</span>
                </li>
                {FEATURE_FLAGS.showBuylist && (
                  <li>
                    <span className="benefit-icon">✦</span>
                    <span className="benefit-text">{t('LoginModal.benefit5')}</span>
                  </li>
                )}
              </ul>

              <div className="benefits-cta-box">
                <p className="cta-text">{t('LoginModal.regTakesAMinute')}</p>
                <button 
                  type="button" 
                  className="benefits-cta-btn"
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode);
                    setEmailError(false);
                    setPasswordError(false);
                    setFullNameError(false);
                    setNewsletter(false);
                    setLocalMessage(null);
                  }}
                >
                  {isRegisterMode ? t('LoginModal.wantToSignIn') : t('LoginModal.wantToRegister')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
