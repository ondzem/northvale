import { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { supabase } from '../supabase';

export default function ResetPasswordModal({ isOpen, onClose, showToast }) {
  const { lang, t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage(lang === 'CZ' ? 'Nové heslo musí mít alespoň 6 znaků.' : 'New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(lang === 'CZ' ? 'Nová hesla se neshodují.' : 'New passwords do not match.');
      return;
    }

    setIsSaving(true);

    try {
      // 1. Update the password in Supabase
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      // 2. Clear recovery state flag
      localStorage.removeItem('supabase_recovery_active');

      // 3. Sign out to clear the temporary recovery session
      await supabase.auth.signOut();

      // 4. Inform user and close modal
      showToast(
        lang === 'CZ'
          ? 'Vaše heslo bylo úspěšně změněno. Nyní se můžete přihlásit s novým heslem.'
          : 'Your password was successfully updated. You can now log in with your new password.',
        'success'
      );
      onClose();
    } catch (err) {
      console.error('Password reset update error:', err);
      setErrorMessage(lang === 'CZ' ? `Chyba při ukládání: ${err.message}` : `Error saving new password: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    setIsSaving(true);
    try {
      localStorage.removeItem('supabase_recovery_active');
      await supabase.auth.signOut();
      onClose();
    } catch (err) {
      console.error('Cancel password reset error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-container" style={{ maxWidth: '450px' }}>
        <div style={{ padding: '32px 40px', textAlign: 'left' }}>
          <h2 className="login-modal-title" style={{ marginBottom: '12px' }}>
            {lang === 'CZ' ? 'Obnova přístupového hesla' : 'Password Recovery'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
            {lang === 'CZ' 
              ? 'Zadejte prosím své nové heslo níže. Po uložení budete moci pokračovat k přihlášení.' 
              : 'Please enter your new password below. Once saved, you can proceed to log in.'}
          </p>

          {errorMessage && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md, 8px)',
              fontSize: '13px',
              lineHeight: '1.5',
              marginBottom: '20px',
              border: '1px solid #c62828',
              backgroundColor: 'rgba(198, 40, 40, 0.1)',
              color: '#e57373',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ fontSize: '16px' }}>⚠</span>
              <span style={{ flex: 1 }}>{errorMessage}</span>
              <button 
                type="button"
                onClick={() => setErrorMessage(null)}
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

          <form onSubmit={handleSubmit} className="login-modal-form">
            <div className="login-form-group">
              <label className="login-form-label">
                {lang === 'CZ' ? 'Nové heslo' : 'New Password'} <span className="text-red">*</span>
              </label>
              <input
                type="password"
                required
                className="login-form-input"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSaving}
              />
            </div>

            <div className="login-form-group" style={{ marginTop: '16px' }}>
              <label className="login-form-label">
                {lang === 'CZ' ? 'Potvrzení nového hesla' : 'Confirm New Password'} <span className="text-red">*</span>
              </label>
              <input
                type="password"
                required
                className="login-form-input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSaving}
              />
            </div>

            <button 
              type="submit" 
              className="login-submit-btn" 
              style={{ width: '100%', marginTop: '20px' }}
              disabled={isSaving}
            >
              {isSaving 
                ? (lang === 'CZ' ? 'Ukládání...' : 'Saving...') 
                : (lang === 'CZ' ? 'Uložit nové heslo' : 'Save New Password')}
            </button>

            <button 
              type="button"
              onClick={handleCancel}
              className="login-submit-btn" 
              style={{ 
                width: '100%', 
                marginTop: '8px', 
                background: 'transparent', 
                border: '1px solid rgba(255, 255, 255, 0.2)', 
                color: 'var(--text-color)',
                boxShadow: 'none'
              }}
              disabled={isSaving}
            >
              {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
