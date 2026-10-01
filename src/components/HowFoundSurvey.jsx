import { useState } from 'react';
import { supabase } from '../supabase';
import { HOW_FOUND_OPTIONS } from '../services/howFound';


const CSS = `
  .hfs { width: 100%; text-align: left; border-top: 1px solid rgba(240,240,240,0.07); padding: 24px 0 4px; margin-bottom: 28px; }
  .hfs-q { font-size: 15px; font-weight: 600; color: #F0F0F0; margin: 0 0 4px; }
  .hfs-hint { font-size: 13px; color: #8A8A92; margin: 0 0 16px; }
  .hfs-opts { display: flex; flex-wrap: wrap; gap: 8px; }
  .hfs-opt { background: transparent; color: #F0F0F0; border: 1px solid rgba(240,240,240,0.12); border-radius: 999px; padding: 8px 14px; font-size: 13.5px; font-weight: 500; cursor: pointer; transition: border-color .16s ease, background-color .16s ease, color .16s ease; font-family: inherit; }
  .hfs-opt:hover { border-color: rgba(253,189,22,0.55); }
  .hfs-opt.is-on { background: #FDBD16; border-color: #FDBD16; color: #111; font-weight: 600; }
  .hfs-opt:disabled { cursor: default; opacity: .6; }
  .hfs-other { display: flex; gap: 8px; margin-top: 12px; }
  .hfs-other input { flex: 1; min-width: 0; background: rgba(255,255,255,0.04); border: 1px solid rgba(240,240,240,0.12); border-radius: 10px; padding: 10px 14px; color: #F0F0F0; font-size: 14px; font-family: inherit; outline: none; }
  .hfs-other input:focus { border-color: rgba(253,189,22,0.55); }
  .hfs-send { background: #FDBD16; color: #111; border: 0; border-radius: 10px; padding: 0 18px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .hfs-send:disabled { opacity: .6; cursor: default; }
  .hfs-done { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #10B981; margin: 0; }
  .hfs-err { font-size: 13px; color: #ef4444; margin: 10px 0 0; }
`;

/**
 * Nepovinná otázka „Jak jste se o nás dozvěděli?“ — na potvrzení objednávky
 * a na stránce objednávky z e-mailu. Odpověď ukládá order-view (ověří klíč).
 */
export default function HowFoundSurvey({ orderId, viewKey, lang = 'CZ' }) {
  const [picked, setPicked] = useState(null);
  const [other, setOther] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done | error

  if (!orderId || !viewKey) return null;
  const cz = lang === 'CZ';

  const send = async (answer, otherText = '') => {
    setState('sending');
    try {
      const { data, error } = await supabase.functions.invoke('order-view', {
        body: { action: 'survey', id: String(orderId), k: viewKey, answer, other: otherText }
      });
      if (error || !data?.success) throw error || new Error('survey failed');
      setState('done');
    } catch (err) {
      console.warn('Dotazník se nepodařilo uložit:', err);
      setState('error');
    }
  };

  const choose = (key) => {
    if (state === 'sending') return;
    setPicked(key);
    if (key !== 'jinak') send(key);
    else setState('idle');
  };

  return (
    <div className="hfs">
      <style>{CSS}</style>
      {state === 'done' ? (
        <p className="hfs-done">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
          {cz ? 'Děkujeme, moc nám to pomůže.' : 'Thank you, that helps us a lot.'}
        </p>
      ) : (
        <>
          <p className="hfs-q">{cz ? 'Jak jste se o nás dozvěděli?' : 'How did you hear about us?'}</p>
          <p className="hfs-hint">{cz ? 'Nepovinné — stačí jedno kliknutí.' : 'Optional — just one click.'}</p>
          <div className="hfs-opts" role="group" aria-label={cz ? 'Jak jste se o nás dozvěděli?' : 'How did you hear about us?'}>
            {HOW_FOUND_OPTIONS.map(opt => (
              <button
                key={opt.key}
                type="button"
                className={`hfs-opt${picked === opt.key ? ' is-on' : ''}`}
                aria-pressed={picked === opt.key}
                disabled={state === 'sending'}
                onClick={() => choose(opt.key)}
              >
                {cz ? opt.cz : opt.en}
              </button>
            ))}
          </div>
          {picked === 'jinak' && (
            <form className="hfs-other" onSubmit={e => { e.preventDefault(); send('jinak', other); }}>
              <input
                type="text"
                maxLength={80}
                value={other}
                onChange={e => setOther(e.target.value)}
                placeholder={cz ? 'Napište, kde jste o nás slyšeli' : 'Tell us where you heard about us'}
                aria-label={cz ? 'Jinak' : 'Other'}
                autoFocus
              />
              <button type="submit" className="hfs-send" disabled={state === 'sending'}>
                {cz ? 'Odeslat' : 'Send'}
              </button>
            </form>
          )}
          {state === 'error' && (
            <p className="hfs-err">{cz ? 'Odpověď se nepodařilo uložit, zkuste to prosím znovu.' : 'Could not save your answer, please try again.'}</p>
          )}
        </>
      )}
    </div>
  );
}
