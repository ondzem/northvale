import { useState, useEffect, useRef, Fragment } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { supabase } from '../../supabase';
import InvoiceTemplate from './InvoiceTemplate';

export default function OrdersTab({ showToast }) {
  const { lang } = useTranslation();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [loadedOrders, setLoadedOrders] = useState({});
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [detailOrder, setDetailOrder] = useState(null);
  const [showInvoiceOrder, setShowInvoiceOrder] = useState(null);
  const [loadingDetailsProgress, setLoadingDetailsProgress] = useState({ current: 0, total: 0 });

  // GLS API configuration states (stored in localStorage)
  const [glsUsername, setGlsUsername] = useState('info@northvaletcg.eu');
  const [glsClientNumber, setGlsClientNumber] = useState('53016731');
  const [glsPassword, setGlsPassword] = useState('');
  const [glsTestMode, setGlsTestMode] = useState(false);
  const [glsPrinterType, setGlsPrinterType] = useState('Thermo');
  const [showGlsSettings, setShowGlsSettings] = useState(false);
  const [generatingLabelId, setGeneratingLabelId] = useState(null);

  // DPD API configuration states (stored in localStorage)
  const [dpdApiKey, setDpdApiKey] = useState('');
  const [dpdCustomerNumber, setDpdCustomerNumber] = useState('10029618142');
  const [dpdAddressId, setDpdAddressId] = useState('15908093');
  const [dpdTestMode, setDpdTestMode] = useState(true);

  // Background loading reference to avoid duplicates
  const loadingQueueRef = useRef([]);

  useEffect(() => {
    // Load GLS API credentials from local storage on mount
    const savedUsername = localStorage.getItem('gls_api_username') || 'info@northvaletcg.eu';
    const savedClientNumber = localStorage.getItem('gls_api_client_number') || '53016731';
    const savedPassword = localStorage.getItem('gls_api_password') || '';
    const savedTestMode = localStorage.getItem('gls_api_test_mode') === 'true';
    const savedPrinterType = localStorage.getItem('gls_api_printer_type') || 'Thermo';

    setGlsUsername(savedUsername);
    setGlsClientNumber(savedClientNumber);
    setGlsPassword(savedPassword);
    setGlsTestMode(savedTestMode);
    setGlsPrinterType(savedPrinterType);

    // Load DPD API credentials
    const savedDpdApiKey = localStorage.getItem('dpd_api_key') || '';
    const savedDpdCustomerNumber = localStorage.getItem('dpd_api_customer_number') || '10029618142';
    const savedDpdAddressId = localStorage.getItem('dpd_api_address_id') || '15908093';
    const savedDpdTestMode = localStorage.getItem('dpd_api_test_mode') !== 'false';

    setDpdApiKey(savedDpdApiKey);
    setDpdCustomerNumber(savedDpdCustomerNumber);
    setDpdAddressId(savedDpdAddressId);
    setDpdTestMode(savedDpdTestMode);

    fetchOrdersList();
  }, []);

  const saveGlsSettings = () => {
    localStorage.setItem('gls_api_username', glsUsername);
    localStorage.setItem('gls_api_client_number', glsClientNumber);
    localStorage.setItem('gls_api_password', glsPassword);
    localStorage.setItem('gls_api_test_mode', glsTestMode.toString());
    localStorage.setItem('gls_api_printer_type', glsPrinterType);

    localStorage.setItem('dpd_api_key', dpdApiKey);
    localStorage.setItem('dpd_api_customer_number', dpdCustomerNumber);
    localStorage.setItem('dpd_api_address_id', dpdAddressId);
    localStorage.setItem('dpd_api_test_mode', dpdTestMode.toString());

    setShowGlsSettings(false);
    showToast(lang === 'CZ' ? 'Nastavení dopravy API bylo uloženo.' : 'Shipping API Settings saved.', 'success');
  };

  const fetchOrdersList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-order-json', {
        method: 'GET'
      });

      if (error) throw error;

      // Filter files matching order_*.xml or order_*.json format
      const orderFiles = ((data && data.files) || []).filter(f => f.name.startsWith('order_') && (f.name.endsWith('.xml') || f.name.endsWith('.json')));
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
    
    // Fetch in small parallel batches of 5 to not hit rate limits
    const batchSize = 5;
    let completed = 0;

    const processQueue = async () => {
      while (loadingQueueRef.current.length > 0) {
        const batch = loadingQueueRef.current.splice(0, batchSize);
        await Promise.all(batch.map(async (filename) => {
          try {
            const { data, error } = await supabase.functions.invoke('save-order-json', {
              method: 'GET',
              queryParams: { filename }
            });
            
            if (error) throw error;
            
            let parsed;
            
            if (filename.endsWith('.json')) {
              const jsonObj = typeof data === 'string' ? JSON.parse(data) : data;
              const o = jsonObj.order;
              parsed = {
                id: o.id,
                date: o.date || new Date(jsonObj.created_at || Date.now()).toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US'),
                customerName: o.customer_name || '',
                email: o.customer_email || '',
                phone: o.customer_phone || '',
                street: o.customer_street || '',
                city: o.customer_city || '',
                zip: o.customer_zip || '',
                paymentMethod: o.payment_method || '',
                carrier: o.carrier || 'GLS',
                shippingMethod: o.shipping_method || '',
                shippingCost: parseFloat(o.shipping_cost || '0'),
                paymentSurcharge: parseFloat(o.payment_surcharge || '0'),
                items: (jsonObj.items || []).map(item => ({
                  name: item.name,
                  code: item.product_id || '',
                  quantity: parseFloat(item.quantity || '1'),
                  price: parseFloat(item.price || '0'),
                  total: parseFloat(item.quantity || '1') * parseFloat(item.price || '0'),
                  isService: false
                })),
                totalPrice: parseFloat(o.final_total || jsonObj.subtotal || '0'),
                isCompany: o.is_company || false,
                companyName: o.company_name || '',
                ico: o.ico || '',
                dic: o.dic || '',
                notes: o.notes || '',
                rawJson: jsonObj
              };

              // Append shipping and payment surcharge as service items if present
              if (parsed.shippingCost > 0) {
                parsed.items.push({
                  name: parsed.shippingMethod || 'Doprava',
                  code: '',
                  quantity: 1,
                  price: parsed.shippingCost,
                  total: parsed.shippingCost,
                  isService: true
                });
              }
              if (parsed.paymentSurcharge > 0) {
                parsed.items.push({
                  name: 'Dobírkový příplatek',
                  code: '',
                  quantity: 1,
                  price: parsed.paymentSurcharge,
                  total: parsed.paymentSurcharge,
                  isService: true
                });
              }
            } else {
              const textContent = typeof data === 'string' ? data : JSON.stringify(data);
              parsed = parseOrderXml(textContent, filename);
            }
            
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

    const orderId = getVal(orderHeader, 'number') || filename.replace('order_', '').replace('.json', '').replace('.xml', '');
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

  // Direct GLS API Labeling Call
  const generateGlsLabelApi = async (order) => {
    if (!glsPassword) {
      showToast(lang === 'CZ' ? 'Zadejte prosím nejprve vaše heslo pro GLS v nastavení API.' : 'Please enter your GLS password in the API settings first.', 'warning');
      setShowGlsSettings(true);
      return;
    }

    setGeneratingLabelId(order.id);
    try {
      const { data, error } = await supabase.functions.invoke('gls-labels', {
        body: {
          username: glsUsername,
          password: glsPassword,
          clientNumber: glsClientNumber,
          testMode: glsTestMode,
          typeOfPrinter: glsPrinterType,
          order: {
            id: order.id,
            customer_name: order.customerName,
            customer_street: order.street,
            customer_city: order.city,
            customer_zip: order.zip,
            customer_phone: order.phone,
            customer_email: order.email,
            total_price: order.totalPrice,
            payment_method: order.paymentMethod
          }
        }
      });

      if (error) throw error;

      if (data && data.success) {
        // Convert Base64 response to binary PDF Blob and download
        const pdfBytes = Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0));
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `gls_stitok_${order.id}_${data.parcelNumber}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(lang === 'CZ' 
          ? `Štítek vygenerován! Balík č.: ${data.parcelNumber}` 
          : `Label generated! Parcel No.: ${data.parcelNumber}`, 'success');
      } else {
        throw new Error(data?.error || 'Neznámá chyba při komunikaci s GLS API.');
      }
    } catch (err) {
      console.error('GLS Label generation failed:', err);
      showToast(lang === 'CZ' ? `Chyba API: ${err.message}` : `API Error: ${err.message}`, 'error');
    } finally {
      setGeneratingLabelId(null);
    }
  };

  // Direct DPD API Labeling Call
  const generateDpdLabelApi = async (order) => {
    if (!dpdApiKey) {
      showToast(lang === 'CZ' ? 'Zadejte prosím nejprve váš API klíč pro DPD v nastavení API.' : 'Please enter your DPD API key in the API settings first.', 'warning');
      setShowGlsSettings(true);
      return;
    }

    setGeneratingLabelId(order.id);
    try {
      const { data, error } = await supabase.functions.invoke('dpd-labels', {
        body: {
          apiKey: dpdApiKey,
          customerIdent: dpdCustomerNumber,
          senderIt4emId: dpdAddressId,
          testMode: dpdTestMode,
          order: {
            id: order.id,
            customer_name: order.customerName,
            customer_street: order.street,
            customer_city: order.city,
            customer_zip: order.zip,
            customer_phone: order.phone,
            customer_email: order.email,
            total_price: order.totalPrice,
            payment_method: order.paymentMethod
          }
        }
      });

      if (error) throw error;

      if (data && data.success) {
        // Convert Base64 response to binary PDF Blob and download
        const pdfBytes = Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0));
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `dpd_stitok_${order.id}_${data.parcelNumber}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(lang === 'CZ' 
          ? `Štítek DPD vygenerován! Balík č.: ${data.parcelNumber}` 
          : `DPD Label generated! Parcel No.: ${data.parcelNumber}`, 'success');
      } else {
        throw new Error(data?.error || 'Neznámá chyba při komunikaci s DPD API.');
      }
    } catch (err) {
      console.error('DPD Label generation failed:', err);
      showToast(lang === 'CZ' ? `Chyba DPD API: ${err.message}` : `DPD API Error: ${err.message}`, 'error');
    } finally {
      setGeneratingLabelId(null);
    }
  };

  const handleSelectOrder = (id) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredFiles) => {
    const filteredIds = filteredFiles.map(f => {
      const details = loadedOrders[f.name];
      return details ? details.id : f.name.replace('order_', '').replace('.json', '').replace('.xml', '');
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

  // Export to GLS CSV Format for backup upload to www.mygls.cz ("IMPORT NOVÉHO BALÍKU")
  const exportGlsCsv = () => {
    if (selectedOrderIds.length === 0) return;

    let csv = 'Jméno příjemce;Ulice a č.p.;Město;PSČ;Kód země;Telefon;Email;Variabilní symbol (ID);Částka dobírky (Kč);Poznámka\r\n';

    selectedOrderIds.forEach(id => {
      const orderFile = files.find(f => f.name.replace('order_', '').replace('.json', '').replace('.xml', '') === id || (loadedOrders[f.name] && loadedOrders[f.name].id === id));
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
      const note = `Objednávka #${refId}`;

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
      const orderFile = files.find(f => f.name.replace('order_', '').replace('.json', '').replace('.xml', '') === id || (loadedOrders[f.name] && loadedOrders[f.name].id === id));
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

  // Download all selected orders as a CSV sheet for the accountant
  const exportAccountantCsv = () => {
    if (selectedOrderIds.length === 0) {
      showToast(lang === 'CZ' ? 'Vyberte nejprve objednávky pro export.' : 'Select orders to export first.', 'warning');
      return;
    }

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'Číslo dokladu;Variabilní symbol;Datum vystavení;Datum plnění (DUZP);Firma/Odběratel;Ulice;Město;PSČ;Stát;IČO;DIČ;Základ 21%;Výše DPH 21%;Osvobozeno 0%;Celkem s DPH;Typ platby;Způsob dopravy\r\n';

    selectedOrderIds.forEach(id => {
      // Find matching filename in files list
      const orderFile = files.find(f => f.name.replace('order_', '').replace('.json', '').replace('.xml', '') === id || (loadedOrders[f.name] && loadedOrders[f.name].id === id));
      if (!orderFile) return;
      const order = loadedOrders[orderFile.name];
      if (!order) return;

      const vatRate = 0.21;
      const total = order.totalPrice || 0;
      const base = total / (1 + vatRate);
      const vat = total - base;

      const escape = (val) => {
        if (!val) return '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const dateStr = order.date || '';
      const name = order.customerName || '';
      const street = order.street || '';
      const city = order.city || '';
      const zip = order.zip || '';
      const country = 'CZ';
      const ico = order.ico || '';
      const dic = order.dic || '';
      const payMethod = order.paymentMethod || '';
      const shipMethod = order.shippingMethod || order.carrier || '';

      csv += `${id};${id};${dateStr};${dateStr};${escape(name)};${escape(street)};${escape(city)};${escape(zip)};${country};${ico};${dic};${base.toFixed(2).replace('.', ',')};${vat.toFixed(2).replace('.', ',')};0;${total.toFixed(2).replace('.', ',')};${escape(payMethod)};${escape(shipMethod)}\r\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `export_ucetnictvi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(lang === 'CZ' ? 'Přehled pro účetní byl stažen (CSV).' : 'Accountant summary downloaded (CSV).', 'success');
  };

  // Export selected orders in STORMWARE Pohoda XML format (invoice.xsd)
  const exportPohodaXml = () => {
    if (selectedOrderIds.length === 0) {
      showToast(lang === 'CZ' ? 'Vyberte nejprve objednávky pro export.' : 'Select orders to export first.', 'warning');
      return;
    }

    const packId = 'PACK-' + Math.floor(100000 + Math.random() * 900000);
    let combinedItemsXml = '';

    const escapeXml = (unsafe) => {
      if (!unsafe) return '';
      return String(unsafe).replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    };

    selectedOrderIds.forEach(id => {
      const orderFile = files.find(f => f.name.replace('order_', '').replace('.json', '').replace('.xml', '') === id || (loadedOrders[f.name] && loadedOrders[f.name].id === id));
      if (!orderFile) return;
      const order = loadedOrders[orderFile.name];
      if (!order) return;

      const dateStr = order.date ? new Date(order.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const name = order.customerName || '';
      const street = order.street || '';
      const city = order.city || '';
      const zip = order.zip || '';
      const email = order.email || '';
      const phone = order.phone || '';
      const payMethod = order.paymentMethod || 'platba kartou';
      const shippingCost = order.shippingCost || 0;
      const paymentSurcharge = order.paymentSurcharge || 0;

      let itemsXml = '';
      const itemsOnly = order.items ? order.items.filter(i => !i.isService) : [];

      itemsOnly.forEach(item => {
        itemsXml += `
        <inv:invoiceItem>
          <inv:text>${escapeXml(item.name)}</inv:text>
          <inv:quantity>${item.quantity}</inv:quantity>
          <inv:rateVAT>high</inv:rateVAT>
          <inv:homeCurrency>
            <typ:unitPrice>${item.price}</typ:unitPrice>
          </inv:homeCurrency>
          ${item.code ? `
          <inv:stockItem>
            <typ:stockItem>
              <typ:ids>${escapeXml(item.code)}</typ:ids>
            </typ:stockItem>
          </inv:stockItem>
          ` : ''}
        </inv:invoiceItem>`;
      });

      if (shippingCost > 0) {
        itemsXml += `
        <inv:invoiceItem>
          <inv:text>${escapeXml(order.shippingMethod || 'Doprava')}</inv:text>
          <inv:quantity>1</inv:quantity>
          <inv:rateVAT>high</inv:rateVAT>
          <inv:homeCurrency>
            <typ:unitPrice>${shippingCost}</typ:unitPrice>
          </inv:homeCurrency>
        </inv:invoiceItem>`;
      }

      if (paymentSurcharge > 0) {
        itemsXml += `
        <inv:invoiceItem>
          <inv:text>Dobírkový příplatek</inv:text>
          <inv:quantity>1</inv:quantity>
          <inv:rateVAT>high</inv:rateVAT>
          <inv:homeCurrency>
            <typ:unitPrice>${paymentSurcharge}</typ:unitPrice>
          </inv:homeCurrency>
        </inv:invoiceItem>`;
      }

      combinedItemsXml += `
  <dat:dataPackItem id="FA-${id}" version="2.0">
    <inv:invoice version="2.0">
      <inv:invoiceHeader>
        <inv:invoiceType>issuedInvoice</inv:invoiceType>
        <inv:number>
          <typ:numberRequested>${id}</typ:numberRequested>
        </inv:number>
        <inv:symVar>${id}</inv:symVar>
        <inv:date>${dateStr}</inv:date>
        <inv:dateTax>${dateStr}</inv:dateTax>
        <inv:dateDue>${dateStr}</inv:dateDue>
        <inv:text>Faktura za objednavku c. ${id}</inv:text>
        <inv:partnerIdentity>
          <typ:address>
            <typ:name>${escapeXml(name)}</typ:name>
            <typ:city>${escapeXml(city)}</typ:city>
            <typ:street>${escapeXml(street)}</typ:street>
            <typ:zip>${escapeXml(zip)}</typ:zip>
            <typ:email>${escapeXml(email)}</typ:email>
            <typ:phone>${escapeXml(phone)}</typ:phone>
            ${order.ico ? `<typ:ico>${order.ico}</typ:ico>` : ''}
            ${order.dic ? `<typ:dic>${order.dic}</typ:dic>` : ''}
          </typ:address>
        </inv:partnerIdentity>
        <inv:paymentType>
          <typ:ids>${escapeXml(payMethod)}</typ:ids>
        </inv:paymentType>
      </inv:invoiceHeader>
      <inv:invoiceDetail>${itemsXml}
      </inv:invoiceDetail>
    </inv:invoice>
  </dat:dataPackItem>`;
    });

    const combinedXml = `<?xml version="1.0" encoding="Windows-1250"?>
<dat:dataPack id="${packId}" version="2.0" note="Hromadny import faktur z eshopu"
              xmlns:dat="http://www.stormware.cz/schema/version_2/data.xsd"
              xmlns:inv="http://www.stormware.cz/schema/version_2/invoice.xsd"
              xmlns:typ="http://www.stormware.cz/schema/version_2/type.xsd">${combinedItemsXml}
</dat:dataPack>`;

    // Windows-1250 (CP1250) mapping table for central European characters
    const cp1250Map = {
      8364: 128, 8218: 130, 8222: 132, 8230: 133, 8224: 134, 8225: 135, 8240: 137, 352: 138, 
      8249: 139, 346: 140, 356: 141, 381: 142, 377: 143, 8216: 145, 8217: 146, 8220: 147, 
      8221: 148, 8226: 149, 8211: 150, 8212: 151, 8482: 153, 353: 154, 8250: 155, 347: 156, 
      357: 157, 382: 158, 378: 159, 160: 160, 711: 161, 728: 162, 321: 163, 164: 164, 
      260: 165, 166: 166, 167: 167, 168: 168, 169: 169, 350: 170, 171: 171, 172: 172, 
      173: 173, 174: 174, 379: 175, 176: 176, 177: 177, 731: 178, 322: 179, 180: 180, 
      181: 181, 182: 182, 183: 183, 184: 184, 261: 185, 351: 186, 187: 187, 317: 188, 
      733: 189, 318: 190, 380: 191, 340: 192, 193: 193, 194: 194, 258: 195, 196: 196, 
      313: 197, 262: 198, 199: 199, 268: 200, 201: 201, 280: 202, 203: 203, 282: 204, 
      205: 205, 206: 206, 270: 207, 272: 208, 323: 209, 327: 210, 211: 211, 212: 212, 
      336: 213, 214: 214, 215: 215, 344: 216, 366: 217, 218: 218, 368: 219, 220: 220, 
      221: 221, 354: 222, 223: 223, 341: 224, 225: 225, 226: 226, 259: 227, 228: 228, 
      314: 229, 263: 230, 231: 231, 269: 232, 233: 233, 281: 234, 235: 235, 283: 236, 
      237: 237, 238: 238, 271: 239, 273: 240, 324: 241, 328: 242, 243: 243, 244: 244, 
      337: 245, 246: 246, 247: 247, 345: 248, 367: 249, 250: 250, 369: 251, 252: 252, 
      253: 253, 355: 254, 729: 255
    };

    const bytes = new Uint8Array(combinedXml.length);
    for (let i = 0; i < combinedXml.length; i++) {
      const code = combinedXml.charCodeAt(i);
      if (code <= 127) {
        bytes[i] = code;
      } else if (cp1250Map[code] !== undefined) {
        bytes[i] = cp1250Map[code];
      } else {
        bytes[i] = 63; // '?' for unmappable
      }
    }

    const blob = new Blob([bytes], { type: 'application/xml;charset=windows-1250;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pohoda_export_${new Date().toISOString().split('T')[0]}.xml`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(lang === 'CZ' ? 'XML soubor pro Pohodu byl stažen.' : 'XML file for Pohoda downloaded.', 'success');
  };

  const downloadAllInvoicesTxt = () => {
    if (selectedOrderIds.length === 0) {
      showToast(lang === 'CZ' ? 'Vyberte nejprve objednávky pro stažení.' : 'Select orders to download first.', 'warning');
      return;
    }
    
    selectedOrderIds.forEach(orderId => {
      const link = document.createElement('a');
      link.href = `https://bfxzhggjpiyqfolqpxzz.supabase.co/storage/v1/object/public/invoices/invoice_${orderId}.txt`;
      link.download = `invoice_${orderId}.txt`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
    
    showToast(
      lang === 'CZ' 
        ? 'Stahování vybraných textových faktur bylo zahájeno.' 
        : 'Downloading selected text invoices started.', 
      'success'
    );
  };

  const getFilteredOrders = () => {
    return files.filter(f => {
      const details = loadedOrders[f.name];
      const orderId = f.name.replace('order_', '').replace('.json', '').replace('.xml', '');
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = orderId.toLowerCase().includes(query);
        const matchesName = details?.customerName?.toLowerCase().includes(query);
        const matchesEmail = details?.email?.toLowerCase().includes(query);
        if (!matchesId && !matchesName && !matchesEmail) return false;
      }

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

  if (showInvoiceOrder) {
    return (
      <InvoiceTemplate 
        order={showInvoiceOrder} 
        onClose={() => setShowInvoiceOrder(null)} 
        lang={lang} 
      />
    );
  }

  return (
    <div className="orders-tab-container">
      <style>{`
        @keyframes ordersSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
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
          max-width: 550px;
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
          display: inline-flex;
          align-items: center;
          gap: 6px;
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
        /* Settings panel */
        .orders-settings-card {
          background: rgba(24, 24, 28, 0.95);
          border: 1px solid rgba(253, 189, 22, 0.2);
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .orders-settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .orders-settings-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .orders-settings-field span {
          font-size: 12px;
          color: #8a8a92;
          font-weight: 700;
          text-transform: uppercase;
        }
        .orders-settings-field input, .orders-settings-field select {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 8px 12px;
          color: #fff;
          font-size: 13.5px;
          outline: none;
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

      {/* API Settings Panel */}
      {showGlsSettings && (
        <div className="orders-settings-card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'var(--nv-gold, #fdbd16)', fontWeight: '800' }}>
            {lang === 'CZ' ? 'Nastavení připojení dopravy API' : 'Shipping API Connection Settings'}
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
            {/* GLS Section */}
            <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '13.5px', fontWeight: '700' }}>GLS API</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label className="orders-settings-field">
                  <span>{lang === 'CZ' ? 'Uživatelské jméno (Email)' : 'Username (Email)'}</span>
                  <input type="email" value={glsUsername} onChange={e => setGlsUsername(e.target.value)} />
                </label>
                <label className="orders-settings-field">
                  <span>{lang === 'CZ' ? 'Zákaznické číslo (Client ID)' : 'Customer ID'}</span>
                  <input type="text" value={glsClientNumber} onChange={e => setGlsClientNumber(e.target.value)} />
                </label>
                <label className="orders-settings-field">
                  <span>{lang === 'CZ' ? 'Heslo do MyGLS' : 'MyGLS Password'}</span>
                  <input type="password" placeholder="••••••••" value={glsPassword} onChange={e => setGlsPassword(e.target.value)} />
                </label>
                <label className="orders-settings-field">
                  <span>{lang === 'CZ' ? 'Typ tiskárny' : 'Printer Type'}</span>
                  <select value={glsPrinterType} onChange={e => setGlsPrinterType(e.target.value)}>
                    <option value="Thermo">Thermo (Standard)</option>
                    <option value="A4_2x2">A4 - 2x2 štítky</option>
                    <option value="A4_4x1">A4 - 4x1 štítky</option>
                    <option value="Connect">Connect</option>
                    <option value="ShipItThermoPdf">ShipIt Thermo PDF</option>
                  </select>
                </label>
                <label className="orders-settings-field" style={{ justifyContent: 'flex-start', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                  <input type="checkbox" checked={glsTestMode} onChange={e => setGlsTestMode(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--nv-gold, #fdbd16)', margin: 0 }} />
                  <span style={{ textTransform: 'none', cursor: 'pointer', fontSize: '13px' }} onClick={() => setGlsTestMode(!glsTestMode)}>Testovací režim GLS</span>
                </label>
              </div>
            </div>

            {/* DPD Section */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '13.5px', fontWeight: '700' }}>DPD API (REST GeoAPI)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label className="orders-settings-field">
                  <span>{lang === 'CZ' ? 'API Klíč' : 'API Key'}</span>
                  <input type="password" placeholder="••••••••" value={dpdApiKey} onChange={e => setDpdApiKey(e.target.value)} />
                </label>
                <label className="orders-settings-field">
                  <span>{lang === 'CZ' ? 'Zákaznické číslo (DSW)' : 'Customer Number (DSW)'}</span>
                  <input type="text" value={dpdCustomerNumber} onChange={e => setDpdCustomerNumber(e.target.value)} />
                </label>
                <label className="orders-settings-field">
                  <span>{lang === 'CZ' ? 'ID adresy odesílatele (It4em ID)' : 'Sender Address ID (It4em ID)'}</span>
                  <input type="text" value={dpdAddressId} onChange={e => setDpdAddressId(e.target.value)} />
                </label>
                <label className="orders-settings-field" style={{ justifyContent: 'flex-start', flexDirection: 'row', gap: '8px', alignItems: 'center', marginTop: '22px' }}>
                  <input type="checkbox" checked={dpdTestMode} onChange={e => setDpdTestMode(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--nv-gold, #fdbd16)', margin: 0 }} />
                  <span style={{ textTransform: 'none', cursor: 'pointer', fontSize: '13px' }} onClick={() => setDpdTestMode(!dpdTestMode)}>Testovací režim DPD</span>
                </label>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="orders-action-btn orders-action-btn-primary" onClick={saveGlsSettings}>
              {lang === 'CZ' ? 'Uložit nastavení' : 'Save settings'}
            </button>
            <button className="orders-action-btn" onClick={() => setShowGlsSettings(false)}>
              {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

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

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="orders-action-btn" onClick={() => setShowGlsSettings(!showGlsSettings)}>
            ⚙️ {lang === 'CZ' ? 'Dopravci API Nastavení' : 'Shipping API Settings'}
          </button>
          <button className="orders-action-btn" onClick={fetchOrdersList} disabled={loading}>
            {loading ? (lang === 'CZ' ? 'Aktualizuji...' : 'Refreshing...') : (lang === 'CZ' ? 'Načíst znovu' : 'Refresh list')}
          </button>
        </div>
      </div>

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
                const orderId = file.name.replace('order_', '').replace('.json', '').replace('.xml', '');
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

                const isGls = details && details.carrier.toUpperCase().includes('GLS');
                const isDpd = details && details.carrier.toUpperCase().includes('DPD');

                return (
                  <Fragment key={file.name}>
                    <tr style={{ borderBottom: detailOrder && detailOrder.id === (details?.id || orderId) ? 'none' : '1px solid rgba(240, 240, 240, 0.04)' }}>
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
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {isGls && (
                            <button 
                              className="orders-action-btn orders-action-btn-primary"
                              disabled={generatingLabelId === details.id}
                              onClick={() => generateGlsLabelApi(details)}
                              title="Vygenerovat štítek přímo přes GLS API"
                            >
                              {generatingLabelId === details.id ? (
                                <div className="spinner-loader co-spinner" style={{ width: '12px', height: '12px', borderWidth: '1.5px' }}></div>
                              ) : (
                                '🏷️ GLS API'
                              )}
                            </button>
                          )}
                          {isDpd && (
                            <button 
                              className="orders-action-btn orders-action-btn-primary"
                              disabled={generatingLabelId === details.id}
                              onClick={() => generateDpdLabelApi(details)}
                              title="Vygenerovat štítek přímo přes DPD API"
                            >
                              {generatingLabelId === details.id ? (
                                <div className="spinner-loader co-spinner" style={{ width: '12px', height: '12px', borderWidth: '1.5px' }}></div>
                              ) : (
                                '🏷️ DPD API'
                              )}
                            </button>
                          )}
                          <button 
                            className="orders-action-btn"
                            style={detailOrder && detailOrder.id === (details?.id || orderId) ? { background: 'var(--nv-gold, #fdbd16)', color: '#0b0c10', fontWeight: 'bold' } : {}}
                            disabled={!details}
                            onClick={() => setDetailOrder(detailOrder && detailOrder.id === (details?.id || orderId) ? null : details)}
                          >
                            {detailOrder && detailOrder.id === (details?.id || orderId) ? (lang === 'CZ' ? 'Skrýt' : 'Hide') : (lang === 'CZ' ? 'Detail' : 'Detail')}
                          </button>
                          <button 
                            className="orders-action-btn orders-action-btn-primary"
                            disabled={!details}
                            onClick={() => setShowInvoiceOrder(details)}
                            title={lang === 'CZ' ? 'Vytisknout / Uložit PDF fakturu' : 'Print / Save PDF Invoice'}
                          >
                            📄 {lang === 'CZ' ? 'Faktura' : 'Invoice'}
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
                            title={lang === 'CZ' ? 'Stáhnout XML pro Pohodu' : 'Download XML for Pohoda'}
                          >
                            XML
                          </a>
                          <a 
                            href={details ? `https://bfxzhggjpiyqfolqpxzz.supabase.co/storage/v1/object/public/invoices/invoice_${details.id}.txt` : '#'} 
                            download={`invoice_${details?.id || orderId}.txt`}
                            className="orders-action-btn"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              if (!details) {
                                e.preventDefault();
                                showToast(lang === 'CZ' ? 'Faktura se načítá.' : 'Invoice is loading.', 'warning');
                              }
                            }}
                            title={lang === 'CZ' ? 'Stáhnout textovou fakturu' : 'Download text invoice'}
                          >
                            TXT
                          </a>
                        </div>
                      </td>
                    </tr>
                    {detailOrder && detailOrder.id === (details?.id || orderId) && (
                      <tr key={`${file.name}-details`}>
                        <td colSpan={8} style={{ padding: 0 }}>
                          <div style={{
                            padding: '24px 32px 32px 32px',
                            background: 'rgba(255, 255, 255, 0.015)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                            animation: 'ordersSlideDown 0.2s ease-out'
                          }}>
                            <div className="orders-modal-grid" style={{ marginBottom: '16px' }}>
                              <div className="orders-modal-col">
                                <h4 style={{ color: 'var(--nv-gold, #fdbd16)', fontWeight: 'bold' }}>{lang === 'CZ' ? 'Osobní údaje' : 'Customer Info'}</h4>
                                <p><strong>{detailOrder.customerName}</strong></p>
                                <p>Email: {detailOrder.email}</p>
                                <p>Tel: {detailOrder.phone}</p>
                              </div>
                              <div className="orders-modal-col">
                                <h4 style={{ color: 'var(--nv-gold, #fdbd16)', fontWeight: 'bold' }}>{lang === 'CZ' ? 'Adresa doručení' : 'Shipping Address'}</h4>
                                <p>{detailOrder.street}</p>
                                <p>{detailOrder.city}, {detailOrder.zip}</p>
                                <p>{lang === 'CZ' ? 'Země' : 'Country'}: CZ</p>
                              </div>
                            </div>

                            <div className="orders-modal-grid" style={{ marginBottom: '24px', marginTop: '16px' }}>
                              <div className="orders-modal-col">
                                <h4 style={{ color: 'var(--nv-gold, #fdbd16)', fontWeight: 'bold' }}>{lang === 'CZ' ? 'Fakturační údaje' : 'Billing Info'}</h4>
                                {detailOrder.isCompany || detailOrder.companyName ? (
                                  <>
                                    <p><strong>{detailOrder.companyName}</strong></p>
                                    {detailOrder.ico && <p>IČO: {detailOrder.ico}</p>}
                                    {detailOrder.dic && <p>DIČ: {detailOrder.dic}</p>}
                                  </>
                                ) : (
                                  <p style={{ color: '#8a8a92', fontStyle: 'italic' }}>
                                    {lang === 'CZ' ? 'Stejné jako doručovací' : 'Same as shipping'}
                                  </p>
                                )}
                              </div>
                              <div className="orders-modal-col">
                                <h4 style={{ color: 'var(--nv-gold, #fdbd16)', fontWeight: 'bold' }}>{lang === 'CZ' ? 'Poznámka k objednávce' : 'Order Notes'}</h4>
                                {detailOrder.notes ? (
                                  <p style={{ color: '#f0f0f0', whiteSpace: 'pre-wrap', background: 'rgba(253, 189, 22, 0.05)', padding: '10px 14px', borderLeft: '3px solid var(--nv-gold, #fdbd16)', borderRadius: '4px', margin: '4px 0 0 0' }}>
                                    {detailOrder.notes}
                                  </p>
                                ) : (
                                  <p style={{ color: '#8a8a92', fontStyle: 'italic' }}>
                                    {lang === 'CZ' ? 'Bez poznámky' : 'No notes'}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="orders-modal-grid" style={{ marginTop: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '20px' }}>
                              <div className="orders-modal-col">
                                <h4 style={{ color: 'var(--nv-gold, #fdbd16)', fontWeight: 'bold' }}>{lang === 'CZ' ? 'Doprava a platba' : 'Delivery & Payment'}</h4>
                                <p>{lang === 'CZ' ? 'Způsob přepravy' : 'Shipping Method'}: <strong>{detailOrder.shippingMethod || detailOrder.carrier}</strong></p>
                                <p>{lang === 'CZ' ? 'Platební metoda' : 'Payment Method'}: <strong>{detailOrder.paymentMethod}</strong></p>
                              </div>
                              <div className="orders-modal-col">
                                <h4 style={{ color: 'var(--nv-gold, #fdbd16)', fontWeight: 'bold' }}>{lang === 'CZ' ? 'Služba' : 'Service info'}</h4>
                                <p>Dopravní kód: <span className="orders-badge orders-badge-gls" style={{ textTransform: 'none' }}>{detailOrder.carrier}</span></p>
                              </div>
                            </div>

                            <div className="orders-modal-items" style={{ marginTop: '20px' }}>
                              <h4 style={{ color: 'var(--nv-gold, #fdbd16)', fontWeight: 'bold' }}>{lang === 'CZ' ? 'Položky objednávky' : 'Items'}</h4>
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

                            <div className="orders-modal-totals" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
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

                              <div className="orders-modal-total-final" style={{ color: 'var(--nv-gold, #fdbd16)', fontWeight: 'bold' }}>
                                <span>{lang === 'CZ' ? 'Celková cena' : 'Grand Total'}:</span>
                                <span>{detailOrder.totalPrice.toLocaleString()} Kč</span>
                              </div>
                            </div>

                            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                              <button className="orders-action-btn orders-action-btn-primary" onClick={() => setShowInvoiceOrder(detailOrder)}>
                                {lang === 'CZ' ? 'Zobrazit fakturu' : 'Show Invoice'}
                              </button>
                              <button className="orders-action-btn" onClick={() => setDetailOrder(null)}>
                                {lang === 'CZ' ? 'Skrýt detail' : 'Hide Details'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
            <button className="orders-action-btn" onClick={exportAccountantCsv}>
              {lang === 'CZ' ? 'Export pro účetní (CSV)' : 'Export for Accountant (CSV)'}
            </button>
            <button className="orders-action-btn orders-action-btn-primary" onClick={exportPohodaXml}>
              {lang === 'CZ' ? 'Export pro Pohodu (XML)' : 'Export for Pohoda (XML)'}
            </button>
            <button className="orders-action-btn orders-action-btn-primary" onClick={downloadAllInvoicesTxt}>
              {lang === 'CZ' ? 'Stáhnout faktury (TXT)' : 'Download Invoices (TXT)'}
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
