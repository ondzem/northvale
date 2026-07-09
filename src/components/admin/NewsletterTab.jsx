import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { supabase } from '../../supabase';
import { fetchSubscribers, deleteSubscriber } from '../../services/newsletter';

export default function NewsletterTab({ showToast }) {
  const { lang } = useTranslation();
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

  const [subscribers, setSubscribers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Left Column switcher
  const [leftTab, setLeftTab] = useState('subscribers'); // 'subscribers' or 'campaigns'

  // Form states
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [subjectEN, setSubjectEN] = useState('');
  const [blocks, setBlocks] = useState([
    { id: '1', type: 'text', content: '', contentEN: '' }
  ]);
  const [isSending, setIsSending] = useState(false);
  const [previewLang, setPreviewLang] = useState('CZ'); // 'CZ' or 'EN'

  // Modals state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, targetEmail: null });
  const [deletingCampId, setDeletingCampId] = useState(null);
  const [deleteCampConfirm, setDeleteCampConfirm] = useState({ isOpen: false, targetId: null, campaignName: '' });

  // Campaign Import loading state
  const [loadingImport, setLoadingImport] = useState(false);

  // Cropping states
  const [isCropping, setIsCropping] = useState(false);
  const [cropTarget, setCropTarget] = useState(null); // { index }
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [cropImageFormat, setCropImageFormat] = useState('image/jpeg');

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

  const handleDeleteCampaign = async () => {
    const campaignId = deleteCampConfirm.targetId;
    if (!campaignId) return;

    setDeleteCampConfirm({ isOpen: false, targetId: null, campaignName: '' });
    setDeletingCampId(campaignId);
    try {
      const { data, error } = await supabase.functions.invoke(`send-newsletter?id=${campaignId}`, {
        method: 'DELETE'
      });
      if (error) throw error;
      showToast(lang === 'CZ' ? 'Kampaň byla smazána.' : 'Campaign was deleted.', 'success');
      loadCampaigns();
    } catch (err) {
      console.error(err);
      showToast(lang === 'CZ' ? 'Chyba při mazání kampaně.' : 'Error deleting campaign.', 'error');
    } finally {
      setDeletingCampId(null);
    }
  };

  const handleSendNewsletter = async (e) => {
    e.preventDefault();
    if (blocks.length === 0) {
      showToast(lang === 'CZ' ? 'Newsletter musí obsahovat alespoň jeden blok.' : 'Newsletter must contain at least one block.', 'error');
      return;
    }
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
          subjectEN,
          blocks
        }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      showToast(lang === 'CZ' ? 'Newsletter byl úspěšně rozeslán všem odběratelům!' : 'Newsletter successfully sent to all subscribers!', 'success');

      // Reset form
      setCampaignName('');
      setSubject('');
      setSubjectEN('');
      setBlocks([{ id: Date.now().toString(), type: 'text', content: '', contentEN: '' }]);

      loadCampaigns();
    } catch (err) {
      console.error(err);
      showToast(lang === 'CZ' ? `Chyba při odesílání: ${err.message}` : `Send error: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const parseHtmlToBlocks = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const blocks = [];
    const blockDivs = doc.querySelectorAll('.block-text, .block-image, .block-button');

    blockDivs.forEach((div, index) => {
      const id = (Date.now() + index).toString();
      if (div.classList.contains('block-text')) {
        let content = div.innerHTML.trim();
        content = content.replace(/<br\s*\/?>/gi, '\n');
        blocks.push({
          id,
          type: 'text',
          content: content,
          contentEN: ''
        });
      } else if (div.classList.contains('block-image')) {
        const anchor = div.querySelector('a');
        const img = div.querySelector('img');
        const linkUrl = anchor ? anchor.getAttribute('href') : '';
        const src = img ? img.getAttribute('src') : '';
        blocks.push({
          id,
          type: 'image',
          ratio: 'original',
          content: src,
          contentEN: '',
          linkUrl: linkUrl,
          linkUrlEN: ''
        });
      } else if (div.classList.contains('block-button')) {
        const anchor = div.querySelector('a');
        const url = anchor ? anchor.getAttribute('href') : '';
        const text = anchor ? anchor.textContent.trim() : '';
        blocks.push({
          id,
          type: 'button',
          text: text,
          textEN: '',
          url: url,
          urlEN: ''
        });
      }
    });
    return blocks;
  };

  const handleLoadCampaign = async (selectedCampaign) => {
    const name = selectedCampaign.name || '';
    let baseName = name;
    let isCZ = true;

    if (name.endsWith(' [CZ]')) {
      baseName = name.slice(0, -5);
      isCZ = true;
    } else if (name.endsWith(' [EN]')) {
      baseName = name.slice(0, -5);
      isCZ = false;
    }

    // Strip resent suffix
    baseName = baseName.replace(/\s*\(Resent\s+\d{1,2}\.\d{1,2}\.\d{4}\)/gi, '');

    const czCampaign = isCZ ? selectedCampaign : campaigns.find(c => c.name.startsWith(baseName + ' [CZ]'));
    const enCampaign = !isCZ ? selectedCampaign : campaigns.find(c => c.name.startsWith(baseName + ' [EN]'));

    setLoadingImport(true);
    showToast(
      lang === 'CZ'
        ? 'Načítání historie kampaně do editoru...'
        : 'Loading campaign history into editor...',
      'info'
    );

    try {
      let czData = null;
      let enData = null;

      if (czCampaign) {
        const res = await supabase.functions.invoke(`send-newsletter?id=${czCampaign.id}`, { method: 'GET' });
        if (res.error) throw res.error;
        czData = res.data;
      }

      if (enCampaign && (!czCampaign || enCampaign.id !== czCampaign.id)) {
        const res = await supabase.functions.invoke(`send-newsletter?id=${enCampaign.id}`, { method: 'GET' });
        if (res.error) throw res.error;
        enData = res.data;
      }

      // Update form values
      setCampaignName(baseName);

      const parsedCZSubject = czData?.subject || selectedCampaign.subject || '';
      const parsedENSubject = enData?.subject || (enCampaign ? enCampaign.subject : '') || parsedCZSubject;

      setSubject(parsedCZSubject);
      setSubjectEN(parsedENSubject);

      const czBlocks = czData ? parseHtmlToBlocks(czData.htmlContent) : [];
      const enBlocks = enData ? parseHtmlToBlocks(enData.htmlContent) : [];

      const mergedBlocks = [];
      const maxLength = Math.max(czBlocks.length, enBlocks.length);

      for (let i = 0; i < maxLength; i++) {
        const czBlock = czBlocks[i];
        const enBlock = enBlocks[i];

        if (czBlock && enBlock && czBlock.type === enBlock.type) {
          if (czBlock.type === 'text') {
            mergedBlocks.push({
              id: czBlock.id,
              type: 'text',
              content: czBlock.content,
              contentEN: enBlock.content
            });
          } else if (czBlock.type === 'image') {
            mergedBlocks.push({
              id: czBlock.id,
              type: 'image',
              ratio: 'original',
              content: czBlock.content,
              contentEN: enBlock.content,
              linkUrl: czBlock.linkUrl || '',
              linkUrlEN: enBlock.linkUrl || ''
            });
          } else if (czBlock.type === 'button') {
            mergedBlocks.push({
              id: czBlock.id,
              type: 'button',
              text: czBlock.text,
              textEN: enBlock.text,
              url: czBlock.url || '',
              urlEN: enBlock.url || ''
            });
          }
        } else if (czBlock) {
          if (czBlock.type === 'text') {
            mergedBlocks.push({
              id: czBlock.id,
              type: 'text',
              content: czBlock.content,
              contentEN: czBlock.content
            });
          } else if (czBlock.type === 'image') {
            mergedBlocks.push({
              id: czBlock.id,
              type: 'image',
              ratio: 'original',
              content: czBlock.content,
              contentEN: czBlock.content,
              linkUrl: czBlock.linkUrl || '',
              linkUrlEN: czBlock.linkUrl || ''
            });
          } else if (czBlock.type === 'button') {
            mergedBlocks.push({
              id: czBlock.id,
              type: 'button',
              text: czBlock.text,
              textEN: czBlock.text,
              url: czBlock.url || '',
              urlEN: czBlock.url || ''
            });
          }
        } else if (enBlock) {
          if (enBlock.type === 'text') {
            mergedBlocks.push({
              id: enBlock.id,
              type: 'text',
              content: enBlock.content,
              contentEN: enBlock.content
            });
          } else if (enBlock.type === 'image') {
            mergedBlocks.push({
              id: enBlock.id,
              type: 'image',
              ratio: 'original',
              content: enBlock.content,
              contentEN: enBlock.content,
              linkUrl: enBlock.linkUrl || '',
              linkUrlEN: enBlock.linkUrl || ''
            });
          } else if (enBlock.type === 'button') {
            mergedBlocks.push({
              id: enBlock.id,
              type: 'button',
              text: enBlock.text,
              textEN: enBlock.text,
              url: enBlock.url || '',
              urlEN: enBlock.url || ''
            });
          }
        }
      }

      if (mergedBlocks.length > 0) {
        setBlocks(mergedBlocks);
        showToast(
          lang === 'CZ'
            ? 'Kampaň byla načtena do editoru!'
            : 'Campaign loaded into editor!',
          'success'
        );
      } else {
        showToast(
          lang === 'CZ'
            ? 'Nepodařilo se nalézt žádné bloky k načtení.'
            : 'No blocks found to load.',
          'warning'
        );
      }
    } catch (err) {
      console.error(err);
      showToast(
        lang === 'CZ'
          ? 'Chyba při načítání kampaně z historie.'
          : 'Error loading campaign from history.',
        'error'
      );
    } finally {
      setLoadingImport(false);
    }
  };

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
      ...(type === 'text' ? { contentEN: '' } : {}),
      ...(type === 'image' ? { ratio: 'original', linkUrl: '', contentEN: '', linkUrlEN: '' } : {}),
      ...(type === 'button' ? { text: 'Prohlížet nabídku', textEN: 'View offer', url: 'https://northvaletcg.eu', urlEN: 'https://northvaletcg.eu/?lang=en' } : {})
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

  const updateBlockContent = (index, value, field = 'content') => {
    setBlocks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateBlockContentEN = (index, value) => {
    setBlocks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], contentEN: value };
      return next;
    });
  };

  const updateBlockRatio = (index, value) => {
    setBlocks(prev => {
      const next = [...prev];
      // Reset image contents when ratio changes so they recrop if needed
      next[index] = { ...next[index], ratio: value, content: '', contentEN: '' };
      return next;
    });
  };

  const updateBlockLinkUrl = (index, value) => {
    setBlocks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], linkUrl: value };
      return next;
    });
  };

  const updateBlockLinkUrlEN = (index, value) => {
    setBlocks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], linkUrlEN: value };
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

  const updateBlockButtonTextEN = (index, value) => {
    setBlocks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], textEN: value };
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

  const updateBlockButtonUrlEN = (index, value) => {
    setBlocks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], urlEN: value };
      return next;
    });
  };

  // Helper to determine cropping crop frame dimensions based on selected ratio
  const getCropDimensions = () => {
    if (!cropTarget) return { frameW: 280, frameH: 112 };
    const targetBlock = blocks[cropTarget.index];
    const ratio = targetBlock ? targetBlock.ratio : 'landscape';

    if (ratio === 'square') {
      return { frameW: 200, frameH: 200 };
    } else if (ratio === 'portrait') {
      return { frameW: 180, frameH: 225 };
    }
    // Default to landscape
    return { frameW: 280, frameH: 112 };
  };

  // --- Image Handling & Cropping ---
  const handleFileChange = (e, index, field = 'content') => {
    const file = e.target.files[0];
    if (file) {
      processSelectedImage(file, index, field);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, index, field = 'content') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      processSelectedImage(file, index, field);
    }
  };

  const processSelectedImage = (file, index, field = 'content') => {
    const targetBlock = blocks[index];
    const ratio = targetBlock ? targetBlock.ratio : 'original';

    const reader = new FileReader();
    reader.onload = (event) => {
      if (ratio === 'original') {
        // No crop required: set content directly to original base64
        updateBlockContent(index, event.target.result, field);
      } else {
        // Crop is required: launch cropper modal
        setCropImageSrc(event.target.result);
        setCropImageFormat(file.type || 'image/jpeg');
        setCropTarget({ index, field });
        setIsCropping(true);

        cropRefX.current = 0;
        cropRefY.current = 0;
        cropRefScale.current = 1;
        minScaleRef.current = 0.1;
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (isCropping && cropImageSrc && canvasRef.current) {
      const canvas = canvasRef.current;
      const img = new Image();
      img.onload = () => {
        loadedImage.current = img;

        const { frameW, frameH } = getCropDimensions();

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

    const { frameW, frameH } = getCropDimensions();
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

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, canvas.width, frameY);
    ctx.fillRect(0, frameY + frameH, canvas.width, frameY);
    ctx.fillRect(0, frameY, frameX, frameH);
    ctx.fillRect(frameX + frameW, frameY, frameX, frameH);

    // Frame borders
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
    const { frameW, frameH } = getCropDimensions();

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

    // High resolution baseline scaling factor (base width 1400 for landscape, 1000 for square/portrait)
    const targetBlock = blocks[cropTarget.index];
    const ratio = targetBlock ? targetBlock.ratio : 'landscape';
    const baseW = ratio === 'landscape' ? 1400 : 1000;
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

    setBlocks(prev => {
      const next = [...prev];
      if (cropTarget.index !== undefined && cropTarget.index < next.length) {
        const targetField = cropTarget.field || 'content';
        next[cropTarget.index][targetField] = croppedUrl;
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
    <div className="ctf-shell" style={{ display: 'flex', gap: '24px', minHeight: '600px', flexDirection: isMobile ? 'column' : 'row', textAlign: 'left', width: '100%', boxSizing: 'border-box' }}>

      {/* LEFT COLUMN: Subscribers Overview & Campaign History (Tabbed layout to save space) */}
      <section className="ctf-tree-col" style={{ flex: isMobile ? 'none' : '0.8 1 0', width: isMobile ? '100%' : undefined, minWidth: isMobile ? '100%' : '260px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Tabs controls */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            type="button"
            className={`btn ${leftTab === 'subscribers' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 0', fontSize: '11px', fontWeight: 'bold' }}
            onClick={() => setLeftTab('subscribers')}
          >
            👥 {lang === 'CZ' ? 'Odběratelé' : 'Subscribers'}
          </button>
          <button
            type="button"
            className={`btn ${leftTab === 'campaigns' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 0', fontSize: '11px', fontWeight: 'bold' }}
            onClick={() => setLeftTab('campaigns')}
          >
            📜 {lang === 'CZ' ? 'Historie' : 'History'}
          </button>
        </div>

        {/* Tab 1: Subscribers list */}
        {leftTab === 'subscribers' && (
          <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.06)', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                  {lang === 'CZ' ? 'Seznam odběratelů' : 'Subscribers list'}
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {lang === 'CZ' ? `${subscribers.length} celkem` : `${subscribers.length} total`}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '10px', padding: '4px 8px' }}
                disabled={subscribers.length === 0}
                onClick={handleExportCSV}
              >
                📥 CSV
              </button>
            </div>

            <input
              type="text"
              placeholder={lang === 'CZ' ? 'Vyhledat...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ctf-input"
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: '10px', padding: '6px 10px', fontSize: '12px' }}
            />

            {loadingSubs ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{lang === 'CZ' ? 'Načítání...' : 'Loading...'}</p>
            ) : filteredSubscribers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', margin: '12px 0' }}>
                {lang === 'CZ' ? 'Žádní odběratelé.' : 'No subscribers.'}
              </p>
            ) : (
              <div style={{ maxHeight: '350px', overflowY: 'auto', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                      <th style={{ padding: '6px', textAlign: 'left', color: 'var(--text-muted)' }}>E-mail</th>
                      {!isMobile && <th style={{ padding: '6px', textAlign: 'center', color: 'var(--text-muted)', width: '45px' }}>Jazyk</th>}
                      <th style={{ padding: '6px', textAlign: 'left', color: 'var(--text-muted)', width: '60px' }}>Stav</th>
                      <th style={{ padding: '6px', textAlign: 'center', color: 'var(--text-muted)', width: '30px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscribers.map(sub => (
                      <tr key={sub.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '6px', color: '#fff', wordBreak: 'break-all' }}>{sub.email}</td>
                        {!isMobile && <td style={{ padding: '6px', textAlign: 'center', color: 'var(--text-muted)' }}>{sub.lang || 'CZ'}</td>}
                        <td style={{ padding: '6px', color: sub.confirmed ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                          {sub.confirmed ? (lang === 'CZ' ? 'Aktiv' : 'Active') : (lang === 'CZ' ? 'Čeká' : 'DOI')}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm({ isOpen: true, targetEmail: sub.email })}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '10px', padding: 0 }}
                            title={lang === 'CZ' ? 'Odebrat' : 'Remove'}
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
        )}

        {/* Tab 2: Campaigns history */}
        {leftTab === 'campaigns' && (
          <div style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.06)', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#fff' }}>
              {lang === 'CZ' ? 'Historie kampaní' : 'Campaigns history'}
            </h4>

            {loadingCamps ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{lang === 'CZ' ? 'Načítání...' : 'Loading...'}</p>
            ) : campaigns.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', margin: 0 }}>
                {lang === 'CZ' ? 'Žádné odeslané kampaně.' : 'No sent campaigns.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
                {campaigns.map(camp => (
                  <div key={camp.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: '12px', color: '#fff', marginBottom: '2px', wordBreak: 'break-word' }}>{camp.name}</strong>
                      <span style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px', wordBreak: 'break-word', fontSize: '11px', opacity: 0.85 }}>{camp.subject}</span>
                      <span style={{ color: 'var(--color-gold)', fontWeight: 'bold', fontSize: '10px' }}>
                        {camp.sentDate ? new Date(camp.sentDate).toLocaleDateString() : 'Odesláno'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px', marginTop: '2px' }}>
                      <button
                        type="button"
                        onClick={() => handleLoadCampaign(camp)}
                        className="btn btn-secondary"
                        style={{ flex: 1, fontSize: '10px', padding: '6px 10px', background: 'rgba(253,189,22,0.08)', color: 'var(--color-gold)', border: '1px solid rgba(253,189,22,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                        disabled={loadingImport || deletingCampId === camp.id}
                      >
                        📥 {lang === 'CZ' ? 'Načíst do editoru' : 'Load to editor'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCampConfirm({ isOpen: true, targetId: camp.id, campaignName: camp.name })}
                        className="btn btn-secondary"
                        style={{ flex: 1, fontSize: '10px', padding: '6px 10px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                        disabled={loadingImport || deletingCampId === camp.id}
                      >
                        🗑️ {deletingCampId === camp.id ? (lang === 'CZ' ? 'Mazání...' : 'Deleting...') : (lang === 'CZ' ? 'Smazat' : 'Delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* MIDDLE COLUMN: Campaign Composer Form (Block Editor) */}
      <section className="ctf-form-col" style={{ flex: isMobile ? 'none' : '1.2 1 0', width: isMobile ? '100%' : undefined, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.06)', padding: '20px', boxSizing: 'border-box', minWidth: isMobile ? '100%' : '320px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: 'var(--color-gold)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
          {lang === 'CZ' ? 'Editor newsletteru' : 'Campaign composer'}
        </h3>

        <form onSubmit={handleSendNewsletter} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Internal Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {lang === 'CZ' ? 'Název kampaně (vnitřní)' : 'Campaign Name (internal)'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="ctf-input"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder={lang === 'CZ' ? 'např. Letní akce 2026' : 'e.g., Summer sale 2026'}
              style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', fontSize: '12.5px' }}
              required
            />
          </div>

          {/* Subjects (CZ & EN) */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {lang === 'CZ' ? 'Předmět CZ' : 'Subject CZ'} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="ctf-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="např. Získejte slevu 15%!"
                style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', fontSize: '12.5px' }}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {lang === 'CZ' ? 'Předmět EN (Překlad)' : 'Subject EN (Translation)'} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="ctf-input"
                value={subjectEN}
                onChange={(e) => setSubjectEN(e.target.value)}
                placeholder="e.g., Get 15% off!"
                style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', fontSize: '12.5px' }}
                required
              />
            </div>
          </div>

          {/* Blocks Layout Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>
              {lang === 'CZ' ? 'OBSAH E-MAILU' : 'EMAIL BLOCKS'}
            </span>

            {blocks.map((block, index) => (
              <div
                key={block.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '12px',
                  position: 'relative'
                }}
              >
                {/* Block header with controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-gold)' }}>
                    #{index + 1} {block.type === 'text' ? (lang === 'CZ' ? 'TEXT' : 'TEXT') : block.type === 'image' ? (lang === 'CZ' ? 'OBRÁZEK' : 'IMAGE') : (lang === 'CZ' ? 'TLAČÍTKO' : 'BUTTON')}
                  </span>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => moveBlock(index, -1)}
                      disabled={index === 0}
                      style={{ background: 'rgba(255,255,255,0.04)', border: 'none', color: '#fff', padding: '2px 6px', borderRadius: '3px', cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: '10px', opacity: index === 0 ? 0.3 : 1 }}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(index, 1)}
                      disabled={index === blocks.length - 1}
                      style={{ background: 'rgba(255,255,255,0.04)', border: 'none', color: '#fff', padding: '2px 6px', borderRadius: '3px', cursor: index === blocks.length - 1 ? 'not-allowed' : 'pointer', fontSize: '10px', opacity: index === blocks.length - 1 ? 0.3 : 1 }}
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBlock(index)}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Block Content Inputs */}
                {block.type === 'text' && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Čeština (CZ)</label>
                      <textarea
                        className="ctf-textarea"
                        rows={3}
                        value={block.content}
                        onChange={(e) => updateBlockContent(index, e.target.value, 'content')}
                        placeholder={lang === 'CZ' ? 'Zde napište český text... (lze použít HTML tagy jako <h2>, <p>)' : 'Write Czech text here... (HTML tags allowed)'}
                        style={{ width: '100%', boxSizing: 'border-box', height: '80px', resize: 'vertical', fontSize: '12px' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Angličtina (EN)</label>
                      <textarea
                        className="ctf-textarea"
                        rows={3}
                        value={block.contentEN || ''}
                        onChange={(e) => updateBlockContentEN(index, e.target.value)}
                        placeholder={lang === 'CZ' ? 'Zde napište anglický překlad...' : 'Write English translation here...'}
                        style={{ width: '100%', boxSizing: 'border-box', height: '80px', resize: 'vertical', fontSize: '12px' }}
                        required
                      />
                    </div>
                  </div>
                )}

                {block.type === 'image' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Ratio & Link Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1.4fr 1.4fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{lang === 'CZ' ? 'Poměr stran' : 'Aspect ratio'}</label>
                        <select
                          value={block.ratio || 'original'}
                          onChange={(e) => updateBlockRatio(index, e.target.value)}
                          style={{ width: '100%', padding: '5px 8px', fontSize: '11px', background: '#0b0b0c', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px' }}
                        >
                          <option value="original">{lang === 'CZ' ? 'Bez ořezu (Canva)' : 'Original (No crop)'}</option>
                          <option value="landscape">{lang === 'CZ' ? 'Běžný (2.5:1)' : 'Landscape (2.5:1)'}</option>
                          <option value="square">{lang === 'CZ' ? 'Čtverec (1:1)' : 'Square (1:1)'}</option>
                          <option value="portrait">{lang === 'CZ' ? 'Portrét (4:5)' : 'Portrait (4:5)'}</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{lang === 'CZ' ? 'Proklik CZ (URL)' : 'Click CZ (URL)'}</label>
                        <input
                          type="url"
                          className="ctf-input"
                          placeholder="https://northvaletcg.eu/products"
                          value={block.linkUrl || ''}
                          onChange={(e) => updateBlockLinkUrl(index, e.target.value)}
                          style={{ width: '100%', padding: '5px 8px', fontSize: '11px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{lang === 'CZ' ? 'Proklik EN (URL)' : 'Click EN (URL)'}</label>
                        <input
                          type="url"
                          className="ctf-input"
                          placeholder="https://northvaletcg.eu/products?lang=en"
                          value={block.linkUrlEN || ''}
                          onChange={(e) => updateBlockLinkUrlEN(index, e.target.value)}
                          style={{ width: '100%', padding: '5px 8px', fontSize: '11px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    {/* Image File Box - CZ & EN */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                      {/* CZ image column */}
                      <div>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>{lang === 'CZ' ? 'Obrázek CZ' : 'Image CZ'}</span>
                        {block.content ? (
                          <div style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#000', padding: '4px' }}>
                            <img
                              src={block.content}
                              alt="CZ Banner"
                              style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '70px', objectFit: 'contain' }}
                            />
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                              <label
                                className="btn btn-secondary"
                                style={{ flex: 1, fontSize: '9px', padding: '3px 0', textAlign: 'center', cursor: 'pointer' }}
                              >
                                📷 {lang === 'CZ' ? 'Změnit' : 'Change'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleFileChange(e, index, 'content')}
                                  style={{ display: 'none' }}
                                />
                              </label>
                              <button
                                type="button"
                                className="btn"
                                style={{ flex: 1, fontSize: '9px', padding: '3px 0', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none' }}
                                onClick={() => updateBlockContent(index, '', 'content')}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index, 'content')}
                            onClick={() => {
                              const fileInput = document.getElementById(`file-cz-${block.id}`);
                              if (fileInput) fileInput.click();
                            }}
                            style={{
                              border: '1px dashed rgba(255, 255, 255, 0.12)',
                              borderRadius: '4px',
                              padding: '12px 6px',
                              textAlign: 'center',
                              background: 'rgba(255, 255, 255, 0.01)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                          >
                            <span style={{ fontSize: '12px' }}>📥</span>
                            <span style={{ fontSize: '9.5px', color: '#fff', fontWeight: 'bold' }}>
                              {lang === 'CZ' ? 'Nahrát CZ obrázek' : 'Upload CZ Image'}
                            </span>
                            <input
                              id={`file-cz-${block.id}`}
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e, index, 'content')}
                              style={{ display: 'none' }}
                            />
                          </div>
                        )}
                      </div>

                      {/* EN image column */}
                      <div>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>{lang === 'CZ' ? 'Obrázek EN (Nepovinný)' : 'Image EN (Optional)'}</span>
                        {block.contentEN ? (
                          <div style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#000', padding: '4px' }}>
                            <img
                              src={block.contentEN}
                              alt="EN Banner"
                              style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '70px', objectFit: 'contain' }}
                            />
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                              <label
                                className="btn btn-secondary"
                                style={{ flex: 1, fontSize: '9px', padding: '3px 0', textAlign: 'center', cursor: 'pointer' }}
                              >
                                📷 {lang === 'CZ' ? 'Změnit' : 'Change'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleFileChange(e, index, 'contentEN')}
                                  style={{ display: 'none' }}
                                />
                              </label>
                              <button
                                type="button"
                                className="btn"
                                style={{ flex: 1, fontSize: '9px', padding: '3px 0', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none' }}
                                onClick={() => updateBlockContent(index, '', 'contentEN')}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index, 'contentEN')}
                            onClick={() => {
                              const fileInput = document.getElementById(`file-en-${block.id}`);
                              if (fileInput) fileInput.click();
                            }}
                            style={{
                              border: '1px dashed rgba(255, 255, 255, 0.12)',
                              borderRadius: '4px',
                              padding: '12px 6px',
                              textAlign: 'center',
                              background: 'rgba(255, 255, 255, 0.01)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                          >
                            <span style={{ fontSize: '12px' }}>📥</span>
                            <span style={{ fontSize: '9.5px', color: '#fff', fontWeight: 'bold' }}>
                              {lang === 'CZ' ? 'Nahrát EN obrázek' : 'Upload EN Image'}
                            </span>
                            <input
                              id={`file-en-${block.id}`}
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e, index, 'contentEN')}
                              style={{ display: 'none' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {block.type === 'button' && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '9.5px', fontWeight: 'bold', color: 'var(--text-muted)' }}>České tlačítko (CZ)</label>
                      <input
                        type="text"
                        className="ctf-input"
                        placeholder="Text tlačítka (CZ)"
                        value={block.text || ''}
                        onChange={(e) => updateBlockButtonText(index, e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', fontSize: '11px', padding: '5px 8px' }}
                        required
                      />
                      <input
                        type="url"
                        className="ctf-input"
                        placeholder="Odkaz CZ (https://...)"
                        value={block.url || ''}
                        onChange={(e) => updateBlockButtonUrl(index, e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', fontSize: '11px', padding: '5px 8px' }}
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '9.5px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Anglické tlačítko (EN)</label>
                      <input
                        type="text"
                        className="ctf-input"
                        placeholder="Button text (EN)"
                        value={block.textEN || ''}
                        onChange={(e) => updateBlockButtonTextEN(index, e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', fontSize: '11px', padding: '5px 8px' }}
                        required
                      />
                      <input
                        type="url"
                        className="ctf-input"
                        placeholder="Link EN (https://...)"
                        value={block.urlEN || ''}
                        onChange={(e) => updateBlockButtonUrlEN(index, e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', fontSize: '11px', padding: '5px 8px' }}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Block Buttons */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: isMobile ? 'none' : 1, padding: '8px 0', fontSize: '10px', fontWeight: 'bold', width: '100%' }}
              onClick={() => addBlock('text')}
            >
              ➕ TEXT
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: isMobile ? 'none' : 1, padding: '8px 0', fontSize: '10px', fontWeight: 'bold', width: '100%' }}
              onClick={() => addBlock('image')}
            >
              ➕ OBRÁZEK
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: isMobile ? 'none' : 1, padding: '8px 0', fontSize: '10px', fontWeight: 'bold', width: '100%' }}
              onClick={() => addBlock('button')}
            >
              ➕ TLAČÍTKO
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', fontWeight: 'bold', marginTop: '8px', fontSize: '12px' }}
            disabled={isSending}
          >
            {isSending
              ? (lang === 'CZ' ? 'Odesílání...' : 'Sending...')
              : (lang === 'CZ' ? '🚀 ROZESLAT newsletter' : '🚀 SEND newsletter')
            }
          </button>
        </form>
      </section>

      {/* RIGHT COLUMN: Real-time Live Preview */}
      <section className="ctf-preview-col" style={{ flex: isMobile ? 'none' : '1.1 1 0', width: isMobile ? '100%' : undefined, background: '#0b0b0c', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px', boxSizing: 'border-box', minWidth: isMobile ? '100%' : '280px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--color-gold)' }}>
            👁️ {lang === 'CZ' ? 'Živý náhled e-mailu' : 'Live email preview'}
          </h4>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              type="button"
              onClick={() => setPreviewLang('CZ')}
              style={{ background: previewLang === 'CZ' ? 'var(--color-gold)' : 'transparent', color: previewLang === 'CZ' ? '#000' : '#fff', border: 'none', borderRadius: '3px', padding: '2px 8px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              CZ
            </button>
            <button
              type="button"
              onClick={() => setPreviewLang('EN')}
              style={{ background: previewLang === 'EN' ? 'var(--color-gold)' : 'transparent', color: previewLang === 'EN' ? '#000' : '#fff', border: 'none', borderRadius: '3px', padding: '2px 8px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              EN
            </button>
          </div>
        </div>

        {/* Browser Mockup Frame */}
        <div style={{
          background: '#131316',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: 1
        }}>
          {/* Mock Browser Header */}
          <div style={{ background: '#1c1c21', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            <div style={{ flex: 1, background: '#0b0b0c', borderRadius: '4px', fontSize: '9px', color: 'var(--text-muted)', padding: '2px 8px', marginLeft: '10px', textAlign: 'center', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {previewLang === 'EN'
                ? (subjectEN || subject || '[Empty English Subject]')
                : (subject || '[Prázdný předmět CZ]')}
            </div>
          </div>

          {/* Email Container Scroll Area */}
          <div style={{ padding: '16px', overflowY: 'auto', flex: 1, background: '#0b0b0c' }}>

            {/* The Email Document */}
            <div style={{
              width: '100%',
              maxWidth: '380px',
              margin: '0 auto',
              background: '#131316',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {/* Header Logo */}
              <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: '#131316' }}>
                <img
                  src="/logo s popisem.webp"
                  alt="NORTHVALE Logo"
                  style={{ maxHeight: '52px', height: 'auto', margin: '0 auto', display: 'block' }}
                />
              </div>

              {/* Render Blocks */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {blocks.map((block) => {
                  if (block.type === 'text') {
                    const textValue = previewLang === 'EN' ? block.contentEN : block.content;
                    return (
                      <div
                        key={block.id}
                        style={{
                          padding: '12px 18px 6px 18px',
                          fontSize: '11px',
                          lineHeight: '1.5',
                          color: '#d1d1d6',
                          wordBreak: 'break-word',
                          fontFamily: 'sans-serif'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: textValue
                            ? textValue.replace(/\n/g, '<br />')
                            : `<span style="font-style: italic; color: #6e6e73;">${previewLang === 'EN' ? '[Empty English text block]' : '[Prázdný textový blok]'}</span>`
                        }}
                      />
                    );
                  }

                  if (block.type === 'image') {
                    const imgValue = previewLang === 'EN' ? block.contentEN : block.content;
                    const hasLink = previewLang === 'EN' ? block.linkUrlEN : block.linkUrl;
                    const aspectStyles = {
                      landscape: { aspectRatio: '2.5 / 1' },
                      square: { aspectRatio: '1 / 1' },
                      portrait: { aspectRatio: '4 / 5' }
                    };
                    const currentStyle = block.ratio !== 'original' ? aspectStyles[block.ratio || 'landscape'] : {};

                    return (
                      <div key={block.id} style={{ width: '100%', padding: '0 0 10px 0', position: 'relative' }}>
                        {imgValue ? (
                          <div style={{ position: 'relative', width: '100%' }}>
                            <img
                              src={imgValue}
                              alt="Banner"
                              style={{
                                width: '100%',
                                display: 'block',
                                border: 'none',
                                objectFit: 'cover',
                                ...currentStyle
                              }}
                            />
                            {hasLink && (
                              <span style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(226, 186, 94, 0.95)', color: '#000', fontSize: '8px', padding: '2px 4px', borderRadius: '3px', fontWeight: 'bold', fontFamily: 'sans-serif' }}>
                                🔗 {lang === 'CZ' ? 'PROKLIK' : 'LINK'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px dashed rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#555',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            fontFamily: 'sans-serif',
                            padding: '24px 0',
                            ...aspectStyles[block.ratio === 'original' ? 'landscape' : (block.ratio || 'landscape')]
                          }}>
                            {previewLang === 'EN' ? '[Empty English image]' : '[Prázdný obrázek]'}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (block.type === 'button') {
                    const btnText = previewLang === 'EN' ? block.textEN : block.text;
                    return (
                      <div key={block.id} style={{ textAlign: 'center', padding: '8px 18px 12px 18px' }}>
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: btnText ? '#E2BA5E' : 'rgba(255,255,255,0.05)',
                          color: btnText ? '#0b0b0c' : '#666',
                          border: btnText ? 'none' : '1px dashed rgba(255,255,255,0.1)',
                          padding: '8px 20px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontFamily: 'sans-serif'
                        }}>
                          {btnText || (previewLang === 'EN' ? '[Empty English button]' : 'CTA BUTTON')}
                        </span>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>

              {/* Email Footer */}
              <div style={{
                padding: '16px',
                textAlign: 'center',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '9px',
                color: '#8a8a93',
                backgroundColor: '#0b0b0c',
                lineHeight: '1.5',
                fontFamily: 'sans-serif'
              }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#fff' }}>
                  {previewLang === 'EN' ? 'NORTHVALE s.r.o. | All rights reserved.' : 'NORTHVALE s.r.o. | Všechna práva vyhrazena.'}
                </p>
                <p style={{ margin: '0 0 10px 0' }}>info@northvaletcg.eu | +420 739 666 779</p>
                <p style={{ margin: '0 0 10px 0', fontSize: '8px', color: '#555' }}>
                  {previewLang === 'EN'
                    ? 'This email was sent based on newsletter subscription on our website northvaletcg.eu.'
                    : 'Tento e-mail byl odeslán na základě přihlášení k odběru newsletteru na našem webu northvaletcg.eu.'}
                </p>
                <span style={{ color: '#55555c', textDecoration: 'underline', fontSize: '9px', cursor: 'default' }}>
                  {previewLang === 'EN' ? 'Unsubscribe' : 'Odhlásit se z odběru'}
                </span>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
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
            padding: '24px',
            maxWidth: '380px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', margin: '0 0 10px 0' }}>
              {lang === 'CZ' ? 'Smazat odběratele?' : 'Remove Subscriber?'}
            </h4>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              {lang === 'CZ'
                ? `Opravdu chcete odebrat e-mail "${deleteConfirm.targetEmail}" ze seznamu odběratelů?`
                : `Are you sure you want to remove email "${deleteConfirm.targetEmail}" from the subscriber list?`}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setDeleteConfirm({ isOpen: false, targetEmail: null })}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#ef4444', color: '#fff', padding: '6px 12px', fontSize: '12px' }}
                onClick={handleDeleteSubscriber}
              >
                {lang === 'CZ' ? 'Odebrat' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Delete Confirmation Modal */}
      {deleteCampConfirm.isOpen && (
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
            padding: '24px',
            maxWidth: '380px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', margin: '0 0 10px 0' }}>
              {lang === 'CZ' ? 'Smazat kampaň?' : 'Delete Campaign?'}
            </h4>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              {lang === 'CZ'
                ? `Opravdu chcete smazat kampaň "${deleteCampConfirm.campaignName}" z historie?`
                : `Are you sure you want to delete campaign "${deleteCampConfirm.campaignName}" from history?`}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setDeleteCampConfirm({ isOpen: false, targetId: null, campaignName: '' })}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#ef4444', color: '#fff', padding: '6px 12px', fontSize: '12px' }}
                onClick={handleDeleteCampaign}
              >
                {lang === 'CZ' ? 'Smazat' : 'Delete'}
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
            padding: '24px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>✉️</span>
            <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: '0 0 10px 0' }}>
              {lang === 'CZ' ? 'Opravdu odeslat newsletter?' : 'Confirm Email Blast?'}
            </h4>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              {lang === 'CZ'
                ? `Tento krok vytvoří kampaň a okamžitě ji odešle na všechny aktivní a ověřené e-maily. Tuto akci nelze vzít zpět ani zastavit.`
                : `This will trigger a campaign in Brevo and immediately dispatch it to all active and verified email addresses. This action cannot be undone or stopped.`}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 16px', flex: 1, fontSize: '12px' }}
                onClick={() => setIsConfirmOpen(false)}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '8px 16px', flex: 1.5, background: 'var(--color-gold)', color: '#000', fontSize: '12px' }}
                onClick={handleConfirmSend}
              >
                {lang === 'CZ' ? 'Odeslat hromadně' : 'Send Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Import Overlay */}
      {loadingImport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'var(--bg-secondary, #141416)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '300px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>⏳</span>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', margin: '0' }}>
              {lang === 'CZ' ? 'Načítání kampaně do editoru...' : 'Loading campaign into editor...'}
            </h4>
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
            maxWidth: '500px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            position: 'relative'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 'bold', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', width: '100%', textAlign: 'center' }}>
              ✂️ {lang === 'CZ' ? 'Oříznout obrázek bloku' : 'Crop Block Image'}
            </h4>

            <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
              {lang === 'CZ' ? 'Tažením obrázek posuňte, posuvníkem níže přibližte.' : 'Drag to pan, use slider below to zoom.'}
            </p>

            <div style={{ position: 'relative', width: '100%', maxWidth: '380px', aspectRatio: '380/260', background: '#000', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
              <canvas
                ref={canvasRef}
                width={380}
                height={260}
                style={{ cursor: 'move', display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
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
            <div style={{ width: '100%', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>{lang === 'CZ' ? 'Přiblížení:' : 'Zoom:'}</span>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '20px' }}>
              <button
                type="button"
                style={{ flex: 1, padding: '8px 16px', fontSize: '11px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', cursor: 'pointer' }}
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
                style={{ flex: 1.5, padding: '8px 16px', fontSize: '11px', borderRadius: '6px', border: 'none', background: 'var(--color-gold)', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}
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
