import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { supabase } from '../../supabase';

export default function OrdersTab({ showToast }) {
  const { lang } = useTranslation();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [loadedOrders, setLoadedOrders] = useState({});
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [detailOrder, setDetailOrder] = useState(null);
  const [loadingDetailsProgress, setLoadingDetailsProgress] = useState({ current: 0, total: 0 });
  const [isExporting, setIsExporting] = useState(false);

  // Background loading reference to avoid duplicates
  const loadingQueueRef = useRef([]);

  useEffect(() => {
    fetchOrdersList();
  }, []);

  const fetchOrdersList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('pohoda-orders')
        .list('', {
          limit: 100,
          sortBy: { column: 'name', order: 'desc' }
        });

      if (error) throw error;

      // Filter files matching order_*.xml format
      const orderFiles = (data || []).filter(f => f.name.startsWith('order_') && f.name.endsWith('.xml'));
      setFiles(orderFiles);
      
      // Start background loading for missing details
      const missingIds = orderFiles
        .map(f => f.name)
        .filter(name => !loadedOrders[name]);
      
      if (missingIds.length > 0) {
        setLoadingDetailsProgress({ current: 0, total: missingIds.length });
        loadDetailsBatch(missingIds);
      }
    } catch (err) {
      console.error('Failed to load orders list:', err);
      showToast(lang === 'CZ' ? 'Chyba při stahování seznamu objednávek.' : 'Error fetching orders list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDetailsBatch = async (filenames) => {
    loadingQueueRef.current = filenames;
    
    // We fetch in small parallel batches of 5 to not hit rate limits and keep browser snappy
    const batchSize = 5;
    let completed = 0;

    const processQueue = async () => {
      while (loadingQueueRef.current.length > 0) {
        const batch = loadingQueueRef.current.splice(0, batchSize);
        await Promise.all(batch.map(async (filename) => {
          try {
            const { data, error } = await supabase.storage
              .from('pohoda-orders')
              .download(filename);
            
            if (error) throw error;
            
            const xmlText = await data.text();
            const parsed = parseOrderXml(xmlText, filename);
            
            setLoadedOrders(prev => ({
              ...prev,
              [filename]: parsed
            }));
          } catch (err) {
            console.error(`Failed to load details for ${filename}:`, err);
          }
        }));
        
        completed += batch.length;
        setLoadingDetailsProgress(prev => ({
          ...prev,
          current: Math.min(prev.total, completed)
        }));
      }
    };

    processQueue();
  };

  const parseOrderXml = (xmlText, filename) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    const getVal = (parent, tag) => {
      if (!parent) return '';
      let el = parent.getElementsByTagName('ord:' + tag)[0] || 
               parent.getElementsByTagName('typ:' + tag)[0] || 
               parent.getElementsByTagName(tag)[0];
      return el ? el.textContent : '';
    };

    const orderHeader = xmlDoc.getElementsByTagName('ord:orderHeader')[0] || 
                        xmlDoc.getElementsByTagName('orderHeader')[0];
                        
    const partnerEl = xmlDoc.getElementsByTagName('ord:partnerIdentity')[0] || 
                      xmlDoc.getElementsByTagName('partnerIdentity')[0];
                      
    const addressEl = partnerEl ? (partnerEl.getElementsByTagName('typ:address')[0] || 
                                   partnerEl.getElementsByTagName('address')[0]) : null;

    const orderId = getVal(orderHeader, 'number') || filename.replace('order_', '').replace('.xml', '');
    const date = getVal(orderHeader, 'date');
    const text = getVal(orderHeader, 'text');
    const paymentMethod = getVal(orderHeader, 'paymentType');
    const carrier = getVal(orderHeader, 'carrier') || 'GLS';

    const name = addressEl ? getVal(addressEl, 'name') : '';
    const city = addressEl ? getVal(addressEl, 'city') : '';
    const street = addressEl ? getVal(addressEl, 'street') : '';
    const zip = addressEl ? getVal(addressEl, 'zip') : '';
    const email = addressEl ? getVal(addressEl, 'email') : '';
    const phone = addressEl ? getVal(addressEl, 'phone') : '';

    // Parse items
    const itemElements = xmlDoc.getElementsByTagName('ord:orderItem') || 
                         xmlDoc.getElementsByTagName('orderItem');
    
    const items = [];
    let total = 0;
    let shippingCost = 0;
    let paymentSurcharge = 0;
    let shippingMethod = '';

    for (let i = 0; i < itemElements.length; i++) {
      const itemEl = itemElements[i];
      const stockItemEl = itemEl.getElementsByTagName('ord:stockItem')[0] || 
                          itemEl.getElementsByTagName('stockItem')[0];
                          
      const itemName = stockItemEl ? getVal(stockItemEl, 'stockName') : getVal(itemEl, 'text');
      const itemCode = stockItemEl ? getVal(stockItemEl, 'code') : '';
      const quantity = parseFloat(getVal(itemEl, 'quantity') || '1');
      const unitPrice = parseFloat(getVal(itemEl, 'unitPrice') || '0');
      const itemTotal = quantity * unitPrice;

      if (!stockItemEl) {
        const lowerName = itemName.toLowerCase();
        if (lowerName.includes('doprava') || lowerName.includes('gls') || lowerName.includes('dpd') || lowerName.includes('zásilkovna') || lowerName.includes('packeta') || lowerName.includes('pošta')) {
          shippingCost = unitPrice;
          shippingMethod = itemName;
        } else if (lowerName.includes('dobírk') || lowerName.includes('surcharge') || lowerName.includes('příplat')) {
          paymentSurcharge = unitPrice;
        }
      }

      items.push({
        name: itemName,
        code: itemCode,
        quantity,
        price: unitPrice,
        total: itemTotal,
        isService: !stockItemEl
      });

      total += itemTotal;
    }

    return {
      id: orderId,
      date,
      customerName: name,
      email,
      phone,
      street,
      city,
      zip,
      paymentMethod,
      carrier,
      shippingMethod,
      shippingCost,
      paymentSurcharge,
      items,
      totalPrice: total,
      rawXml: xmlText
    };
  };

  const handleSelectOrder = (id) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredFiles) => {
    const filteredIds = filteredFiles.map(f => {
      const details = loadedOrders[f.name];
      return details ? details.id : f.name.replace('order_', '').replace('.xml', '');
    });

    if (selectedOrderIds.length === filteredIds.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredIds);
    }
  };

  const triggerCsvDownload = (csvContent, filename) => {
    // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to GLS CSV Format for upload to www.mygls.cz ("IMPORT NOVÉHO BALÍKU")
  const exportGlsCsv = () => {
    if (selectedOrderIds.length === 0) return;

    // GLS Standard CSV Header
    // Semicolon separator is preferred in CZ/SK Excel
    let csv = 'Jméno příjemce;Ulice a č.p.;Město;PSČ;Kód země;Telefon;Email;Variabilní symbol (ID);Částka dobírky (Kč);Poznámka\r\n';

    selectedOrderIds.forEach(id => {
      // Find matching order in loaded details
      const orderFile = files.find(f => f.name.replace('order_', '').replace('.xml', '') === id || (loadedOrders[f.name] && loadedOrders[f.name].id === id));
      if (!orderFile) return;
      const order = loadedOrders[orderFile.name];
      if (!order) return;

      // Extract delivery details
      const name = order.customerName || '';
      const street = order.street || '';
      const city = order.city || '';
      // Clean ZIP (remove whitespace)
      const zip = (order.zip || '').replace(/\s+/g, '');
      const country = 'CZ'; // Default destination country code
      const phone = order.phone || '';
      const email = order.email || '';
      const refId = order.id || '';

      // If payment is Cash on Delivery, export total order price, otherwise 0/empty
      const isCod = (order.paymentMethod || '').toLowerCase().includes('dobírk') || 
                    (order.paymentMethod || '').toLowerCase().includes('cod');
      const codAmount = isCod ? order.totalPrice : '';

      const note = `Objednávka #${refId}`;

      // Escape semicolons and newlines in values
      const escapeCsv = (str) => {
        if (!str) return '';
        return str.toString().replace(/;/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '').trim();
      };

      csv += `${escapeCsv(name)};${escapeCsv(street)};${escapeCsv(city)};${escapeCsv(zip)};${escapeCsv(country)};${escapeCsv(phone)};${escapeCsv(email)};${escapeCsv(refId)};${codAmount};${escapeCsv(note)}\r\n`;
    });

    triggerCsvDownload(csv, `gls_export_${new Date().toISOString().split('T')[0]}.csv`);
    showToast(lang === 'CZ' ? `Exportováno ${selectedOrderIds.length} zásilek pro GLS.` : `Exported ${selectedOrderIds.length} parcels for GLS.`, 'success');
  };

  // Export to DPD CSV Format
  const exportDpdCsv = () => {
    if (selectedOrderIds.length === 0) return;

    let csv = 'Name;Street;City;Zip;Country;Phone;Email;COD_Amount;Reference\r\n';

    selectedOrderIds.forEach(id => {
      const orderFile = files.find(f => f.name.replace('order_', '').replace('.xml', '') === id || (loadedOrders[f.name] && loadedOrders[f.name].id === id));
      if (!orderFile) return;
      const order = loadedOrders[orderFile.name];
      if (!order) return;

      const name = order.customerName || '';
      const street = order.street || '';
      const city = order.city || '';
      const zip = (order.zip || '').replace(/\s+/g, '');
      const country = 'CZ';
      const phone = order.phone || '';
      const email = order.email || '';
      const refId = order.id || '';
      const isCod = (order.paymentMethod || '').toLowerCase().includes('dobírk') || 
                    (order.paymentMethod || '').toLowerCase().includes('cod');
      const codAmount = isCod ? order.totalPrice : '';

      const escapeCsv = (str) => {
        if (!str) return '';
        return str.toString().replace(/;/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '').trim();
      };

      csv += `${escapeCsv(name)};${escapeCsv(street)};${escapeCsv(city)};${escapeCsv(zip)};${escapeCsv(country)};${escapeCsv(phone)};${escapeCsv(email)};${codAmount};${escapeCsv(refId)}\r\n`;
    });

    triggerCsvDownload(csv, `dpd_export_${new Date().toISOString().split('T')[0]}.csv`);
    showToast(lang === 'CZ' ? `Exportováno ${selectedOrderIds.length} zásilek pro DPD.` : `Exported ${selectedOrderIds.length} parcels for DPD.`, 'success');
  };

  // Download all selected orders combined in a single Pohoda datapack XML
  const downloadCombinedPohodaXml = () => {
    if (selectedOrderIds.length === 0) return;

    const packId = 'PACK-' + Math.floor(100000 + Math.random() * 900000);
    let combinedItemsXml = '';

    selectedOrderIds.forEach(id => {
      const orderFile = files.find(f => f.name.replace('order_', '').replace('.xml', '') === id || (loadedOrders[f.name] && loadedOrders[f.name].id === id));
      if (!orderFile) return;
      const order = loadedOrders[orderFile.name];
      if (!order || !order.rawXml) return;

      // Extract the content inside the first <dat:dataPackItem> element
      const parser = new DOMParser();
      const doc = parser.parseFromString(order.rawXml, 'application/xml');
      const dataPackItem = doc.getElementsByTagName('dat:dataPackItem')[0] || 
                           doc.getElementsByTagName('dataPackItem')[0];

      if (dataPackItem) {
        // XMLSerializer to serialize the dataPackItem node
        const serializer = new XMLSerializer();
        let itemXml = serializer.serializeToString(dataPackItem);
        // Replace existing PackItem IDs to match the combined import structure
        combinedItemsXml += '\n  ' + itemXml;
      }
    });

    const combinedXml = `<?xml version="1.0" encoding="Windows-1250"?>
<dat:dataPack id="${packId}" version="2.0" note="Hromadny import eshop"
              xmlns:dat="http://www.stormware.cz/schema/version_2/data.xsd"
              xmlns:ord="http://www.stormware.cz/schema/version_2/order.xsd"
              xmlns:typ="http://www.stormware.cz/schema/version_2/type.xsd">${combinedItemsXml}
</dat:dataPack>`;

    // Download file
    const blob = new Blob([combinedXml], { type: 'application/xml;charset=windows-1250;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pohoda_import_${packId}.xml`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(lang === 'CZ' ? 'Hromadný Pohoda XML soubor stažen.' : 'Combined Pohoda XML file downloaded.', 'success');
  };

  // Get orders after search & carrier filtering
  const getFilteredOrders = () => {
    return files.filter(f => {
      const details = loadedOrders[f.name];
      const orderId = f.name.replace('order_', '').replace('.xml', '');
      
      // Filter by search query (Order ID or Customer Name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = orderId.toLowerCase().includes(query);
        const matchesName = details?.customerName?.toLowerCase().includes(query);
        const matchesEmail = details?.email?.toLowerCase().includes(query);
        if (!matchesId && !matchesName && !matchesEmail) return false;
      }

      // Filter by carrier
      if (carrierFilter !== 'all') {
        const detailsCarrier = (details?.carrier || 'GLS').toLowerCase();
        if (carrierFilter === 'gls' && !detailsCarrier.includes('gls')) return false;
        if (carrierFilter === 'dpd' && !detailsCarrier.includes('dpd')) return false;
        if (carrierFilter === 'zasilkovna' && !(detailsCarrier.includes('zasilkovna') || detailsCarrier.includes('packeta'))) return false;
        if (carrierFilter === 'posta' && !detailsCarrier.includes('pošta')) return false;
        if (carrierFilter === 'pickup' && !detailsCarrier.includes('odběr')) return false;
      }

      return true;
    });
  };

  const filteredFiles = getFilteredOrders();
  const allSelected = filteredFiles.length > 0 && selectedOrderIds.length === filteredFiles.length;

  return (
    <div className="orders-tab-container">
      <style>{`
        .orders-tab-container {
          color: #fff;
          font-family: var(--font-sans), system-ui, sans-serif;
        }
        .orders-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .orders-search-group {
          display: flex;
          gap: 12px;
          flex-grow: 1;
          max-width: 500px;
        }
        .orders-search-group input {
          flex-grow: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 10px 14px;
          color: #fff;
          font-size: 14px;
          outline: none;
        }
        .orders-search-group select {
          background: rgba(24, 24, 28, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 10px 14px;
          color: #fff;
          font-size: 14px;
          outline: none;
          cursor: pointer;
        }
        .orders-progress-bar {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }
        .orders-progress-fill {
          height: 6px;
          background: var(--nv-gold, #fdbd16);
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        .orders-progress-track {
          width: 200px;
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-left: 12px;
        }
        .orders-table-wrapper {
          background: rgba(24, 24, 28, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        .orders-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13.5px;
        }
        .orders-table th {
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 14px 16px;
          font-weight: 700;
          color: #8a8a92;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .orders-table td {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding: 14px 16px;
          vertical-align: middle;
        }
        .orders-table tr:hover td {
          background: rgba(255, 255, 255, 0.01);
        }
        .orders-checkbox-col {
          width: 40px;
          text-align: center;
        }
        .orders-table input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: var(--nv-gold, #fdbd16);
          cursor: pointer;
        }
        .orders-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .orders-badge-gls {
          background: rgba(0, 114, 187, 0.15);
          color: #0072bb;
          border: 1px solid rgba(0, 114, 187, 0.3);
        }
        .orders-badge-dpd {
          background: rgba(227, 27, 35, 0.15);
          color: #e31b23;
          border: 1px solid rgba(227, 27, 35, 0.3);
        }
        .orders-badge-zasilkovna {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .orders-badge-posta {
          background: rgba(253, 189, 22, 0.15);
          color: var(--nv-gold, #fdbd16);
          border: 1px solid rgba(253, 189, 22, 0.3);
        }
        .orders-badge-pickup {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .orders-action-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 4px;
          color: #fff;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 600;
        }
        .orders-action-btn:hover {
          border-color: var(--nv-gold, #fdbd16);
          color: var(--nv-gold, #fdbd16);
          background: rgba(253, 189, 22, 0.05);
        }
        .orders-action-btn-primary {
          background: var(--nv-gold, #fdbd16);
          border: 1px solid var(--nv-gold, #fdbd16);
          color: #000;
        }
        .orders-action-btn-primary:hover {
          background: #e5ab14;
          color: #000;
        }
        .orders-floating-bar {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(24, 24, 28, 0.96);
          border: 1px solid rgba(253, 189, 22, 0.3);
          border-radius: 8px;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.6);
          backdrop-filter: blur(10px);
          z-index: 999;
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { bottom: -100px; opacity: 0; }
          to { bottom: 24px; opacity: 1; }
        }
        .orders-floating-info {
          font-size: 14px;
          font-weight: 700;
        }
        .orders-floating-actions {
          display: flex;
          gap: 12px;
        }
        /* Modal Styles */
        .orders-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .orders-modal-content {
          background: rgba(24, 24, 28, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 32px;
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.5);
          position: relative;
        }
        .orders-modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: none;
          border: none;
          color: #8a8a92;
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        }
        .orders-modal-close:hover {
          color: #fff;
        }
        .orders-modal-header {
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .orders-modal-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--nv-gold, #fdbd16);
          margin: 0;
        }
        .orders-modal-meta {
          font-size: 12px;
          color: #8a8a92;
          margin-top: 4px;
        }
        .orders-modal-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }
        .orders-modal-col h4 {
          font-size: 13px;
          color: #8a8a92;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .orders-modal-col p {
          margin: 4px 0;
          font-size: 14px;
          color: #fff;
        }
        .orders-modal-items {
          margin-bottom: 24px;
        }
        .orders-modal-items table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
          text-align: left;
        }
        .orders-modal-items th {
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding: 8px 0;
          color: #8a8a92;
          font-size: 11px;
          text-transform: uppercase;
        }
        .orders-modal-items td {
          border-bottom: 1px solid rgba(255,255,255,0.04);
          padding: 12px 0;
        }
        .orders-modal-totals {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }
        .orders-modal-total-row {
          display: flex;
          width: 250px;
          justify-content: space-between;
          font-size: 13.5px;
          color: #8a8a92;
        }
        .orders-modal-total-final {
          display: flex;
          width: 250px;
          justify-content: space-between;
          font-size: 16px;
          font-weight: 800;
          color: var(--nv-gold, #fdbd16);
          margin-top: 6px;
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 8px;
        }
      `}</style>

      <div className="orders-toolbar">
        <div className="orders-search-group">
          <input 
            type="text" 
            placeholder={lang === 'CZ' ? 'Hledat podle ID, jména zákazníka...' : 'Search by ID, customer name...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select value={carrierFilter} onChange={(e) => setCarrierFilter(e.target.value)}>
            <option value="all">{lang === 'CZ' ? 'Všichni dopravci' : 'All Carriers'}</option>
            <option value="gls">GLS</option>
            <option value="dpd">DPD</option>
            <option value="zasilkovna">Zásilkovna / Packeta</option>
            <option value="posta">Česká pošta</option>
            <option value="pickup">{lang === 'CZ' ? 'Osobní odběr' : 'Local Pickup'}</option>
          </select>
        </div>

        <button className="orders-action-btn" onClick={fetchOrdersList} disabled={loading}>
          {loading ? (lang === 'CZ' ? 'Aktualizuji...' : 'Refreshing...') : (lang === 'CZ' ? 'Načíst znovu' : 'Refresh list')}
        </button>
      </div>

      {/* Progress bar showing XML background downloading progress */}
      {loadingDetailsProgress.current < loadingDetailsProgress.total && (
        <div className="orders-progress-bar">
          <div>
            {lang === 'CZ' 
              ? `Načítání detailů objednávek... (${loadingDetailsProgress.current} z ${loadingDetailsProgress.total})` 
              : `Loading order details... (${loadingDetailsProgress.current} of ${loadingDetailsProgress.total})`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>{Math.round((loadingDetailsProgress.current / loadingDetailsProgress.total) * 100)}%</span>
            <div className="orders-progress-track">
              <div className="orders-progress-fill" style={{ width: `${(loadingDetailsProgress.current / loadingDetailsProgress.total) * 100}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <div className="spinner-loader co-spinner" style={{ margin: '0 auto 20px auto' }}></div>
          <p>{lang === 'CZ' ? 'Stahuji seznam XML souborů...' : 'Downloading list of XML files...'}</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', background: 'rgba(24, 24, 28, 0.4)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>📦</span>
          <p style={{ color: '#8a8a92', margin: 0 }}>
            {lang === 'CZ' ? 'Nebyly nalezeny žádné objednávky.' : 'No orders found.'}
          </p>
        </div>
      ) : (
        <div className="orders-table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th className="orders-checkbox-col">
                  <input 
                    type="checkbox" 
                    checked={allSelected} 
                    onChange={() => handleSelectAll(filteredFiles)}
                  />
                </th>
                <th>{lang === 'CZ' ? 'Číslo objednávky' : 'Order ID'}</th>
                <th>{lang === 'CZ' ? 'Datum' : 'Date'}</th>
                <th>{lang === 'CZ' ? 'Zákazník' : 'Customer'}</th>
                <th>{lang === 'CZ' ? 'Dopravce' : 'Carrier'}</th>
                <th>{lang === 'CZ' ? 'Způsob platby' : 'Payment'}</th>
                <th>{lang === 'CZ' ? 'Celkem' : 'Total Price'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'CZ' ? 'Akce' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map(file => {
                const details = loadedOrders[file.name];
                const orderId = file.name.replace('order_', '').replace('.xml', '');
                const fileDateStr = new Date(file.created_at).toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US');
                
                const isSelected = selectedOrderIds.includes(details?.id || orderId);

                const getCarrierBadgeClass = (carrierName) => {
                  const lower = (carrierName || '').toLowerCase();
                  if (lower.includes('gls')) return 'orders-badge-gls';
                  if (lower.includes('dpd')) return 'orders-badge-dpd';
                  if (lower.includes('zasilkovna') || lower.includes('packeta')) return 'orders-badge-zasilkovna';
                  if (lower.includes('pošta')) return 'orders-badge-posta';
                  if (lower.includes('odběr') || lower.includes('pickup')) return 'orders-badge-pickup';
                  return '';
                };

                return (
                  <tr key={file.name}>
                    <td className="orders-checkbox-col">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleSelectOrder(details?.id || orderId)}
                      />
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--nv-gold, #fdbd16)' }}>
                      #{details?.id || orderId}
                    </td>
                    <td>
                      {details?.date ? new Date(details.date).toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US') : fileDateStr}
                    </td>
                    <td>
                      {details ? (
                        <div>
                          <div style={{ fontWeight: '600' }}>{details.customerName}</div>
                          <div style={{ fontSize: '11px', color: '#8a8a92' }}>{details.email}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#8a8a92', fontSize: '12px' }}>{lang === 'CZ' ? 'Načítám...' : 'Loading...'}</span>
                      )}
                    </td>
                    <td>
                      {details ? (
                        <span className={`orders-badge ${getCarrierBadgeClass(details.carrier)}`}>
                          {details.carrier}
                        </span>
                      ) : (
                        <span style={{ color: '#8a8a92', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td>
                      {details ? (
                        <span style={{ fontSize: '12px' }}>{details.paymentMethod}</span>
                      ) : (
                        <span style={{ color: '#8a8a92', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td style={{ fontWeight: '700' }}>
                      {details ? (
                        `${details.totalPrice.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} Kč`
                      ) : (
                        <span style={{ color: '#8a8a92', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          className="orders-action-btn"
                          disabled={!details}
                          onClick={() => setDetailOrder(details)}
                        >
                          {lang === 'CZ' ? 'Detail' : 'Detail'}
                        </button>
                        <a 
                          href={details ? URL.createObjectURL(new Blob([details.rawXml], { type: 'application/xml' })) : '#'} 
                          download={`order_${details?.id || orderId}.xml`}
                          className="orders-action-btn"
                          onClick={(e) => {
                            if (!details) {
                              e.preventDefault();
                              showToast(lang === 'CZ' ? 'XML soubor se načítá.' : 'XML file is loading.', 'warning');
                            }
                          }}
                        >
                          XML
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Action Bar when orders are checked */}
      {selectedOrderIds.length > 0 && (
        <div className="orders-floating-bar">
          <div className="orders-floating-info">
            {lang === 'CZ' 
              ? `Vybráno: ${selectedOrderIds.length} objednávek` 
              : `Selected: ${selectedOrderIds.length} orders`}
          </div>
          <div className="orders-floating-actions">
            <button className="orders-action-btn orders-action-btn-primary" onClick={exportGlsCsv}>
              Export pro GLS (CSV)
            </button>
            <button className="orders-action-btn orders-action-btn-primary" onClick={exportDpdCsv}>
              Export pro DPD (CSV)
            </button>
            <button className="orders-action-btn" onClick={downloadCombinedPohodaXml}>
              Sloučit XML pro Pohodu
            </button>
          </div>
        </div>
      )}

      {/* Modal Detail View */}
      {detailOrder && (
        <div className="orders-modal-overlay" onClick={() => setDetailOrder(null)}>
          <div className="orders-modal-content" onClick={e => e.stopPropagation()}>
            <button className="orders-modal-close" onClick={() => setDetailOrder(null)}>✕</button>
            
            <header className="orders-modal-header">
              <h3 className="orders-modal-title">
                {lang === 'CZ' ? `Detail objednávky #${detailOrder.id}` : `Order Detail #${detailOrder.id}`}
              </h3>
              <div className="orders-modal-meta">
                {lang === 'CZ' ? `Vytvořeno dne: ${new Date(detailOrder.date).toLocaleDateString('cs-CZ')}` : `Placed on: ${new Date(detailOrder.date).toLocaleDateString('en-US')}`}
              </div>
            </header>

            <div className="orders-modal-grid">
              <div className="orders-modal-col">
                <h4>{lang === 'CZ' ? 'Osobní údaje' : 'Customer Info'}</h4>
                <p><strong>{detailOrder.customerName}</strong></p>
                <p>Email: {detailOrder.email}</p>
                <p>Tel: {detailOrder.phone}</p>
              </div>
              <div className="orders-modal-col">
                <h4>{lang === 'CZ' ? 'Adresa doručení' : 'Shipping Address'}</h4>
                <p>{detailOrder.street}</p>
                <p>{detailOrder.city}, {detailOrder.zip}</p>
                <p>Země: CZ</p>
              </div>
            </div>

            <div className="orders-modal-grid" style={{ marginTop: '-16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '20px' }}>
              <div className="orders-modal-col">
                <h4>{lang === 'CZ' ? 'Doprava a platba' : 'Delivery & Payment'}</h4>
                <p>{lang === 'CZ' ? 'Způsob přepravy' : 'Shipping Method'}: <strong>{detailOrder.shippingMethod || detailOrder.carrier}</strong></p>
                <p>{lang === 'CZ' ? 'Platební metoda' : 'Payment Method'}: <strong>{detailOrder.paymentMethod}</strong></p>
              </div>
              <div className="orders-modal-col">
                <h4>{lang === 'CZ' ? 'Služba' : 'Service info'}</h4>
                <p>Dopravní kód: <span className="orders-badge orders-badge-gls" style={{ textTransform: 'none' }}>{detailOrder.carrier}</span></p>
              </div>
            </div>

            <div className="orders-modal-items">
              <h4>{lang === 'CZ' ? 'Položky objednávky' : 'Items'}</h4>
              <table>
                <thead>
                  <tr>
                    <th>{lang === 'CZ' ? 'Název položky' : 'Product Name'}</th>
                    <th>{lang === 'CZ' ? 'Kód / SKU' : 'SKU'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'CZ' ? 'Množství' : 'Qty'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'CZ' ? 'Cena' : 'Price'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'CZ' ? 'Celkem' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailOrder.items.map((item, idx) => (
                    <tr key={idx} style={{ opacity: item.isService ? 0.7 : 1 }}>
                      <td>
                        {item.name}
                        {item.isService && <span style={{ fontSize: '10px', color: 'var(--nv-gold, #fdbd16)', marginLeft: '8px' }}>({lang === 'CZ' ? 'Poplatek/Služba' : 'Service fee'})</span>}
                      </td>
                      <td style={{ color: '#8a8a92', fontSize: '12px' }}>{item.code || '-'}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity} ks</td>
                      <td style={{ textAlign: 'right' }}>{item.price.toLocaleString()} Kč</td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>{item.total.toLocaleString()} Kč</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="orders-modal-totals">
              <div className="orders-modal-total-row">
                <span>{lang === 'CZ' ? 'Mezisoučet produktů' : 'Subtotal products'}:</span>
                <span>{detailOrder.items.filter(i => !i.isService).reduce((s, i) => s + i.total, 0).toLocaleString()} Kč</span>
              </div>
              
              {detailOrder.shippingCost > 0 && (
                <div className="orders-modal-total-row">
                  <span>{lang === 'CZ' ? 'Náklady na doručení' : 'Shipping fee'}:</span>
                  <span>{detailOrder.shippingCost.toLocaleString()} Kč</span>
                </div>
              )}

              {detailOrder.paymentSurcharge > 0 && (
                <div className="orders-modal-total-row">
                  <span>{lang === 'CZ' ? 'Dobírkový příplatek' : 'COD fee'}:</span>
                  <span>{detailOrder.paymentSurcharge.toLocaleString()} Kč</span>
                </div>
              )}

              <div className="orders-modal-total-final">
                <span>{lang === 'CZ' ? 'Celková cena' : 'Grand Total'}:</span>
                <span>{detailOrder.totalPrice.toLocaleString()} Kč</span>
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="orders-action-btn orders-action-btn-primary" onClick={() => setDetailOrder(null)}>
                {lang === 'CZ' ? 'Zavřít' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
