import { useState, useEffect } from 'react';
import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';
import ProductCard from './ProductCard';
import { supabase } from '../supabase';

const getGameImage = (product) => {
  if (product.category === 'Acrylics') return '/acrylic-etb-box.png';
  const game = product.game || '';
  const g = game.toLowerCase();
  if (g.includes('pokémon') || g.includes('pokemon')) return '/Pokemon.webp';
  if (g.includes('lorcana')) return '/lorcana logo.webp';
  if (g.includes('riftbound')) return '/Riftbound.webp';
  if (g.includes('magic')) return '/Magic the gathering.webp';
  if (g.includes('one piece') || g.includes('onepiece')) return '/One piece.webp';
  return '/logo s popisem.webp';
};

// Rich text formatter function for custom headers, lists, check lists, bold text
const parseFormattedText = (text, isMini = false) => {
  if (!text) return null;

  // If it looks like HTML, render it directly
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return (
      <div 
        className={isMini ? "mock-page-container-html" : "tab-popis-text-html"} 
        dangerouslySetInnerHTML={{ __html: text }} 
      />
    );
  }

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];
  
  const parseInlineFormatting = (str) => {
    if (!str) return '';
    const parts = str.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} style={{ color: '#fff', fontWeight: 'bold' }}>{part}</strong>;
      }
      return part;
    });
  };

  const flushList = (key) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} style={{ margin: isMini ? '0 0 8px 0' : '0 0 16px 0', paddingLeft: isMini ? '16px' : '24px', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: isMini ? '4px' : '8px' }}>
          {currentList.map((item, idx) => {
            const bulletColor = item.type === 'star' ? 'var(--color-gold, #fdbd16)' : item.type === 'check' ? '#4caf50' : 'rgba(255,255,255,0.4)';
            const bulletChar = item.type === 'check' ? '✓' : item.type === 'star' ? '✦' : '•';
            return (
              <li key={`li-${key}-${idx}`} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: isMini ? '11px' : '14.5px', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)' }}>
                <span style={{ color: bulletColor, fontWeight: 'bold', fontSize: isMini ? '10px' : '14px', flexShrink: 0, marginTop: isMini ? '1px' : '2px' }}>{bulletChar}</span>
                <span style={{ flex: 1 }}>{parseInlineFormatting(item.text)}</span>
              </li>
            );
          })}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Check if it's a heading
    if (trimmed.startsWith('### ')) {
      flushList(index);
      const headingText = trimmed.substring(4);
      elements.push(
        <h3 key={index} style={{ fontSize: isMini ? '12px' : '18px', fontWeight: '800', color: '#fff', margin: isMini ? '12px 0 6px 0' : '24px 0 12px 0', fontFamily: 'var(--font-heading)' }}>
          {parseInlineFormatting(headingText)}
        </h3>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList(index);
      const headingText = trimmed.substring(3);
      elements.push(
        <h2 key={index} style={{ fontSize: isMini ? '13px' : '20px', fontWeight: '800', color: '#fff', margin: isMini ? '14px 0 8px 0' : '28px 0 16px 0', fontFamily: 'var(--font-heading)' }}>
          {parseInlineFormatting(headingText)}
        </h2>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList(index);
      const headingText = trimmed.substring(2);
      elements.push(
        <h1 key={index} style={{ fontSize: isMini ? '14px' : '24px', fontWeight: '800', color: '#fff', margin: isMini ? '16px 0 10px 0' : '32px 0 20px 0', fontFamily: 'var(--font-heading)' }}>
          {parseInlineFormatting(headingText)}
        </h1>
      );
    }
    // Check if it's a list item
    else if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.replace(/^(•|-|\*)\s*/, '');
      currentList.push({ type: 'bullet', text: itemText });
    } else if (trimmed.startsWith('✦ ')) {
      const itemText = trimmed.replace(/^✦\s*/, '');
      currentList.push({ type: 'star', text: itemText });
    } else if (trimmed.startsWith('✓ ')) {
      const itemText = trimmed.replace(/^✓\s*/, '');
      currentList.push({ type: 'check', text: itemText });
    }
    // Regular line
    else {
      if (trimmed === '') {
        flushList(index);
        elements.push(<div key={index} style={{ height: isMini ? '6px' : '12px' }} />);
      } else {
        flushList(index);
        elements.push(
          <p key={index} style={{ margin: isMini ? '0 0 6px 0' : '0 0 16px 0', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)', fontSize: isMini ? '11px' : '14.5px' }}>
            {parseInlineFormatting(line)}
          </p>
        );
      }
    }
  });

  flushList(lines.length);
  return elements;
};

