import { useState, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { FEATURE_FLAGS } from '../config';
import { supabase } from '../supabase';
import InvoiceTemplate from './admin/InvoiceTemplate';
import { subscribeToNewsletter, deleteSubscriber } from '../services/newsletter';

export default function UserPortal({ user, setUser, setActivePage, onLogout, showToast }) {
  const { lang, t } = useTranslation();
  const [activeTab, setActiveTab] = useState('settings');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showInvoiceOrder, setShowInvoiceOrder] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState({});

  const getPaymentStatusText = (status, lang) => {
    switch (status) {
      case 'paid':
      case 'uhrazeno':
        return lang === 'CZ' ? 'Uhrazeno' : 'Paid';
      case 'awaiting_payment':
      case 'neuhrazeno':
        return lang === 'CZ' ? 'Čeká na platbu' : 'Awaiting Payment';
      case 'cod':
      case 'na dobírku':
        return lang === 'CZ' ? 'Na dobírku' : 'Cash on Delivery';
      default:
        return lang === 'CZ' ? 'Čeká na platbu' : 'Awaiting Payment';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
      case 'uhrazeno':
        return { bg: 'rgba(16, 185, 129, 0.08)', text: '#10b981' };
      case 'awaiting_payment':
      case 'neuhrazeno':
        return { bg: 'rgba(245, 158, 11, 0.08)', text: '#f59e0b' };
      case 'cod':
      case 'na dobírku':
        return { bg: 'rgba(59, 130, 246, 0.08)', text: '#3b82f6' };
      default:
        return { bg: 'rgba(245, 158, 11, 0.08)', text: '#f59e0b' };
    }
  };

  const getFulfillmentStatusText = (status, lang) => {
    switch (status) {
      case 'shipped':
      case 'odesláno':
        return lang === 'CZ' ? 'Odesláno' : 'Shipped';
      case 'cancelled':
      case 'stornováno':
        return lang === 'CZ' ? 'Stornováno' : 'Cancelled';
      case 'pending':
      case 'přijato':
      default:
        return lang === 'CZ' ? 'Nevyřízeno' : 'Pending';
    }
  };

  const getFulfillmentStatusColor = (status) => {
    switch (status) {
      case 'shipped':
      case 'odesláno':
        return { bg: 'rgba(16, 185, 129, 0.08)', text: '#10b981' };
      case 'cancelled':
      case 'stornováno':
        return { bg: 'rgba(239, 68, 68, 0.08)', text: '#ef4444' };
      case 'pending':
      case 'přijato':
      default:
        return { bg: 'rgba(245, 158, 11, 0.08)', text: '#f59e0b' };
    }
  };

  // Contact Info states
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactName, setContactName] = useState(user.name || '');
  const [contactPhone, setContactPhone] = useState(user.phone || '');

  // Billing Info states
  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [billingCompany, setBillingCompany] = useState(user.billingCompany || '');
  const [billingName, setBillingName] = useState(user.billingName || '');
  const [billingStreet, setBillingStreet] = useState(user.billingStreet || '');
  const [billingCity, setBillingCity] = useState(user.billingCity || '');
  const [billingZip, setBillingZip] = useState(user.billingZip || '');
  const [billingCountry, setBillingCountry] = useState(user.billingCountry || 'Česká republika');
  const [billingIco, setBillingIco] = useState(user.billingIco || '');
  const [billingDic, setBillingDic] = useState(user.billingDic || '');
  const [billingBankAccount, setBillingBankAccount] = useState(user.billingBankAccount || '');

  // Shipping Address states
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState(null);
  const [shipName, setShipName] = useState('');
  const [shipStreet, setShipStreet] = useState('');
  const [shipCity, setShipCity] = useState('');
  const [shipZip, setShipZip] = useState('');
  const [shipCountry, setShipCountry] = useState('Česká republika');

  // Security Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // 2FA Setup states
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [enrolledFactor, setEnrolledFactor] = useState(null); // stores { id, qrCode, secret }
  const [authCode, setAuthCode] = useState('');
  const [authCodeError, setAuthCodeError] = useState(false);

  // Custom Confirm Dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: null,
    isDanger: false
  });

  const showConfirm = ({ title, message, confirmText, cancelText, onConfirm, isDanger = false }) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText: confirmText || (lang === 'CZ' ? 'Potvrdit' : 'Confirm'),
      cancelText: cancelText || (lang === 'CZ' ? 'Zrušit' : 'Cancel'),
      onConfirm: () => {
        onConfirm();
        closeConfirm();
      },
      isDanger
    });
  };

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  // Responsive state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Real-time live orders state fetched from Supabase database
  const [liveOrders, setLiveOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const fetchLiveOrders = async () => {
    if (!user || (!user.email && !user.id)) {
      setLoadingOrders(false);
      return;
    }
    setLoadingOrders(true);
    try {
      const emailToQuery = (user.email || '').toLowerCase().trim();
      
      // 1. Fetch orders stored as JSON files in Pohoda storage bucket
      let storageMapped = [];
      if (emailToQuery) {
        const { data, error } = await supabase.functions.invoke(`save-order-json?t=${Date.now()}`, {
          method: 'GET'
        });

        if (!error && data && Array.isArray(data.orders)) {
          storageMapped = data.orders.map(jsonObj => {
            const o = jsonObj.order || {};
            const items = Array.isArray(jsonObj.items) ? jsonObj.items : (o.items || []);
            const rawDate = o.date || jsonObj.created_at || new Date().toISOString();
            const orderDate = rawDate.includes('-') && rawDate.length > 10
              ? new Date(rawDate).toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US')
              : rawDate;

            const pStatus = (o.payment_status || o.paymentStatus || o.platba || 'awaiting_payment').toLowerCase();
            const fStatus = (o.fulfillment_status || o.fulfillmentStatus || o.stav || 'pending').toLowerCase();

            const mappedItems = items.map(it => ({
              name: it.name || it.productName,
              quantity: parseFloat(it.quantity || 1),
              price: parseFloat(it.price || 0)
            }));

            const itemsTotalSum = mappedItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
            const explicitTotal = parseFloat(o.final_total || o.finalTotal || o.total_price || o.totalPrice || 0);
            const computedTotal = explicitTotal > 0 ? explicitTotal : Math.max(0, itemsTotalSum + parseFloat(o.shipping_cost || o.shippingCost || 0) + parseFloat(o.payment_surcharge || o.paymentSurcharge || 0) - parseFloat(o.discount_amount || o.discountAmount || 0));

            return {
              id: String(o.id || ''),
              created_at: jsonObj.created_at || o.created_at || new Date().toISOString(),
              date: orderDate,
              paymentStatus: pStatus === 'uhrazeno' || pStatus === 'paid' ? 'paid' : (pStatus === 'cod' || pStatus === 'na dobírku' || pStatus === 'dobírka' ? 'cod' : 'awaiting_payment'),
              fulfillmentStatus: fStatus === 'vyřízeno' || fStatus === 'completed' || fStatus === 'odesláno' || fStatus === 'shipped' ? 'shipped' : (fStatus === 'stornováno' || fStatus === 'cancelled' ? 'cancelled' : 'pending'),
              shippingMethod: o.shipping_method || o.shippingMethod || 'Doprava',
              paymentMethod: o.payment_method || o.paymentMethod || 'Platba',
              finalTotal: computedTotal,
              subtotal: parseFloat(o.subtotal || itemsTotalSum),
              shippingCost: parseFloat(o.shipping_cost || o.shippingCost || 0),
              paymentSurcharge: parseFloat(o.payment_surcharge || o.paymentSurcharge || 0),
              items: mappedItems,
              customerName: o.customer_name || o.customerName || user.name,
              customerEmail: o.customer_email || o.customerEmail || user.email,
              customerPhone: o.customer_phone || o.customerPhone || user.phone,
              shippingStreet: o.customer_street || o.shippingStreet || o.street,
              shippingCity: o.customer_city || o.shippingCity || o.city,
              shippingZip: o.customer_zip || o.shippingZip || o.zip,
              isCompany: o.is_company || o.isCompany,
              companyName: o.company_name || o.companyName,
              ico: o.ico,
              dic: o.dic
            };
          });
        }
      }

      // 2. Fetch direct profile order_history from Supabase database if logged in
      let dbProfileOrders = [];
      if (user.id) {
        try {
          const { data: dbProf } = await supabase
            .from('profiles')
            .select('order_history')
            .eq('id', user.id)
            .maybeSingle();

          if (dbProf && Array.isArray(dbProf.order_history)) {
            dbProfileOrders = dbProf.order_history;
          }
        } catch (dbErr) {
          console.warn('DB profile orders fetch failed:', dbErr);
        }
      }

      // 3. Combine with user.orderHistory, user.order_history and dbProfileOrders
      const rawProfileHistory = [
        ...(Array.isArray(user.orderHistory) ? user.orderHistory : []),
        ...(Array.isArray(user.order_history) ? user.order_history : []),
        ...dbProfileOrders
      ];

      const historyMapped = rawProfileHistory.map(o => {
        const items = Array.isArray(o.items) ? o.items : [];
        const mappedItems = items.map(it => ({
          name: it.name || it.productName,
          quantity: parseFloat(it.quantity || 1),
          price: parseFloat(it.price || 0)
        }));
        const itemsTotalSum = mappedItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
        const explicitTotal = parseFloat(o.finalTotal || o.final_total || o.totalPrice || o.total_price || 0);
        const computedTotal = explicitTotal > 0 ? explicitTotal : Math.max(0, itemsTotalSum + parseFloat(o.shippingCost || o.shipping_cost || 0) + parseFloat(o.paymentSurcharge || o.payment_surcharge || 0) - parseFloat(o.discountAmount || o.discount_amount || 0));

        const pStatus = (o.paymentStatus || o.payment_status || o.platba || 'awaiting_payment').toLowerCase();
        const fStatus = (o.fulfillmentStatus || o.fulfillment_status || o.stav || 'pending').toLowerCase();

        return {
          id: String(o.id || ''),
          created_at: o.created_at || new Date().toISOString(),
          date: o.date || new Date().toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US'),
          paymentStatus: pStatus === 'uhrazeno' || pStatus === 'paid' ? 'paid' : (pStatus === 'cod' || pStatus === 'na dobírku' || pStatus === 'dobírka' ? 'cod' : 'awaiting_payment'),
          fulfillmentStatus: fStatus === 'vyřízeno' || fStatus === 'completed' || fStatus === 'odesláno' || fStatus === 'shipped' ? 'shipped' : (fStatus === 'stornováno' || fStatus === 'cancelled' ? 'cancelled' : 'pending'),
          shippingMethod: o.shippingMethod || o.shipping_method || 'Doprava',
          paymentMethod: o.paymentMethod || o.payment_method || 'Platba',
          finalTotal: computedTotal,
          subtotal: parseFloat(o.subtotal || itemsTotalSum),
          shippingCost: parseFloat(o.shippingCost || o.shipping_cost || 0),
          paymentSurcharge: parseFloat(o.paymentSurcharge || o.payment_surcharge || 0),
          items: mappedItems,
          customerName: o.customerName || user.name,
          customerEmail: o.customerEmail || user.email,
          customerPhone: o.customerPhone || user.phone,
          shippingStreet: o.shippingStreet || o.street,
          shippingCity: o.shippingCity || o.city,
          shippingZip: o.shippingZip || o.zip,
          isCompany: o.isCompany,
          companyName: o.companyName,
          ico: o.ico,
          dic: o.dic
        };
      });

      // Combine storage and profile history, deduplicating by ID key-by-key (non-empty wins)
      const combinedMap = new Map();
      const mergeOrderProps = (existing, incoming) => {
        if (!existing) return incoming;
        const merged = { ...existing };
        Object.keys(incoming).forEach(k => {
          const val = incoming[k];
          if (val !== undefined && val !== null && val !== '' && val !== 'Doprava' && val !== 'Platba') {
            if (k === 'paymentStatus' || k === 'fulfillmentStatus') {
              if (val !== 'awaiting_payment' && val !== 'pending') {
                merged[k] = val;
              }
            } else {
              merged[k] = val;
            }
          }
        });
        return merged;
      };

      storageMapped.forEach(o => {
        if (o.id) combinedMap.set(o.id, o);
      });
      historyMapped.forEach(o => {
        if (o.id) {
          const existing = combinedMap.get(o.id);
          combinedMap.set(o.id, mergeOrderProps(existing, o));
        }
      });

      const finalOrders = Array.from(combinedMap.values()).sort((a, b) => (b.id || '').localeCompare(a.id || ''));
      setLiveOrders(finalOrders);
    } catch (err) {
      console.error('Error fetching live orders:', err);
      setLiveOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchLiveOrders();
  }, [user.email, user.id, activeTab]);

  // Open / Download official PDF invoice generated by Supabase Edge Function
  const handleOpenInvoicePdf = async (order) => {
    try {
      const fileName = `invoice_${order.id}.pdf`;
      const { data, error } = await supabase.storage
        .from('invoices')
        .createSignedUrl(fileName, 3600);

      if (!error && data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
        return;
      }

      window.open(publicUrl, '_blank');
    } catch (err) {
      console.error('Error opening invoice PDF:', err);
      showToast(lang === 'CZ' ? 'Fakturu se nepodařilo otevřít.' : 'Could not open invoice PDF.', 'error');
    }
  };

  // Synchronize input fields when user object changes from Supabase fetch
  useEffect(() => {
    setContactName(user.name || '');
    setContactPhone(user.phone || '');
    setBillingCompany(user.billingCompany || '');
    setBillingName(user.billingName || '');
    setBillingStreet(user.billingStreet || '');
    setBillingCity(user.billingCity || '');
    setBillingZip(user.billingZip || '');
    setBillingCountry(user.billingCountry || 'Česká republika');
    setBillingIco(user.billingIco || '');
    setBillingDic(user.billingDic || '');
    setBillingBankAccount(user.billingBankAccount || '');
  }, [user]);

  // Save Contact Info Action
  const handleSaveContact = async () => {
    if (contactName.trim().length < 3) {
      showToast(lang === 'CZ' ? 'Celé jméno musí mít alespoň 3 znaky.' : 'Full name must be at least 3 characters.', 'error');
      return;
    }
    
    let isSuccess = false;
    if (user.id) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: contactName, phone: contactPhone })
          .eq('id', user.id);

        if (!error) {
          isSuccess = true;
        } else {
          console.warn('Database save failed (falling back to state):', error.message);
        }
      } catch (err) {
        console.warn('Database connection error:', err);
      }
    }

    // Always update local React state so UI is functional
    setUser(prev => ({ ...prev, name: contactName, phone: contactPhone }));
    setIsEditingContact(false);
    
    if (isSuccess) {
      showToast(lang === 'CZ' ? 'Kontaktní údaje byly úspěšně uloženy.' : 'Contact info was successfully saved.', 'success');
    } else {
      showToast(
        lang === 'CZ' 
          ? 'Kontaktní údaje se nepodařilo uložit do databáze (uloženo dočasně v paměti).' 
          : 'Failed to save contact info to the database (saved in memory).', 
        'warning'
      );
    }
  };

  // Save Billing Info Action
  const handleSaveBilling = async () => {
    const billingData = {
      billing_company: billingCompany,
      billing_name: billingName,
      billing_street: billingStreet,
      billing_city: billingCity,
      billing_zip: billingZip,
      billing_country: billingCountry,
      billing_ico: billingIco,
      billing_dic: billingDic,
      billing_bank_account: billingBankAccount
    };

    let isSuccess = false;
    if (user.id) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update(billingData)
          .eq('id', user.id);

        if (!error) {
          isSuccess = true;
        } else {
          console.warn('Database save failed (falling back to state):', error.message);
        }
      } catch (err) {
        console.warn('Database connection error:', err);
      }
    }

    setUser(prev => ({
      ...prev,
      billingCompany,
      billingName,
      billingStreet,
      billingCity,
      billingZip,
      billingCountry,
      billingIco,
      billingDic,
      billingBankAccount
    }));
    setIsEditingBilling(false);

    if (isSuccess) {
      showToast(lang === 'CZ' ? 'Fakturační údaje byly úspěšně uloženy.' : 'Billing details were successfully saved.', 'success');
    } else {
      showToast(
        lang === 'CZ' 
          ? 'Fakturační údaje se nepodařilo uložit do databáze (uloženo dočasně v paměti).' 
          : 'Failed to save billing details to the database (saved in memory).', 
        'warning'
      );
    }
  };

  // Address form cleanup
  const clearAddressForm = () => {
    setShipName('');
    setShipStreet('');
    setShipCity('');
    setShipZip('');
    setShipCountry('Česká republika');
  };

  // Add / Edit Shipping Address Action
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!shipName || !shipStreet || !shipCity || !shipZip) {
      showToast(lang === 'CZ' ? 'Prosím vyplňte všechna povinná pole.' : 'Please fill in all required fields.', 'error');
      return;
    }

    const newAddr = {
      name: shipName,
      street: shipStreet,
      city: shipCity,
      zip: shipZip,
      country: shipCountry
    };

    let updatedAddresses = [...(user.shippingAddresses || [])];
    if (editingAddressIndex !== null) {
      updatedAddresses[editingAddressIndex] = newAddr;
    } else {
      updatedAddresses.push(newAddr);
    }

    let isSuccess = false;
    if (user.id) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ shipping_addresses: updatedAddresses })
          .eq('id', user.id);

        if (!error) {
          isSuccess = true;
        } else {
          console.warn('Database save failed (falling back to state):', error.message);
        }
      } catch (err) {
        console.warn('Database connection error:', err);
      }
    }

    setUser(prev => ({ ...prev, shippingAddresses: updatedAddresses }));
    setIsAddingAddress(false);
    setEditingAddressIndex(null);
    clearAddressForm();

    if (isSuccess) {
      showToast(lang === 'CZ' ? 'Adresa byla úspěšně uložena.' : 'Address was successfully saved.', 'success');
    } else {
      showToast(
        lang === 'CZ' 
          ? 'Adresu se nepodařilo uložit do databáze (uloženo dočasně v paměti).' 
          : 'Failed to save address to the database (saved in memory).', 
        'warning'
      );
    }
  };

  // Edit address trigger
  const triggerEditAddress = (idx) => {
    const addr = user.shippingAddresses[idx];
    setEditingAddressIndex(idx);
    setShipName(addr.name || '');
    setShipStreet(addr.street || '');
    setShipCity(addr.city || '');
    setShipZip(addr.zip || '');
    setShipCountry(addr.country || 'Česká republika');
    setIsAddingAddress(true);
  };

  // Delete address action
  const handleDeleteAddress = (idx) => {
    showConfirm({
      title: lang === 'CZ' ? 'Odstranit adresu' : 'Delete Address',
      message: lang === 'CZ' ? 'Opravdu chcete tuto doručovací adresu trvale odstranit?' : 'Are you sure you want to permanently delete this shipping address?',
      confirmText: lang === 'CZ' ? 'Smazat' : 'Delete',
      isDanger: true,
      onConfirm: async () => {
        const updatedAddresses = (user.shippingAddresses || []).filter((_, i) => i !== idx);
        
        let isSuccess = false;
        if (user.id) {
          try {
            const { error } = await supabase
              .from('profiles')
              .update({ shipping_addresses: updatedAddresses })
              .eq('id', user.id);

            if (!error) {
              isSuccess = true;
            } else {
              console.warn('Database save failed (falling back to state):', error.message);
            }
          } catch (err) {
            console.warn('Database connection error:', err);
          }
        }

        setUser(prev => ({ ...prev, shippingAddresses: updatedAddresses }));

        if (isSuccess) {
          showToast(lang === 'CZ' ? 'Adresa byla úspěšně odstraněna.' : 'Address was successfully deleted.', 'success');
        } else {
          showToast(
            lang === 'CZ' 
              ? 'Adresa odstraněna v prohlížeči (pro trvalé uložení spusťte SQL skript v Supabase).' 
              : 'Address deleted in memory (run the SQL script in Supabase to save permanently).', 
            'warning'
          );
        }
      }
    });
  };

  // Password update action
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast(lang === 'CZ' ? 'Zadejte prosím současné heslo.' : 'Please enter your current password.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast(lang === 'CZ' ? 'Nové heslo musí mít alespoň 6 znaků.' : 'New password must be at least 6 characters long.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(lang === 'CZ' ? 'Nová hesla se neshodují.' : 'New passwords do not match.', 'error');
      return;
    }

    // Step 1: Verify current password by signing in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (verifyError) {
      showToast(
        lang === 'CZ' 
          ? 'Současné heslo je nesprávné.' 
          : 'Current password is incorrect.', 
        'error'
      );
      return;
    }

    // Step 2: Update to the new password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      showToast(
        lang === 'CZ' 
          ? `Chyba při změně hesla: ${updateError.message}` 
          : `Password change error: ${updateError.message}`, 
        'error'
      );
    } else {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast(lang === 'CZ' ? 'Heslo bylo úspěšně změněno.' : 'Password was successfully updated.', 'success');
    }
  };

  // Trigger password reset email from profile security tab
  const handleForgotPassword = async () => {
    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin
      });

      if (error) throw error;

      showToast(
        lang === 'CZ'
          ? 'Odkaz pro obnovení hesla byl odeslán na Váš e-mail.'
          : 'Password reset link has been sent to your email.',
        'success'
      );
    } catch (err) {
      console.error('Password reset from portal error:', err);
      showToast(
        lang === 'CZ'
          ? `Chyba při odesílání: ${err.message}`
          : `Error sending reset link: ${err.message}`,
        'error'
      );
    } finally {
      setIsResetting(false);
    }
  };

  // Start 2FA Setup (Enroll factor)
  const handleStart2FASetup = async () => {
    try {
      // Check if we have a real Supabase session
      const { data: { session } } = await supabase.auth.getSession();

      // BEZPEČNOST: dřívější "testovací režim" zde zapínal 2FA s pevně daným
      // veřejně známým klíčem a jako platný bral jakýkoli šestimístný kód.
      // Uživateli se pak v účtu zobrazovalo, že má 2FA aktivní, přestože
      // ve skutečnosti nechránilo vůbec nic. Bez relace 2FA nezapínáme.
      if (!session) {
        showToast(
          lang === 'CZ'
            ? 'Pro nastavení dvoufaktorového ověření se prosím znovu přihlaste.'
            : 'Please sign in again to set up two-factor authentication.',
          'error'
        );
        return;
      }

      // Enroll the factor
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'NORTHVALE',
        friendlyName: user.email || 'customer'
      });

      if (error) {
        console.error('MFA enroll error:', error);
        showToast(lang === 'CZ' ? `Chyba při spuštění 2FA: ${error.message}` : `MFA init error: ${error.message}`, 'error');
        return;
      }

      setEnrolledFactor({
        id: data.id,
        qrCode: data.totp.qr_code, // Base64 SVG data URI
        secret: data.totp.secret,
        isMock: false
      });
      setIsSettingUp2FA(true);
    } catch (err) {
      console.error('MFA setup error:', err);
      showToast(lang === 'CZ' ? 'Chyba při spuštění nastavení 2FA.' : 'Error starting 2FA setup.', 'error');
    }
  };

  // Cancel 2FA Setup
  const handleCancel2FASetup = async () => {
    if (enrolledFactor?.id && !enrolledFactor.isMock) {
      try {
        await supabase.auth.mfa.unenroll({ factorId: enrolledFactor.id });
      } catch (err) {
        console.warn('Failed to unenroll unverified factor:', err);
      }
    }
    setEnrolledFactor(null);
    setIsSettingUp2FA(false);
    setAuthCode('');
    setAuthCodeError(false);
  };

  // Setup 2FA validation
  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!authCode.trim() || authCode.trim().length !== 6) {
      setAuthCodeError(true);
      showToast(lang === 'CZ' ? 'Zadejte platný šestimístný kód.' : 'Please enter valid 6-digit code.', 'error');
      return;
    }

    if (!enrolledFactor?.id) {
      showToast(lang === 'CZ' ? 'Chyba: Chybí aktivní relace registrace 2FA.' : 'Error: Missing active 2FA enrollment session.', 'error');
      return;
    }

    // BEZPEČNOST: zde bývalo "testovací ověření", které jako platný přijalo
    // jakýkoli šestimístný kód a přesto zapsalo two_factor_enabled = true.
    // Zákazník pak byl přesvědčený, že má účet chráněný, a přitom neměl.
    // Ověřuje se výhradně proti Supabase MFA.
    if (enrolledFactor.isMock) {
      setAuthCodeError(true);
      showToast(
        lang === 'CZ'
          ? 'Dvoufaktorové ověření se nepodařilo nastavit. Přihlaste se prosím znovu.'
          : 'Two-factor authentication could not be set up. Please sign in again.',
        'error'
      );
      setIsSettingUp2FA(false);
      setEnrolledFactor(null);
      setAuthCode('');
      return;
    }

    // Real Supabase verification
    try {
      // Create challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrolledFactor.id
      });

      if (challengeError) {
        setAuthCodeError(true);
        showToast(lang === 'CZ' ? `Chyba ověření: ${challengeError.message}` : `Verification error: ${challengeError.message}`, 'error');
        return;
      }

      // Verify challenge
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrolledFactor.id,
        challengeId: challengeData.id,
        code: authCode.trim()
      });

      if (verifyError) {
        setAuthCodeError(true);
        showToast(lang === 'CZ' ? 'Neplatný ověřovací kód.' : 'Invalid validation code.', 'error');
        return;
      }

      // Successfully verified! Save in DB
      let isSuccess = false;
      if (user.id) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ two_factor_enabled: true })
            .eq('id', user.id);

          if (!error) isSuccess = true;
        } catch (err) {
          console.warn(err);
        }
      }

      setUser(prev => ({ ...prev, twoFactorEnabled: true }));
      setIsSettingUp2FA(false);
      setEnrolledFactor(null);
      setAuthCode('');
      setAuthCodeError(false);

      if (isSuccess) {
        showToast(lang === 'CZ' ? 'Dvoufaktorové ověření (2FA) bylo úspěšně aktivováno.' : 'Two-factor authentication (2FA) was successfully activated.', 'success');
      } else {
        showToast(lang === 'CZ' ? '2FA aktivováno lokálně (pro trvalé uložení spusťte SQL skript v Supabase).' : '2FA activated locally (run the SQL script in Supabase to save permanently).', 'warning');
      }
    } catch (err) {
      console.error(err);
      showToast(lang === 'CZ' ? 'Chyba při ověřování 2FA kódu.' : 'Error verifying 2FA code.', 'error');
    }
  };

  // Disable 2FA
  const handleDisable2FA = () => {
    showConfirm({
      title: lang === 'CZ' ? 'Deaktivovat 2FA' : 'Deactivate 2FA',
      message: lang === 'CZ' ? 'Opravdu chcete deaktivovat dvoufaktorové ověření pro Váš účet?' : 'Are you sure you want to deactivate two-factor authentication for your account?',
      confirmText: lang === 'CZ' ? 'Deaktivovat' : 'Deactivate',
      isDanger: true,
      onConfirm: async () => {
        try {
          // Check session
          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            // Unenroll all verified TOTP factors
            const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
            if (!listError && factors?.all) {
              const totpFactors = factors.all.filter(f => f.factor_type === 'totp' && f.status === 'verified');
              for (const f of totpFactors) {
                await supabase.auth.mfa.unenroll({ factorId: f.id });
              }
            }
          }

          let isSuccess = false;
          if (user.id) {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ two_factor_enabled: false })
                .eq('id', user.id);

              if (!error) isSuccess = true;
            } catch (err) {
              console.warn(err);
            }
          }

          setUser(prev => ({ ...prev, twoFactorEnabled: false }));

          if (isSuccess) {
            showToast(lang === 'CZ' ? 'Dvoufaktorové ověření bylo deaktivováno.' : '2FA has been deactivated.', 'success');
          } else {
            showToast(lang === 'CZ' ? '2FA deaktivováno.' : '2FA deactivated.', 'warning');
          }
        } catch (err) {
          console.error(err);
          showToast(lang === 'CZ' ? 'Chyba při vypínání 2FA.' : 'Error disabling 2FA.', 'error');
        }
      }
    });
  };

  // Toggle Newsletter
  const handleToggleNewsletter = async (checked) => {
    let isSuccess = false;
    if (user.id) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ newsletter: checked })
          .eq('id', user.id);

        if (!error) {
          isSuccess = true;
          // Synchronize with the newsletter_subscribers table
          if (user.email) {
            if (checked) {
              await subscribeToNewsletter(user.email, lang);
            } else {
              await deleteSubscriber(user.email);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to sync newsletter preference:', err);
      }
    }

    setUser(prev => ({ ...prev, newsletter: checked }));

    if (isSuccess) {
      showToast(
        lang === 'CZ' 
          ? (checked ? 'Odběr newsletteru byl přihlášen.' : 'Odběr newsletteru byl odhlášen.')
          : (checked ? 'Subscribed to newsletter.' : 'Unsubscribed from newsletter.'),
        'success'
      );
    } else {
      showToast(
        lang === 'CZ' 
          ? (checked ? 'Odběr newsletteru přihlášen lokálně.' : 'Odběr newsletteru odhlášen lokálně.')
          : (checked ? 'Subscribed to newsletter (local).' : 'Unsubscribed from newsletter (local).'),
        'warning'
      );
    }
  };

  // Delete User Account
  const handleDeleteAccount = () => {
    showConfirm({
      title: lang === 'CZ' ? 'Zrušit klientský účet' : 'Close Account',
      message: lang === 'CZ' 
        ? 'Opravdu chcete zrušit svůj účet? Tato akce je nevratná a dojde k odstranění Vašeho profilu, uložených adres i fakturačních údajů.' 
        : 'Are you sure you want to close your account? This action is permanent and will completely delete your profile, billing preferences, and addresses.',
      confirmText: lang === 'CZ' ? 'Zrušit účet' : 'Delete Account',
      isDanger: true,
      onConfirm: async () => {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user.id);

        if (error) {
          showToast(lang === 'CZ' ? `Chyba při rušení: ${error.message}` : `Error deleting: ${error.message}`, 'error');
        } else {
          showToast(lang === 'CZ' ? 'Váš klientský účet byl úspěšně zrušen.' : 'Your client account was successfully deleted.', 'success');
          onLogout();
        }
      }
    });
  };

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
    <div className="nv-profile-container fade-in">
      <h1 className="sr-only">
        {lang === 'CZ' ? 'Můj klientský účet - NORTHVALE' : 'My Account - NORTHVALE'}
      </h1>

      {/* Top Banner (smarty.cz style) */}
      <div className="prf-topbar">
        <span className="prf-topbar-user">
          {lang === 'CZ' ? 'Přihlášen jako' : 'Logged in as'}:{' '}
          <strong>{user.name || user.email.split('@')[0]}</strong>
        </span>
        <div className="prf-topbar-actions">
          {user && (user.role === 'admin' || user.email === 'info@northvaletcg.eu') && (
            <button 
              className="prf-topbar-logout" 
              style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold)', backgroundColor: 'rgba(253, 189, 22, 0.05)' }} 
              onClick={() => setActivePage('admin')}
            >
              👑 {lang === 'CZ' ? 'Vstoupit do administrace' : 'Enter Admin Panel'}
            </button>
          )}
          <button className="prf-topbar-logout" onClick={onLogout}>
            {t('UserPortal.logoutBtn')}
          </button>
        </div>
      </div>

      <div className="prf-shell">
        {/* Left Navigation Menu */}
        <aside className="prf-nav">
          <button 
            className={`prf-nav-item ${activeTab === 'settings' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>
            <span>{lang === 'CZ' ? 'Nastavení účtu' : 'Account Settings'}</span>
          </button>
          <button 
            className={`prf-nav-item ${activeTab === 'orders' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>
            <span>{lang === 'CZ' ? 'Moje objednávky' : 'My Orders'}</span>
          </button>
          <button 
            className={`prf-nav-item ${activeTab === 'invoices' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h7M9 17h7"/></svg>
            <span>{lang === 'CZ' ? 'Faktury' : 'Invoices'}</span>
          </button>
          <button 
            className={`prf-nav-item ${activeTab === 'security' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z"/></svg>
            <span>{lang === 'CZ' ? 'Zabezpečení' : 'Security'}</span>
          </button>
          {FEATURE_FLAGS.showNewsletter && (
            <button 
              className={`prf-nav-item ${activeTab === 'newsletters' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('newsletters')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
              <span>{lang === 'CZ' ? 'Newslettery' : 'Newsletters'}</span>
            </button>
          )}
          {!isMobile && <div className="prf-nav-divider"></div>}
          {!isMobile && user && (user.role === 'admin' || user.email === 'info@northvaletcg.eu') && (
            <>
              <button 
                className="prf-nav-item"
                style={{ color: 'var(--color-gold)', backgroundColor: 'rgba(253, 189, 22, 0.03)' }}
                onClick={() => setActivePage('admin')}
              >
                👑 <span>{lang === 'CZ' ? 'Administrace' : 'Admin Panel'}</span>
              </button>
              <div className="prf-nav-divider"></div>
            </>
          )}
          {!isMobile && (
            <button 
              className="prf-nav-item prf-nav-logout"
              onClick={onLogout}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              <span>{lang === 'CZ' ? 'Odhlásit se' : 'Logout'}</span>
            </button>
          )}
        </aside>

        {/* Right Content Area */}
        <main className="prf-main">
          
          {/* TAB 1: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="prf-tab-content">
              <span className="nv-eyebrow">{lang === 'CZ' ? 'Můj účet' : 'My Account'}</span>
              <h2 className="prf-title">{lang === 'CZ' ? 'Nastavení účtu' : 'Account Settings'}</h2>
              
              {/* Contact details */}
              <section className="prf-block">
                <div className="prf-block-head">
                  <h3>{lang === 'CZ' ? 'Kontaktní údaje' : 'Contact Details'}</h3>
                  {!isEditingContact && (
                    <button className="prf-edit" onClick={() => setIsEditingContact(true)}>
                      {lang === 'CZ' ? 'Upravit' : 'Edit'}
                    </button>
                  )}
                </div>

                {isEditingContact ? (
                  <div className="prf-form">
                    <div className="prf-input-group">
                      <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Celé jméno' : 'Full Name'}</label>
                      <input 
                        type="text" 
                        value={contactName} 
                        onChange={e => setContactName(e.target.value)} 
                        className="prf-input" 
                      />
                    </div>
                    <div className="prf-input-group" style={{ marginTop: '12px' }}>
                      <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Telefon' : 'Phone'}</label>
                      <input 
                        type="tel" 
                        value={contactPhone} 
                        onChange={e => setContactPhone(e.target.value)} 
                        className="prf-input" 
                      />
                    </div>
                    <div className="prf-input-group" style={{ marginTop: '12px' }}>
                      <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'E-mail' : 'Email'}</label>
                      <input 
                        type="email" 
                        value={user.email} 
                        disabled 
                        className="prf-input"
                        style={{ opacity: 0.5, cursor: 'not-allowed' }} 
                      />
                      <span className="helper-text" style={{ fontSize: '11px', color: '#8a8a92', marginTop: '4px', display: 'block' }}>
                        {lang === 'CZ' ? 'E-mailovou adresu nelze změnit.' : 'Email address cannot be changed.'}
                      </span>
                    </div>
                    <div className="prf-btn-group">
                      <button className="prf-btn-primary" onClick={handleSaveContact}>
                        {lang === 'CZ' ? 'Uložit' : 'Save'}
                      </button>
                      <button className="prf-btn-secondary" onClick={() => { setIsEditingContact(false); setContactName(user.name); setContactPhone(user.phone); }}>
                        {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <dl className="prf-dl">
                    <div className="prf-dl-row">
                      <dt>{lang === 'CZ' ? 'Uživatelské jméno / E-mail' : 'Username / Email'}</dt>
                      <dd>{user.email}</dd>
                    </div>
                    <div className="prf-dl-row">
                      <dt>{lang === 'CZ' ? 'Jméno' : 'Name'}</dt>
                      <dd>{user.name || '—'}</dd>
                    </div>
                    <div className="prf-dl-row">
                      <dt>{lang === 'CZ' ? 'Telefon' : 'Phone'}</dt>
                      <dd>{user.phone || '—'}</dd>
                    </div>
                  </dl>
                )}
              </section>

              {/* Billing details */}
              <section className="prf-block">
                <div className="prf-block-head">
                  <h3>{lang === 'CZ' ? 'Fakturační údaje' : 'Billing Details'}</h3>
                  {!isEditingBilling && (
                    <button className="prf-edit" onClick={() => setIsEditingBilling(true)}>
                      {lang === 'CZ' ? 'Upravit' : 'Edit'}
                    </button>
                  )}
                </div>

                {isEditingBilling ? (
                  <div className="prf-form">
                    <div className="prf-dl-2col">
                      <div className="prf-input-group">
                        <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Firma' : 'Company'}</label>
                        <input type="text" value={billingCompany} onChange={e => setBillingCompany(e.target.value)} className="prf-input" />
                      </div>
                      <div className="prf-input-group">
                        <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Jméno' : 'Name'}</label>
                        <input type="text" value={billingName} onChange={e => setBillingName(e.target.value)} className="prf-input" />
                      </div>
                      <div className="prf-input-group">
                        <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Ulice a č.p.' : 'Street'}</label>
                        <input type="text" value={billingStreet} onChange={e => setBillingStreet(e.target.value)} className="prf-input" />
                      </div>
                      <div className="prf-input-group">
                        <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Město a PSČ' : 'City & ZIP'}</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="text" value={billingCity} onChange={e => setBillingCity(e.target.value)} className="prf-input" style={{ flex: 2 }} placeholder="Město" />
                          <input type="text" value={billingZip} onChange={e => setBillingZip(e.target.value)} className="prf-input" style={{ flex: 1 }} placeholder="PSČ" />
                        </div>
                      </div>
                      <div className="prf-input-group">
                        <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Země' : 'Country'}</label>
                        <input type="text" value={billingCountry} onChange={e => setBillingCountry(e.target.value)} className="prf-input" />
                      </div>
                      <div className="prf-input-group">
                        <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'IČ' : 'Company ID'}</label>
                        <input type="text" value={billingIco} onChange={e => setBillingIco(e.target.value)} className="prf-input" />
                      </div>
                      <div className="prf-input-group">
                        <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'DIČ' : 'VAT ID'}</label>
                        <input type="text" value={billingDic} onChange={e => setBillingDic(e.target.value)} className="prf-input" />
                      </div>
                      <div className="prf-input-group">
                        <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Číslo účtu' : 'Bank Account'}</label>
                        <input type="text" value={billingBankAccount} onChange={e => setBillingBankAccount(e.target.value)} className="prf-input" />
                      </div>
                    </div>
                    <div className="prf-btn-group" style={{ marginTop: '20px' }}>
                      <button className="prf-btn-primary" onClick={handleSaveBilling}>
                        {lang === 'CZ' ? 'Uložit' : 'Save'}
                      </button>
                      <button className="prf-btn-secondary" onClick={() => setIsEditingBilling(false)}>
                        {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <dl className="prf-dl prf-dl-2col">
                    <div className="prf-dl-row">
                      <dt>{lang === 'CZ' ? 'Firma' : 'Company'}</dt>
                      <dd>{user.billingCompany || '—'}</dd>
                    </div>
                    <div className="prf-dl-row">
                      <dt>{lang === 'CZ' ? 'Jméno' : 'Name'}</dt>
                      <dd>{user.billingName || '—'}</dd>
                    </div>
                    <div className="prf-dl-row">
                      <dt>{lang === 'CZ' ? 'Ulice a č.p.' : 'Street'}</dt>
                      <dd>{user.billingStreet || '—'}</dd>
                    </div>
                    <div className="prf-dl-row">
                      <dt>{lang === 'CZ' ? 'Město a PSČ' : 'City & ZIP'}</dt>
                      <dd>{user.billingCity ? `${user.billingCity}, ${user.billingZip}` : '—'}</dd>
                    </div>
                    <div className="prf-dl-row">
                      <dt>{lang === 'CZ' ? 'Země' : 'Country'}</dt>
                      <dd>{user.billingCountry || '—'}</dd>
                    </div>
                    <div className="prf-dl-row">
                      <dt>{lang === 'CZ' ? 'IČ' : 'Company ID'}</dt>
                      <dd>{user.billingIco || '—'}</dd>
                    </div>
                    <div className="prf-dl-row">
                      <dt>{lang === 'CZ' ? 'DIČ' : 'VAT ID'}</dt>
                      <dd>{user.billingDic || '—'}</dd>
                    </div>
                    <div className="prf-dl-row">
                      <dt>{lang === 'CZ' ? 'Číslo účtu' : 'Bank Account'}</dt>
                      <dd>{user.billingBankAccount || '—'}</dd>
                    </div>
                  </dl>
                )}
              </section>

              {/* Shipping Addresses */}
              <section className="prf-block">
                <div className="prf-block-head">
                  <h3>{lang === 'CZ' ? 'Doručovací adresy' : 'Delivery Addresses'}</h3>
                  {!isAddingAddress && (
                    <button className="prf-edit" onClick={() => { clearAddressForm(); setIsAddingAddress(true); setEditingAddressIndex(null); }}>
                      + {lang === 'CZ' ? 'Přidat adresu' : 'Add address'}
                    </button>
                  )}
                </div>

                {isAddingAddress ? (
                  <form onSubmit={handleSaveAddress} className="prf-form">
                    <div className="prf-dl-2col">
                      <div className="prf-input-group">
                        <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Jméno a příjmení' : 'Name'} *</label>
                        <input type="text" value={shipName} onChange={e => setShipName(e.target.value)} className="prf-input" required />
                      </div>
                      <div className="prf-input-group">
                        <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Ulice a č.p.' : 'Street'} *</label>
                        <input type="text" value={shipStreet} onChange={e => setShipStreet(e.target.value)} className="prf-input" required />
                      </div>
                      <div className="prf-input-group">
                        <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Město a PSČ' : 'City & ZIP'} *</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="text" value={shipCity} onChange={e => setShipCity(e.target.value)} className="prf-input" style={{ flex: 2 }} placeholder="Město" required />
                          <input type="text" value={shipZip} onChange={e => setShipZip(e.target.value)} className="prf-input" style={{ flex: 1 }} placeholder="PSČ" required />
                        </div>
                      </div>
                      <div className="prf-input-group">
                        <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Země' : 'Country'}</label>
                        <input type="text" value={shipCountry} onChange={e => setShipCountry(e.target.value)} className="prf-input" />
                      </div>
                    </div>
                    <div className="prf-btn-group" style={{ marginTop: '20px' }}>
                      <button type="submit" className="prf-btn-primary">
                        {lang === 'CZ' ? 'Uložit adresu' : 'Save address'}
                      </button>
                      <button type="button" className="prf-btn-secondary" onClick={() => { setIsAddingAddress(false); setEditingAddressIndex(null); clearAddressForm(); }}>
                        {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    {!user.shippingAddresses || user.shippingAddresses.length === 0 ? (
                      <p style={{ color: '#8a8a92', fontSize: '13px' }}>{lang === 'CZ' ? 'Nemáte žádné uložené doručovací adresy.' : 'No saved delivery addresses.'}</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                        {user.shippingAddresses.map((addr, idx) => (
                          <div key={idx} className="prf-addr">
                            <div className="prf-addr-name">{addr.name}</div>
                            <div className="prf-addr-lines">
                              <span>{addr.street}</span>
                              <span>{addr.city}, {addr.zip}</span>
                              <span>{addr.country}</span>
                            </div>
                            <div className="prf-addr-actions">
                              <button onClick={() => triggerEditAddress(idx)}>{lang === 'CZ' ? 'Upravit' : 'Edit'}</button>
                              <span className="prf-addr-sep"></span>
                              <button className="prf-addr-del" onClick={() => handleDeleteAddress(idx)}>{lang === 'CZ' ? 'Smazat' : 'Delete'}</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Account Deletion */}
              <section className="prf-danger">
                <div className="prf-danger-text">
                  <h3>{lang === 'CZ' ? 'Zrušení klientského účtu' : 'Close Account'}</h3>
                  <p>
                    {lang === 'CZ'
                      ? 'Zrušením dojde k permanentnímu smazání profilu, fakturačních údajů i doručovacích adres. Akce je nevratná.'
                      : 'Deactivating your account will permanently delete your billing preferences, contact details, and shipping addresses. This action is irreversible.'}
                  </p>
                </div>
                <button className="prf-danger-btn" onClick={handleDeleteAccount}>
                  {lang === 'CZ' ? 'Zrušit účet' : 'Delete Account'}
                </button>
              </section>

            </div>
          )}

          {/* TAB 2: MY ORDERS */}
          {activeTab === 'orders' && (
            <div className="prf-tab-content">
              <span className="nv-eyebrow">{lang === 'CZ' ? 'Můj účet' : 'My Account'}</span>
              <h2 className="prf-title">{lang === 'CZ' ? 'Moje objednávky' : 'My Orders'}</h2>
              
              {loadingOrders ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#8a8a92', fontSize: '13px' }}>
                  {lang === 'CZ' ? 'Načítám aktuální objednávky...' : 'Loading orders...'}
                </div>
              ) : liveOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <p style={{ color: '#8a8a92', fontSize: '13px' }}>{lang === 'CZ' ? 'Zatím jste u nás neprovedl(a) žádnou objednávku.' : 'You have not placed any orders yet.'}</p>
                  <button className="prf-btn-primary" style={{ marginTop: '16px' }} onClick={() => setActivePage('home')}>
                    {lang === 'CZ' ? 'Přejít do e-shopu' : 'Continue Shopping'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {liveOrders.map((order, idx) => {
                    const isExpanded = !!expandedOrders[order.id];
                    const paymentColor = getPaymentStatusColor(order.paymentStatus);
                    const fulfillmentColor = getFulfillmentStatusColor(order.fulfillmentStatus);
                    const subtotalAmount = order.subtotal || (order.items || []).reduce((acc, it) => acc + (it.price * it.quantity), 0);

                    return (
                      <div 
                        key={order.id || idx} 
                        className="prf-block" 
                        style={{ 
                          paddingBottom: '24px', 
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease',
                          position: 'relative'
                        }}
                        onClick={() => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.01)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div className="prf-block-head" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ fontSize: '14px', textTransform: 'none', letterSpacing: 'normal', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <span style={{ 
                              fontSize: '10px', 
                              color: 'var(--color-gold)', 
                              display: 'inline-block',
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                              transition: 'transform 0.2s ease',
                              marginRight: '4px'
                            }}>▶</span>
                            {lang === 'CZ' ? 'Objednávka' : 'Order'} <strong style={{ color: '#f0f0f0' }}>#{order.id}</strong>
                            <span style={{ color: '#8a8a92', marginLeft: '12px', fontSize: '12px' }}>{order.date}</span>
                          </h3>
                          <span style={{ color: 'var(--color-gold)', fontWeight: '800', fontSize: '15px' }}>
                            {(order.finalTotal || order.total || 0).toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} Kč
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {order.items && order.items.map((it, itemIdx) => (
                              <span key={itemIdx} style={{ fontSize: '13px', color: '#8a8a92' }}>
                                {it.quantity}x {it.name} ({parseFloat(it.price || 0).toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} Kč)
                              </span>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {/* Payment Status Badge */}
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: '700', 
                              backgroundColor: paymentColor.bg, 
                              color: paymentColor.text, 
                              padding: '4px 10px', 
                              borderRadius: '4px' 
                            }}>
                              {getPaymentStatusText(order.paymentStatus, lang)}
                            </span>
                            {/* Fulfillment Status Badge */}
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: '700', 
                              backgroundColor: fulfillmentColor.bg, 
                              color: fulfillmentColor.text, 
                              padding: '4px 10px', 
                              borderRadius: '4px' 
                            }}>
                              {getFulfillmentStatusText(order.fulfillmentStatus, lang)}
                            </span>
                          </div>
                        </div>

                        {/* Expanded details container */}
                        {isExpanded && (
                          <div 
                            style={{ 
                              marginTop: '20px', 
                              paddingTop: '20px', 
                              borderTop: '1px solid rgba(240, 240, 240, 0.06)',
                              fontSize: '13px',
                              color: '#aaa',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '20px'
                            }}
                            onClick={(e) => e.stopPropagation()} // Prevent toggling when clicking details content
                          >
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                              {/* Shipping address info */}
                              <div>
                                <h4 style={{ color: '#eee', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', marginTop: 0 }}>
                                  {lang === 'CZ' ? 'Doručovací adresa' : 'Shipping Address'}
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{ color: '#fff', fontWeight: '500' }}>{order.customerName}</span>
                                  <span>{order.shippingStreet}</span>
                                  <span>{order.shippingCity}, {order.shippingZip}</span>
                                  <span style={{ color: '#888', marginTop: '4px' }}>{order.customerPhone}</span>
                                </div>
                              </div>

                              {/* Shipping & Payment Method info */}
                              <div>
                                <h4 style={{ color: '#eee', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', marginTop: 0 }}>
                                  {lang === 'CZ' ? 'Způsob doručení a platby' : 'Delivery & Payment'}
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span><strong style={{ color: '#ccc' }}>{lang === 'CZ' ? 'Doprava:' : 'Shipping:'}</strong> {order.shippingMethod}</span>
                                  <span><strong style={{ color: '#ccc' }}>{lang === 'CZ' ? 'Platba:' : 'Payment:'}</strong> {order.paymentMethod}</span>
                                </div>
                              </div>
                            </div>

                            {/* Financial breakdown summary */}
                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span>{lang === 'CZ' ? 'Mezisoučet zboží:' : 'Subtotal:'}</span>
                                <span style={{ color: '#eee' }}>{subtotalAmount.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} Kč</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span>{lang === 'CZ' ? 'Poštovné:' : 'Shipping:'}</span>
                                <span style={{ color: '#eee' }}>{parseFloat(order.shippingCost || 0).toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} Kč</span>
                              </div>
                              {parseFloat(order.paymentSurcharge || 0) > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <span>{lang === 'CZ' ? 'Poplatek za platbu / dobírku:' : 'Payment fee:'}</span>
                                  <span style={{ color: '#eee' }}>{parseFloat(order.paymentSurcharge || 0).toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} Kč</span>
                                </div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: 'bold', fontSize: '14px' }}>
                                <span style={{ color: '#fff' }}>{lang === 'CZ' ? 'Celkem k úhradě:' : 'Total:'}</span>
                                <span style={{ color: 'var(--color-gold)' }}>{(order.finalTotal || 0).toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} Kč</span>
                              </div>
                            </div>

                            {/* PDF Invoice Button */}
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              {order.paymentStatus === 'paid' || order.paymentStatus === 'cod' ? (
                                <button 
                                  style={{ 
                                    background: 'rgba(253, 189, 22, 0.1)', 
                                    color: 'var(--color-gold, #fdbd16)', 
                                    border: '1px solid rgba(253, 189, 22, 0.2)',
                                    padding: '8px 16px',
                                    fontSize: '12.5px',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenInvoicePdf(order);
                                  }}
                                >
                                  📄 {lang === 'CZ' ? 'Stáhnout fakturu (PDF)' : 'Download Invoice (PDF)'}
                                </button>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#8a8a92' }}>
                                  {lang === 'CZ' ? 'Faktura bude vystavena po uhrazení' : 'Invoice will be issued after payment'}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INVOICES */}
          {activeTab === 'invoices' && (
            <div className="prf-tab-content">
              <span className="nv-eyebrow">{lang === 'CZ' ? 'Můj účet' : 'My Account'}</span>
              <h2 className="prf-title">{lang === 'CZ' ? 'Faktury' : 'Invoices'}</h2>
              
              <div className="prf-block" style={{ borderBottom: 'none', paddingBottom: '0' }}>
                <div style={{ display: 'flex', gap: '12px', padding: '16px 20px', backgroundColor: 'rgba(253, 189, 22, 0.02)', borderLeft: '3px solid var(--color-gold)', borderRadius: '4px', marginBottom: '24px' }}>
                  <span style={{ color: 'var(--color-gold)' }}>ℹ️</span>
                  <p style={{ margin: 0, fontSize: '13px', color: '#8a8a92', lineHeight: '1.5' }}>
                    {lang === 'CZ' 
                      ? 'Zde naleznete přehled a oficiální daňové doklady (PDF faktury) ke všem Vašim objednávkám.'
                      : 'Here you can find an overview and official tax invoices (PDF) for all your orders.'}
                  </p>
                </div>

                {loadingOrders ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: '#8a8a92', fontSize: '13px' }}>
                    {lang === 'CZ' ? 'Načítám faktury...' : 'Loading invoices...'}
                  </div>
                ) : liveOrders.length === 0 ? (
                  <p style={{ color: '#8a8a92', fontSize: '13px' }}>{lang === 'CZ' ? 'Žádné faktury k dispozici.' : 'No invoices available.'}</p>
                ) : (
                  <div style={{ border: '1px solid rgba(240, 240, 240, 0.07)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1.2fr 1fr 1fr' : '1.5fr 1fr 1fr 1.5fr', padding: '12px 20px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(240, 240, 240, 0.07)', fontSize: '11px', fontWeight: 'bold', color: '#8a8a92', textTransform: 'uppercase' }}>
                      <span>{lang === 'CZ' ? 'Číslo faktury' : 'Invoice ID'}</span>
                      {!isMobile && <span>{lang === 'CZ' ? 'Datum' : 'Date'}</span>}
                      <span>{lang === 'CZ' ? 'Částka' : 'Amount'}</span>
                      <span style={{ textAlign: 'right' }}>{lang === 'CZ' ? 'Daňový doklad' : 'Tax Document'}</span>
                    </div>
                    {liveOrders.map((order, idx) => {
                      const invoiceNum = `Faktura č. ${order.id}`;
                      const canDownload = order.paymentStatus === 'paid' || order.paymentStatus === 'cod';
                      return (
                        <div key={order.id || idx} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1.2fr 1fr 1fr' : '1.5fr 1fr 1fr 1.5fr', padding: '16px 20px', borderBottom: '1px solid rgba(240, 240, 240, 0.04)', fontSize: '13px', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', color: '#f0f0f0' }}>{invoiceNum}</span>
                          {!isMobile && <span style={{ color: '#8a8a92' }}>{order.date}</span>}
                          <span style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>
                            {(order.finalTotal || order.total || 0).toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} Kč
                          </span>
                          <div style={{ textAlign: 'right' }}>
                            {canDownload ? (
                              <button 
                                className="prf-edit"
                                style={{ 
                                  background: 'rgba(253, 189, 22, 0.1)', 
                                  color: 'var(--color-gold, #fdbd16)', 
                                  border: '1px solid rgba(253, 189, 22, 0.2)',
                                  padding: '8px 14px',
                                  borderRadius: '6px',
                                  fontSize: '12.5px',
                                  fontWeight: '600'
                                }}
                                onClick={() => handleOpenInvoicePdf(order)}
                              >
                                📄 {lang === 'CZ' ? 'Stáhnout fakturu (PDF)' : 'Download PDF'}
                              </button>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#8a8a92' }}>
                                {lang === 'CZ' ? 'Faktura bude vystavena po uhrazení' : 'Invoice will be issued after payment'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY */}
          {activeTab === 'security' && (
            <div className="prf-tab-content">
              <span className="nv-eyebrow">{lang === 'CZ' ? 'Můj účet' : 'My Account'}</span>
              <h2 className="prf-title">{lang === 'CZ' ? 'Zabezpečení účtu' : 'Account Security'}</h2>
              
              {/* Change Password */}
              <section className="prf-block">
                <div className="prf-block-head">
                  <h3>{lang === 'CZ' ? 'Změna přístupového hesla' : 'Change Account Password'}</h3>
                </div>
                <form onSubmit={handleChangePassword} className="prf-form" style={{ maxWidth: '400px' }}>
                  <div className="prf-input-group">
                    <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Současné heslo' : 'Current Password'} *</label>
                    <input 
                      type="password" 
                      value={currentPassword} 
                      onChange={e => setCurrentPassword(e.target.value)} 
                      className="prf-input"
                      placeholder="••••••••" 
                      required 
                    />
                  </div>
                  <div className="prf-input-group" style={{ marginTop: '12px' }}>
                    <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Nové heslo' : 'New Password'} *</label>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      className="prf-input"
                      placeholder="••••••••" 
                      required 
                    />
                  </div>
                  <div className="prf-input-group" style={{ marginTop: '12px' }}>
                    <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Potvrzení nového hesla' : 'Confirm New Password'} *</label>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      className="prf-input"
                      placeholder="••••••••" 
                      required 
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <button type="submit" className="prf-btn-primary" style={{ margin: 0 }}>
                      {lang === 'CZ' ? 'Uložit nové heslo' : 'Save New Password'}
                    </button>
                    
                    <button 
                      type="button" 
                      className="forgot-password-link"
                      style={{ margin: 0, padding: 0 }}
                      disabled={isResetting}
                      onClick={handleForgotPassword}
                    >
                      {isResetting 
                        ? (lang === 'CZ' ? 'Odesílání...' : 'Sending...') 
                        : t('LoginModal.forgotPasswordLink')}
                    </button>
                  </div>
                </form>
              </section>

              {/* Two-Factor Authentication (2FA) */}
              <section className="prf-block">
                <div className="prf-block-head">
                  <h3>{lang === 'CZ' ? 'Dvoufaktorové ověření (2FA)' : 'Two-Factor Authentication (2FA)'}</h3>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    backgroundColor: user.twoFactorEnabled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(224, 82, 77, 0.08)',
                    color: user.twoFactorEnabled ? '#10b981' : '#e0524d',
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}>
                    {user.twoFactorEnabled ? (lang === 'CZ' ? 'AKTIVNÍ' : 'ACTIVE') : (lang === 'CZ' ? 'NEAKTIVNÍ' : 'INACTIVE')}
                  </span>
                </div>
                
                <p style={{ color: '#8a8a92', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>
                  {lang === 'CZ'
                    ? 'Zabezpečte svůj klientský účet pomocí jednorázových ověřovacích kódů generovaných ve Vaší mobilní aplikaci Google Authenticator nebo Microsoft Authenticator.'
                    : 'Secure your login sessions with 6-digit codes generated inside your Google Authenticator or Microsoft Authenticator application.'}
                </p>

                {user.twoFactorEnabled ? (
                  <button className="prf-btn-secondary" style={{ color: '#e0524d', borderColor: 'rgba(224,82,77,0.3)' }} onClick={handleDisable2FA}>
                    {lang === 'CZ' ? 'Deaktivovat 2FA' : 'Deactivate 2FA'}
                  </button>
                ) : (
                  <div>
                    {!isSettingUp2FA ? (
                      <button className="prf-btn-primary" onClick={handleStart2FASetup}>
                        {lang === 'CZ' ? 'Aktivovat dvoufaktorové ověření' : 'Setup Two-Factor Verification'}
                      </button>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '140px 1fr', gap: '24px', padding: '20px', border: '1px solid rgba(240, 240, 240, 0.07)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: '120px', height: '120px', border: '2px solid var(--color-gold)', borderRadius: '8px', padding: '6px', position: 'relative', overflow: 'hidden', background: '#fff' }}>
                            <div style={{ width: '100%', height: '100%' }}>
                              {enrolledFactor?.qrCode ? (
                                <img 
                                  src={enrolledFactor.qrCode} 
                                  alt="2FA QR Code" 
                                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} 
                                />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '10px' }}>
                                  Načítání...
                                </div>
                              )}
                            </div>
                            <div className="qr-scanner-line" style={{ position: 'absolute', left: 0, width: '100%', height: '2px', background: 'var(--color-gold)', boxShadow: '0 0 8px var(--color-gold)', animation: 'scan 2.5s infinite linear' }}></div>
                          </div>
                          <span style={{ fontSize: '10px', color: '#8a8a92', marginTop: '8px', display: 'block', wordBreak: 'break-all', textAlign: 'center', fontFamily: 'monospace' }}>
                            Klíč: {enrolledFactor?.secret || 'Načítání...'}
                          </span>
                        </div>
                        <div>
                          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#8a8a92', lineHeight: '1.6' }}>
                            <li>{lang === 'CZ' ? 'Otevřete ve Vašem telefonu aplikaci Authenticator.' : 'Open Authenticator app on your smartphone.'}</li>
                            <li>{lang === 'CZ' ? 'Naskenujte QR kód nebo zadejte ručně klíč.' : 'Scan QR code or type key manually.'}</li>
                            <li>{lang === 'CZ' ? 'Vložte vygenerovaný šestimístný ověřovací kód.' : 'Enter the generated 6-digit confirmation code.'}</li>
                          </ol>
                          <form onSubmit={handleVerify2FA} style={{ marginTop: '16px', maxWidth: '300px' }}>
                            <div className="prf-input-group">
                              <label className="nv-eyebrow" style={{ fontSize: '10px' }}>{lang === 'CZ' ? 'Ověřovací kód' : '6-digit code'}</label>
                              <input 
                                type="text" 
                                value={authCode} 
                                onChange={e => setAuthCode(e.target.value)} 
                                placeholder="123456" 
                                maxLength={6} 
                                className="prf-input"
                                style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }} 
                              />
                              {authCodeError && <p style={{ color: '#e0524d', fontSize: '12px', margin: '4px 0 0' }}>{lang === 'CZ' ? 'Zadejte platný kód.' : 'Please enter valid code.'}</p>}
                            </div>
                            <div className="prf-btn-group" style={{ marginTop: '12px' }}>
                              <button type="submit" className="prf-btn-primary">
                                {lang === 'CZ' ? 'Aktivovat' : 'Activate'}
                              </button>
                              <button type="button" className="prf-btn-secondary" onClick={handleCancel2FASetup}>
                                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 5: NEWSLETTERS */}
          {FEATURE_FLAGS.showNewsletter && activeTab === 'newsletters' && (
            <div className="prf-tab-content">
              <span className="nv-eyebrow">{lang === 'CZ' ? 'Můj účet' : 'My Account'}</span>
              <h2 className="prf-title">{lang === 'CZ' ? 'Newslettery' : 'Newsletters'}</h2>
              
              <section className="prf-block" style={{ borderBottom: 'none', paddingBottom: '0' }}>
                <div style={{
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700', color: '#fff' }}>
                        {lang === 'CZ' ? 'Stav odběru newsletteru' : 'Newsletter Subscription Status'}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: user.newsletter ? '#4caf50' : '#8a8a92'
                        }} />
                        <span style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: user.newsletter ? '#4caf50' : '#8a8a92',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {user.newsletter 
                            ? (lang === 'CZ' ? 'Aktivní (Odebíráte)' : 'Active (Subscribed)') 
                            : (lang === 'CZ' ? 'Neaktivní (Neodebíráte)' : 'Inactive (Unsubscribed)')}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#8a8a92', lineHeight: '1.5', maxWidth: '520px' }}>
                        {lang === 'CZ'
                          ? 'Odběrem získáte jako první informace o předobjednávkách nových edic Pokémonů, Lorcany a slevových akcích.'
                          : 'By subscribing, you will be the first to know about pre-orders of new Pokémon/Lorcana releases and discount promotions.'}
                      </p>
                    </div>
                  </div>

                  <div style={{ width: isMobile ? '100%' : 'auto', flexShrink: 0 }}>
                    {user.newsletter ? (
                      <button 
                        className="prf-topbar-logout"
                        style={{
                          width: isMobile ? '100%' : 'auto',
                          padding: '10px 20px',
                          backgroundColor: 'rgba(239, 68, 68, 0.05)',
                          color: '#ef4444',
                          borderColor: 'rgba(239, 68, 68, 0.2)',
                          borderRadius: '10px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleToggleNewsletter(false)}
                      >
                        {lang === 'CZ' ? 'Zrušit odběr novinek' : 'Cancel Subscription'}
                      </button>
                    ) : (
                      <button 
                        className="prf-topbar-logout"
                        style={{
                          width: isMobile ? '100%' : 'auto',
                          padding: '10px 20px',
                          backgroundColor: 'rgba(253, 189, 22, 0.05)',
                          color: 'var(--color-gold)',
                          borderColor: 'rgba(253, 189, 22, 0.2)',
                          borderRadius: '10px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleToggleNewsletter(true)}
                      >
                        {lang === 'CZ' ? 'Přihlásit se k odběru' : 'Subscribe to Newsletter'}
                      </button>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={closeConfirm}>
          <div style={{
            backgroundColor: '#1C1C22',
            border: `1px solid ${confirmDialog.isDanger ? 'rgba(239, 68, 68, 0.25)' : 'rgba(253, 189, 22, 0.25)'}`,
            borderRadius: '12px',
            padding: '28px',
            width: '420px',
            maxWidth: '90%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.8)',
            transform: 'scale(1)',
            animation: 'slideUpScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            textAlign: 'left'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '18px',
              fontWeight: '700',
              color: confirmDialog.isDanger ? '#ef4444' : 'var(--color-gold)'
            }}>
              {confirmDialog.title}
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#8a8a92'
            }}>
              {confirmDialog.message}
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button 
                type="button" 
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(240, 240, 240, 0.12)',
                  color: '#8a8a92',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.18s'
                }}
                className="prf-btn-secondary"
                onClick={closeConfirm}
              >
                {confirmDialog.cancelText}
              </button>
              <button 
                type="button" 
                style={{
                  backgroundColor: confirmDialog.isDanger ? '#ef4444' : 'var(--color-gold)',
                  border: 'none',
                  color: confirmDialog.isDanger ? '#fff' : '#000',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.18s'
                }}
                onClick={confirmDialog.onConfirm}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
