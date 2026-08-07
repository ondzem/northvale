import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

export default function AddressAutocomplete({
  value = '',
  onChange,
  onSelect,
  placeholder = '',
  lang = 'CZ',
  id = 'input-street',
  autoComplete = 'street-address',
  hasError = false,
  className = '',
  style = {},
  disabled = false,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const wrapperRef = useRef(null);
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch suggestions with debounce & cancellation
  useEffect(() => {
    const query = String(value || '').trim();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setActiveIndex(-1);
      setLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setLoading(true);

      try {
        const langParam = lang === 'EN' ? 'en' : 'cs';
        const { data, error } = await supabase.functions.invoke('address-suggest', {
          method: 'GET',
          headers: {},
          queryParams: {
            q: query,
            lang: langParam,
            country: 'cz',
          },
          signal: controller.signal,
        });

        if (error || !data || !Array.isArray(data.suggestions)) {
          setSuggestions([]);
          setIsOpen(false);
        } else {
          setSuggestions(data.suggestions);
          setIsOpen(data.suggestions.length > 0);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setSuggestions([]);
          setIsOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [value, lang]);

  const handleSelectSuggestion = (item) => {
    // Normalize zip by removing spaces
    const cleanZip = String(item.zip || '').replace(/\s+/g, '');
    const selected = {
      street: item.street || item.label || '',
      city: item.city || '',
      zip: cleanZip,
      country: item.country || 'Česko',
    };

    if (onChange) {
      onChange(selected.street);
    }
    if (onSelect) {
      onSelect(selected);
    }

    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', width: '100%', ...style }}
      className={`address-autocomplete-wrapper ${className}`}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 && String(value || '').trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={`${id}-listbox`}
          aria-activedescendant={activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
          style={{
            width: '100%',
            borderColor: hasError ? '#ef4444' : undefined,
            paddingRight: loading ? '32px' : undefined,
          }}
        />
        {loading && (
          <span
            style={{
              position: 'absolute',
              right: '12px',
              pointerEvents: 'none',
              fontSize: '12px',
              color: 'var(--text-muted, #8a8a92)',
              animation: 'spin 1s linear infinite',
            }}
          >
            ⏳
          </span>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'var(--color-surface-elevated, #1c1c24)',
            border: '1px solid var(--color-border-glow, rgba(253, 189, 22, 0.3))',
            borderRadius: '8px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65)',
            listStyle: 'none',
            margin: 0,
            padding: '6px 0',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {suggestions.map((item, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <li
                key={idx}
                id={`${id}-opt-${idx}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelectSuggestion(item)}
                onMouseEnter={() => setActiveIndex(idx)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  color: isSelected ? 'var(--color-gold, #fdbd16)' : 'var(--color-text, #f1f5f9)',
                  background: isSelected ? 'rgba(253, 189, 22, 0.12)' : 'transparent',
                  borderBottom: idx < suggestions.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  transition: 'background 0.15s ease, color 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div style={{ fontWeight: '600' }}>{item.label}</div>
                {(item.city || item.zip) && (
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #94a3b8)' }}>
                    {[item.city, item.zip].filter(Boolean).join(', ')}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
