import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { supabase } from '../../supabase';
import { fetchSubscribers, deleteSubscriber } from '../../services/newsletter';

export default function NewsletterTab({ showToast }) {
  const { lang } = useTranslation();
  const [subscribers, setSubscribers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [blocks, setBlocks] = useState([
    { id: '1', type: 'text', content: '' }
  ]);
  const [isSending, setIsSending] = useState(false);

  // Modals state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, targetEmail: null });

  // Cropping states
  const [isCropping, setIsCropping] = useState(false);
  const [cropTarget, setCropTarget] = useState(null); // { index }
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [cropImageFormat, setCropImageFormat] = useState('image/jpeg');
  const [cropOrientation, setCropOrientation] = useState('landscape'); // Newsletter uses landscape banner ratio (2.5:1)

  const canvasRef = useRef(null);
  const loadedImage = useRef(null);
  const sliderRef = useRef(null);
  const zoomValRef = useRef(null);
  const minScaleRef = useRef(0.1);
  const cropRefScale = useRef(1);
  const cropRefX = useRef(0);
  const cropRefY = useRef(0);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    loadSubscribers();
    loadCampaigns();
  }, []);

  const loadSubscribers = async () => {
    setLoadingSubs(true);
    try {
      const data = await fetchSubscribers();
      setSubscribers(data);
    } catch (err) {
      console.error(err);
      showToast(lang === 'CZ' ? 'Chyba při načítání odběratelů.' : 'Error loading subscribers.', 'error');
    } finally {
      setLoadingSubs(false);
    }
  };

  const loadCampaigns = async () => {
    setLoadingCamps(true);
    try {
      // Call Edge Function with GET request to fetch campaigns history
      const { data, error } = await supabase.functions.invoke('send-newsletter', {
        method: 'GET'
      });
      if (error) throw error;
      setCampaigns(data?.campaigns || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCamps(false);
    }
  };

  const handleDeleteSubscriber = async () => {
    const email = deleteConfirm.targetEmail;
    if (!email) return;
    try {
      await deleteSubscriber(email);
      showToast(lang === 'CZ' ? 'Odběratel byl úspěšně odebrán.' : 'Subscriber was successfully removed.', 'success');
      loadSubscribers();
    } catch (err) {
      console.error(err);
      showToast(lang === 'CZ' ? 'Chyba při odebírání odběratele.' : 'Error removing subscriber.', 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, targetEmail: null });
    }
  };

  const handleSendNewsletter = async (e) => {
    e.preventDefault();
    if (blocks.length === 0) {
      showToast(lang === 'CZ' ? 'Newsletter musí obsahovat alespoň jeden blok.' : 'Newsletter must contain at least one block.', 'error');
      return;
    }
    // Check if there are empty block contents
    const hasEmpty = blocks.some(b => b.type === 'text' && !b.content.trim());
    const hasEmptyImg = blocks.some(b => b.type === 'image' && !b.content);
    if (hasEmpty || hasEmptyImg) {
      showToast(
        lang === 'CZ' 
          ? 'Prosím vyplňte obsah všech textových a obrázkových bloků.' 
          : 'Please fill in content for all text and image blocks.', 
        'error'
      );
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    setIsConfirmOpen(false);
    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-newsletter', {
        body: {
          campaignName,
          subject,
          blocks
        }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      showToast(lang === 'CZ' ? 'Newsletter byl úspěšně rozeslán všem odběratelům!' : 'Newsletter successfully sent to all subscribers!', 'success');
      
      // Reset form
      setCampaignName('');
      setSubject('');
      setBlocks([{ id: Date.now().toString(), type: 'text', content: '' }]);

      loadCampaigns();
    } catch (err) {
      console.error(err);
      showToast(lang === 'CZ' ? `Chyba při odesílání: ${err.message}` : `Send error: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (subscribers.length === 0) return;
    const headers = ['Email', 'Created At', 'Confirmed'];
    const rows = subscribers.map(sub => [
      sub.email,
      new Date(sub.created_at).toLocaleString(),
      sub.confirmed ? 'Yes' : 'No'
    ]);

    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `subscribers_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Block management
  const addBlock = (type) => {
    const newBlock = {
      id: Date.now().toString(),
      type,
      content: '',
      ...(type === 'button' ? { text: 'Prohlížet nabídku', url: 'https://northvaletcg.eu' } : {})
    };
    setBlocks(prev => [...prev, newBlock]);
  };

  const deleteBlock = (index) => {
    setBlocks(prev => prev.filter((_, i) => i !== index));
  };

  const moveBlock = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    setBlocks(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const updateBlockContent = (index, value) => {
    setBlocks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], content: value };
      return next;
    });
  };

  const updateBlockButtonText = (index, value) => {
    setBlocks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], text: value };
      return next;
    });
  };

  const updateBlockButtonUrl = (index, value) => {
    setBlocks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], url: value };
      return next;
    });
  };

  // --- Image Crop Canvas Implementation ---
  const handleFileChange = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      loadImageFile(file, index);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      loadImageFile(file, index);
    }
  };

  const loadImageFile = (file, index) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropImageSrc(event.target.result);
      setCropImageFormat(file.type || 'image/jpeg');
      setCropTarget({ index });
      setCropOrientation('landscape');
      setIsCropping(true);

      cropRefX.current = 0;
      cropRefY.current = 0;
      cropRefScale.current = 1;
      minScaleRef.current = 0.1;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (isCropping && cropImageSrc && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        loadedImage.current = img;

        const frameW = 280;
        const frameH = 112; // 2.5:1 ratio landscape

        const minScaleX = frameW / img.width;
        const minScaleY = frameH / img.height;
        const computedMinScale = Math.max(minScaleX, minScaleY);

        const sliderMinScale = 0.01;
        minScaleRef.current = sliderMinScale;

        cropRefScale.current = computedMinScale;
        cropRefX.current = 0;
        cropRefY.current = 0;

        if (sliderRef.current) {
          sliderRef.current.min = sliderMinScale.toString();
          sliderRef.current.max = Math.max(computedMinScale * 4, 3).toString();
          sliderRef.current.step = "0.01";
          sliderRef.current.value = computedMinScale.toString();
        }
        if (zoomValRef.current) {
          zoomValRef.current.textContent = `${Math.round(computedMinScale * 100)}%`;
        }

        drawCanvas();
      };
      img.src = cropImageSrc;
    }
  }, [isCropping, cropImageSrc]);

  const drawCanvas = () => {
    if (!loadedImage.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = loadedImage.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const frameW = 280;
    const frameH = 112;
    const frameX = (canvas.width - frameW) / 2;
    const frameY = (canvas.height - frameH) / 2;

    ctx.save();

    ctx.beginPath();
    ctx.rect(frameX, frameY, frameW, frameH);
    ctx.clip();

    const scale = cropRefScale.current;
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    const minLimitX = frameW - drawW;
    const maxLimitX = 0;
    if (drawW <= frameW) {
      cropRefX.current = 0;
    } else {
      cropRefX.current = Math.max(minLimitX, Math.min(maxLimitX, cropRefX.current));
    }

    const minLimitY = frameH - drawH;
    const maxLimitY = 0;
    if (drawH <= frameH) {
      cropRefY.current = 0;
    } else {
      cropRefY.current = Math.max(minLimitY, Math.min(maxLimitY, cropRefY.current));
    }

    const drawX = frameX + (frameW - drawW) / 2 + cropRefX.current;
    const drawY = frameY + (frameH - drawH) / 2 + cropRefY.current;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    ctx.restore();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, canvas.width, frameY);
    ctx.fillRect(0, frameY + frameH, canvas.width, frameY);
    ctx.fillRect(0, frameY, frameX, frameH);
    ctx.fillRect(frameX + frameW, frameY, frameX, frameH);

    ctx.strokeStyle = 'var(--nv-gold, #fdbd16)';
    ctx.lineWidth = 2;
    ctx.strokeRect(frameX, frameY, frameW, frameH);
  };

  const handleCanvasMouseDown = (e) => {
    isDragging.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    dragStart.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDragging.current || !loadedImage.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - dragStart.current.x;
    const dy = mouseY - dragStart.current.y;

    cropRefX.current += dx;
    cropRefY.current += dy;

    dragStart.current = { x: mouseX, y: mouseY };
    drawCanvas();
  };

  const handleCanvasMouseUp = () => {
    isDragging.current = false;
  };

  const handleCanvasTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    isDragging.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    dragStart.current = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  };

  const handleCanvasTouchMove = (e) => {
    if (!isDragging.current || !loadedImage.current || e.touches.length !== 1) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.touches[0].clientX - rect.left;
    const mouseY = e.touches[0].clientY - rect.top;

    const dx = mouseX - dragStart.current.x;
    const dy = mouseY - dragStart.current.y;

    cropRefX.current += dx;
    cropRefY.current += dy;

    dragStart.current = { x: mouseX, y: mouseY };
    drawCanvas();
  };

  const handleCropAction = () => {
    if (!loadedImage.current || !canvasRef.current || !cropTarget) return;

    const img = loadedImage.current;
    const frameW = 280;
    const frameH = 112;

    const scale = cropRefScale.current;
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    const imageLeft = (frameW - drawW) / 2 + cropRefX.current;
    const imageTop = (frameH - drawH) / 2 + cropRefY.current;

    const visibleX = Math.max(0, imageLeft);
    const visibleY = Math.max(0, imageTop);
    const visibleW = Math.min(frameW, imageLeft + drawW) - visibleX;
    const visibleH = Math.min(frameH, imageTop + drawH) - visibleY;

    if (visibleW <= 0 || visibleH <= 0) {
      showToast(lang === 'CZ' ? 'Obrázek je mimo ořezové pole!' : 'Image is outside the crop frame!', 'error');
      return;
    }

    const baseW = 1400;
    const scaleFactor = baseW / frameW;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = visibleW * scaleFactor;
    cropCanvas.height = visibleH * scaleFactor;
    const cropCtx = cropCanvas.getContext('2d');

    const sourceXInScaledImage = visibleX - imageLeft;
    const sourceYInScaledImage = visibleY - imageTop;

    const sx = sourceXInScaledImage / scale;
    const sy = sourceYInScaledImage / scale;
    const sw = visibleW / scale;
    const sh = visibleH / scale;

    cropCtx.imageSmoothingEnabled = true;
    cropCtx.imageSmoothingQuality = 'high';

    const isPng = cropImageFormat === 'image/png';
    if (!isPng) {
      cropCtx.fillStyle = '#ffffff';
      cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
    } else {
      cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    }

    cropCtx.drawImage(
      img,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    );

    const outputFormat = isPng ? 'image/png' : 'image/jpeg';
    const outputQuality = isPng ? undefined : 0.85;
    const croppedUrl = cropCanvas.toDataURL(outputFormat, outputQuality);

    // Update block content
    setBlocks(prev => {
      const next = [...prev];
      if (cropTarget.index !== undefined && cropTarget.index < next.length) {
        next[cropTarget.index].content = croppedUrl;
      }
      return next;
    });

    setIsCropping(false);
    setCropImageSrc(null);
    setCropTarget(null);
  };

  const filteredSubscribers = subscribers.filter(sub => 
    sub.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="ctf-shell" style={{ display: 'flex', gap: '32px', minHeight: '500px', flexDirection: 'row', textAlign: 'left' }}>
      
      {/* LEFT COLUMN: Subscribers Overview & Campaign History */}
      <section className="ctf-tree-col" style={{ flex: '1.1 1 0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Subscribers card */}
        <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.06)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                {lang === 'CZ' ? 'Odběratelé newsletteru' : 'Newsletter Subscribers'}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                {lang === 'CZ' ? `Celkem: ${subscribers.length} přihlášených e-mailů` : `Total: ${subscribers.length} subscribed emails`}
              </p>
            </div>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ fontSize: '11px', padding: '6px 12px' }}
              disabled={subscribers.length === 0}
              onClick={handleExportCSV}
            >
              📥 {lang === 'CZ' ? 'Export CSV' : 'Export CSV'}
            </button>
          </div>

          <input 
            type="text" 
            placeholder={lang === 'CZ' ? 'Vyhledat e-mail...' : 'Search email...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ctf-input"
            style={{ width: '100%', boxSizing: 'border-box', marginBottom: '12px', padding: '8px 12px', fontSize: '13px' }}
          />

          {loadingSubs ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{lang === 'CZ' ? 'Načítání e-mailů...' : 'Loading emails...'}</p>
          ) : filteredSubscribers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', margin: '16px 0' }}>
              {lang === 'CZ' ? 'Žádní odběratelé nenalezeni.' : 'No subscribers found.'}
            </p>
          ) : (
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-muted)' }}>E-mail</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-muted)', width: '90px' }}>Ověřen</th>
                    <th style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)', width: '60px' }}>Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscribers.map(sub => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '8px', color: '#fff' }}>{sub.email}</td>
                      <td style={{ padding: '8px', color: sub.confirmed ? '#10b981' : '#f59e0b' }}>
                        {sub.confirmed ? (lang === 'CZ' ? 'Ano' : 'Yes') : (lang === 'CZ' ? 'Čeká' : 'Pending')}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button 
                          type="button" 
                          onClick={() => setDeleteConfirm({ isOpen: true, targetEmail: sub.email })}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', padding: 0 }}
                          title={lang === 'CZ' ? 'Odebrat odběratele' : 'Remove subscriber'}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* History card */}
        <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.06)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#fff' }}>
            {lang === 'CZ' ? 'Odeslané kampaně v Brevu' : 'Sent Campaigns in Brevo'}
          </h3>

          {loadingCamps ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{lang === 'CZ' ? 'Načítání historie...' : 'Loading history...'}</p>
          ) : campaigns.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>
              {lang === 'CZ' ? 'Žádné odeslané kampaně nenalezeny.' : 'No sent campaigns found.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {campaigns.slice(0, 5).map(camp => (
                <div key={camp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px', color: '#fff' }}>{camp.name}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{camp.subject}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-gold)', fontWeight: 'bold' }}>
                    {camp.sentDate ? new Date(camp.sentDate).toLocaleDateString() : 'Sent'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* RIGHT COLUMN: Campaign Composer Form (Block Editor) */}
      <section className="ctf-form-col" style={{ flex: '1.4 1 0', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.06)', padding: '24px', boxSizing: 'border-box' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: 'var(--color-gold)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
          {lang === 'CZ' ? 'Vytvořit a rozeslat newsletter (Blokový editor)' : 'Create & Send Newsletter (Block Builder)'}
        </h3>

        <form onSubmit={handleSendNewsletter} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Internal Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {lang === 'CZ' ? 'Název kampaně (vnitřní)' : 'Campaign Name (internal)'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text" 
              className="ctf-input"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder={lang === 'CZ' ? 'např. Letní slevová akce 2026' : 'e.g., Summer Discount Campaign 2026'}
              style={{ width: '100%', boxSizing: 'border-box' }}
              required
            />
          </div>

          {/* Subject */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {lang === 'CZ' ? 'Předmět e-mailu' : 'Email Subject'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text" 
              className="ctf-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={lang === 'CZ' ? 'např. Získejte slevu 15% na celý sortiment!' : 'e.g., Get 15% off the entire collection!'}
              style={{ width: '100%', boxSizing: 'border-box' }}
              required
            />
          </div>

          {/* Blocks Layout Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>
                {lang === 'CZ' ? 'STRUKTURA E-MAILU' : 'EMAIL STRUCTURE'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {lang === 'CZ' ? 'Přetažením nebo tlačítky uspořádejte bloky' : 'Arrange blocks using controls below'}
              </span>
            </div>

            {blocks.map((block, index) => (
              <div 
                key={block.id} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.01)', 
                  border: '1px solid rgba(255, 255, 255, 0.05)', 
                  borderRadius: '10px', 
                  padding: '16px',
                  position: 'relative'
                }}
              >
                {/* Block header with controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-gold)', textTransform: 'uppercase' }}>
                    #{index + 1} {block.type === 'text' ? (lang === 'CZ' ? 'TEXT' : 'TEXT') : block.type === 'image' ? (lang === 'CZ' ? 'OBRÁZEK' : 'IMAGE') : (lang === 'CZ' ? 'TLAČÍTKO' : 'BUTTON')}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Move Up */}
                    <button 
                      type="button" 
                      onClick={() => moveBlock(index, -1)}
                      disabled={index === 0}
                      style={{ background: 'rgba(255,255,255,0.04)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: '11px', opacity: index === 0 ? 0.3 : 1 }}
                    >
                      ▲
                    </button>
                    {/* Move Down */}
                    <button 
                      type="button" 
                      onClick={() => moveBlock(index, 1)}
                      disabled={index === blocks.length - 1}
                      style={{ background: 'rgba(255,255,255,0.04)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: index === blocks.length - 1 ? 'not-allowed' : 'pointer', fontSize: '11px', opacity: index === blocks.length - 1 ? 0.3 : 1 }}
                    >
                      ▼
                    </button>
                    {/* Delete */}
                    <button 
                      type="button" 
                      onClick={() => deleteBlock(index)}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Block Content Inputs */}
                {block.type === 'text' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <textarea 
                      className="ctf-textarea"
                      rows={4}
                      value={block.content}
                      onChange={(e) => updateBlockContent(index, e.target.value)}
                      placeholder={lang === 'CZ' ? 'Zde napište text... (podporuje HTML nadpisy a odstavce)' : 'Write body text here... (supports HTML tags)'}
                      style={{ width: '100%', boxSizing: 'border-box', height: '100px', resize: 'vertical' }}
                      required
                    />
                  </div>
                )}

                {block.type === 'image' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {block.content ? (
                      <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#000', padding: '10px' }}>
                        <img 
                          src={block.content} 
                          alt="Banner Preview" 
                          style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '180px', objectFit: 'contain' }} 
                        />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                          <label 
                            className="btn btn-secondary" 
                            style={{ flex: 1, fontSize: '11px', padding: '6px 0', textAlign: 'center', cursor: 'pointer' }}
                          >
                            📷 {lang === 'CZ' ? 'Změnit obrázek' : 'Change Image'}
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => handleFileChange(e, index)} 
                              style={{ display: 'none' }} 
                            />
                          </label>
                          <button 
                            type="button" 
                            className="btn" 
                            style={{ flex: 1, fontSize: '11px', padding: '6px 0', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none' }}
                            onClick={() => updateBlockContent(index, '')}
                          >
                            ❌ {lang === 'CZ' ? 'Smazat' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onClick={() => {
                          const fileInput = document.getElementById(`file-input-${block.id}`);
                          if (fileInput) fileInput.click();
                        }}
                        style={{
                          border: '2px dashed rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          padding: '30px 20px',
                          textAlign: 'center',
                          background: 'rgba(255, 255, 255, 0.02)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'border-color 0.2s ease'
                        }}
                      >
                        <span style={{ fontSize: '24px' }}>📥</span>
                        <span style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>
                          {lang === 'CZ' ? 'Přetáhněte obrázek sem' : 'Drag & drop image here'}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {lang === 'CZ' ? 'nebo klikněte pro procházení' : 'or click to browse'}
                        </span>
                        <input 
                          id={`file-input-${block.id}`}
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleFileChange(e, index)} 
                          style={{ display: 'none' }} 
                        />
                      </div>
                    )}
                  </div>
                )}

                {block.type === 'button' && (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {lang === 'CZ' ? 'Text tlačítka' : 'Button Text'}
                      </label>
                      <input 
                        type="text" 
                        className="ctf-input"
                        value={block.text || ''}
                        onChange={(e) => updateBlockButtonText(index, e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', fontSize: '12px', padding: '6px 10px' }}
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 2 }}>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {lang === 'CZ' ? 'Odkaz tlačítka (URL)' : 'Button Link (URL)'}
                      </label>
                      <input 
                        type="url" 
                        className="ctf-input"
                        value={block.url || ''}
                        onChange={(e) => updateBlockButtonUrl(index, e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', fontSize: '12px', padding: '6px 10px' }}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Block Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '10px 0', fontSize: '11px', fontWeight: 'bold' }}
              onClick={() => addBlock('text')}
            >
              ➕ TEXT
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '10px 0', fontSize: '11px', fontWeight: 'bold' }}
              onClick={() => addBlock('image')}
            >
              ➕ OBRÁZEK
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '10px 0', fontSize: '11px', fontWeight: 'bold' }}
              onClick={() => addBlock('button')}
            >
              ➕ TLAČÍTKO
            </button>
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', fontWeight: 'bold', marginTop: '16px' }}
            disabled={isSending}
          >
            {isSending 
              ? (lang === 'CZ' ? 'Odesílání kampaně...' : 'Sending campaign...') 
              : (lang === 'CZ' ? '🚀 ROZESLAT VŠEM ODBĚRATELŮM' : '🚀 SEND TO ALL SUBSCRIBERS')
            }
          </button>
        </form>
      </section>

      {/* Delete Subscriber Confirmation Modal */}
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
              {lang === 'CZ' ? 'Smazat odběratele?' : 'Remove Subscriber?'}
            </h4>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              {lang === 'CZ' 
                ? `Opravdu chcete odebrat e-mail "${deleteConfirm.targetEmail}" ze seznamu odběratelů?`
                : `Are you sure you want to remove email "${deleteConfirm.targetEmail}" from the subscriber list?`}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 16px' }}
                onClick={() => setDeleteConfirm({ isOpen: false, targetEmail: null })}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#ef4444', color: '#fff', padding: '8px 16px' }}
                onClick={handleDeleteSubscriber}
              >
                {lang === 'CZ' ? 'Odebrat' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sending Confirmation Modal */}
      {isConfirmOpen && (
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
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>✉️</span>
            <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', margin: '0 0 12px 0' }}>
              {lang === 'CZ' ? 'Opravdu odeslat newsletter?' : 'Confirm Email Blast?'}
            </h4>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              {lang === 'CZ' 
                ? `Tento krok vytvoří kampaň v Brevu a okamžitě ji odešle na všechny aktivní a ověřené e-maily. Tuto akci nelze vzít zpět ani zastavit.`
                : `This will trigger a campaign in Brevo and immediately dispatch it to all active and verified email addresses. This action cannot be undone or stopped.`}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '10px 20px', flex: 1 }}
                onClick={() => setIsConfirmOpen(false)}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '10px 20px', flex: 1.5, background: 'var(--color-gold)', color: '#000' }}
                onClick={handleConfirmSend}
              >
                {lang === 'CZ' ? 'Odeslat hromadně' : 'Send Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High Quality Canvas Crop Modal Overlay */}
      {isCropping && cropImageSrc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(10px)',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#131316',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            maxWidth: '550px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            position: 'relative'
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', width: '100%', textAlign: 'center' }}>
              ✂️ {lang === 'CZ' ? 'Oříznout obrázek banneru' : 'Crop Banner Image'}
            </h4>
            
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              {lang === 'CZ' ? 'Tažením obrázek posuňte, posuvníkem níže přibližte.' : 'Drag to pan, use slider below to zoom.'}
            </p>

            <div style={{ position: 'relative', width: '380px', height: '220px', background: '#000', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
              <canvas
                ref={canvasRef}
                width={380}
                height={220}
                style={{ cursor: 'move', display: 'block' }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onTouchStart={handleCanvasTouchStart}
                onTouchMove={handleCanvasTouchMove}
                onTouchEnd={handleCanvasMouseUp}
              />
            </div>

            {/* Slider zoom controls */}
            <div style={{ width: '100%', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>{lang === 'CZ' ? 'Přiblížení obrázku:' : 'Image Zoom:'}</span>
                <span ref={zoomValRef} style={{ color: 'var(--nv-gold, #fdbd16)', fontWeight: 'bold' }}>100%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    if (sliderRef.current) {
                      const minVal = Number(sliderRef.current.min);
                      const newVal = Math.max(minVal, cropRefScale.current - 0.05);
                      sliderRef.current.value = newVal.toString();
                      cropRefScale.current = newVal;
                      if (zoomValRef.current) zoomValRef.current.textContent = `${Math.round(newVal * 100)}%`;
                      drawCanvas();
                    }
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                
                <input 
                  ref={sliderRef}
                  type="range"
                  min="0.01"
                  max="3"
                  step="0.01"
                  style={{ flex: 1, accentColor: 'var(--nv-gold, #fdbd16)', cursor: 'pointer', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }}
                  onChange={(e) => {
                    const newScale = Number(e.target.value);
                    cropRefScale.current = newScale;
                    if (zoomValRef.current) zoomValRef.current.textContent = `${Math.round(newScale * 100)}%`;
                    drawCanvas();
                  }}
                />

                <button 
                  type="button"
                  onClick={() => {
                    if (sliderRef.current) {
                      const maxVal = Number(sliderRef.current.max);
                      const newVal = Math.min(maxVal, cropRefScale.current + 0.05);
                      sliderRef.current.value = newVal.toString();
                      cropRefScale.current = newVal;
                      if (zoomValRef.current) zoomValRef.current.textContent = `${Math.round(newVal * 100)}%`;
                      drawCanvas();
                    }
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '24px' }}>
              <button
                type="button"
                style={{ flex: 1, padding: '10px 16px', fontSize: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', cursor: 'pointer' }}
                onClick={() => {
                  setIsCropping(false);
                  setCropImageSrc(null);
                  setCropTarget(null);
                }}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button
                type="button"
                style={{ flex: 1.5, padding: '10px 16px', fontSize: '12px', borderRadius: '8px', border: 'none', background: 'var(--color-gold)', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={handleCropAction}
              >
                {lang === 'CZ' ? '✓ Dokončit ořez' : '✓ Crop Image'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
