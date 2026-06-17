import { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { fetchCategoriesFromDB, saveCategoryToDB, deleteCategoryFromDB } from '../../services/categories';

export default function CategoriesTab({ showToast }) {
  const { lang } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Form State
  const [formId, setFormId] = useState('');
  const [formNameCz, setFormNameCz] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formType, setFormType] = useState('single');
  const [formGame, setFormGame] = useState('Pokémon');
  const [formParentId, setFormParentId] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formDescCz, setFormDescCz] = useState('');
  const [formDescEn, setFormDescEn] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    const data = await fetchCategoriesFromDB();
    setCategories(data || []);
    setLoading(false);
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setFormId(cat.id);
    setFormNameCz(cat.name_cz || '');
    setFormNameEn(cat.name_en || '');
    setFormType(cat.type || 'single');
    setFormGame(cat.game || 'Pokémon');
    setFormParentId(cat.parent_id || '');
    setFormImageUrl(cat.image_url || '');
    setFormDescCz(cat.description_cz || '');
    setFormDescEn(cat.description_en || '');
    setIsEditing(true);
  };

  const handleResetForm = () => {
    setSelectedCategory(null);
    setFormId('');
    setFormNameCz('');
    setFormNameEn('');
    setFormType('single');
    setFormGame('Pokémon');
    setFormParentId('');
    setFormImageUrl('');
    setFormDescCz('');
    setFormDescEn('');
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formId.trim()) {
      const slug = (formNameEn || formNameCz)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (!slug) {
        showToast(lang === 'CZ' ? 'Vyplňte prosím název kategorie.' : 'Please enter category name.', 'error');
        return;
      }
      setFormId(slug);
    }

    const catData = {
      id: formId.trim() || (formNameEn || formNameCz).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name_cz: formNameCz,
      name_en: formNameEn,
      type: formType,
      game: formGame,
      parent_id: formParentId || null,
      image_url: formImageUrl,
      description_cz: formDescCz,
      description_en: formDescEn
    };

    const { data, error } = await saveCategoryToDB(catData);
    if (error) {
      showToast(lang === 'CZ' ? 'Chyba při ukládání kategorie.' : 'Error saving category.', 'error');
    } else {
      showToast(lang === 'CZ' ? 'Kategorie úspěšně uložena!' : 'Category saved successfully!', 'success');
      loadCategories();
      handleResetForm();
    }
  };

  const handleDelete = async (id) => {
    const confirmMsg = lang === 'CZ' 
      ? `Opravdu chcete smazat kategorii "${id}"? Tím dojde k odstranění i všech jejích podkategorií.` 
      : `Are you sure you want to delete category "${id}"? This will also remove all its subcategories.`;
    
    if (window.confirm(confirmMsg)) {
      const { error } = await deleteCategoryFromDB(id);
      if (error) {
        showToast(lang === 'CZ' ? 'Chyba při mazání kategorie.' : 'Error deleting category.', 'error');
      } else {
        showToast(lang === 'CZ' ? 'Kategorie byla úspěšně smazána.' : 'Category deleted successfully.', 'success');
        loadCategories();
        handleResetForm();
      }
    }
  };

  // Group categories for rendering
  const gamesList = ['Pokémon', 'Lorcana', 'One Piece', 'Riftbound', 'Accessories', 'Acrylics'];
  
  const getParentCategories = () => {
    // Only return top level categories for nesting
    return categories.filter(c => c.parent_id === null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {/* Left pane: Tree view */}
        <div style={styles.pane} className="glass-panel">
          <h2 style={styles.heading}>{lang === 'CZ' ? 'Strom kategorií' : 'Category Tree'}</h2>
          <p style={styles.desc}>
            {lang === 'CZ' 
              ? 'Vyberte kategorii pro úpravu nebo vytvořte novou podkategorii.'
              : 'Select a category to edit or create a new subcategory.'}
          </p>

          {loading ? (
            <p style={styles.loadingText}>{lang === 'CZ' ? 'Načítání...' : 'Loading...'}</p>
          ) : (
            <div style={styles.tree}>
              {gamesList.map(game => {
                const roots = categories.filter(c => c.game === game && !c.parent_id);
                return (
                  <div key={game} style={styles.gameGroup}>
                    <div style={styles.gameHeader}>🎮 {game}</div>
                    {roots.length === 0 ? (
                      <div style={styles.emptyChild}>{lang === 'CZ' ? 'Žádné podkategorie' : 'No subcategories'}</div>
                    ) : (
                      roots.map(root => {
                        const children = categories.filter(c => c.parent_id === root.id);
                        return (
                          <div key={root.id} style={styles.rootCategory}>
                            <div style={styles.categoryRow}>
                              <span 
                                style={{
                                  ...styles.categoryLink,
                                  color: selectedCategory?.id === root.id ? 'var(--color-gold)' : 'var(--text-main)'
                                }}
                                onClick={() => handleSelectCategory(root)}
                              >
                                📁 {lang === 'CZ' ? root.name_cz : root.name_en} <span style={styles.badge}>{root.type}</span>
                              </span>
                              <button 
                                style={styles.deleteMiniBtn} 
                                onClick={(e) => { e.stopPropagation(); handleDelete(root.id); }}
                                title={lang === 'CZ' ? 'Smazat' : 'Delete'}
                              >
                                🗑️
                              </button>
                            </div>
                            
                            {/* Children */}
                            {children.length > 0 && (
                              <div style={styles.childrenContainer}>
                                {children.map(child => (
                                  <div key={child.id} style={styles.categoryRowChild}>
                                    <span 
                                      style={{
                                        ...styles.categoryLink,
                                        color: selectedCategory?.id === child.id ? 'var(--color-gold)' : 'var(--text-muted)'
                                      }}
                                      onClick={() => handleSelectCategory(child)}
                                    >
                                      📄 {lang === 'CZ' ? child.name_cz : child.name_en}
                                    </span>
                                    <button 
                                      style={styles.deleteMiniBtn} 
                                      onClick={(e) => { e.stopPropagation(); handleDelete(child.id); }}
                                      title={lang === 'CZ' ? 'Smazat' : 'Delete'}
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right pane: Form */}
        <div style={styles.pane} className="glass-panel">
          <div style={styles.formHeader}>
            <h2 style={styles.heading}>
              {isEditing 
                ? (lang === 'CZ' ? 'Upravit kategorii' : 'Edit Category')
                : (lang === 'CZ' ? 'Vytvořit kategorii' : 'Create Category')}
            </h2>
            {isEditing && (
              <button className="btn btn-secondary" style={styles.newBtn} onClick={handleResetForm}>
                {lang === 'CZ' ? 'Nová +' : 'New +'}
              </button>
            )}
          </div>

          <form onSubmit={handleSave} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{lang === 'CZ' ? 'Identifikátor (slug / ID)' : 'Identifier (slug / ID)'}</label>
              <input 
                type="text" 
                style={styles.input}
                placeholder={lang === 'CZ' ? 'např. set-obsidian-flames (nechte prázdné pro automatické vygenerování)' : 'e.g. set-obsidian-flames (leave empty to autogenerate)'}
                value={formId}
                onChange={e => setFormId(e.target.value)}
                disabled={isEditing}
              />
              <span style={styles.helperText}>
                {lang === 'CZ' 
                  ? '💡 Unikátní kód, který se zobrazí v URL adrese (např. .../singles-catalog?edition=obsidian-flames). Nechte prázdné a vygeneruje se sám.' 
                  : '💡 Unique code that appears in the URL address. Leave empty to automatically generate it.'}
              </span>
            </div>

            <div style={styles.row}>
              <div style={styles.col}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{lang === 'CZ' ? 'Název CZ *' : 'Name CZ *'}</label>
                  <input 
                    type="text" 
                    required
                    style={styles.input}
                    value={formNameCz}
                    onChange={e => setFormNameCz(e.target.value)}
                  />
                  <span style={styles.helperText}>{lang === 'CZ' ? '💡 Název zobrazený českým uživatelům.' : '💡 Czech version name.'}</span>
                </div>
              </div>
              <div style={styles.col}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{lang === 'CZ' ? 'Název EN *' : 'Name EN *'}</label>
                  <input 
                    type="text" 
                    required
                    style={styles.input}
                    value={formNameEn}
                    onChange={e => setFormNameEn(e.target.value)}
                  />
                  <span style={styles.helperText}>{lang === 'CZ' ? '💡 Název zobrazený anglickým uživatelům.' : '💡 English version name.'}</span>
                </div>
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.col}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{lang === 'CZ' ? 'Hra / Sekce' : 'Game / Section'}</label>
                  <select 
                    style={styles.select}
                    value={formGame}
                    onChange={e => setFormGame(e.target.value)}
                  >
                    {gamesList.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <span style={styles.helperText}>{lang === 'CZ' ? '💡 Hlavní kategorie.' : '💡 Target franchise.'}</span>
                </div>
              </div>
              <div style={styles.col}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{lang === 'CZ' ? 'Typ produktů' : 'Product Type'}</label>
                  <select 
                    style={styles.select}
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                  >
                    <option value="single">{lang === 'CZ' ? 'Kusové karty (Singles)' : 'Singles'}</option>
                    <option value="sealed">{lang === 'CZ' ? 'Zapečetěné produkty' : 'Sealed Products'}</option>
                    <option value="slab">{lang === 'CZ' ? 'Graded slabs' : 'Graded Slabs'}</option>
                    <option value="accessory">{lang === 'CZ' ? 'Příslušenství / Ostatní' : 'Accessories'}</option>
                  </select>
                  <span style={styles.helperText}>{lang === 'CZ' ? '💡 Zařazení typu zboží.' : '💡 Product group designation.'}</span>
                </div>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{lang === 'CZ' ? 'Nadřazená kategorie (Parent)' : 'Parent Category'}</label>
              <select 
                style={styles.select}
                value={formParentId}
                onChange={e => setFormParentId(e.target.value)}
              >
                <option value="">{lang === 'CZ' ? '-- Žádná (Hlavní úroveň) --' : '-- None (Top level) --'}</option>
                {getParentCategories()
                  .filter(c => c.id !== formId) // Avoid circular ref
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.game} - {lang === 'CZ' ? c.name_cz : c.name_en} ({c.id})
                    </option>
                  ))
                }
              </select>
              <span style={styles.helperText}>
                {lang === 'CZ' 
                  ? '💡 Pokud vytváříte edici (např. Obsidian Flames), zvolte jako nadřazenou hru (např. Pokémon TCG).' 
                  : '💡 Nest this category under a parent (e.g. nest set under its game).'}
              </span>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{lang === 'CZ' ? 'Obrázek (URL)' : 'Image (URL)'}</label>
              <input 
                type="text" 
                style={styles.input}
                placeholder="https://..."
                value={formImageUrl}
                onChange={e => setFormImageUrl(e.target.value)}
              />
              <span style={styles.helperText}>{lang === 'CZ' ? '💡 Odkaz na logo/obrázek setu.' : '💡 URL of the set image.'}</span>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{lang === 'CZ' ? 'Popis CZ' : 'Description CZ'}</label>
              <textarea 
                style={styles.textarea}
                rows="3"
                value={formDescCz}
                onChange={e => setFormDescCz(e.target.value)}
              />
              <span style={styles.helperText}>{lang === 'CZ' ? '💡 Krátký text, který se zobrazí v záhlaví této kategorie na e-shopu.' : '💡 Description text displayed in CZ.'}</span>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{lang === 'CZ' ? 'Popis EN' : 'Description EN'}</label>
              <textarea 
                style={styles.textarea}
                rows="3"
                value={formDescEn}
                onChange={e => setFormDescEn(e.target.value)}
              />
              <span style={styles.helperText}>{lang === 'CZ' ? '💡 Krátký text pro anglickou verzi webu.' : '💡 Description text displayed in EN.'}</span>
            </div>

            <div style={styles.btnRow}>
              {isEditing && (
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  style={{ marginRight: 'auto' }}
                  onClick={() => handleDelete(formId)}
                >
                  {lang === 'CZ' ? 'Smazat kategorii' : 'Delete Category'}
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={handleResetForm}>
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button type="submit" className="btn btn-success">
                {lang === 'CZ' ? 'Uložit kategorii' : 'Save Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
  },
  grid: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  pane: {
    flex: '1 1 450px',
    padding: '30px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
  },
  heading: {
    fontSize: '18px',
    fontWeight: '800',
    margin: 0,
    fontFamily: 'var(--font-heading)',
    color: 'var(--text-main)',
  },
  desc: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: 0,
  },
  loadingText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  tree: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxHeight: '600px',
    overflowY: 'auto',
    paddingRight: '8px',
  },
  gameGroup: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    paddingBottom: '16px',
  },
  gameHeader: {
    fontWeight: '700',
    fontSize: '14px',
    color: 'var(--color-gold)',
    marginBottom: '8px',
  },
  emptyChild: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    paddingLeft: '16px',
  },
  rootCategory: {
    paddingLeft: '12px',
    marginTop: '6px',
  },
  categoryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
  },
  categoryLink: {
    fontSize: '13px',
    cursor: 'pointer',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  badge: {
    fontSize: '9px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: '1px 5px',
    borderRadius: '2px',
    color: 'var(--text-muted)',
  },
  deleteMiniBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '2px',
    opacity: 0.6,
    transition: 'opacity 0.2s',
    ':hover': {
      opacity: 1
    }
  },
  childrenContainer: {
    borderLeft: '1px dashed rgba(255,255,255,0.08)',
    marginLeft: '6px',
    paddingLeft: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  categoryRowChild: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2px 0',
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newBtn: {
    padding: '4px 10px',
    fontSize: '11px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    color: 'var(--text-main)',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    color: 'var(--text-main)',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  textarea: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    color: 'var(--text-main)',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
  },
  helperText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '3px',
    lineHeight: '1.4',
    textAlign: 'left',
  }
};
