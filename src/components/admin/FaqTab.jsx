import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import {
  fetchFaqData,
  saveFaqCategory,
  deleteFaqCategory,
  saveFaqItem,
  deleteFaqItem,
  saveFaqCategoriesOrder,
  saveFaqItemsOrder,
  DEFAULT_FAQ
} from '../../services/faq';

export default function FaqTab({ showToast }) {
  const { lang } = useTranslation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [faqData, setFaqData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  // type: 'category' | 'item'
  // mode: 'add' | 'edit'
  // data: values
  const [formState, setFormState] = useState(null);

  // Expand state for categories in the list
  const [expandedCats, setExpandedCats] = useState({});

  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: '', target: null });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const isInitialMount = useRef(true);

  // Smooth scroll to form on mobile when edit/add is initiated
  useEffect(() => {
    if (isMobile && formState) {
      setTimeout(() => {
        const formElement = document.querySelector('.ctf-form-col');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  }, [formState, isMobile]);

  // Smooth scroll back to tree on mobile when form is closed/saved
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (isMobile && !formState) {
      const treeElement = document.querySelector('.ctf-tree-col');
      if (treeElement) {
        treeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [formState, isMobile]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchFaqData();
    setFaqData(data);
    setLoading(false);
  };

  const handleImportDefaults = async () => {
    setLoading(true);
    try {
      for (const cat of DEFAULT_FAQ) {
        const catPayload = {
          name_cz: cat.name_cz,
          name_en: cat.name_en,
          position: cat.position
        };
        const catRes = await saveFaqCategory(catPayload);
        if (catRes.error) throw catRes.error;
        
        const newCatId = catRes.data.id;
        
        if (cat.questions && cat.questions.length > 0) {
          for (const item of cat.questions) {
            const itemPayload = {
              category_id: newCatId,
              question_cz: item.question_cz,
              question_en: item.question_en,
              answer_cz: item.answer_cz,
              answer_en: item.answer_en,
              position: item.position
            };
            const itemRes = await saveFaqItem(itemPayload);
            if (itemRes.error) throw itemRes.error;
          }
        }
      }
      showToast(lang === 'CZ' ? 'Výchozí dotazy byly úspěšně importovány.' : 'Default FAQs imported successfully.', 'success');
      await loadData();
    } catch (err) {
      console.error('Failed to import default FAQs:', err);
      showToast(lang === 'CZ' ? 'Chyba při importu výchozích dotazů.' : 'Error importing default FAQs.', 'error');
      setLoading(false);
    }
  };

  const handleToggleExpand = (catId) => {
    setExpandedCats(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  // Reordering categories
  const handleMoveCategory = async (index, direction) => {
    const list = [...faqData];
    if (direction === 'up' && index > 0) {
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
    } else {
      return;
    }

    setFaqData(list);
    const res = await saveFaqCategoriesOrder(list);
    if (res.error) {
      showToast(lang === 'CZ' ? 'Chyba při změně pořadí kategorií.' : 'Error changing category order.', 'error');
      loadData();
    } else {
      showToast(lang === 'CZ' ? 'Pořadí kategorií uloženo.' : 'Category order saved.', 'success');
    }
  };

  // Reordering items within category
  const handleMoveItem = async (catId, index, direction) => {
    const catIndex = faqData.findIndex(c => c.id === catId);
    if (catIndex === -1) return;

    const cat = faqData[catIndex];
    const list = [...(cat.questions || [])];

    if (direction === 'up' && index > 0) {
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
    } else {
      return;
    }

    // Update local state
    const newFaqData = [...faqData];
    newFaqData[catIndex] = { ...cat, questions: list };
    setFaqData(newFaqData);

    const res = await saveFaqItemsOrder(list);
    if (res.error) {
      showToast(lang === 'CZ' ? 'Chyba při změně pořadí dotazů.' : 'Error changing questions order.', 'error');
      loadData();
    } else {
      showToast(lang === 'CZ' ? 'Pořadí dotazů uloženo.' : 'Questions order saved.', 'success');
    }
  };

  // Start adding a category
  const handleInitAddCategory = () => {
    setFormState({
      type: 'category',
      mode: 'add',
      data: { name_cz: '', name_en: '', position: faqData.length }
    });
  };

  // Start editing a category
  const handleInitEditCategory = (cat) => {
    setFormState({
      type: 'category',
      mode: 'edit',
      data: { id: cat.id, name_cz: cat.name_cz, name_en: cat.name_en, position: cat.position }
    });
  };

  // Delete category
  const handleDeleteCategoryClick = (cat) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'category',
      target: cat
    });
  };

  // Start adding an item
  const handleInitAddItem = (catId = '') => {
    const targetCat = faqData.find(c => c.id === catId) || faqData[0];
    const defaultPosition = targetCat ? (targetCat.questions || []).length : 0;

    setFormState({
      type: 'item',
      mode: 'add',
      data: {
        category_id: catId || (faqData[0]?.id || ''),
        question_cz: '',
        question_en: '',
        answer_cz: '',
        answer_en: '',
        position: defaultPosition
      }
    });
  };

  // Start editing an item
  const handleInitEditItem = (item) => {
    setFormState({
      type: 'item',
      mode: 'edit',
      data: { ...item }
    });
  };

  // Delete item
  const handleDeleteItemClick = (item) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'item',
      target: item
    });
  };

  // Handle actual deletion confirmation
  const handleConfirmDelete = async () => {
    const { type, target } = deleteConfirm;
    if (!target) return;

    if (type === 'category') {
      const res = await deleteFaqCategory(target.id);
      if (res.error) {
        showToast(lang === 'CZ' ? 'Chyba při mazání kategorie.' : 'Error deleting category.', 'error');
      } else {
        showToast(lang === 'CZ' ? 'Kategorie byla smazána.' : 'Category was deleted.', 'success');
        if (formState?.type === 'category' && formState?.data?.id === target.id) {
          setFormState(null);
        }
        loadData();
      }
    } else if (type === 'item') {
      const res = await deleteFaqItem(target.id);
      if (res.error) {
        showToast(lang === 'CZ' ? 'Chyba při mazání dotazu.' : 'Error deleting question.', 'error');
      } else {
        showToast(lang === 'CZ' ? 'Dotaz byl smazán.' : 'Question was deleted.', 'success');
        if (formState?.type === 'item' && formState?.data?.id === target.id) {
          setFormState(null);
        }
        loadData();
      }
    }

    setDeleteConfirm({ isOpen: false, type: '', target: null });
  };

  // Handle Form Submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formState) return;

    if (formState.type === 'category') {
      const { name_cz, name_en } = formState.data;
      if (!name_cz.trim() || !name_en.trim()) {
        showToast(lang === 'CZ' ? 'Vyplňte prosím název v obou jazycích.' : 'Please fill in names for both languages.', 'error');
        return;
      }

      const res = await saveFaqCategory(formState.data);
      if (res.error) {
        showToast(lang === 'CZ' ? 'Chyba při ukládání kategorie.' : 'Error saving category.', 'error');
      } else {
        showToast(lang === 'CZ' ? 'Kategorie byla úspěšně uložena.' : 'Category saved successfully.', 'success');
        setFormState(null);
        loadData();
      }
    } else if (formState.type === 'item') {
      const { category_id, question_cz, question_en, answer_cz, answer_en } = formState.data;
      if (!category_id) {
        showToast(lang === 'CZ' ? 'Vyberte prosím kategorii.' : 'Please select a category.', 'error');
        return;
      }
      if (!question_cz.trim() || !question_en.trim() || !answer_cz.trim() || !answer_en.trim()) {
        showToast(lang === 'CZ' ? 'Vyplňte prosím všechna textová pole v obou jazycích.' : 'Please fill in all text fields in both languages.', 'error');
        return;
      }

      const res = await saveFaqItem(formState.data);
      if (res.error) {
        showToast(lang === 'CZ' ? 'Chyba při ukládání dotazu.' : 'Error saving question.', 'error');
      } else {
        showToast(lang === 'CZ' ? 'Dotaz byl úspěšně uložen.' : 'Question saved successfully.', 'success');
        setFormState(null);
        loadData();
      }
    }
  };

  const handleInputChange = (field, val) => {
    setFormState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [field]: val
      }
    }));
  };

  return (
    <div className="ctf-shell" style={{ display: 'flex', gap: '32px', minHeight: '500px', flexDirection: isMobile ? 'column' : 'row' }}>
      
      {/* LEFT COLUMN: FAQ list / tree */}
      <section className="ctf-tree-col" style={{ flex: isMobile ? 'none' : '1.2 1 0', width: isMobile ? '100%' : undefined, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '8px', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '16px' }}>
          <div>
            <h3 className="ctf-col-title" style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>
              {lang === 'CZ' ? 'Přehled témat a dotazů' : 'FAQ Topics & Questions'}
            </h3>
            <p className="ctf-col-sub" style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              {lang === 'CZ' ? 'Zde můžete řadit témata i dotazy nahoru/dolů.' : 'Reorder topics and questions here.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ flex: isMobile ? 1 : 'none', fontSize: '11px', padding: '6px 12px' }}
              onClick={handleInitAddCategory}
            >
              + {lang === 'CZ' ? 'Nové téma' : 'New Topic'}
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              style={{ flex: isMobile ? 1 : 'none', fontSize: '11px', padding: '6px 12px' }}
              disabled={faqData.length === 0}
              onClick={() => handleInitAddItem()}
            >
              + {lang === 'CZ' ? 'Nový dotaz' : 'New Question'}
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{lang === 'CZ' ? 'Načítání témat...' : 'Loading topics...'}</p>
        ) : faqData.length === 0 ? (
          <div style={{ padding: '32px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px dashed rgba(255,255,255,0.08)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
              {lang === 'CZ' 
                ? 'Žádná témata ani dotazy nebyly v databázi nalezeny.' 
                : 'No FAQ topics or questions were found in the database.'}
            </p>
            <button 
              type="button" 
              className="btn btn-primary" 
              style={{ fontSize: '12px', padding: '8px 16px' }}
              onClick={handleImportDefaults}
            >
              🚀 {lang === 'CZ' ? 'Importovat výchozí dotazy' : 'Import Default FAQ'}
            </button>
          </div>
        ) : (
          <div className="ctf-tree" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            maxHeight: isMobile ? 'none' : 'calc(100vh - 280px)',
            overflowY: isMobile ? 'visible' : 'auto',
            paddingRight: isMobile ? '0' : '8px',
            WebkitOverflowScrolling: 'touch'
          }}>
            {faqData.map((cat, idx) => {
              const isExpanded = expandedCats[cat.id] ?? true;
              return (
                <div key={cat.id} style={{ borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  
                  {/* Category Header */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between', 
                    padding: isMobile ? '12px 10px' : '12px 16px', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    gap: isMobile ? '10px' : '0'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      cursor: 'pointer', 
                      flex: 1 
                    }} onClick={() => handleToggleExpand(cat.id)}>
                      <span style={{ 
                        fontSize: '10px', 
                        color: 'var(--text-muted)', 
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                        display: 'inline-block', 
                        transition: 'transform 0.2s ease', 
                        flexShrink: 0,
                        marginTop: '1px' 
                      }}>▶</span>
                      <strong style={{ 
                        color: '#fff', 
                        fontSize: '14px', 
                        lineHeight: '1.4', 
                        wordBreak: 'break-word' 
                      }}>{lang === 'CZ' ? cat.name_cz : cat.name_en}</strong>
                      <span style={{ 
                        fontSize: '10px', 
                        color: 'var(--text-muted)', 
                        background: 'rgba(255,255,255,0.04)', 
                        padding: '2px 6px', 
                        borderRadius: '10px', 
                        flexShrink: 0,
                        marginLeft: '4px',
                        alignSelf: 'center'
                      }}>
                        {cat.questions?.length || 0}
                      </span>
                    </div>

                    {/* Category actions */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: isMobile ? '12px' : '6px',
                      justifyContent: isMobile ? 'flex-end' : 'flex-end',
                      borderTop: isMobile ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      paddingTop: isMobile ? '8px' : '0',
                      marginTop: isMobile ? '2px' : '0'
                    }}>
                      <button 
                        type="button" 
                        onClick={() => handleMoveCategory(idx, 'up')}
                        disabled={idx === 0}
                        style={{ background: 'none', border: 'none', color: idx === 0 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)', padding: isMobile ? '6px' : '4px', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: isMobile ? '14px' : '11px' }}
                        title={lang === 'CZ' ? 'Posunout nahoru' : 'Move up'}
                      >
                        ▲
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleMoveCategory(idx, 'down')}
                        disabled={idx === faqData.length - 1}
                        style={{ background: 'none', border: 'none', color: idx === faqData.length - 1 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)', padding: isMobile ? '6px' : '4px', cursor: idx === faqData.length - 1 ? 'not-allowed' : 'pointer', fontSize: isMobile ? '14px' : '11px' }}
                        title={lang === 'CZ' ? 'Posunout dolů' : 'Move down'}
                      >
                        ▼
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleInitEditCategory(cat)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-gold)', padding: isMobile ? '6px' : '4px', cursor: 'pointer', fontSize: isMobile ? '14px' : '12px' }}
                        title={lang === 'CZ' ? 'Upravit téma' : 'Edit topic'}
                      >
                        ✏️
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteCategoryClick(cat)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', padding: isMobile ? '6px' : '4px', cursor: 'pointer', fontSize: isMobile ? '14px' : '12px' }}
                        title={lang === 'CZ' ? 'Smazat téma' : 'Delete topic'}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Nested Questions */}
                  {isExpanded && (
                    <div style={{ padding: isMobile ? '8px' : '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.1)' }}>
                      {(cat.questions || []).length === 0 ? (
                        <p style={{ margin: '8px', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                          {lang === 'CZ' ? 'Žádné dotazy v tomto tématu.' : 'No questions in this topic.'}
                          <span style={{ color: 'var(--color-gold)', cursor: 'pointer', marginLeft: '6px', textDecoration: 'underline' }} onClick={() => handleInitAddItem(cat.id)}>
                            {lang === 'CZ' ? 'Přidat dotaz' : 'Add question'}
                          </span>
                        </p>
                      ) : (
                        (cat.questions || []).map((item, qIdx) => (
                          <div 
                            key={item.id} 
                            style={{ 
                              display: 'flex', 
                              flexDirection: isMobile ? 'column' : 'row',
                              alignItems: isMobile ? 'stretch' : 'center', 
                              justifyContent: 'space-between',
                              padding: isMobile ? '12px 10px' : '10px 14px', 
                              borderRadius: 'var(--radius-sm)', 
                              background: formState?.type === 'item' && formState?.data?.id === item.id ? 'rgba(253, 189, 22, 0.08)' : 'rgba(255,255,255,0.02)',
                              border: formState?.type === 'item' && formState?.data?.id === item.id ? '1px solid rgba(253, 189, 22, 0.2)' : '1px solid rgba(255,255,255,0.04)',
                              gap: isMobile ? '12px' : '16px'
                            }}
                          >
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-gold)' }}>CZ:</span>
                                <span style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.4', wordBreak: 'break-word' }}>
                                  {item.question_cz}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>EN:</span>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4', wordBreak: 'break-word' }}>
                                  {item.question_en}
                                </span>
                              </div>
                            </div>

                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: isMobile ? '12px' : '6px', 
                              flexShrink: 0,
                              justifyContent: isMobile ? 'flex-end' : 'flex-end',
                              borderTop: isMobile ? '1px solid rgba(255,255,255,0.03)' : 'none',
                              paddingTop: isMobile ? '6px' : '0',
                              marginTop: isMobile ? '2px' : '0'
                            }}>
                              <button 
                                type="button" 
                                onClick={() => handleMoveItem(cat.id, qIdx, 'up')}
                                disabled={qIdx === 0}
                                style={{ background: 'none', border: 'none', color: qIdx === 0 ? 'rgba(255,255,255,0.05)' : 'var(--text-muted)', padding: isMobile ? '4px' : '2px', cursor: qIdx === 0 ? 'not-allowed' : 'pointer', fontSize: isMobile ? '12px' : '10px' }}
                                title={lang === 'CZ' ? 'Posunout nahoru' : 'Move up'}
                              >
                                ▲
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleMoveItem(cat.id, qIdx, 'down')}
                                disabled={qIdx === (cat.questions || []).length - 1}
                                style={{ background: 'none', border: 'none', color: qIdx === (cat.questions || []).length - 1 ? 'rgba(255,255,255,0.05)' : 'var(--text-muted)', padding: isMobile ? '4px' : '2px', cursor: qIdx === (cat.questions || []).length - 1 ? 'not-allowed' : 'pointer', fontSize: isMobile ? '12px' : '10px' }}
                                title={lang === 'CZ' ? 'Posunout dolů' : 'Move down'}
                              >
                                ▼
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleInitEditItem(item)}
                                style={{ background: 'none', border: 'none', color: 'var(--color-gold)', padding: isMobile ? '4px' : '2px', cursor: 'pointer', fontSize: isMobile ? '13px' : '11px' }}
                                title={lang === 'CZ' ? 'Upravit dotaz' : 'Edit question'}
                              >
                                ✏️
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteItemClick(item)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', padding: isMobile ? '4px' : '2px', cursor: 'pointer', fontSize: isMobile ? '13px' : '11px' }}
                                title={lang === 'CZ' ? 'Smazat dotaz' : 'Delete question'}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* RIGHT COLUMN: Form for add / edit */}
      <section className="ctf-form-col" style={{ 
        flex: isMobile ? 'none' : '1 1 0', 
        width: isMobile ? '100%' : undefined, 
        background: 'var(--bg-secondary)', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid rgba(255,255,255,0.06)', 
        padding: isMobile ? '16px' : '24px', 
        boxSizing: 'border-box',
        maxHeight: isMobile ? 'none' : 'calc(100vh - 280px)',
        overflowY: isMobile ? 'visible' : 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        {!formState ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '32px', marginBottom: '16px' }}>⚙️</span>
            <h4 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>
              {lang === 'CZ' ? 'Detail nastavení' : 'Settings Detail'}
            </h4>
            <p style={{ margin: 0, fontSize: '12px', maxWidth: '260px', lineHeight: '1.6' }}>
              {lang === 'CZ' 
                ? 'Vyberte položku k editaci nebo klikněte na tlačítka nahoře pro vytvoření nového tématu či dotazu.' 
                : 'Select an item to edit or click the buttons above to create a new topic or question.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--color-gold)' }}>
                {formState.type === 'category' ? (
                  formState.mode === 'add' 
                    ? (lang === 'CZ' ? 'Nové téma FAQ' : 'New FAQ Topic')
                    : (lang === 'CZ' ? 'Upravit téma FAQ' : 'Edit FAQ Topic')
                ) : (
                  formState.mode === 'add'
                    ? (lang === 'CZ' ? 'Nový dotaz FAQ' : 'New FAQ Question')
                    : (lang === 'CZ' ? 'Upravit dotaz FAQ' : 'Edit FAQ Question')
                )}
              </h3>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
                onClick={() => setFormState(null)}
              >
                &times;
              </button>
            </div>

            {/* CATEGORY FORM FIELDS */}
            {formState.type === 'category' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {lang === 'CZ' ? 'Název CZ' : 'Name CZ'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    className="ctf-input"
                    value={formState.data.name_cz}
                    onChange={(e) => handleInputChange('name_cz', e.target.value)}
                    placeholder={lang === 'CZ' ? 'např. Doprava a platba' : 'e.g., Shipping and payment'}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {lang === 'CZ' ? 'Název EN' : 'Name EN'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    className="ctf-input"
                    value={formState.data.name_en}
                    onChange={(e) => handleInputChange('name_en', e.target.value)}
                    placeholder={lang === 'CZ' ? 'např. Shipping & Payment' : 'e.g., Shipping & Payment'}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </>
            )}

            {/* ITEM FORM FIELDS */}
            {formState.type === 'item' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {lang === 'CZ' ? 'Přiřadit do tématu' : 'Assign to Topic'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="ctf-select" style={{ width: '100%' }}>
                    <select
                      value={formState.data.category_id}
                      onChange={(e) => handleInputChange('category_id', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-main)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}
                      required
                    >
                      <option value="" disabled>-- {lang === 'CZ' ? 'Vyberte téma' : 'Select Topic'} --</option>
                      {faqData.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {lang === 'CZ' ? cat.name_cz : cat.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {lang === 'CZ' ? 'Otázka CZ' : 'Question CZ'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    className="ctf-input"
                    value={formState.data.question_cz}
                    onChange={(e) => handleInputChange('question_cz', e.target.value)}
                    placeholder={lang === 'CZ' ? 'Zadejte otázku v češtině' : 'Enter question in Czech'}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {lang === 'CZ' ? 'Otázka EN' : 'Question EN'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    className="ctf-input"
                    value={formState.data.question_en}
                    onChange={(e) => handleInputChange('question_en', e.target.value)}
                    placeholder={lang === 'CZ' ? 'Zadejte otázku v angličtině' : 'Enter question in English'}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {lang === 'CZ' ? 'Odpověď CZ' : 'Answer CZ'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea 
                    className="ctf-textarea"
                    rows={4}
                    value={formState.data.answer_cz}
                    onChange={(e) => handleInputChange('answer_cz', e.target.value)}
                    placeholder={lang === 'CZ' ? 'Zadejte odpověď v češtině...' : 'Enter answer in Czech...'}
                    style={{ width: '100%', boxSizing: 'border-box', height: '100px', resize: 'vertical' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {lang === 'CZ' ? 'Odpověď EN' : 'Answer EN'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea 
                    className="ctf-textarea"
                    rows={4}
                    value={formState.data.answer_en}
                    onChange={(e) => handleInputChange('answer_en', e.target.value)}
                    placeholder={lang === 'CZ' ? 'Zadejte odpověď v angličtině...' : 'Enter answer in English...'}
                    style={{ width: '100%', boxSizing: 'border-box', height: '100px', resize: 'vertical' }}
                    required
                  />
                </div>
              </>
            )}

            {/* BUTTONS */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', gap: '10px', marginTop: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ flex: 1, width: isMobile ? '100%' : 'auto' }}
                onClick={() => setFormState(null)}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ flex: 1.5, width: isMobile ? '100%' : 'auto' }}
              >
                {lang === 'CZ' ? 'Uložit změny' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Delete Confirmation Modal Portal */}
      {deleteConfirm.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-secondary, #141416)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: '0 0 12px 0' }}>
              {lang === 'CZ' ? 'Opravdu smazat?' : 'Confirm Delete?'}
            </h4>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              {deleteConfirm.type === 'category' ? (
                lang === 'CZ'
                  ? `Opravdu chcete smazat kategorii "${deleteConfirm.target?.name_cz}" a všechny její dotazy? Tuto akci nelze vzít zpět.`
                  : `Are you sure you want to delete category "${deleteConfirm.target?.name_en}" and all its questions? This action cannot be undone.`
              ) : (
                lang === 'CZ'
                  ? `Opravdu chcete smazat tento dotaz? Tuto akci nelze vzít zpět.`
                  : `Are you sure you want to delete this question? This action cannot be undone.`
              )}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                onClick={() => setDeleteConfirm({ isOpen: false, type: '', target: null })}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button
                type="button"
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
                onClick={handleConfirmDelete}
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