export default function SinglesDetail({ productId, products, addToCart, setSelectedProductId, setActivePage, setFilters, alert, user, onOpenLogin }) {
  const { lang, t } = useTranslation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoomStyle, setLightboxZoomStyle] = useState({ display: 'none' });
  
  // Custom interactive states
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState('popis');
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [isWatchdogModalOpen, setIsWatchdogModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(() => {
    try {
      const saved = localStorage.getItem(`fav-${productId}`);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const handleFavoriteClick = () => {
    const nextVal = !isFavorite;
    setIsFavorite(nextVal);
    try {
      localStorage.setItem(`fav-${productId}`, String(nextVal));
      if (alert) {
        alert(nextVal ? 'Přidáno do oblíbených' : 'Odebráno z oblíbených', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Ask Form fields
  const [askEmail, setAskEmail] = useState('');
  const [askPhone, setAskPhone] = useState('');
  const [askMessage, setAskMessage] = useState('');
  const [askGdpr, setAskGdpr] = useState(false);

  // Watchdog Form fields
  const [watchdogType, setWatchdogType] = useState('stock');
  const [watchdogPriceLimit, setWatchdogPriceLimit] = useState('');
  const [watchdogEmail, setWatchdogEmail] = useState('');
  const [watchdogGdpr, setWatchdogGdpr] = useState(false);

  // Local state for reviews & comments (dynamic database)
  const [reviews, setReviews] = useState([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const [comments, setComments] = useState([]);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');

  // Reply state
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [replyAuthor, setReplyAuthor] = useState('');
  const [replyText, setReplyText] = useState('');

  const isAdmin = user && (user.role === 'admin' || user.email === 'info@northvaletcg.eu');

  const formatAuthorName = (name, email) => {
    let displayName = name;
    if (!displayName && email) {
      const localPart = email.split('@')[0];
      displayName = localPart.replace(/[._\-+]/g, ' ');
    }
    if (!displayName) displayName = 'Uživatel';
    
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) {
      const word = parts[0];
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    return `${firstName.charAt(0).toUpperCase() + firstName.slice(1)} ${lastName.charAt(0).toUpperCase()}.`;
  };

  useEffect(() => {
    let active = true;
    const fetchReviewsAndComments = async () => {
      if (!supabase.from) return;
      try {
        const { data: revData, error: revError } = await supabase
          .from('product_reviews')
          .select('*')
          .eq('product_id', productId)
          .order('created_at', { ascending: false });
        
        if (revError) {
          console.warn('Error fetching reviews:', revError);
        } else if (active) {
          setReviews((revData || []).map(r => ({
            id: r.id,
            author: r.author_name,
            rating: r.rating,
            date: new Date(r.created_at).toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US'),
            text: r.comment_text
          })));
        }

        const { data: comData, error: comError } = await supabase
          .from('product_comments')
          .select('*')
          .eq('product_id', productId)
          .order('created_at', { ascending: true });
        
        if (comError) {
          console.warn('Error fetching comments:', comError);
        } else if (active) {
          setComments((comData || []).map(c => ({
            id: c.id,
            author: c.author_name,
            date: new Date(c.created_at).toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US'),
            text: c.comment_text,
            parent_id: c.parent_id,
            is_admin_reply: c.is_admin_reply
          })));
        }
      } catch (err) {
        console.warn('Failed to load reviews/comments from Supabase:', err);
      }
    };

    setReviews([]);
    setComments([]);
    fetchReviewsAndComments();

    return () => {
      active = false;
    };
  }, [productId, lang]);

  const handleOpenReviewModal = () => {
    if (!user || !user.id) {
      if (alert) {
        alert(lang === 'CZ' ? 'Pro napsání recenze se musíte nejprve přihlásit.' : 'You must log in to write a review.', 'warning');
      }
      if (onOpenLogin) {
        onOpenLogin();
      }
      return;
    }
    setReviewAuthor(formatAuthorName(user.name, user.email));
    setIsReviewModalOpen(true);
  };

  const handleOpenCommentModal = () => {
    if (!user || !user.id) {
      if (alert) {
        alert(lang === 'CZ' ? 'Pro položení dotazu se musíte nejprve přihlásit.' : 'You must log in to ask a question.', 'warning');
      }
      if (onOpenLogin) {
        onOpenLogin();
      }
      return;
    }
    setCommentAuthor(formatAuthorName(user.name, user.email));
    setIsCommentModalOpen(true);
  };

  const handleOpenReplyModal = (parentComment) => {
    if (!user || !user.id) {
      if (alert) {
        alert(lang === 'CZ' ? 'Pro odpověď v diskuzi se musíte nejprve přihlásit.' : 'You must log in to reply to the discussion.', 'warning');
      }
      if (onOpenLogin) {
        onOpenLogin();
      }
      return;
    }
    const isUserAdmin = user && (user.role === 'admin' || user.email === 'info@northvaletcg.eu');
    setReplyAuthor(isUserAdmin ? 'Northvale Team' : formatAuthorName(user.name, user.email));
    setReplyingToComment(parentComment);
    setIsReplyModalOpen(true);
  };

  const handleDeleteReview = async (revId) => {
    if (!window.confirm(lang === 'CZ' ? 'Opravdu chcete tuto recenzi smazat?' : 'Are you sure you want to delete this review?')) return;
    try {
      const { error } = await supabase.from('product_reviews').delete().eq('id', revId);
      if (error) throw error;
      setReviews(prev => prev.filter(r => r.id !== revId));
      if (alert) {
        alert(lang === 'CZ' ? 'Recenze byla úspěšně smazána.' : 'Review has been successfully deleted.', 'success');
      }
    } catch (err) {
      console.error(err);
      if (alert) {
        alert(lang === 'CZ' ? 'Chyba při mazání recenze: ' + err.message : 'Error deleting review: ' + err.message, 'error');
      }
    }
  };

  const handleDeleteComment = async (comId) => {
    if (!window.confirm(lang === 'CZ' ? 'Opravdu chcete tento dotaz/odpověď smazat?' : 'Are you sure you want to delete this comment/reply?')) return;
    try {
      const { error } = await supabase.from('product_comments').delete().eq('id', comId);
      if (error) throw error;
      setComments(prev => prev.filter(c => c.id !== comId && c.parent_id !== comId));
      if (alert) {
        alert(lang === 'CZ' ? 'Komentář byl úspěšně smazán.' : 'Comment has been successfully deleted.', 'success');
      }
    } catch (err) {
      console.error(err);
      if (alert) {
        alert(lang === 'CZ' ? 'Chyba při mazání komentáře: ' + err.message : 'Error deleting comment: ' + err.message, 'error');
      }
    }
  };



  const product = products.find(p => p.id === productId);

  if (!product) {
    return (
      <div style={styles.errorContainer} className="glass-panel">
        <h3>{lang === 'CZ' ? 'Karta nebyla nalezena' : 'Card not found'}</h3>
        <button className="btn btn-primary" onClick={() => { if (setFilters) setFilters({}); setActivePage('singles-catalog'); }}>
          {lang === 'CZ' ? 'Zpět do katalogu' : 'Back to catalog'}
        </button>
      </div>
    );
  }

  // React state for dynamic selection of variant parameters
  const initialVariant = product.variants && product.variants.length > 0
    ? product.variants[0]
    : { id: product.id, price: product.price || 0, stock: product.stock || 0, condition: 'NM', lang: 'EN', foil: false };

  const [selectedCondition, setSelectedCondition] = useState(initialVariant.condition);
  const [selectedLang, setSelectedLang] = useState(initialVariant.lang);
  const [selectedFoil, setSelectedFoil] = useState(initialVariant.foil);

  // Sync state if product changes
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      setSelectedCondition(product.variants[0].condition);
      setSelectedLang(product.variants[0].lang);
      setSelectedFoil(product.variants[0].foil);
    } else {
      setSelectedCondition('NM');
      setSelectedLang('EN');
      setSelectedFoil(false);
    }
    setQty(1);
  }, [productId, products]);

  // Find exact matching variant
  let activeVariant = product.variants && product.variants.length > 0
    ? product.variants.find(v => v.condition === selectedCondition && v.lang === selectedLang && v.foil === selectedFoil)
    : null;

  // Fallback to avoid crashes
  if (!activeVariant && product.variants && product.variants.length > 0) {
    activeVariant = product.variants.find(v => v.condition === selectedCondition)
      || product.variants.find(v => v.lang === selectedLang)
      || product.variants[0];
  }

  if (!activeVariant) {
    activeVariant = { id: product.id, price: product.price || 0, stock: product.stock || 0, condition: 'NM', lang: 'EN', foil: false };
  }

  const price = activeVariant.price;
  const stock = activeVariant.stock;
  const condition = activeVariant.condition;
  const variantLang = activeVariant.lang;
  const foil = activeVariant.foil;

  // Auto-sync handlers to prevent invalid states
  const handleConditionChange = (cond) => {
    setSelectedCondition(cond);
    const matchingVariant = product.variants.find(v => v.condition === cond);
    if (matchingVariant) {
      setSelectedLang(matchingVariant.lang);
      setSelectedFoil(matchingVariant.foil);
    }
  };

  const handleLangChange = (lg) => {
    setSelectedLang(lg);
    const matchingVariant = product.variants.find(v => v.condition === selectedCondition && v.lang === lg) 
      || product.variants.find(v => v.lang === lg);
    if (matchingVariant) {
      setSelectedCondition(matchingVariant.condition);
      setSelectedFoil(matchingVariant.foil);
    }
  };

  const handleFoilChange = (fl) => {
    setSelectedFoil(fl);
    const matchingVariant = product.variants.find(v => v.condition === selectedCondition && v.lang === selectedLang && v.foil === fl)
      || product.variants.find(v => v.foil === fl);
    if (matchingVariant) {
      setSelectedCondition(matchingVariant.condition);
      setSelectedLang(matchingVariant.lang);
    }
  };

  const availableConditions = product.variants ? [...new Set(product.variants.map(v => v.condition))] : [];
  const availableLangs = product.variants ? [...new Set(product.variants.map(v => v.lang))] : [];
  const availableFoils = product.variants ? [...new Set(product.variants.map(v => v.foil))] : [];

  const images = [
    product.image,
    ...(product.additionalImages || []),
    product.backImage || 'https://images.pokemontcg.io/unbroken_bonds/back.png'
  ].filter(Boolean);

  const activeImage = images[currentImageIndex] || product.image;

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Custom Zoom Magnifier implementation for Lightbox Modal
  const handleLightboxMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setLightboxZoomStyle({
      display: 'block',
      backgroundImage: `url(${activeImage})`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: `${width * 2.2}px ${height * 2.2}px` // 2.2x zoom
    });
  };

  const handleLightboxMouseLeave = () => {
    setLightboxZoomStyle({ display: 'none' });
  };

  // Filter related and similar products
  const relatedSingles = products
    .filter(p => p.type === 'single' && p.game === product.game && p.id !== product.id)
    .slice(0, 8);

  const similarSingles = products
    .filter(p => (p.type === 'single' || (FEATURE_FLAGS.showSlabs && p.type === 'slab')) && p.id !== product.id && !relatedSingles.some(r => r.id === p.id))
    .slice(0, 8);

  // Helper function to get card codes


  // Smooth scroll handler for tabs
  const scrollToSection = (id) => {
    setActiveTab(id);
    setTimeout(() => {
      const element = document.querySelector('.product-tabs-wrapper');
      if (element) {
        const offset = 80; // offset matches sticky header navbar
        const elementPosition = element.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: elementPosition - offset,
          behavior: 'smooth'
        });
      }
    }, 50);
  };



  // Action submissions
  const handleAskSubmit = (e) => {
    e.preventDefault();
    if (alert) {
      alert(lang === 'CZ' ? 'Váš dotaz byl úspěšně odeslán prodejci. Brzy se Vám ozveme.' : 'Your inquiry has been successfully sent to the seller. We will get back to you soon.', 'success');
    }
    setAskEmail('');
    setAskPhone('');
    setAskMessage('');
    setAskGdpr(false);
    setIsAskModalOpen(false);
  };

  const handleWatchdogSubmit = (e) => {
    e.preventDefault();
    if (alert) {
      alert(lang === 'CZ' ? 'Hlídací pes byl nastaven. Budete upozorněni e-mailem.' : 'Watchdog has been set. You will be notified by email.', 'success');
    }
    setWatchdogPriceLimit('');
    setWatchdogEmail('');
    setWatchdogGdpr(false);
    setIsWatchdogModalOpen(false);
  };

  const handleShareClick = () => {
    navigator.clipboard.writeText(window.location.href);
    if (alert) {
      alert(lang === 'CZ' ? 'Odkaz na tuto kartu byl zkopírován do schránky.' : 'Link to this card has been copied to your clipboard.', 'success');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user || !user.id) {
      if (alert) {
        alert(lang === 'CZ' ? 'Pro napsání recenze se musíte nejprve přihlásit.' : 'You must log in to write a review.', 'warning');
      }
      return;
    }
    if (reviewText.trim().length > 300) {
      if (alert) {
        alert(lang === 'CZ' ? 'Recenze může mít maximálně 300 znaků.' : 'Review can have a maximum of 300 characters.', 'warning');
      }
      return;
    }

    try {
      if (!supabase.from) throw new Error('Supabase client is not initialized');
      
      const formattedName = formatAuthorName(user.name, user.email);
      const { data, error } = await supabase
        .from('product_reviews')
        .insert([{
          product_id: productId,
          user_id: user.id,
          author_name: formattedName,
          rating: reviewRating,
          comment_text: reviewText.trim()
        }])
        .select();

      if (error) throw error;

      const dateStr = new Date().toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US');
      const newRev = {
        id: data && data[0] ? data[0].id : null,
        author: formattedName,
        rating: reviewRating,
        date: dateStr,
        text: reviewText.trim()
      };
      setReviews([newRev, ...reviews]);

      // Call the Edge Function to send email alert
      try {
        await supabase.functions.invoke('send-support-notification', {
          body: {
            type: 'review',
            productName: product.name,
            authorName: formattedName,
            text: reviewText.trim(),
            rating: reviewRating,
            productId: productId
          }
        });
      } catch (emailErr) {
        console.warn('Failed to send support email notification:', emailErr);
      }

      if (alert) {
        alert(lang === 'CZ' ? 'Děkujeme! Vaše hodnocení bylo úspěšně přidáno.' : 'Thank you! Your review has been successfully added.', 'success');
      }
      setReviewAuthor('');
      setReviewRating(5);
      setReviewText('');
      setIsReviewModalOpen(false);
      scrollToSection('hodnoceni');
    } catch (err) {
      console.error(err);
      if (alert) {
        alert(lang === 'CZ' ? 'Chyba při ukládání recenze: ' + err.message : 'Error saving review: ' + err.message, 'error');
      }
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!user || !user.id) {
      if (alert) {
        alert(lang === 'CZ' ? 'Pro položení dotazu se musíte nejprve přihlásit.' : 'You must log in to ask a question.', 'warning');
      }
      return;
    }
    if (commentText.trim().length > 300) {
      if (alert) {
        alert(lang === 'CZ' ? 'Dotaz může mít maximálně 300 znaků.' : 'Question can have a maximum of 300 characters.', 'warning');
      }
      return;
    }

    try {
      if (!supabase.from) throw new Error('Supabase client is not initialized');

      const formattedName = formatAuthorName(user.name, user.email);
      const { data, error } = await supabase
        .from('product_comments')
        .insert([{
          product_id: productId,
          user_id: user.id,
          author_name: formattedName,
          comment_text: commentText.trim()
        }])
        .select();

      if (error) throw error;

      const dateStr = new Date().toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US');
      const newComm = {
        id: data && data[0] ? data[0].id : null,
        author: formattedName,
        date: dateStr,
        text: commentText.trim(),
        parent_id: null,
        is_admin_reply: false
      };
      setComments([...comments, newComm]);

      // Call the Edge Function to send email alert
      try {
        await supabase.functions.invoke('send-support-notification', {
          body: {
            type: 'comment',
            productName: product.name,
            authorName: formattedName,
            text: commentText.trim(),
            productId: productId
          }
        });
      } catch (emailErr) {
        console.warn('Failed to send support email notification:', emailErr);
      }

      if (alert) {
        alert(lang === 'CZ' ? 'Komentář byl úspěšně přidán do diskuze.' : 'Comment has been successfully added to the discussion.', 'success');
      }
      setCommentAuthor('');
      setCommentText('');
      setIsCommentModalOpen(false);
      scrollToSection('diskuse');
    } catch (err) {
      console.error(err);
      if (alert) {
        alert(lang === 'CZ' ? 'Chyba při ukládání dotazu: ' + err.message : 'Error saving comment: ' + err.message, 'error');
      }
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!user || !user.id) {
      if (alert) {
        alert(lang === 'CZ' ? 'Pro odeslání odpovědi se musíte nejprve přihlásit.' : 'You must log in to reply.', 'warning');
      }
      return;
    }
    if (replyText.trim().length > 300) {
      if (alert) {
        alert(lang === 'CZ' ? 'Odpověď může mít maximálně 300 znaků.' : 'Reply can have a maximum of 300 characters.', 'warning');
      }
      return;
    }

    try {
      if (!supabase.from) throw new Error('Supabase client is not initialized');

      const isUserAdmin = user && (user.role === 'admin' || user.email === 'info@northvaletcg.eu');
      const authorName = isUserAdmin ? 'Northvale Team' : formatAuthorName(user.name, user.email);

      const { data, error } = await supabase
        .from('product_comments')
        .insert([{
          product_id: productId,
          user_id: user.id,
          author_name: authorName,
          comment_text: replyText.trim(),
          parent_id: replyingToComment.id,
          is_admin_reply: isUserAdmin
        }])
        .select();

      if (error) throw error;

      const dateStr = new Date().toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US');
      const newReplyObj = {
        id: data && data[0] ? data[0].id : null,
        author: authorName,
        date: dateStr,
        text: replyText.trim(),
        parent_id: replyingToComment.id,
        is_admin_reply: isUserAdmin
      };

      setComments([...comments, newReplyObj]);

      // Call the Edge Function to send email alert
      try {
        await supabase.functions.invoke('send-support-notification', {
          body: {
            type: 'reply',
            productName: product.name,
            authorName: authorName,
            text: replyText.trim(),
            productId: productId
          }
        });
      } catch (emailErr) {
        console.warn('Failed to send support email notification:', emailErr);
      }

      if (alert) {
        alert(lang === 'CZ' ? 'Odpověď byla úspěšně přidána.' : 'Reply has been successfully added.', 'success');
      }
      setReplyText('');
      setReplyingToComment(null);
      setIsReplyModalOpen(false);
    } catch (err) {
      console.error(err);
      if (alert) {
        alert(lang === 'CZ' ? 'Chyba při ukládání odpovědi: ' + err.message : 'Error saving reply: ' + err.message, 'error');
      }
    }
  };
  const getPriceHistory = () => {
    const months = lang === 'CZ'
      ? ['Čec', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro', 'Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čer']
      : ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const seed = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const history = [];
    let tempPrice = price;
    for (let i = 11; i >= 0; i--) {
      history.unshift({
        month: months[i],
        price: Math.round(tempPrice)
      });
      const changePercent = 0.965 + ((seed + i) % 5) * 0.01;
      tempPrice = tempPrice * changePercent;
    }
    history[11].price = price;
    return history;
  };

  let descBlocks = [];
  try {
    if (product.desc && product.desc.startsWith('[')) {
      descBlocks = JSON.parse(product.desc);
    }
  } catch (e) {
    console.error("Failed to parse description blocks", e);
  }
  if (!Array.isArray(descBlocks) || descBlocks.length === 0) {
    descBlocks = [{ id: 'b-default', type: 'text', value: product.desc || '' }];
  }

  const firstBlockText = descBlocks.find(b => b.type === 'text')?.value || '';
  const fallbackShortDesc = firstBlockText ? (firstBlockText.split('.').slice(0, 2).filter(Boolean).join('. ') + '.') : '';

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    if (ratingCounts[r.rating] !== undefined) {
      ratingCounts[r.rating]++;
    }
  });

  const getPercentage = (stars) => {
    if (reviews.length === 0) return 0;
    return Math.round((ratingCounts[stars] / reviews.length) * 100);
  };

  const renderAverageStars = (ratingVal) => {
    const numeric = parseFloat(ratingVal);
    if (isNaN(numeric) || numeric === 0) return '☆☆☆☆☆';
    const rounded = Math.round(numeric);
    return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
  };

  return (
    <div style={styles.container} className="fade-in">
      <h1 className="sr-only">{product.name} - Detail karty - NORTHVALE</h1>

      {/* Breadcrumbs Navigation */}
      <div className="container">
        <nav className="breadcrumbs-nav" style={isMobile ? { marginBottom: '28px' } : undefined}>
        <span className="breadcrumb-item" onClick={() => { setActivePage('home'); }}>
          {t('common.home')}
        </span>
        <span className="breadcrumb-separator">/</span>
        <span 
          className="breadcrumb-item" 
          onClick={() => { 
            if (setFilters) setFilters({ game: product.game }); 
            setActivePage('singles-catalog'); 
          }}
        >
          {product.game}
        </span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">
          {product.name}
        </span>
      </nav>
      </div>

      <div className="container">
        <div style={styles.layout}>
        {/* Mobile-only Header */}
        {isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginBottom: '24px' }}>
            <h2 style={{ ...styles.cardTitle, margin: 0, padding: 0, fontSize: '24px' }}>{product.name}</h2>
            <div className="rating-stars-container" style={{ marginTop: 0 }}>
              <span className="rating-star-gold">{'★'.repeat(5)}</span>
              <span className="rating-count-link" onClick={() => scrollToSection('hodnoceni')}>
                ({reviews.length} {lang === 'CZ' ? 'hodnocení' : 'reviews'})
              </span>
            </div>
          </div>
        )}

        {/* Left Column: Clean Image Gallery */}
        <div className="product-detail-left-col" style={{ ...styles.leftCol, marginBottom: isMobile ? '12px' : '0px' }}>
          <div className="detail-gallery-wrapper">
            {/* Left Nav Arrow */}
            {images.length > 1 && (
              <button type="button" className="gallery-nav-btn gallery-nav-left" onClick={handlePrevImage} aria-label={lang === 'CZ' ? 'Předchozí obrázek' : 'Previous image'}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="20" y1="12" x2="4" y2="12" />
                  <polyline points="10 18 4 12 10 6" />
                </svg>
              </button>
            )}

            <div 
              className="detail-clean-image-container"
              onClick={() => setIsLightboxOpen(true)}
              style={{ cursor: 'zoom-in' }}
            >
              <img 
                src={activeImage} 
                alt={product.name} 
              />
            </div>

            {/* Right Nav Arrow */}
            {images.length > 1 && (
              <button type="button" className="gallery-nav-btn gallery-nav-right" onClick={handleNextImage} aria-label={lang === 'CZ' ? 'Další obrázek' : 'Next image'}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <polyline points="14 6 20 12 14 18" />
                </svg>
              </button>
            )}
          </div>

          {/* Indicator Lines */}
          {images.length > 1 && (
            <div style={styles.indicators}>
              {images.map((_, idx) => (
                <span 
                  key={idx} 
                  style={{
                    ...styles.dot, 
                    width: currentImageIndex === idx ? '32px' : '16px',
                    backgroundColor: currentImageIndex === idx ? 'var(--color-gold)' : 'rgba(255,255,255,0.2)'
                  }}
                  onClick={() => setCurrentImageIndex(idx)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Title, Ratings, Pricing, Buy Action */}
        <div className="product-detail-right-col" style={{ ...styles.rightCol, background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
          {!isMobile && <h2 style={styles.cardTitle}>{product.name}</h2>}
          
          {/* Rating stars and count link */}
          {!isMobile && (
            <div className="rating-stars-container">
              <span className="rating-star-gold">{'★'.repeat(5)}</span>
              <span className="rating-count-link" onClick={() => scrollToSection('hodnoceni')}>
                ({reviews.length} {lang === 'CZ' ? 'hodnocení' : 'reviews'})
              </span>
            </div>
          )}

          {/* Short description with more info link */}
          {!isMobile && (
            <div className="product-short-desc">
              {parseFormattedText(product.shortDesc || fallbackShortDesc)}
              <span className="more-info-link" onClick={() => scrollToSection('popis')} style={{ display: 'inline-block', marginLeft: '6px' }}>
                {lang === 'CZ' ? ' Víc informací' : ' More info'}
              </span>
            </div>
          )}

          {/* Variant Selectors */}
          {product.variants && product.variants.length > 1 && (
            <div style={styles.variantSelectorsContainer}>
              <h4 style={styles.variantSelectorsTitle}>
                {lang === 'CZ' ? 'Výběr varianty karty:' : 'Select Card Variant:'}
              </h4>
              <div style={styles.selectorsGrid}>
                {/* Condition Selector */}
                {availableConditions.length > 0 && (
                  <div style={styles.selectorField}>
                    <label style={styles.selectorLabel}>{lang === 'CZ' ? 'Stav karty:' : 'Card Condition:'}</label>
                    <select 
                      value={selectedCondition} 
                      onChange={(e) => handleConditionChange(e.target.value)}
                      style={styles.variantSelect}
                    >
                      {availableConditions.map(cond => (
                        <option key={cond} value={cond}>
                          {cond}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Language Selector */}
                {availableLangs.length > 0 && (
                  <div style={styles.selectorField}>
                    <label style={styles.selectorLabel}>{lang === 'CZ' ? 'Jazyk karty:' : 'Card Language:'}</label>
                    <select 
                      value={selectedLang} 
                      onChange={(e) => handleLangChange(e.target.value)}
                      style={styles.variantSelect}
                    >
                      {availableLangs.map(lg => (
                        <option key={lg} value={lg}>
                          {lg === 'EN' ? (lang === 'CZ' ? 'Angličtina (EN)' : 'English (EN)') : lg === 'JP' ? (lang === 'CZ' ? 'Japonština (JP)' : 'Japanese (JP)') : lg}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Foil Selector */}
                {availableFoils.length > 0 && (
                  <div style={styles.selectorField}>
                    <label style={styles.selectorLabel}>{lang === 'CZ' ? 'Provedení:' : 'Finish:'}</label>
                    <select 
                      value={selectedFoil ? 'foil' : 'non-foil'} 
                      onChange={(e) => handleFoilChange(e.target.value === 'foil')}
                      style={styles.variantSelect}
                    >
                      {availableFoils.map(fl => (
                        <option key={fl ? 'foil' : 'non-foil'} value={fl ? 'foil' : 'non-foil'}>
                          {fl ? (lang === 'CZ' ? 'Foil (lesklá)' : 'Foil (shiny)') : (lang === 'CZ' ? 'Non-Foil (klasická)' : 'Non-Foil (classic)')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          <hr className="product-detail-divider" />

          <div className="product-price-purchase-box">
            <div className="price-stock-delivery-group">
              {/* Price displaying */}
              <div className="product-price-section">
                <div className="product-price-vat">
                  {price.toLocaleString('cs-CZ')} Kč
                </div>
                <div className="product-price-ex-vat">
                  {lang === 'CZ' ? 'Bez DPH:' : 'Excl. VAT:'} {Math.round(price / 1.21).toLocaleString('cs-CZ')} Kč
                </div>
              </div>

              {/* Stock status */}
              <div className="product-stock-delivery-wrapper">
                <div className={`product-stock-status ${product.preorder ? 'in-stock' : (stock > 0 ? 'in-stock' : 'out-of-stock')}`}>
                  <span style={{ fontSize: '20px', lineHeight: 1, color: product.preorder ? 'var(--color-gold)' : (stock > 0 ? 'var(--color-green)' : 'var(--color-red)') }}>●</span>
                  {product.preorder ? (
                    <span style={{ color: 'var(--nv-gold, #fdbd16)', fontWeight: 'bold' }}>
                      {lang === 'CZ' ? 'Předobjednávka' : 'Pre-order'}
                    </span>
                  ) : (
                    stock > 0 ? (lang === 'CZ' ? `Skladem (${stock} ks)` : `In Stock (${stock} pcs)`) : (lang === 'CZ' ? 'Na objednávku' : 'Special Order')
                  )}
                </div>
                {product.preorder && product.releaseDate && (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>📅</span>
                    <span>{lang === 'CZ' ? `Očekávané vydání: ${product.releaseDate}` : `Expected release: ${product.releaseDate}`}</span>
                    <button 
                      type="button"
                      onClick={() => {
                        sessionStorage.setItem('scrollToPreorderInfo', 'true');
                        setActivePage('gdpr-vop', 'doprava');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: 'var(--nv-gold, #fdbd16)',
                        textDecoration: 'underline',
                        fontSize: '11px',
                        fontWeight: '600',
                        fontFamily: 'inherit',
                        marginLeft: '4px'
                      }}
                    >
                      {lang === 'CZ' ? 'Jak to funguje?' : 'How does it work?'}
                    </button>
                  </div>
                )}
                <span className="product-delivery-link" onClick={() => setActivePage('community')}>
                  {lang === 'CZ' ? 'Možnosti doručení' : 'Delivery options'}
                </span>
              </div>
            </div>

            <div className="purchase-actions-group">
              {/* Quantity and Cart Button */}
              <div className="product-purchase-row">
                <div className="product-quantity-selector">
                  <button className="qty-btn" onClick={() => setQty(prev => Math.max(1, prev - 1))}>−</button>
                  <input type="number" className="qty-input" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} min="1" max={stock > 0 ? stock : 10} />
                  <button className="qty-btn" onClick={() => setQty(prev => Math.min(stock > 0 ? stock : 10, prev + 1))}>+</button>
                </div>

                <button 
                  className="product-add-to-cart-btn"
                  disabled={stock === 0 && !product.preorder}
                  onClick={() => addToCart(activeVariant, product, qty)}
                  style={{
                    backgroundColor: product.preorder ? 'var(--nv-gold, #fdbd16)' : undefined,
                    color: product.preorder ? '#000' : undefined,
                    fontWeight: product.preorder ? '700' : undefined
                  }}
                >
                  {product.preorder ? (lang === 'CZ' ? 'Předobjednat' : 'Pre-order') : t('common.addToCart')}
                </button>
              </div>

              {/* Actions Buttons Grid */}
              <div className="product-actions-grid">
                <button className="product-action-btn" onClick={handleFavoriteClick} title="Oblíbené" aria-label="Oblíbené">
                  <svg viewBox="0 0 24 24" fill={isFavorite ? 'var(--color-gold)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>{t('Navbar.favorites')}</span>
                </button>
                <button className="product-action-btn" onClick={() => setIsAskModalOpen(true)} title="Zeptat se" aria-label="Zeptat se">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>{lang === 'CZ' ? 'Zeptat se' : 'Ask a question'}</span>
                </button>
                <button className="product-action-btn" onClick={() => setIsWatchdogModalOpen(true)} title="Upozornění" aria-label="Upozornění">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <span>{lang === 'CZ' ? 'Upozornění' : 'Watchdog'}</span>
                </button>
                <button className="product-action-btn" onClick={handleShareClick} title="Sdílet" aria-label="Sdílet">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  <span>{lang === 'CZ' ? 'Sdílet' : 'Share'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="detail-trust-badges">
            <div className="detail-trust-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="detail-badge-icon-svg">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <div className="detail-badge-text">
                <h4 className="detail-badge-title">{lang === 'CZ' ? 'Doprava zdarma' : 'Free Shipping'}</h4>
                <p className="detail-badge-desc">{lang === 'CZ' ? 'nad 1 000 Kč' : 'over 1,000 CZK'}</p>
              </div>
            </div>
            <div className="detail-trust-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="detail-badge-icon-svg">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
                <line x1="12" y1="2" x2="12" y2="4" />
              </svg>
              <div className="detail-badge-text">
                <h4 className="detail-badge-title">{lang === 'CZ' ? 'Rychlost' : 'Fast Dispatch'}</h4>
                <p className="detail-badge-desc">{lang === 'CZ' ? 'Odesíláme do 24h' : 'Within 24 hours'}</p>
              </div>
            </div>
            <div className="detail-trust-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="detail-badge-icon-svg">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 11 11 13 15 9" />
              </svg>
              <div className="detail-badge-text">
                <h4 className="detail-badge-title">{lang === 'CZ' ? '100% Originál' : '100% Genuine'}</h4>
                <p className="detail-badge-desc">{lang === 'CZ' ? 'Od distributorů' : 'From distributors'}</p>
              </div>
            </div>
            <div className="detail-trust-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="detail-badge-icon-svg">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <div className="detail-badge-text">
                <h4 className="detail-badge-title">{lang === 'CZ' ? 'Bezpečná platba' : 'Secure Payment'}</h4>
                <p className="detail-badge-desc">{lang === 'CZ' ? 'Karta, bankovní převod' : 'Card, bank transfer'}</p>
              </div>
            </div>
          </div>

          {product.investment && (
            <div style={{
              background: 'rgba(253, 189, 22, 0.03)',
              border: '1px solid rgba(253, 189, 22, 0.15)',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: '20px', color: 'var(--nv-gold, #fdbd16)', lineHeight: '1' }}>📈</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--nv-gold, #fdbd16)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {lang === 'CZ' ? 'Investiční doporučení' : 'Investment Advice'}
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
                  {lang === 'CZ' 
                    ? 'Tato karta představuje zajímavou sběratelskou a investiční příležitost. Pro zachování její hodnoty a stavu (condition) doporučujeme kartu uchovávat v ochranné fólii (sleeve) a pevné toploader/magnetic case krabičce a nevystavovat ji slunečnímu záření.'
                    : 'This card represents a great collecting and investment opportunity. To maintain its value and condition, we recommend keeping the card in a protective sleeve and a rigid toploader/magnetic case, away from direct sunlight.'}
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
      </div>

      {/* Sticky Tab Bar */}
      <div className="product-tabs-wrapper">
        <div className="product-tabs-nav">
          <button 
            className={`product-tab-btn ${activeTab === 'popis' ? 'active' : ''}`} 
            onClick={() => scrollToSection('popis')}
          >
            <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            <span>{lang === 'CZ' ? 'Popis a parametry' : 'Description & Specs'}</span>
          </button>
          <button 
            className={`product-tab-btn ${activeTab === 'hodnoceni' ? 'active' : ''}`} 
            onClick={() => scrollToSection('hodnoceni')}
          >
            <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{lang === 'CZ' ? 'Hodnocení' : 'Reviews'}</span>
          </button>
          <button 
            className={`product-tab-btn ${activeTab === 'diskuse' ? 'active' : ''}`} 
            onClick={() => scrollToSection('diskuse')}
          >
            <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2v4l-4-4H9a1.9 1.9 0 0 1-2-2" />
              <path d="M3 14V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H3z" />
            </svg>
            <span>{lang === 'CZ' ? 'Diskuze' : 'Discussion'}</span>
          </button>
          <button 
            className={`product-tab-btn ${activeTab === 'souvisejici' ? 'active' : ''}`} 
            onClick={() => scrollToSection('souvisejici')}
          >
            <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>{lang === 'CZ' ? 'Související produkty' : 'Related Products'}</span>
          </button>
          <button 
            className={`product-tab-btn ${activeTab === 'podobne' ? 'active' : ''}`} 
            onClick={() => scrollToSection('podobne')}
          >
            <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>{lang === 'CZ' ? 'Podobné produkty' : 'Similar Products'}</span>
          </button>
        </div>
      </div>

    <div className="container">
      {/* Popis Section */}
      {activeTab === 'popis' && (() => {
        const isSlab = product.type === 'slab';
        
        // Helper formatting
        const foilText = foil ? 'Foil' : 'Non-Foil';
        const foilLongText = foil 
          ? (lang === 'CZ' ? 'Foil (Třpytivá) ✨' : 'Foil (Shiny) ✨') 
          : (lang === 'CZ' ? 'Non-Foil (Matná)' : 'Non-Foil (Matte)');
        const langText = variantLang === 'JP' 
          ? (lang === 'CZ' ? 'Japonština 🇯🇵' : 'Japanese 🇯🇵') 
          : variantLang === 'CN' 
            ? (lang === 'CZ' ? 'Čínština 🇨🇳' : 'Chinese 🇨🇳') 
            : (lang === 'CZ' ? 'Angličtina 🇬🇧' : 'English 🇬🇧');
        const conditionFull = condition === 'NM' ? 'Near Mint (NM)' : condition === 'EX' ? 'Excellent (EX)' : condition === 'GD' ? 'Good (GD)' : condition === 'LP' ? 'Light Played (LP)' : condition === 'PL' ? 'Played (PL)' : 'Poor (PO)';
        
        // Mapped details from product (strict truthiness, no fallback mocks)
        const yearReleased = (product.year !== undefined && product.year !== null && product.year !== '') ? Number(product.year) : null;
        const setCode = product.setCode || null;
        const elementColor = product.element || null;
        const stageLevel = product.stage || null;
        const illustrator = product.illustrator || null;

        return (
          <section id="popis" className="detail-section">
            <div className="tab-popis-layout">
              <div className="tab-popis-left-col">
                  <h3 className="detail-section-title" style={{ marginTop: 0 }}>{lang === 'CZ' ? 'Popis produktu' : 'Product Description'}</h3>
                  <div className="tab-popis-text">
                    {descBlocks.map(block => {
                      if (block.type === 'text') {
                        return (
                          <div key={block.id}>
                            {parseFormattedText(block.value)}
                          </div>
                        );
                      } else if (block.type === 'image') {
                        return (
                          <div key={block.id} className="desc-block-image-container" style={{ margin: '20px 0', textAlign: 'left' }}>
                            <img src={block.value} alt="" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} />
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>


              </div>
              
              <div className="tab-popis-right-col">
                <div className="custom-detail-panel" style={{ padding: '32px', width: '100%', boxSizing: 'border-box' }}>
                  <h3 className="detail-section-title" style={{ marginTop: 0 }}>{lang === 'CZ' ? 'Parametry karty' : 'Card Specs'}</h3>
                  {!isSlab ? (
                    <table className="tab-popis-specs-table">
                      <tbody>
                        {product.game && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Značka / Hra' : 'Game'}</td>
                            <td>{product.game}</td>
                          </tr>
                        )}
                        {product.edition && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Edice / Sada' : 'Expansion / Set'}</td>
                            <td>{product.edition}</td>
                          </tr>
                        )}
                        {setCode && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Zkratka edice' : 'Set Code'}</td>
                            <td>{setCode}</td>
                          </tr>
                        )}
                        {product.rarity && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Rarita' : 'Rarity'}</td>
                            <td>{product.rarity}</td>
                          </tr>
                        )}
                        {getCardCode(product) && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Sběratelské číslo' : 'Collector Number'}</td>
                            <td>{getCardCode(product)}</td>
                          </tr>
                        )}
                        {conditionFull && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Stav karty' : 'Card Condition'}</td>
                            <td>{conditionFull}</td>
                          </tr>
                        )}
                        {langText && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Jazyk' : 'Language'}</td>
                            <td>{langText}</td>
                          </tr>
                        )}
                        {foilLongText && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Provedení (Finish)' : 'Foiling / Finish'}</td>
                            <td>{foilLongText}</td>
                          </tr>
                        )}
                        {elementColor && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Typ / Element' : 'Type / Element'}</td>
                            <td>{elementColor}</td>
                          </tr>
                        )}
                        {product.game === 'Pokémon' && stageLevel && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Stádium vývoje' : 'Stage'}</td>
                            <td>{stageLevel}</td>
                          </tr>
                        )}
                        {illustrator && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Ilustrátor' : 'Illustrator'}</td>
                            <td>{illustrator}</td>
                          </tr>
                        )}
                        {yearReleased && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Rok vydání' : 'Year Released'}</td>
                            <td>{yearReleased}</td>
                          </tr>
                        )}
                        {product.customParams && Array.isArray(product.customParams) && product.customParams.map((cp, idx) => (
                          <tr key={idx}>
                            <td>{cp.label}</td>
                            <td>{cp.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="tab-popis-specs-table">
                      <tbody>
                        {product.game && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Značka / Hra' : 'Game'}</td>
                            <td>{product.game}</td>
                          </tr>
                        )}
                        {product.edition && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Edice / Sada' : 'Expansion / Set'}</td>
                            <td>{product.edition}</td>
                          </tr>
                        )}
                        {product.rarity && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Rarita' : 'Rarity'}</td>
                            <td>{product.rarity}</td>
                          </tr>
                        )}
                        {langText && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Jazyk' : 'Language'}</td>
                            <td>{langText}</td>
                          </tr>
                        )}
                        {product.company && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Gradingová firma' : 'Grading Company'}</td>
                            <td><strong>{product.company}</strong></td>
                          </tr>
                        )}
                        {product.grade && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Výsledná známka' : 'Grade'}</td>
                            <td><strong>{product.grade} ({product.grade === 10 ? 'Gem Mint' : 'Gem Mint'})</strong></td>
                          </tr>
                        )}
                        {product.certNumber && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Certifikační číslo' : 'Certificate Number'}</td>
                            <td><code>{product.certNumber}</code></td>
                          </tr>
                        )}
                        {product.customParams && Array.isArray(product.customParams) && product.customParams.map((cp, idx) => (
                          <tr key={idx}>
                            <td>{cp.label}</td>
                            <td>{cp.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })()}


      {/* Hodnocení Section */}
      {activeTab === 'hodnoceni' && (
        <section id="hodnoceni" className="detail-section custom-detail-panel">
          <div className="reviews-dashboard">
            <div className="reviews-dashboard-score">
              <div className="reviews-average-number">{averageRating}</div>
              <div className="reviews-average-stars">{renderAverageStars(averageRating)}</div>
              <div className="reviews-average-count">
                {lang === 'CZ' ? `Založeno na ${reviews.length} hodnoceních` : `Based on ${reviews.length} reviews`}
              </div>
            </div>
            
            <div className="reviews-dashboard-bars">
              {[5, 4, 3, 2, 1].map(stars => {
                const pct = getPercentage(stars);
                return (
                  <div key={stars} className="reviews-bar-row">
                    <span className="bar-label">{stars} ★</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }}></div></div>
                    <span className="bar-percentage">{pct}%</span>
                  </div>
                );
              })}
            </div>

            <div className="reviews-dashboard-action">
              <p className="action-text">
                {lang === 'CZ' 
                  ? 'Podělte se o své zkušenosti s tímto produktem a pomozte ostatním sběratelům.' 
                  : 'Share your experience with this product and help other collectors.'}
              </p>
              <button className="btn btn-primary reviews-add-btn" onClick={handleOpenReviewModal}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                {lang === 'CZ' ? 'Napsat recenzi' : 'Write a review'}
              </button>
            </div>
          </div>

          {reviews.length > 0 ? (
            <div className="reviews-list">
              {reviews.map((rev, i) => {
                const initials = rev.author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                return (
                  <div key={rev.id || i} className="premium-review-card">
                    <div className="review-avatar-col">
                      <div className="review-avatar">{initials}</div>
                    </div>
                    <div className="review-main-col">
                      <div className="review-meta-row">
                        <div className="review-author-group">
                          <span className="review-author">{rev.author}</span>
                          <span className="verified-badge">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '2px' }}>
                              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            {lang === 'CZ' ? 'Ověřený nákup' : 'Verified Purchase'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="review-date">{rev.date}</span>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteReview(rev.id)}
                              className="review-delete-btn"
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              ✕ {lang === 'CZ' ? 'Smazat' : 'Delete'}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="review-stars-row">
                        {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                      </div>
                      <p className="review-text">{rev.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-reviews">
              {lang === 'CZ' ? 'K tomuto produktu zatím nebyla přidána žádná hodnocení. Buďte první!' : 'No reviews have been added for this product yet. Be the first!'}
            </div>
          )}
        </section>
      )}

      {/* Diskuze Section */}
      {activeTab === 'diskuse' && (
        <section id="diskuse" className="detail-section custom-detail-panel">
          <div className="discussions-dashboard">
            <div className="discussions-dashboard-info">
              <h3 className="detail-section-title" style={{ margin: 0 }}>
                {lang === 'CZ' ? `Diskuze k produktu (${comments.length})` : `Product Discussion (${comments.length})`}
              </h3>
              <p className="discussions-dashboard-subtitle">
                {lang === 'CZ' ? 'Máte k produktu nějaký dotaz? Náš tým Vám rád odpoví.' : 'Do you have any questions about this product? Our team will gladly answer them.'}
              </p>
            </div>
            <button className="btn btn-primary discussions-add-btn" onClick={handleOpenCommentModal}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {lang === 'CZ' ? 'Položit dotaz' : 'Ask a question'}
            </button>
          </div>

          {comments.filter(c => !c.parent_id).length > 0 ? (
            <div className="comments-list-wrapper">
              {comments.filter(c => !c.parent_id).map((comm) => {
                const initials = comm.author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                const repliesList = comments.filter(c => c.parent_id === comm.id);
                
                return (
                  <div key={comm.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Parent Comment (Question) */}
                    <div className="premium-comment-card question-card">
                      <div className="comment-avatar-col">
                        <div className="comment-avatar">
                          {initials}
                        </div>
                      </div>
                      <div className="comment-main-col">
                        <div className="comment-header-row">
                          <span className="comment-author">
                            {comm.author}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className="comment-date">{comm.date}</span>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteComment(comm.id)}
                                className="review-delete-btn"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.2)',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                ✕ {lang === 'CZ' ? 'Smazat' : 'Delete'}
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="comment-text">{comm.text}</p>
                        
                        {/* Reply trigger button */}
                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-start' }}>
                          <button
                            onClick={() => handleOpenReplyModal(comm)}
                            style={{
                              background: 'transparent',
                              color: 'var(--color-gold, #fdbd16)',
                              border: 'none',
                              padding: '0',
                              fontSize: '13.5px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'color 0.2s ease'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M10 9l-5 5 5 5" />
                              <path d="M20 20a8 8 0 0 0-8-8H5" />
                            </svg>
                            {lang === 'CZ' ? 'Odpovědět' : 'Reply'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Child Replies */}
                    {repliesList.map((reply) => {
                      const isSupportReply = reply.is_admin_reply || reply.author.includes('Team') || reply.author.includes('Support');
                      const replyInitials = reply.author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                      
                      return (
                        <div key={reply.id} className="premium-comment-card reply-card">
                          <div className="reply-connector-line"></div>
                          <div className="comment-avatar-col">
                            <div className={`comment-avatar ${isSupportReply ? 'admin-avatar' : ''}`}>
                              {isSupportReply ? '🛡️' : replyInitials}
                            </div>
                          </div>
                          <div className="comment-main-col">
                            <div className="comment-header-row">
                              <span className={`comment-author ${isSupportReply ? 'admin-author' : ''}`}>
                                {reply.author}
                                {isSupportReply && <span className="admin-badge">{lang === 'CZ' ? 'Podpora' : 'Support'}</span>}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="comment-date">{reply.date}</span>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteComment(reply.id)}
                                    className="review-delete-btn"
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.1)',
                                      color: '#ef4444',
                                      border: '1px solid rgba(239, 68, 68, 0.2)',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.2s ease'
                                    }}
                                  >
                                    ✕ {lang === 'CZ' ? 'Smazat' : 'Delete'}
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="comment-text">{reply.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-comments">
              {lang === 'CZ' ? 'K tomuto produktu zatím nebyly položeny žádné dotazy. Zeptejte se na to, co vás zajímá!' : 'No questions have been asked about this product yet. Ask what you are interested in!'}
            </div>
          )}
        </section>
      )}

      {/* Související produkty Section */}
      {activeTab === 'souvisejici' && (
        <section id="souvisejici" className="detail-section">
          <h3 className="detail-section-title">{lang === 'CZ' ? 'Související produkty' : 'Related Products'}</h3>
          {relatedSingles.length > 0 ? (
            <div className="catalog-product-grid">
              {relatedSingles.map(rel => (
                <ProductCard key={rel.id} product={rel} addToCart={addToCart} setSelectedProductId={setSelectedProductId} setActivePage={setActivePage} />
              ))}
            </div>
          ) : (
            <div className="no-reviews" style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
              {lang === 'CZ' ? 'Žádané související produkty nebyly nalezeny.' : 'No related products found.'}
            </div>
          )}
        </section>
      )}

      {/* Podobné produkty Section */}
      {activeTab === 'podobne' && (
        <section id="podobne" className="detail-section">
          <h3 className="detail-section-title">{lang === 'CZ' ? 'Podobné produkty' : 'Similar Products'}</h3>
          {similarSingles.length > 0 ? (
            <div className="catalog-product-grid">
              {similarSingles.map(rel => (
                <ProductCard key={rel.id} product={rel} addToCart={addToCart} setSelectedProductId={setSelectedProductId} setActivePage={setActivePage} />
              ))}
            </div>
          ) : (
            <div className="no-reviews" style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
              {lang === 'CZ' ? 'Žádané podobné produkty nebyly nalezeny.' : 'No similar products found.'}
            </div>
          )}
        </section>
      )}
    </div>



      {/* Lightbox Modal Overlay */}
      {isLightboxOpen && (
        <div 
          className="lightbox-overlay" 
          onClick={() => setIsLightboxOpen(false)}
        >
          <div 
            className="lightbox-container lightbox-container-clean" 
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative' }}
          >
            <button 
              type="button" 
              className="lightbox-close-btn" 
              onClick={() => setIsLightboxOpen(false)}
              aria-label={lang === 'CZ' ? 'Zavřít' : 'Close'}
            >
              ✕
            </button>

            <h3 className="lightbox-title" style={{ marginBottom: '12px' }}>{product.name}</h3>

            <div className="lightbox-gallery-wrapper">
              {/* Left Arrow inside modal */}
              {images.length > 1 && (
                <button 
                  type="button" 
                  className="gallery-nav-btn gallery-nav-left" 
                  onClick={handlePrevImage} 
                  aria-label={lang === 'CZ' ? 'Předchozí obrázek' : 'Previous image'}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="20" y1="12" x2="4" y2="12" />
                    <polyline points="10 18 4 12 10 6" />
                  </svg>
                </button>
              )}

              {/* Image with Magnifier Zoom inside Modal */}
              <div 
                className="lightbox-magnifier-container"
                onMouseMove={handleLightboxMouseMove}
                onMouseLeave={handleLightboxMouseLeave}
              >
                <img 
                  src={activeImage} 
                  alt={product.name} 
                  className="lightbox-image lightbox-image-clean" 
                />
                <div className="lightbox-magnifier-lens" style={lightboxZoomStyle} />
              </div>

              {/* Right Arrow inside modal */}
              {images.length > 1 && (
                <button 
                  type="button" 
                  className="gallery-nav-btn gallery-nav-right" 
                  onClick={handleNextImage} 
                  aria-label={lang === 'CZ' ? 'Další obrázek' : 'Next image'}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <polyline points="14 6 20 12 14 18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Indicators inside modal */}
            {images.length > 1 && (
              <div className="lightbox-indicators">
                {images.map((_, idx) => (
                  <span 
                    key={idx} 
                    style={{
                      ...styles.dot, 
                      width: currentImageIndex === idx ? '32px' : '16px',
                      backgroundColor: currentImageIndex === idx ? 'var(--color-gold)' : 'rgba(255,255,255,0.2)'
                    }}
                    onClick={() => setCurrentImageIndex(idx)}
                  />
                ))}
              </div>
            )}
            
            <span className="lightbox-tip">
              {lang === 'CZ' ? 'Najetím myší na obrázek jej přiblížíte pro detailní kontrolu.' : 'Hover over the image to zoom in for detailed inspection.'}
            </span>
          </div>
        </div>
      )}

      {/* Local Modal Overlays for actions */}
      {isAskModalOpen && (
        <div className="product-modal-overlay" onClick={() => setIsAskModalOpen(false)}>
          <div className="product-modal-container" onClick={e => e.stopPropagation()}>
            <button className="product-modal-close" onClick={() => setIsAskModalOpen(false)}>✕</button>
            <h3 className="product-modal-title">{lang === 'CZ' ? 'Zeptat se prodejce' : 'Ask the Seller'}</h3>
            <form onSubmit={handleAskSubmit} className="login-modal-form">
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Váš E-mail' : 'Your Email'} <span className="text-red">*</span></label>
                <input type="email" required className="login-form-input" value={askEmail} onChange={e => setAskEmail(e.target.value)} placeholder="jmeno@example.com" />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Telefonní číslo' : 'Phone Number'}</label>
                <input type="tel" className="login-form-input" value={askPhone} onChange={e => setAskPhone(e.target.value)} placeholder={lang === 'CZ' ? 'Např. +420 777 777 777' : 'e.g. +420 777 777 777'} />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Vaše zpráva' : 'Your Message'} <span className="text-red">*</span></label>
                <textarea required className="login-form-input" style={{ minHeight: '100px', resize: 'vertical' }} value={askMessage} onChange={e => setAskMessage(e.target.value)} placeholder={lang === 'CZ' ? 'Zde napište svůj dotaz ohledně karty...' : 'Write your question about the card here...'} />
              </div>
              <div className="login-form-group" style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-start' }}>
                <input type="checkbox" required id="ask-gdpr" checked={askGdpr} onChange={e => setAskGdpr(e.target.checked)} style={{ marginTop: '3px' }} />
                <label htmlFor="ask-gdpr" style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: '1.4' }}>
                  {lang === 'CZ' 
                    ? 'Souhlasím se zpracováním osobních údajů v souladu se zásadami ochrany osobních údajů na této stránce.' 
                    : 'I agree to the processing of personal data in accordance with the privacy policy on this site.'}
                </label>
              </div>
              <button type="submit" className="login-submit-btn">{lang === 'CZ' ? 'Odeslat dotaz' : 'Send Inquiry'}</button>
            </form>
          </div>
        </div>
      )}

      {isWatchdogModalOpen && (
        <div className="product-modal-overlay" onClick={() => setIsWatchdogModalOpen(false)}>
          <div className="product-modal-container" onClick={e => e.stopPropagation()}>
            <button className="product-modal-close" onClick={() => setIsWatchdogModalOpen(false)}>✕</button>
            <h3 className="product-modal-title">{lang === 'CZ' ? 'Sledovat produkt (Hlídací pes)' : 'Watch Product (Watchdog)'}</h3>
            <form onSubmit={handleWatchdogSubmit} className="login-modal-form">
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Upozornit mě, když:' : 'Notify me when:'}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="radio" name="watchdog-type" checked={watchdogType === 'stock'} onChange={() => setWatchdogType('stock')} />
                    {lang === 'CZ' ? 'Produkt bude skladem' : 'Product is in stock'}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="radio" name="watchdog-type" checked={watchdogType === 'sale'} onChange={() => setWatchdogType('sale')} />
                    {lang === 'CZ' ? 'Produkt bude v akci' : 'Product is on sale'}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', flexWrap: 'wrap' }}>
                    <input type="radio" name="watchdog-type" checked={watchdogType === 'price'} onChange={() => setWatchdogType('price')} />
                    {lang === 'CZ' ? 'Cena klesne pod:' : 'Price drops below:'} 
                    <input type="number" disabled={watchdogType !== 'price'} value={watchdogPriceLimit} onChange={e => setWatchdogPriceLimit(e.target.value)} className="login-form-input" style={{ width: '100px', padding: '6px 12px', display: 'inline-block', margin: '0 4px', height: 'auto' }} placeholder={lang === 'CZ' ? 'Částka' : 'Amount'} />
                    Kč
                  </label>
                </div>
              </div>
              <div className="login-form-group" style={{ marginTop: '8px' }}>
                <label className="login-form-label">{lang === 'CZ' ? 'E-mail pro zaslání upozornění' : 'Email for notification'} <span className="text-red">*</span></label>
                <input type="email" required className="login-form-input" value={watchdogEmail} onChange={e => setWatchdogEmail(e.target.value)} placeholder="jmeno@example.com" />
              </div>
              <div className="login-form-group" style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-start' }}>
                <input type="checkbox" required id="watchdog-gdpr" checked={watchdogGdpr} onChange={e => setWatchdogGdpr(e.target.checked)} style={{ marginTop: '3px' }} />
                <label htmlFor="watchdog-gdpr" style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: '1.4' }}>
                  {lang === 'CZ' 
                    ? 'Beru na vědomí, že moje e-mailová adresa bude spravována za účelem informování o dostupnosti a cenách produktů v souladu se zásadami zpracování osobních údajů.' 
                    : 'I acknowledge that my email address will be managed for the purpose of informing me about product availability and prices in accordance with the privacy policy.'}
                </label>
              </div>
              <button type="submit" className="login-submit-btn">{lang === 'CZ' ? 'Uložit nastavení hlídání' : 'Save Watchdog Settings'}</button>
            </form>
          </div>
        </div>
      )}

      {isReviewModalOpen && (
        <div className="product-modal-overlay" onClick={() => setIsReviewModalOpen(false)}>
          <div className="product-modal-container" onClick={e => e.stopPropagation()}>
            <button className="product-modal-close" onClick={() => setIsReviewModalOpen(false)}>✕</button>
            <h3 className="product-modal-title">{lang === 'CZ' ? 'Přidat hodnocení produktu' : 'Add Product Review'}</h3>
            <form onSubmit={handleReviewSubmit} className="login-modal-form">
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Vaše jméno' : 'Your Name'} <span className="text-red">*</span></label>
                <input type="text" required readOnly className="login-form-input" style={{ opacity: 0.8, cursor: 'not-allowed' }} value={reviewAuthor} placeholder="Jan N." />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Počet hvězdiček' : 'Star Rating'} <span className="text-red">*</span></label>
                <select className="login-form-input" value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))}>
                  <option value={5}>★★★★★ ({lang === 'CZ' ? '5 hvězdiček' : '5 stars'})</option>
                  <option value={4}>★★★★☆ ({lang === 'CZ' ? '4 hvězdičky' : '4 stars'})</option>
                  <option value={3}>★★★☆☆ ({lang === 'CZ' ? '3 hvězdičky' : '3 stars'})</option>
                  <option value={2}>★★☆☆☆ ({lang === 'CZ' ? '2 hvězdičky' : '2 stars'})</option>
                  <option value={1}>★☆☆☆☆ ({lang === 'CZ' ? '1 hvězdička' : '1 star'})</option>
                </select>
              </div>
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Text recenze' : 'Review Content'} <span className="text-red">*</span></label>
                <textarea required className="login-form-input" style={{ minHeight: '100px', resize: 'vertical' }} maxLength={300} value={reviewText} onChange={e => setReviewText(e.target.value.substring(0, 300))} placeholder={lang === 'CZ' ? 'Jak jste spokojen s tímto produktem?' : 'How satisfied are you with this product?'} />
                <div style={{ textAlign: 'right', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                  {reviewText.length}/300
                </div>
              </div>
              <button type="submit" className="login-submit-btn">{lang === 'CZ' ? 'Odeslat recenzi' : 'Submit Review'}</button>
            </form>
          </div>
        </div>
      )}

      {isCommentModalOpen && (
        <div className="product-modal-overlay" onClick={() => setIsCommentModalOpen(false)}>
          <div className="product-modal-container" onClick={e => e.stopPropagation()}>
            <button className="product-modal-close" onClick={() => setIsCommentModalOpen(false)}>✕</button>
            <h3 className="product-modal-title">{lang === 'CZ' ? 'Položit dotaz / Napsat komentář' : 'Ask a Question / Write a Comment'}</h3>
            <form onSubmit={handleCommentSubmit} className="login-modal-form">
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Vaše jméno' : 'Your Name'} <span className="text-red">*</span></label>
                <input type="text" required readOnly className="login-form-input" style={{ opacity: 0.8, cursor: 'not-allowed' }} value={commentAuthor} placeholder="Jan N." />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Text komentáře' : 'Comment Text'} <span className="text-red">*</span></label>
                <textarea required className="login-form-input" style={{ minHeight: '100px', resize: 'vertical' }} maxLength={300} value={commentText} onChange={e => setCommentText(e.target.value.substring(0, 300))} placeholder={lang === 'CZ' ? 'Zde napište svůj dotaz nebo postřeh...' : 'Write your question or feedback here...'} />
                <div style={{ textAlign: 'right', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                  {commentText.length}/300
                </div>
              </div>
              <button type="submit" className="login-submit-btn">{lang === 'CZ' ? 'Odeslat komentář' : 'Submit Comment'}</button>
            </form>
          </div>
        </div>
      )}

      {isReplyModalOpen && (
        <div className="product-modal-overlay" onClick={() => setIsReplyModalOpen(false)}>
          <div className="product-modal-container" onClick={e => e.stopPropagation()}>
            <button className="product-modal-close" onClick={() => setIsReplyModalOpen(false)}>✕</button>
            <h3 className="product-modal-title">{lang === 'CZ' ? 'Odpovědět na dotaz' : 'Reply to Question'}</h3>
            <form onSubmit={handleReplySubmit} className="login-modal-form">
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Vaše jméno' : 'Your Name'} <span className="text-red">*</span></label>
                <input type="text" required readOnly className="login-form-input" style={{ opacity: 0.8, cursor: 'not-allowed' }} value={replyAuthor} placeholder="Jan N." />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Text odpovědi' : 'Reply Text'} <span className="text-red">*</span></label>
                <textarea required className="login-form-input" style={{ minHeight: '100px', resize: 'vertical' }} maxLength={300} value={replyText} onChange={e => setReplyText(e.target.value.substring(0, 300))} placeholder={lang === 'CZ' ? 'Zde napište svou odpověď...' : 'Write your reply here...'} />
                <div style={{ textAlign: 'right', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                  {replyText.length}/300
                </div>
              </div>
              <button type="submit" className="login-submit-btn">{lang === 'CZ' ? 'Odeslat odpověď' : 'Submit Reply'}</button>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}

const styles = {
  container: {
    paddingTop: '20px',
    paddingBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  errorContainer: {
    padding: '40px',
    textAlign: 'center',
  },
  layout: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  leftCol: {
    flex: '1.2 1 400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignItems: 'center',
  },
  galleryWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '320px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicators: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    zIndex: 5,
    marginTop: '10px',
  },
  dot: {
    height: '4px',
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  rightCol: {
    flex: '1.5 1 400px',
    padding: '30px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: '800',
    lineHeight: '1.3',
    margin: 0,
    fontFamily: 'var(--font-heading)',
  },
  variantSelectorsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: '16px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    marginTop: '8px',
  },
  variantSelectorsTitle: {
    fontSize: '14px',
    fontWeight: '700',
    margin: 0,
    color: 'var(--text-main)',
  },
  selectorsGrid: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  selectorField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: '1 1 120px',
  },
  selectorLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  variantSelect: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    color: 'var(--text-main)',
    outline: 'none',
    cursor: 'pointer',
    width: '100%',
  }
};
