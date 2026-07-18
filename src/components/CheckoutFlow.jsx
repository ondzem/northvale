import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { supabase } from '../supabase';
import { getProductImageCached } from '../services/products';

export default function CheckoutFlow({ cart, user, submitOrder, setActivePage, alert, onOpenLogin, appliedDiscount, setAppliedDiscount, validateCart }) {
  const { lang, t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [shipping, setShipping] = useState('pardubice');
  const [payment, setPayment] = useState('card');
  
  // Store Credit applied state
  const [creditInput, setCreditInput] = useState('');
  const [appliedCredit, setAppliedCredit] = useState(0);

  // Company and notes states
  const [isCompany, setIsCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [ico, setIco] = useState('');
  const [dic, setDic] = useState('');
  const [pickupPoint, setPickupPoint] = useState('');
  const [pickupPointDetails, setPickupPointDetails] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapType, setMapType] = useState('');
  const [notes, setNotes] = useState('');

  // Discount code states
  const [promoInput, setPromoInput] = useState(appliedDiscount ? appliedDiscount.code : '');
  const [promoLoading, setPromoLoading] = useState(false);

  // ComGate Payment Gateway Simulator States
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Calculate discount
  const discountAmount = appliedDiscount 
    ? Math.round(cartSubtotal * (appliedDiscount.discount_percent / 100)) 
    : 0;
  const subtotalAfterDiscount = Math.max(0, cartSubtotal - discountAmount);

  // Shipping cost
  let shippingCost = 0;
  if (shipping === 'dpd-pickup') shippingCost = 79;
  else if (shipping === 'dpd-address') shippingCost = 109;
  else if (shipping === 'gls-pickup') shippingCost = 89;
  else if (shipping === 'gls-address') shippingCost = 129;
  else if (shipping === 'pardubice') shippingCost = 0;
  else if (shipping === 'zasilkovna') shippingCost = 79;
  else if (shipping === 'gls') shippingCost = 129;
  else if (shipping === 'dpd') shippingCost = 109;

  // Free shipping above 2000 CZK (checked on total after discount)
  if (subtotalAfterDiscount > 2000 && (
    shipping === 'dpd-pickup' || 
    shipping === 'dpd-address' || 
    shipping === 'gls-pickup' || 
    shipping === 'gls-address' || 
    shipping === 'zasilkovna' || 
    shipping === 'gls' || 
    shipping === 'dpd'
  )) {
    shippingCost = 0;
  }

  // Payment surcharge for Cash on Delivery (Dobírka)
  const paymentSurcharge = payment === 'cod' ? 25 : 0;

  // Store Credit capping calculations
  const totalBeforeCredit = Math.max(0, subtotalAfterDiscount + shippingCost + paymentSurcharge);
  const actualAppliedCredit = Math.min(appliedCredit, totalBeforeCredit);
  const finalTotal = Math.max(0, totalBeforeCredit - actualAppliedCredit);

  const getShippingPriceDisplay = (method, basePrice) => {
    const isFree = subtotalAfterDiscount > 2000 && (
      method === 'zasilkovna' || 
      method === 'gls' || 
      method === 'dpd' ||
      method === 'dpd-pickup' ||
      method === 'dpd-address' ||
      method === 'gls-pickup' ||
      method === 'gls-address'
    );
    if (isFree || basePrice === 0) {
      return lang === 'CZ' ? 'Zdarma' : 'Free';
    }
    return `${basePrice} Kč`;
  };

  const handleApplyDiscount = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    try {
      const codeClean = promoInput.trim().toUpperCase();
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', codeClean)
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAppliedDiscount(data);
        if (alert) {
          alert(
            lang === 'CZ' 
              ? `Slevový kód "${data.code}" (${data.discount_percent}%) byl úspěšně uplatněn.` 
              : `Discount code "${data.code}" (${data.discount_percent}%) has been successfully applied.`,
            'success'
          );
        }
      } else {
        if (alert) {
          alert(
            lang === 'CZ' 
              ? 'Zadaný slevový kód je neplatný nebo neexistuje.' 
              : 'The entered discount code is invalid or does not exist.',
            'error'
          );
        }
      }
    } catch (err) {
      console.error(err);
      if (alert) {
        alert(
          lang === 'CZ' 
            ? 'Chyba při ověřování slevového kódu.' 
            : 'Error validating discount code.',
          'error'
        );
      }
    } finally {
      setPromoLoading(false);
    }
  };

  // Auto-fill form fields when logged in user details change
  useEffect(() => {
    if (user && user.id) {
      if (user.billingName) setName(user.billingName);
      else if (user.name) setName(user.name);
      
      if (user.email) setEmail(user.email);
      if (user.phone) setPhone(user.phone);
      
      // Auto-fill address (priority: shippingAddresses[0] -> billingStreet)
      if (user.shippingAddresses && user.shippingAddresses.length > 0) {
        const addr = user.shippingAddresses[0];
        if (addr.street) setStreet(addr.street);
        if (addr.city) setCity(addr.city);
        if (addr.zip) setZip(addr.zip);
      } else {
        if (user.billingStreet) setStreet(user.billingStreet);
        if (user.billingCity) setCity(user.billingCity);
        if (user.billingZip) setZip(user.billingZip);
      }
      
      // If user profile has saved company billing data, set them as fallback/default
      if (user.billingCompany) setCompanyName(user.billingCompany);
      if (user.billingIco) setIco(user.billingIco);
      if (user.billingDic) setDic(user.billingDic);
      if (user.billingCompany || user.billingIco) setIsCompany(true);
    }
  }, [user]);

  const [isVerifying, setIsVerifying] = useState(false);
  const callbackProcessedRef = useRef(false);

  // Zpracování callbacku z GP webpay po návratu zákazníka
  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('status');
      
      if (status === 'callback') {
        if (callbackProcessedRef.current) return;
        callbackProcessedRef.current = true;

        const orderNumber = params.get('ORDERNUMBER');
        const prCode = params.get('PRCODE');
        const srCode = params.get('SRCODE');
        const digest = params.get('DIGEST');
        const merchantNumber = params.get('MERCHANTNUMBER');
        const operation = params.get('OPERATION');
        const merOrderNum = params.get('MERORDERNUM');
        const resultText = params.get('RESULTTEXT');

        if (!orderNumber || !prCode || !digest) return;

        setIsVerifying(true);
        try {
          // Ověřit podpis platby přes Supabase Edge Function
          const { data, error } = await supabase.functions.invoke('gp-webpay/verify', {
            body: {
              MERCHANTNUMBER: merchantNumber,
              OPERATION: operation,
              ORDERNUMBER: orderNumber,
              MERORDERNUM: merOrderNum,
              PRCODE: prCode,
              SRCODE: srCode,
              RESULTTEXT: resultText,
              DIGEST: digest
            }
          });

          if (error || !data) {
            throw new Error(error?.message || 'Chyba při verifikaci platby');
          }

          if (data.success) {
            // Platba byla úspěšně ověřena!
            // Načíst zbylé parametry z rozpracované objednávky v localStorage
            const pendingStr = localStorage.getItem('pending-order-data');
            let orderItems = cart;
            let orderSubtotal = cartSubtotal;
            let orderDiscountCode = appliedDiscount ? appliedDiscount.code : null;
            let orderDiscountAmount = discountAmount;
            let orderShippingCost = shippingCost;
            let orderPaymentSurcharge = paymentSurcharge;
            let creditUsed = actualAppliedCredit;
            let orderFinalTotal = finalTotal;
            let shipMethod = shipping;
            let customerDetails = {
              name: name,
              email: email,
              phone: phone,
              street: street,
              city: city,
              zip: zip,
              isCompany: isCompany,
              companyName: isCompany ? companyName : '',
              ico: isCompany ? ico : '',
              dic: isCompany ? dic : '',
              notes: notes
            };

            if (pendingStr) {
              const pending = JSON.parse(pendingStr);
              orderItems = pending.cart || [];
              orderSubtotal = pending.cartSubtotal || 0;
              orderDiscountCode = pending.discountCode || null;
              orderDiscountAmount = pending.discountAmount || 0;
              orderShippingCost = pending.shippingCost || 0;
              orderPaymentSurcharge = pending.paymentSurcharge || 0;
              creditUsed = pending.creditApplied || 0;
              orderFinalTotal = pending.finalTotal || 0;
              shipMethod = pending.shippingMethod;
              if (pending.customerDetails) {
                customerDetails = pending.customerDetails;
              }
              localStorage.removeItem('pending-order-data');
            }

            const order = {
              id: orderNumber,
              items: orderItems.map(item => ({
                id: item.id,
                product_id: item.product?.id || item.id,
                name: item.name || item.productName,
                price: item.price,
                quantity: item.quantity,
                no_vat: !!(item.no_vat || item.product?.no_vat),
                product: item.product || item
              })),
              subtotal: orderSubtotal,
              discountCode: orderDiscountCode,
              discountAmount: orderDiscountAmount,
              shippingCost: orderShippingCost,
              paymentSurcharge: orderPaymentSurcharge,
              creditApplied: creditUsed,
              isicApplied: false,
              isicDiscount: 0,
              finalTotal: orderFinalTotal,
              shippingMethod: shipMethod === 'dpd-pickup'
                ? (lang === 'CZ' ? `DPD - Výdejní místo: ${pending.pickupPoint || ''}` : `DPD - Pickup Point: ${pending.pickupPoint || ''}`)
                : shipMethod === 'dpd-address' || shipMethod === 'dpd'
                  ? (lang === 'CZ' ? 'DPD - Doručení na adresu' : 'DPD - Home Delivery')
                  : shipMethod === 'gls-pickup'
                    ? (lang === 'CZ' ? `GLS - Výdejní místo: ${pending.pickupPoint || ''}` : `GLS - Pickup Point: ${pending.pickupPoint || ''}`)
                    : shipMethod === 'gls-address' || shipMethod === 'gls'
                      ? (lang === 'CZ' ? 'GLS - Doručení na adresu' : 'GLS - Home Delivery')
                      : shipMethod === 'pardubice' 
                        ? (lang === 'CZ' ? 'Osobní odběr (Bratří Čapků 1095, Holice)' : 'Personal Pickup (Bratří Čapků 1095, Holice)') 
                        : (lang === 'CZ' ? 'Doprava' : 'Shipping'),
              carrier: (shipMethod || '').startsWith('dpd') ? 'DPD' : (shipMethod || '').startsWith('gls') ? 'GLS' : 'OSOBNÍ ODBĚR',
              paymentMethod: lang === 'CZ' ? 'Online platební karta (GP webpay)' : 'Online Credit/Debit Card (GP webpay)',
              date: new Date().toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US'),
              invoiceUrl: '#',
              customerName: customerDetails.name,
              customerEmail: customerDetails.email,
              customerPhone: customerDetails.phone,
              shippingStreet: customerDetails.street,
              shippingCity: customerDetails.city,
              shippingZip: customerDetails.zip,
              isCompany: customerDetails.isCompany,
              companyName: customerDetails.companyName,
              ico: customerDetails.ico,
              dic: customerDetails.dic,
              notes: customerDetails.notes,
              pickupPointDetails: pending.pickupPointDetails || null
            };

            submitOrder(order, creditUsed);
            alert(lang === 'CZ'
              ? `Platba pro objednávku ${orderNumber} byla úspěšně ověřena! Objednávka byla vytvořena.`
              : `Payment for order ${orderNumber} has been successfully verified! Order created.`,
              'success'
            );
            setActivePage('order-confirmation');
          } else {
            alert(lang === 'CZ'
              ? `Platba pro objednávku ${orderNumber} byla zamítnuta (Kód: ${prCode}/${srCode}). Zkuste to prosím znovu.`
              : `Payment for order ${orderNumber} was declined (Code: ${prCode}/${srCode}). Please try again.`,
              'error'
            );
          }
        } catch (err) {
          console.error('Verifikace platby selhala:', err);
          callbackProcessedRef.current = false;
          alert(lang === 'CZ' 
            ? 'Nepodařilo se ověřit platbu přes GP webpay.' 
            : 'Could not verify payment via GP webpay.',
            'error'
          );
        } finally {
          setIsVerifying(false);
          // Vyčistit parametry z URL adresy, aby se verifikace neopakovala při obnovení
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };
    handleCallback();
  }, [cart, cartSubtotal, shippingCost, paymentSurcharge, finalTotal, actualAppliedCredit, shipping, lang, appliedDiscount, discountAmount]);
  useEffect(() => {
    const handleWidgetMessage = (event) => {
      // 1. DPD Widget Message handler
      if (event.data && event.data.dpdWidget) {
        const dpd = event.data.dpdWidget;
        // console.log("DPD Widget message received:", dpd);
        // console.log("RAW DPD Widget event.data:", JSON.stringify(event.data));
        // console.log("RAW DPD pickupPointResult:", event.data?.dpdWidget?.pickupPointResult);
        if (dpd.message === "widgetClose") {
          setShowMapModal(false);
          return;
        }

        let address = '';
        let details = null;

        if (typeof dpd === 'object' && dpd !== null) {
          if (dpd.pickupPointResult) {
            address = dpd.pickupPointResult;
          } else if (dpd.address) {
            address = `${dpd.name || ''}, ${dpd.address}`;
            if (dpd.city) address += `, ${dpd.city}`;
            if (dpd.postcode) address += ` ${dpd.postcode}`;
          } else {
            address = dpd.name || dpd.label || dpd.id || JSON.stringify(dpd);
          }

          let pId = dpd.id || dpd.code || dpd.pclshopid || '';
          if (!pId && address) {
            const match = address.match(/ID:\s*([A-Za-z0-9]+)/);
            if (match) pId = match[1];
          }

          details = {
            id: pId,
            name: dpd.name || dpd.label || '',
            street: dpd.street || dpd.address || '',
            city: dpd.city || '',
            zip: (dpd.postcode || dpd.zip || dpd.zipCode || '').toString().replace(/\s+/g, ''),
            country: dpd.country || 'CZ'
          };

          // If detail values are empty but we have the address string, attempt fallback parsing
          if ((!details.street || !details.city) && address) {
            const parts = address.split(',').map(p => p.trim());
            if (!details.name) details.name = parts[0] || '';
            if (!details.street) details.street = parts[1] || '';
            if (parts[2]) {
              const lastPart = parts[2].replace(/\(ID:\s*\S+\)/i, '').trim();
              const zipMatch = lastPart.match(/\b\d{3}\s*\d{2}\b/);
              if (zipMatch) {
                details.zip = zipMatch[0].replace(/\s+/g, '');
                details.city = lastPart.replace(zipMatch[0], '').trim();
              } else {
                const shortZipMatch = lastPart.match(/\b\d{5}\b/);
                if (shortZipMatch) {
                  details.zip = shortZipMatch[0];
                  details.city = lastPart.replace(shortZipMatch[0], '').trim();
                } else {
                  details.city = lastPart;
                }
              }
            }
          }
        } else if (typeof dpd === 'string') {
          address = dpd;
          let pId = '';
          const match = address.match(/ID:\s*([A-Za-z0-9]+)/);
          if (match) pId = match[1];
          
          const parts = address.split(',').map(p => p.trim());
          let streetVal = parts[1] || '';
          let cityVal = '';
          let zipVal = '';
          if (parts[2]) {
            const lastPart = parts[2].replace(/\(ID:\s*\S+\)/i, '').trim();
            const zipMatch = lastPart.match(/\b\d{3}\s*\d{2}\b/);
            if (zipMatch) {
              zipVal = zipMatch[0].replace(/\s+/g, '');
              cityVal = lastPart.replace(zipMatch[0], '').trim();
            } else {
              const shortZipMatch = lastPart.match(/\b\d{5}\b/);
              if (shortZipMatch) {
                zipVal = shortZipMatch[0];
                cityVal = lastPart.replace(shortZipMatch[0], '').trim();
              } else {
                cityVal = lastPart;
              }
            }
          }
          details = {
            id: pId,
            name: parts[0] || '',
            street: streetVal,
            city: cityVal,
            zip: zipVal,
            country: 'CZ'
          };
        }

        if (address && address !== "widgetClose") {
          setPickupPoint(address);
          setPickupPointDetails(details);
          setShowMapModal(false);
          if (alert) {
            alert(lang === 'CZ' ? 'Výdejní místo DPD bylo úspěšně vybráno.' : 'DPD pickup point selected.', 'success');
          }
        }
      }

      // 2. GLS Widget Message handler
      if (event.data && event.data.parcelshop) {
        const ps = event.data.parcelshop;
        console.log("GLS Widget message received:", ps);
        const detail = ps.detail;
        if (detail) {
          const resolvedStreet = detail.address || detail.street || '';
          const resolvedZip = (detail.zipcode || detail.zip || '').toString().replace(/\s+/g, '');
          const address = `${detail.name}, ${resolvedStreet}, ${detail.city} (ID: ${detail.pclshopid})`;
          setPickupPoint(address);
          
          const details = {
            id: detail.pclshopid || '',
            name: detail.name || '',
            street: resolvedStreet,
            city: detail.city || '',
            zip: resolvedZip,
            country: detail.country || 'CZ'
          };
          setPickupPointDetails(details);
          
          setShowMapModal(false);
          if (alert) {
            alert(lang === 'CZ' ? 'Výdejní místo GLS bylo úspěšně vybráno.' : 'GLS pickup point selected.', 'success');
          }
        }
      }
    };

    window.addEventListener('message', handleWidgetMessage);
    return () => {
      window.removeEventListener('message', handleWidgetMessage);
    };
  }, [lang]);

  useEffect(() => {
    let scrollY = 0;
    if (showMapModal) {
      scrollY = window.pageYOffset || document.documentElement.scrollTop;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const topStr = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (topStr) {
        const scrollYPos = parseInt(topStr, 10) * -1;
        if (!isNaN(scrollYPos)) {
          window.scrollTo(0, scrollYPos);
        }
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [showMapModal]);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert(t('Cart.empty'), 'error');
      return;
    }

    // Run stock validation right before submitting the order
    if (validateCart) {
      const currentCart = [...cart];
      const validated = await validateCart(cart);
      const isChanged = validated.length !== currentCart.length || 
        validated.some((item, idx) => item.quantity !== currentCart[idx]?.quantity || item.id !== currentCart[idx]?.id);
      
      if (isChanged) {
        alert(lang === 'CZ'
          ? 'Některé položky ve vašem košíku již nejsou dostupné a košík byl automaticky upraven. Zkontrolujte prosím objednávku znovu.'
          : 'Some items in your cart are no longer available and the cart has been adjusted. Please review your order again.',
          'error'
        );
        return;
      }
    }

    // General details presence check
    if (!name.trim() || !email.trim() || !phone.trim() || !street.trim() || !city.trim() || !zip.trim()) {
      alert(lang === 'CZ'
        ? 'Vyplňte prosím všechny povinné osobní a doručovací údaje.'
        : 'Please fill in all required personal and shipping details.',
        'error'
      );
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      alert(lang === 'CZ'
        ? 'Zadejte prosím platnou e-mailovou adresu.'
        : 'Please enter a valid email address.',
        'error'
      );
      return;
    }

    // Format and validate phone
    let cleanedPhone = phone.trim().replace(/\s+/g, '');
    if (/^\d{9}$/.test(cleanedPhone)) {
      cleanedPhone = '+420' + cleanedPhone;
    }
    const phoneRegex = /^\+\d{9,15}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      alert(lang === 'CZ'
        ? 'Zadejte prosím platné telefonní číslo s předvolbou (např. +420 123 456 789).'
        : 'Please enter a valid phone number with country code (e.g. +420 123 456 789).',
        'error'
      );
      return;
    }

    // Format and validate ZIP (only if not personal pickup)
    let cleanedZip = zip.trim().replace(/\s+/g, '');
    if (shipping !== 'pardubice') {
      const zipRegex = /^\d{5}$/;
      if (!zipRegex.test(cleanedZip)) {
        alert(lang === 'CZ'
          ? 'Zadejte prosím platné pětimístné PSČ (např. 534 01).'
          : 'Please enter a valid 5-digit postal code (e.g. 534 01).',
          'error'
        );
        return;
      }
      cleanedZip = `${cleanedZip.slice(0, 3)} ${cleanedZip.slice(3)}`;
    }

    if ((shipping === 'dpd-pickup' || shipping === 'gls-pickup') && !pickupPoint.trim()) {
      alert(lang === 'CZ' 
        ? 'Vyberte prosím výdejní místo na mapě.' 
        : 'Please select a pickup point on the map.', 'error');
      setMapType(shipping === 'dpd-pickup' ? 'dpd' : 'gls');
      setShowMapModal(true);
      return;
    }

    if (payment === 'card') {
      setIsPaying(true);
      try {
        const orderId = '100' + Math.floor(1000 + Math.random() * 9000);
        const amountCents = Math.round(finalTotal * 100);
        const returnUrl = window.location.origin + '/checkout?status=callback';

        // Vyžádání podpisu platby z Edge funkce
        const { data, error } = await supabase.functions.invoke('gp-webpay/sign', {
          body: {
            orderId,
            amount: amountCents,
            currency: '203', // CZK
            returnUrl
          }
        });

        if (error || !data || !data.DIGEST) {
          throw new Error(error?.message || 'Neplatná data podpisu');
        }

        // Uložit rozpracovanou objednávku do localStorage pro návrat
        localStorage.setItem('pending-order-data', JSON.stringify({
          orderId,
          cart,
          cartSubtotal,
          discountCode: appliedDiscount ? appliedDiscount.code : null,
          discountAmount,
          shippingCost,
          paymentSurcharge,
          creditApplied: actualAppliedCredit,
          finalTotal,
          shippingMethod: shipping,
          paymentMethod: 'card',
          pickupPoint,
          pickupPointDetails,
          customerDetails: {
            name,
            email,
            phone: cleanedPhone,
            street,
            city,
            zip: cleanedZip,
            isCompany,
            companyName: isCompany ? companyName : '',
            ico: isCompany ? ico : '',
            dic: isCompany ? dic : '',
            notes
          }
        }));

        // Přesměrovat na bránu pomocí POST formuláře
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'https://3dsecure.gpwebpay.com/pgw/order.do';

        Object.keys(data).forEach(key => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = data[key];
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } catch (err) {
        console.warn('GP webpay signature function failed. Falling back to mockup gateway simulator:', err);
        setIsPaying(false);
        setIsGatewayOpen(true); // Fallback na simulovanou bránu v případě nedostupnosti
      }
    } else {
      finalizeOrder();
    }
  };

  const handleGatewayPay = (e) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvv) {
      alert(lang === 'CZ' ? 'Vyplňte prosím všechny údaje platební karty.' : 'Please fill in all credit card details.', 'error');
      return;
    }
    
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      setIsGatewayOpen(false);
      finalizeOrder();
    }, 1500);
  };

  const finalizeOrder = () => {
    let cleanedPhone = phone.trim().replace(/\s+/g, '');
    if (/^\d{9}$/.test(cleanedPhone)) {
      cleanedPhone = '+420' + cleanedPhone;
    }
    let cleanedZip = zip.trim().replace(/\s+/g, '');
    if (shipping !== 'pardubice') {
      cleanedZip = `${cleanedZip.slice(0, 3)} ${cleanedZip.slice(3)}`;
    }
    const orderId = '100' + Math.floor(1000 + Math.random() * 9000);
    const order = {
      id: orderId,
      items: cart.map(item => ({
        id: item.id,
        product_id: item.product?.id || item.id,
        name: item.name || item.productName,
        price: item.price,
        quantity: item.quantity,
        product: item.product || item
      })),
      subtotal: cartSubtotal,
      discountCode: appliedDiscount ? appliedDiscount.code : null,
      discountAmount: discountAmount,
      shippingCost,
      paymentSurcharge,
      creditApplied: actualAppliedCredit,
      isicApplied: false,
      isicDiscount: 0,
      finalTotal,
      shippingMethod: shipping === 'dpd-pickup'
        ? (lang === 'CZ' ? `DPD - Výdejní místo: ${pickupPoint}` : `DPD - Pickup Point: ${pickupPoint}`)
        : shipping === 'dpd-address' || shipping === 'dpd'
          ? (lang === 'CZ' ? 'DPD - Doručení na adresu' : 'DPD - Home Delivery')
          : shipping === 'gls-pickup'
            ? (lang === 'CZ' ? `GLS - Výdejní místo: ${pickupPoint}` : `GLS - Pickup Point: ${pickupPoint}`)
            : shipping === 'gls-address' || shipping === 'gls'
              ? (lang === 'CZ' ? 'GLS - Doručení na adresu' : 'GLS - Home Delivery')
              : shipping === 'pardubice' 
                ? (lang === 'CZ' ? 'Osobní odběr (Bratří Čapků 1095, Holice)' : 'Personal Pickup (Bratří Čapků 1095, Holice)') 
                : (lang === 'CZ' ? 'Doprava' : 'Shipping'),
      carrier: shipping.startsWith('dpd') ? 'DPD' : shipping.startsWith('gls') ? 'GLS' : 'OSOBNÍ ODBĚR',
      paymentMethod: payment === 'card'
        ? (lang === 'CZ' ? 'Online platební karta' : 'Online Credit/Debit Card')
        : payment === 'transfer'
          ? (lang === 'CZ' ? 'Bankovní převod' : 'Bank Transfer')
          : (lang === 'CZ' ? 'Dobírka' : 'Cash on Delivery'),
      date: new Date().toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US'),
      invoiceUrl: '#',
      customerName: name,
      customerEmail: email,
      customerPhone: cleanedPhone,
      shippingStreet: street,
      shippingCity: city,
      shippingZip: cleanedZip,
      isCompany: isCompany,
      companyName: isCompany ? companyName : '',
      ico: isCompany ? ico : '',
      dic: isCompany ? dic : '',
      notes: notes,
      pickupPointDetails: shipping.includes('pickup') ? pickupPointDetails : null
    };

    submitOrder(order, actualAppliedCredit);
    alert(lang === 'CZ'
      ? `Děkujeme za Váš nákup! Objednávka #${order.id} byla úspěšně vytvořena a uložena do Vašeho profilu.`
      : `Thank you for your purchase! Order #${order.id} was successfully created and saved to your profile.`,
      'success'
    );
    setActivePage('order-confirmation');
  };

  return (
    <div className="fade-in">
      {isVerifying && (
        <div className="co-modal-overlay" style={{ zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="co-modal-content" style={{ textAlign: 'center' }}>
            <div className="co-loader-container">
              <div className="spinner-loader co-spinner"></div>
              <h3 style={{ marginTop: '20px', color: 'var(--nv-gold, #fdbd16)' }}>
                {lang === 'CZ' ? 'Ověřování platby...' : 'Verifying payment...'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                {lang === 'CZ' ? 'Komunikujeme s platební bránou GP webpay, prosím nezavírejte toto okno.' : 'Communicating with GP webpay payment gateway, please do not close this window.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {showMapModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          backgroundColor: 'rgba(0, 0, 0, 0.75)', 
          zIndex: 15000, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          pointerEvents: 'auto'
        }}>
          <div style={{ 
            position: 'relative', 
            width: '95%', 
            maxWidth: '900px', 
            height: '85vh', 
            background: '#1a1d24', 
            borderRadius: '8px', 
            overflow: 'hidden', 
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            
            {/* Close Button floating over the iframe */}
            <button 
              type="button" 
              onClick={() => setShowMapModal(false)}
              style={{ 
                position: 'absolute', 
                top: '12px', 
                right: '12px', 
                zIndex: 15001,
                background: 'rgba(0, 0, 0, 0.6)', 
                border: 'none', 
                color: '#fff', 
                fontSize: '20px', 
                fontWeight: 'bold',
                width: '32px', 
                height: '32px', 
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.8)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.6)'}
              title={lang === 'CZ' ? 'Zavřít' : 'Close'}
            >
              &times;
            </button>
            
            <div style={{ flex: 1, position: 'relative' }}>
              {mapType === 'dpd' ? (
                <iframe 
                  src={`https://api.dpd.cz/widget/latest/index.html?hideCloseButton=true&countries=CZ${payment === 'cod' ? '&paymentFilter=cod' : ''}`} 
                  style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                  title="DPD Widget"
                />
              ) : (
                <iframe 
                  src={`https://ps-maps.gls-czech.com?find=1&ctrcode=CZ&lang=cs${payment === 'cod' ? '&cod=1' : ''}`} 
                  style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                  title="GLS Widget"
                />
              )}
            </div>

            <div style={{ 
              height: '44px', 
              background: '#0b0c10', 
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '0 16px',
              color: '#8a8a92',
              fontSize: '11.5px',
              textAlign: 'center'
            }}>
              <span>💡 {lang === 'CZ' 
                ? 'Pokud se mapa výdejních míst nenačte, zavřete prosím toto okno a zvolte doručení kurýrem na adresu.'
                : 'If the pickup points map does not load, please close this window and select delivery by courier to your address.'}</span>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinner-loader {
          animation: spin 1s linear infinite;
        }

        /* Redesign classes from template */
        .__om-t {
          color: rgb(138, 138, 146);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 2.42px;
          text-transform: uppercase;
          font-family: var(--font-sans), system-ui, sans-serif;
        }

        .po-section {
          background-color: rgb(24, 24, 28);
          color: rgb(240, 240, 240);
          padding: 36px 64px 56px 64px;
        }
        @media (max-width: 640px) {
          .po-section {
            padding-top: 24px;
          }
        }

        .pof-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 52px;
        }

        /* Prevent global text style overriding styled elements */
        .nv-link span,
        .pof-step-num span,
        .pof-isic-row button span,
        .pof-submit span,
        .pof-price span,
        .pof-field span span {
          color: inherit;
          font-family: inherit;
          font-size: inherit;
          font-weight: inherit;
          letter-spacing: inherit;
          text-transform: inherit;
        }
        .nv-eyebrow {
          color: rgb(138, 138, 146);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 2.42px;
          margin-bottom: 10px;
          text-transform: uppercase;
        }

        .nv-link {
          font-size: 13px;
          font-weight: 500;
          text-transform: uppercase;
          color: rgb(253, 189, 22);
          letter-spacing: 1.04px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: opacity 0.2s;
          cursor: pointer;
          background: transparent;
          border: none;
          padding: 0 0 4px 0;
        }
        .nv-link:hover {
          opacity: 0.85;
        }
        .nv-link-arrow {
          font-size: 13px;
          font-weight: 500;
          transition: transform 0.2s;
        }
        .nv-link:hover .nv-link-arrow {
          transform: translateX(4px);
        }

        .pof-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 60px;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .pof-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }

        .pof-form {
          display: flex;
          flex-direction: column;
          gap: 48px;
        }

        .pof-aside {
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: sticky;
          top: 24px;
        }

        .pof-step {
          display: flex;
          flex-direction: column;
        }
        .pof-step-head {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 26px;
        }
        .pof-step-num {
          font-size: 12px;
          font-weight: 500;
          color: rgb(253, 189, 22);
          letter-spacing: 1.2px;
        }
        .pof-step-head h3 {
          font-size: 15px;
          font-weight: 600;
          text-transform: uppercase;
          margin: 0;
          letter-spacing: 0px;
          color: rgb(240, 240, 240);
        }

        .pof-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 600px) {
          .pof-2col {
            grid-template-columns: 1fr;
            gap: 0;
          }
        }
        .pof-field {
          display: flex;
          flex-direction: column;
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(240, 240, 240, 0.12);
          padding-bottom: 13px;
          box-sizing: border-box;
        }
        .pof-field span {
          display: block;
          margin-bottom: 10px;
          font-family: var(--font-sans), system-ui, sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: rgb(138, 138, 146);
          letter-spacing: 2.42px;
          text-transform: uppercase;
        }
        .pof-field input {
          background: transparent;
          border: none;
          outline: none;
          padding: 0;
          margin: 0;
          font-family: var(--font-sans), system-ui, sans-serif;
          font-size: 16px;
          color: rgb(240, 240, 240);
          font-weight: 400;
          width: 100%;
          height: 19.5px;
        }
        .pof-field input::placeholder {
          color: rgba(240, 240, 240, 0.25);
        }
        .pof-field input:-webkit-autofill,
        .pof-field input:-webkit-autofill:hover, 
        .pof-field input:-webkit-autofill:focus, 
        .pof-field input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px rgb(24, 24, 28) inset !important;
          -webkit-text-fill-color: rgb(240, 240, 240) !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .pof-radios {
          display: flex;
          flex-direction: column;
          border-top: none;
        }
        .pof-radio {
          display: flex;
          align-items: flex-start;
          padding: 18px 0;
          border: none;
          border-top: 1px solid rgba(240, 240, 240, 0.07);
          background: transparent;
          cursor: pointer;
          width: 100%;
          text-align: left;
          color: inherit;
          transition: opacity 0.18s ease;
        }
        .pof-radio:hover {
          opacity: 0.8;
        }

        .pof-radio-dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1.5px solid rgb(80, 80, 90);
          margin-right: 16px;
          margin-top: 2px;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-sizing: border-box;
          transition: border-color 0.18s ease;
          background-color: transparent;
        }
        .pof-radio.is-active .pof-radio-dot {
          border-color: rgb(253, 189, 22);
        }
        .pof-radio.is-active .pof-radio-dot::after {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: rgb(253, 189, 22);
        }

        .pof-radio-body {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pof-radio-name {
          font-size: 15px;
          font-weight: 600;
          color: rgb(240, 240, 240);
          letter-spacing: -0.075px;
        }
        .pof-radio-desc {
          font-size: 13px;
          color: rgb(138, 138, 146);
          line-height: 1.4;
        }
        .pof-price {
          font-size: 14px;
          font-weight: 600;
          color: rgb(240, 240, 240);
          margin-left: auto;
          flex-shrink: 0;
        }
        .pof-price.is-free {
          color: rgb(253, 189, 22);
        }

        .pof-summary {
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: transparent;
          border: none;
          padding: 0;
        }
        .pof-summary-title {
          margin: 0 0 22px 0;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(240, 240, 240, 0.07);
        }
        .pof-summary-title .__om-t {
          color: rgb(138, 138, 146);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 1.92px;
          text-transform: uppercase;
        }

        .pof-line-item {
          display: grid;
          grid-template-columns: 48px 1fr auto;
          gap: 16px;
          align-items: center;
          padding-bottom: 22px;
          border-bottom: 1px solid rgba(240, 240, 240, 0.07);
        }
        .pof-li-thumb {
          width: 48px;
          height: 67px;
          flex-shrink: 0;
          border-radius: 4px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.3);
          position: relative;
        }
        .pof-li-name {
          font-size: 14px;
          font-weight: 600;
          color: rgb(240, 240, 240);
          line-height: 1.4;
        }
        .pof-li-variant {
          font-size: 11px;
          color: rgb(138, 138, 146);
          margin-top: 2px;
        }
        .pof-li-price {
          font-size: 14px;
          font-weight: 600;
          color: rgb(253, 189, 22);
          white-space: nowrap;
          text-align: right;
        }
        .pof-li-price .__om-t {
          color: rgb(138, 138, 146);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 1.5px;
        }

        .pof-isic {
          padding: 20px 0;
          border-bottom: 1px solid rgba(240, 240, 240, 0.07);
        }
        .pof-isic-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .pof-isic-head .__om-t {
          color: rgb(138, 138, 146);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .pof-isic-pct {
          color: rgb(253, 189, 22);
          font-weight: 700;
        }
        .pof-isic-row {
          display: flex;
          align-items: center;
          border-bottom: 1px solid rgba(240, 240, 240, 0.12);
          padding-bottom: 8px;
          height: 28px;
          box-sizing: border-box;
        }
        .pof-isic-row input {
          flex-grow: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 14px;
          color: rgb(240, 240, 240);
          padding: 0;
          margin: 0;
        }
        .pof-isic-row input::placeholder {
          color: rgba(240, 240, 240, 0.25);
        }
        .pof-isic-row button {
          background: transparent;
          border: none;
          color: rgb(253, 189, 22);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.04px;
          cursor: pointer;
          transition: opacity 0.2s;
          padding: 1px 6px;
        }
        .pof-isic-row button:hover {
          opacity: 0.85;
        }
        .pof-isic-row button:disabled {
          color: rgb(138, 138, 146);
          cursor: not-allowed;
        }

        .pof-srows {
          display: flex;
          flex-direction: column;
          padding: 16px 0 4px 0;
          gap: 0;
        }
        .pof-srow {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 14px;
          color: rgb(138, 138, 146);
          padding: 7px 0;
        }
        .pof-sdots {
          flex-grow: 1;
          border-bottom: 1px dotted rgba(240, 240, 240, 0.12);
          margin: 0 10px;
          position: relative;
          top: -3px;
        }
        .pof-srow span:last-child {
          color: rgb(240, 240, 240);
          font-weight: 500;
        }
        .pof-srow span:last-child .__om-t {
          color: rgb(138, 138, 146);
          font-size: 11px;
          font-weight: 500;
        }

        .pof-total {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-top: 6px;
          padding: 18px 0 22px 0;
        }
        .pof-total span:first-child {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          color: rgb(138, 138, 146);
          letter-spacing: 1px;
        }
        .pof-total-val {
          font-size: 30px;
          font-weight: 700;
          color: rgb(253, 189, 22);
          letter-spacing: -0.6px;
        }
        .pof-total-val .__om-t {
          color: rgb(138, 138, 146);
          font-size: 11px;
          font-weight: 500;
        }

        .pof-submit {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 49.5px;
          background: rgb(253, 189, 22);
          color: rgb(26, 20, 7);
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1.04px;
          border: none;
          border-radius: 0;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .pof-submit:hover {
          opacity: 0.9;
        }
        .pof-submit .__om-t {
          color: rgb(26, 20, 7);
        }



        /* Card Art CSS Simulation from template */
        .card-art {
          display: block;
          height: 67px;
          width: 48px;
          position: relative;
          overflow: hidden;
          border-radius: 5px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.5);
        }
        .ca-base {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: radial-gradient(120% 80% at 28% 18%, rgb(138, 90, 204) 0%, rgba(0, 0, 0, 0) 55%), radial-gradient(110% 100% at 78% 88%, rgb(212, 161, 74) 0%, rgba(0, 0, 0, 0) 50%), radial-gradient(80% 80% at 50% 60%, rgb(74, 26, 110) 0%, rgba(0, 0, 0, 0) 60%), linear-gradient(135deg, rgb(26, 10, 46) 0%, rgb(74, 26, 110) 60%, rgb(26, 10, 46) 100%);
        }
        .ca-holo {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: conic-gradient(from 200deg, rgba(255, 255, 255, 0) 0deg, rgba(255, 255, 255, 0.12) 60deg, rgba(255, 255, 255, 0) 120deg, rgba(255, 255, 255, 0.08) 200deg, rgba(255, 255, 255, 0) 280deg, rgba(255, 255, 255, 0.1) 340deg, rgba(255, 255, 255, 0) 360deg);
        }
        .ca-shine {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: linear-gradient(160deg, rgba(255, 255, 255, 0.22) 0%, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0) 70%, rgba(255, 255, 255, 0.1) 100%);
          opacity: 0.6;
        }
        .ca-grain {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.35;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }
        .ca-frame {
          display: block;
          position: absolute;
          top: 4px;
          left: 3px;
          right: 3px;
          bottom: 4px;
          border: 1.5px solid rgba(255, 255, 255, 0.18);
          border-radius: 2px;
        }
        .ca-inner-frame {
          display: block;
          position: absolute;
          top: 9px;
          left: 4px;
          right: 4px;
          bottom: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 1px;
          background-image: linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.05));
          box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.35);
        }

        /* ComGate Simulator Modal Styles */
        .co-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .co-modal-content {
          width: 90%;
          max-width: 400px;
          border-radius: 0;
          padding: 28px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          position: relative;
          background: rgba(24, 24, 28, 0.98);
          border: 1px solid rgba(240, 240, 240, 0.07);
        }
        .co-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(240, 240, 240, 0.07);
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .co-modal-close-btn {
          background: none;
          border: none;
          color: rgb(138, 138, 146);
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
          line-height: 1;
          transition: color 0.2s;
        }
        .co-modal-close-btn:hover {
          color: rgb(240, 240, 240);
        }
        .co-loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 0;
        }
        .co-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(253, 189, 22, 0.1);
          border-top: 3px solid rgb(253, 189, 22);
          border-radius: 50%;
        }
      `}</style>

      <h1 className="sr-only">
        {lang === 'CZ' ? 'Pokladna a dokončení objednávky - NORTHVALE' : 'Checkout & Purchase - NORTHVALE'}
      </h1>

      <div className="container" style={{ marginBottom: '24px', paddingTop: '20px' }}>
        <nav className="breadcrumbs-nav" aria-label={lang === 'CZ' ? 'Drobečková navigace' : 'Breadcrumbs'} style={{ margin: 0, padding: 0 }}>
          <span className="breadcrumb-item" onClick={() => setActivePage('home')}>{t('common.home')}</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item" onClick={() => setActivePage('cart')}>{t('Cart.title')}</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item active">{lang === 'CZ' ? 'Pokladna' : 'Checkout'}</span>
        </nav>
      </div>

      <div className="container nv-section v-floating po-section">
        {cart.length === 0 ? (
          <div style={{ padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }} className="glass-panel">
            <span style={{ fontSize: '48px' }}>🛒</span>
            <h3>{t('Cart.empty')}</h3>
            <button className="btn btn-primary" onClick={() => setActivePage('sealed-catalog')}>
              {t('common.backToCatalog')}
            </button>
          </div>
        ) : (
        <form onSubmit={handlePlaceOrder}>
          <header className="ckf-head">
            <div className="title-group">
              <div className="nv-eyebrow">
                {lang === 'CZ' ? 'Krok 2 ze 3 - Doprava a platba' : 'Step 2 of 3 - Shipping & Payment'}
              </div>
              <h2 className="ckf-title">
                {lang === 'CZ' ? 'Pokladna' : 'Checkout'}
              </h2>
            </div>
            <span 
              className="nv-link" 
              onClick={() => setActivePage('cart')}
              style={{ cursor: 'pointer' }}
            >
              {lang === 'CZ' ? 'Zpět do košíku' : 'Back to Cart'} <span className="nv-link-arrow">→</span>
            </span>
          </header>

          {!user?.id && (
            <div className="checkout-login-banner" style={{
              padding: '0 0 12px 0',
              marginBottom: '32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '15px', fontWeight: '600' }}>
                  {lang === 'CZ' ? 'Máte již u nás účet?' : 'Already have an account?'}
                </h4>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
                  {lang === 'CZ' ? 'Přihlaste se a my vše předvyplníme za vás.' : 'Log in and we will auto-fill everything for you.'}
                </p>
              </div>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={onOpenLogin}
                style={{ 
                  borderColor: 'var(--nv-gold, #fdbd16)', 
                  color: 'var(--nv-gold, #fdbd16)',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: '1px solid var(--nv-gold, #fdbd16)',
                  borderRadius: '4px'
                }}
              >
                {lang === 'CZ' ? 'Přihlásit se' : 'Log In'}
              </button>
            </div>
          )}

          <div className="pof-grid">
            {/* Left Column: Form Steps */}
            <div className="pof-form">
              {/* Step 1: Osobní údaje */}
              <section className="pof-step">
                <div className="pof-step-head">
                  <span className="pof-step-num"><span className="__om-t">01</span></span>
                  <h3><span className="__om-t">{lang === 'CZ' ? 'Osobní údaje' : 'Personal Information'}</span></h3>
                </div>
                <div className="pof-2col">
                  <label className="pof-field">
                    <span><span className="__om-t">{lang === 'CZ' ? 'Jméno a příjmení' : 'Full Name'}</span></span>
                    <input 
                      type="text" 
                      required 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="Jan Novák"
                      autoComplete="name"
                    />
                  </label>
                  <label className="pof-field">
                    <span><span className="__om-t">{lang === 'CZ' ? 'E-mail' : 'Email'}</span></span>
                    <input 
                      type="email" 
                      required 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      placeholder="jan@example.cz"
                      autoComplete="email"
                    />
                  </label>
                </div>
                <label className="pof-field">
                  <span><span className="__om-t">{lang === 'CZ' ? 'Telefon' : 'Phone'}</span></span>
                  <input 
                    type="tel" 
                    required 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder={lang === 'CZ' ? '+420 123 456 789' : '+44 20 7946 0958'}
                    autoComplete="tel"
                  />
                </label>
              </section>

              {/* Step 2: Adresa doručení */}
              <section className="pof-step">
                <div className="pof-step-head">
                  <span className="pof-step-num"><span className="__om-t">02</span></span>
                  <h3><span className="__om-t">{lang === 'CZ' ? 'Adresa doručení' : 'Shipping Address'}</span></h3>
                </div>

                {/* Company Checkbox */}
                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="checkbox" 
                    id="is-company-checkbox"
                    checked={isCompany}
                    onChange={e => setIsCompany(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: 'var(--nv-gold, #fdbd16)',
                      cursor: 'pointer'
                    }}
                  />
                  <label htmlFor="is-company-checkbox" style={{ fontSize: '14px', fontWeight: '500', color: 'rgb(240, 240, 240)', cursor: 'pointer', userSelect: 'none' }}>
                    {lang === 'CZ' ? 'Nakupuji na firmu' : 'Buy as a company'}
                  </label>
                </div>

                {isCompany && (
                  <div className="fade-in">
                    <label className="pof-field">
                      <span><span className="__om-t">{lang === 'CZ' ? 'Obchodní jméno / Název firmy' : 'Company Name'}</span></span>
                      <input 
                        type="text" 
                        required={isCompany}
                        value={companyName} 
                        onChange={e => setCompanyName(e.target.value)} 
                        placeholder={lang === 'CZ' ? 'Moje Firma s.r.o.' : 'My Company Ltd.'}
                        autoComplete="organization"
                      />
                    </label>
                    <div className="pof-2col">
                      <label className="pof-field">
                        <span><span className="__om-t">{lang === 'CZ' ? 'IČO' : 'Company ID (IČO)'}</span></span>
                        <input 
                          type="text" 
                          required={isCompany}
                          value={ico} 
                          onChange={e => setIco(e.target.value)} 
                          placeholder="12345678"
                        />
                      </label>
                      <label className="pof-field">
                        <span><span className="__om-t">{lang === 'CZ' ? 'DIČ (volitelné)' : 'Tax ID (DIČ - optional)'}</span></span>
                        <input 
                          type="text" 
                          value={dic} 
                          onChange={e => setDic(e.target.value)} 
                          placeholder="CZ12345678"
                        />
                      </label>
                    </div>
                  </div>
                )}

                <label className="pof-field">
                  <span><span className="__om-t">{lang === 'CZ' ? 'Ulice a číslo popisné' : 'Street & house number'}</span></span>
                  <input 
                    type="text" 
                    required 
                    value={street} 
                    onChange={e => setStreet(e.target.value)} 
                    placeholder={lang === 'CZ' ? 'Bratří Čapků 1095' : '10 Downing Street'}
                    autoComplete="address-line1"
                  />
                </label>
                <div className="pof-2col">
                  <label className="pof-field">
                    <span><span className="__om-t">{lang === 'CZ' ? 'Město' : 'City'}</span></span>
                    <input 
                      type="text" 
                      required 
                      value={city} 
                      onChange={e => setCity(e.target.value)} 
                      placeholder={lang === 'CZ' ? 'Holice' : 'London'}
                      autoComplete="address-level2"
                    />
                  </label>
                  <label className="pof-field">
                    <span><span className="__om-t">{lang === 'CZ' ? 'PSČ' : 'ZIP / Postal Code'}</span></span>
                    <input 
                      type="text" 
                      required 
                      value={zip} 
                      onChange={e => setZip(e.target.value)} 
                      placeholder={lang === 'CZ' ? '534 01' : 'SW1A 2AA'}
                      autoComplete="postal-code"
                    />
                  </label>
                </div>
              </section>

              {/* Step 3: Poznámky */}
              <section className="pof-step">
                <div className="pof-step-head">
                  <span className="pof-step-num"><span className="__om-t">03</span></span>
                  <h3><span className="__om-t">{lang === 'CZ' ? 'Poznámky' : 'Order Notes'}</span></h3>
                </div>
                <label className="pof-field" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                  <span><span className="__om-t">{lang === 'CZ' ? 'Poznámka k objednávce (volitelné)' : 'Notes for the seller (optional)'}</span></span>
                  <textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    placeholder={lang === 'CZ' ? 'Máte nějaké speciální přání nebo dotaz k objednávce?' : 'Any special requests or questions about the order?'}
                    rows="3"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid rgba(240, 240, 240, 0.12)',
                      borderRadius: '4px',
                      color: 'rgb(240, 240, 240)',
                      padding: '12px',
                      fontSize: '14px',
                      fontFamily: 'var(--font-sans), system-ui, sans-serif',
                      outline: 'none',
                      resize: 'vertical',
                      marginTop: '8px'
                    }}
                  />
                </label>
              </section>

              {/* Step 4: Způsob dopravy */}
              <section className="pof-step">
                <div className="pof-step-head">
                  <span className="pof-step-num"><span className="__om-t">04</span></span>
                  <h3><span className="__om-t">{lang === 'CZ' ? 'Způsob dopravy' : 'Shipping Method'}</span></h3>
                </div>
                <div className="pof-radios" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Osobní odběr */}
                  <button 
                    type="button"
                    className={`pof-radio ${shipping === 'pardubice' ? 'is-active' : ''}`}
                    onClick={() => setShipping('pardubice')}
                  >
                    <span className="pof-radio-dot" aria-hidden="true"></span>
                    <span className="pof-radio-body">
                      <span className="pof-radio-name">
                        {lang === 'CZ' ? 'Osobní odběr (Bratří Čapků 1095, Holice)' : 'Personal Pickup (Bratří Čapků 1095, Holice)'}
                      </span>
                      <span className="pof-radio-desc">
                        {lang === 'CZ' ? 'Vyzvednutí na naší provozovně. Zdarma.' : 'Pickup at our premises. Free.'}
                      </span>
                    </span>
                    <span className={`pof-price ${shipping === 'pardubice' ? 'is-free' : ''}`}>{lang === 'CZ' ? 'Zdarma' : 'Free'}</span>
                  </button>

                  {/* DPD - Výdejní místo */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button 
                      type="button"
                      className={`pof-radio ${shipping === 'dpd-pickup' ? 'is-active' : ''}`}
                      onClick={() => {
                        setShipping('dpd-pickup');
                        setMapType('dpd');
                        setShowMapModal(true);
                      }}
                    >
                      <span className="pof-radio-dot" aria-hidden="true"></span>
                      <span className="pof-radio-body">
                        <span className="pof-radio-name">
                          {lang === 'CZ' ? 'DPD - Výdejní místo (Pickup)' : 'DPD - Pickup Point'}
                        </span>
                        <span className="pof-radio-desc">
                          {lang === 'CZ' ? 'Doručení na výdejní místo DPD nebo do boxu.' : 'Delivery to a DPD pickup point or box.'}
                        </span>
                      </span>
                      <span className={`pof-price ${subtotalAfterDiscount > 2000 ? 'is-free' : ''}`}>
                        {getShippingPriceDisplay('dpd-pickup', 79)}
                      </span>
                    </button>
                    {shipping === 'dpd-pickup' && pickupPoint && (
                      <div style={{ padding: '8px 12px 8px 36px', fontSize: '13px', color: '#81c784', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(46, 125, 50, 0.04)', borderRadius: '4px', border: '1px solid rgba(46, 125, 50, 0.1)' }}>
                        <span>✓ <strong>{lang === 'CZ' ? 'Vybráno:' : 'Selected:'}</strong> {pickupPoint}</span>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            setMapType('dpd');
                            setShowMapModal(true);
                          }}
                          style={{ color: 'var(--nv-gold, #fdbd16)', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600' }}
                        >
                          {lang === 'CZ' ? 'Změnit' : 'Change'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* DPD - Doručení na adresu */}
                  <button 
                    type="button"
                    className={`pof-radio ${shipping === 'dpd-address' ? 'is-active' : ''}`}
                    onClick={() => setShipping('dpd-address')}
                  >
                    <span className="pof-radio-dot" aria-hidden="true"></span>
                    <span className="pof-radio-body">
                      <span className="pof-radio-name">
                        {lang === 'CZ' ? 'DPD - Doručení na adresu' : 'DPD - Home Delivery'}
                      </span>
                      <span className="pof-radio-desc">
                        {lang === 'CZ' ? 'Doručení kurýrem DPD na Vaši adresu.' : 'Courier delivery to your address.'}
                      </span>
                    </span>
                    <span className={`pof-price ${subtotalAfterDiscount > 2000 ? 'is-free' : ''}`}>
                      {getShippingPriceDisplay('dpd-address', 109)}
                    </span>
                  </button>

                  {/* GLS - Výdejní místo */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button 
                      type="button"
                      className={`pof-radio ${shipping === 'gls-pickup' ? 'is-active' : ''}`}
                      onClick={() => {
                        setShipping('gls-pickup');
                        setMapType('gls');
                        setShowMapModal(true);
                      }}
                    >
                      <span className="pof-radio-dot" aria-hidden="true"></span>
                      <span className="pof-radio-body">
                        <span className="pof-radio-name">
                          {lang === 'CZ' ? 'GLS - Výdejní místo (ParcelShop)' : 'GLS - Pickup Point'}
                        </span>
                        <span className="pof-radio-desc">
                          {lang === 'CZ' ? 'Doručení na výdejní místo GLS nebo do boxu.' : 'Delivery to a GLS pickup point or box.'}
                        </span>
                      </span>
                      <span className={`pof-price ${subtotalAfterDiscount > 2000 ? 'is-free' : ''}`}>
                        {getShippingPriceDisplay('gls-pickup', 89)}
                      </span>
                    </button>
                    {shipping === 'gls-pickup' && pickupPoint && (
                      <div style={{ padding: '8px 12px 8px 36px', fontSize: '13px', color: '#81c784', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(46, 125, 50, 0.04)', borderRadius: '4px', border: '1px solid rgba(46, 125, 50, 0.1)' }}>
                        <span>✓ <strong>{lang === 'CZ' ? 'Vybráno:' : 'Selected:'}</strong> {pickupPoint}</span>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            setMapType('gls');
                            setShowMapModal(true);
                          }}
                          style={{ color: 'var(--nv-gold, #fdbd16)', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600' }}
                        >
                          {lang === 'CZ' ? 'Změnit' : 'Change'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* GLS - Doručení na adresu */}
                  <button 
                    type="button"
                    className={`pof-radio ${shipping === 'gls-address' ? 'is-active' : ''}`}
                    onClick={() => setShipping('gls-address')}
                  >
                    <span className="pof-radio-dot" aria-hidden="true"></span>
                    <span className="pof-radio-body">
                      <span className="pof-radio-name">
                        {lang === 'CZ' ? 'GLS - Doručení na adresu' : 'GLS - Home Delivery'}
                      </span>
                      <span className="pof-radio-desc">
                        {lang === 'CZ' ? 'Doručení kurýrem GLS na Vaši adresu.' : 'Courier delivery to your address.'}
                      </span>
                    </span>
                    <span className={`pof-price ${subtotalAfterDiscount > 2000 ? 'is-free' : ''}`}>
                      {getShippingPriceDisplay('gls-address', 129)}
                    </span>
                  </button>
                </div>
              </section>

              {/* Step 5: Způsob platby */}
              <section className="pof-step" style={{ marginTop: '24px' }}>
                <div className="pof-step-head">
                  <span className="pof-step-num"><span className="__om-t">05</span></span>
                  <h3><span className="__om-t">{lang === 'CZ' ? 'Způsob platby' : 'Payment Method'}</span></h3>
                </div>
                <div className="pof-radios" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Platební karta */}
                  <button 
                    type="button"
                    className={`pof-radio ${payment === 'card' ? 'is-active' : ''}`}
                    onClick={() => setPayment('card')}
                  >
                    <span className="pof-radio-dot" aria-hidden="true"></span>
                    <span className="pof-radio-body">
                      <span className="pof-radio-name">
                        {lang === 'CZ' ? 'Online platební karta (GP webpay)' : 'Online Credit/Debit Card (GP webpay)'}
                      </span>
                      <span className="pof-radio-desc">
                        {lang === 'CZ' ? 'Rychlá a bezpečná platba kartou přes bránu Global Payments.' : 'Fast and secure card payment via Global Payments gateway.'}
                      </span>
                    </span>
                  </button>

                  {/* Bankovní převod */}
                  <button 
                    type="button"
                    className={`pof-radio ${payment === 'transfer' ? 'is-active' : ''}`}
                    onClick={() => setPayment('transfer')}
                  >
                    <span className="pof-radio-dot" aria-hidden="true"></span>
                    <span className="pof-radio-body">
                      <span className="pof-radio-name">
                        {lang === 'CZ' ? 'Bankovní převod' : 'Bank Transfer'}
                      </span>
                      <span className="pof-radio-desc">
                        {lang === 'CZ' ? 'Převod peněz z Vašeho účtu. Objednávka se vyřídí po připsání platby.' : 'Transfer money from your bank account. Order is processed after payment is received.'}
                      </span>
                    </span>
                  </button>

                  {/* Dobírka */}
                  <button 
                    type="button"
                    className={`pof-radio ${payment === 'cod' ? 'is-active' : ''}`}
                    onClick={() => setPayment('cod')}
                  >
                    <span className="pof-radio-dot" aria-hidden="true"></span>
                    <span className="pof-radio-body">
                      <span className="pof-radio-name">
                        {lang === 'CZ' ? 'Dobírka' : 'Cash on Delivery'}
                      </span>
                      <span className="pof-radio-desc">
                        {lang === 'CZ' ? 'Platba hotově nebo kartou kurýrovi při převzetí zásilky.' : 'Pay by cash or card to the courier upon parcel arrival.'}
                      </span>
                    </span>
                    <span className="pof-price">+25 Kč</span>
                  </button>
                </div>

                {payment === 'transfer' && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px 16px',
                    background: 'rgba(253, 189, 22, 0.04)',
                    border: '1px dashed rgba(253, 189, 22, 0.25)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: 'var(--nv-gold, #fdbd16)',
                    lineHeight: '1.4'
                  }}>
                    💡 {lang === 'CZ' 
                      ? 'Platební údaje a QR kód pro platbu se zobrazí ihned po dokončení objednávky a zašleme Vám je i e-mailem. Zásilku odešleme po připsání platby.' 
                      : 'Payment details and QR code will be displayed immediately after completing your order and sent to your email. The shipment is dispatched once payment is received.'}
                  </div>
                )}
              </section>
            </div>

            {/* Right Column: Sticky Sidebar */}
            <aside className="pof-aside">
              <div className="pof-summary">
                <h3 className="pof-summary-title">
                  <span className="__om-t">{lang === 'CZ' ? 'Vaše objednávka' : 'Your Order Summary'}</span>
                </h3>

                {/* Preorder order warning hidden for now
                {cart.some(item => item.product?.preorder || item.preorder) && (
                  <div style={{
                    background: 'rgba(253, 189, 22, 0.02)',
                    border: '1px solid rgba(253, 189, 22, 0.15)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    color: 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    gap: '8px',
                    boxSizing: 'border-box'
                  }}>
                    <span style={{ fontSize: '14px', color: 'var(--nv-gold, #fdbd16)' }}>⚠️</span>
                    <div style={{ textAlign: 'left' }}>
                      {lang === 'CZ'
                        ? 'Objednávka obsahuje předobjednávku. Zásilka bude odeslána kompletně až po naskladnění všech položek.'
                        : 'Your order contains a pre-order. The entire shipment will ship together once all items are in stock.'}
                    </div>
                  </div>
                )}
                */}
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {cart.map((item, idx) => (
                    <div key={idx} className="pof-line-item">
                      <div className="pof-li-thumb">
                        <img 
                          src={getProductImageCached(item.product?.id || item.id, item.product?.image || item.image || '/Akce - NORTHVALE.webp')} 
                          alt={item.name || (item.product && item.product.name) || 'Northvale TCG produkt'} 
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      </div>
                      <div className="pof-li-name">
                        <div>
                          {item.name || (item.product && item.product.name)}
                          {/* Preorder label hidden for now
                          {(item.product?.preorder || item.preorder) && (
                            <span style={{ fontSize: '8px', fontWeight: '800', backgroundColor: 'rgba(253, 189, 22, 0.12)', color: 'var(--nv-gold, #fdbd16)', padding: '1px 4px', borderRadius: '2px', marginLeft: '6px', display: 'inline-block', verticalAlign: 'middle', textTransform: 'uppercase', border: '1px solid rgba(253, 189, 22, 0.2)' }}>
                              {lang === 'CZ' ? 'Předobjednávka' : 'Pre-order'}
                            </span>
                          )}
                          */}
                        </div>
                        {item.condition && (
                          <div className="pof-li-variant">
                            {lang === 'CZ' ? 'Stav' : 'Condition'}: {item.condition} | {item.lang} | {item.foil ? 'Foil' : 'Non-Foil'}
                          </div>
                        )}
                      </div>
                      <div className="pof-li-price">
                        {item.quantity}<span className="__om-t">x </span>{item.price.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} <span className="__om-t">{lang === 'CZ' ? 'Kč' : 'CZK'}</span>
                      </div>
                    </div>
                  ))}
                </div>



                {/* Store Credit Redemption */}
                {user && user.storeCredit > 0 && (
                  <div className="pof-isic">
                    <div className="pof-isic-head">
                      <span className="__om-t">{lang === 'CZ' ? 'Uplatnit Store Kredit' : 'Redeem Store Credit'}</span>
                      <span className="pof-isic-pct">
                        {lang === 'CZ' 
                          ? `K dispozici: ${user.storeCredit.toLocaleString('cs-CZ')} Kč` 
                          : `Available: ${user.storeCredit.toLocaleString('en-US')} CZK`}
                      </span>
                    </div>
                    <div className="pof-isic-row">
                      <input 
                        type="number" 
                        min="0"
                        max={user.storeCredit}
                        placeholder={lang === 'CZ' ? `Max. ${user.storeCredit}` : `Max. ${user.storeCredit}`}
                        value={creditInput} 
                        onChange={(e) => setCreditInput(e.target.value)}
                        disabled={appliedCredit > 0}
                      />
                      {appliedCredit > 0 ? (
                        <button 
                          type="button"
                          onClick={() => {
                            setAppliedCredit(0);
                            setCreditInput('');
                          }}
                        >
                          <span className="__om-t">{lang === 'CZ' ? 'Zrušit' : 'Cancel'}</span>
                        </button>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => {
                            const val = Math.max(0, parseInt(creditInput) || 0);
                            if (val > user.storeCredit) {
                              alert(lang === 'CZ' ? 'Nemáte dostatek kreditu.' : 'You do not have enough store credit.', 'error');
                              return;
                            }
                            const maxPossibleCredit = Math.max(0, subtotalAfterDiscount + shippingCost + paymentSurcharge - isicDiscount);
                            const finalApplied = Math.min(val, maxPossibleCredit);
                            setAppliedCredit(finalApplied);
                            setCreditInput(finalApplied.toString());
                          }}
                        >
                          <span className="__om-t">{lang === 'CZ' ? 'Uplatnit' : 'Apply'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                 {/* Discount Code Input */}
                 <div className="pof-isic" style={{ padding: '20px 0', borderBottom: '1px solid rgba(240, 240, 240, 0.07)' }}>
                   <div className="pof-isic-head">
                     <span className="__om-t">{lang === 'CZ' ? 'Slevový kód' : 'Discount Code'}</span>
                   </div>
                   <div className="pof-isic-row">
                     <input 
                       type="text" 
                       placeholder={lang === 'CZ' ? 'Zadejte kód' : 'Enter code'}
                       value={promoInput} 
                       onChange={(e) => setPromoInput(e.target.value)}
                       disabled={!!appliedDiscount || promoLoading}
                       style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '14px', flexGrow: 1 }}
                     />
                     {appliedDiscount ? (
                       <button 
                         type="button"
                         onClick={() => {
                           setAppliedDiscount(null);
                           setPromoInput('');
                         }}
                         style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', cursor: 'pointer' }}
                       >
                         <span className="__om-t">{lang === 'CZ' ? 'Odstranit' : 'Remove'}</span>
                       </button>
                     ) : (
                       <button 
                         type="button"
                         onClick={handleApplyDiscount}
                         disabled={promoLoading}
                         style={{ background: 'transparent', border: 'none', color: 'rgb(253, 189, 22)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', cursor: 'pointer' }}
                       >
                         <span className="__om-t">{promoLoading ? (lang === 'CZ' ? 'Ověřování...' : 'Verifying...') : (lang === 'CZ' ? 'Uplatnit' : 'Apply')}</span>
                       </button>
                     )}
                   </div>
                 </div>

                 {/* Totals Summary */}
                 <div className="pof-srows">
                   <div className="pof-srow">
                     <span><span className="__om-t">{lang === 'CZ' ? 'Mezisoučet' : 'Subtotal'}</span></span>
                     <span className="pof-sdots"></span>
                     <span>{cartSubtotal.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} <span className="__om-t">{lang === 'CZ' ? 'Kč' : 'CZK'}</span></span>
                   </div>

                   {appliedDiscount && (
                     <div className="pof-srow" style={{ color: 'var(--color-gold)' }}>
                       <span><span className="__om-t">{lang === 'CZ' ? `Sleva (${appliedDiscount.code})` : `Discount (${appliedDiscount.code})`}</span></span>
                       <span className="pof-sdots"></span>
                       <span>-{discountAmount.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} <span className="__om-t">{lang === 'CZ' ? 'Kč' : 'CZK'}</span></span>
                     </div>
                   )}

                   <div className="pof-srow">
                     <span><span className="__om-t">{lang === 'CZ' ? 'Doprava' : 'Shipping'}</span></span>
                     <span className="pof-sdots"></span>
                     <span>{shippingCost === 0 ? (lang === 'CZ' ? 'Zdarma' : 'Free') : `${shippingCost} ${lang === 'CZ' ? 'Kč' : 'CZK'}`}</span>
                   </div>
                   {paymentSurcharge > 0 && (
                     <div className="pof-srow">
                       <span><span className="__om-t">{lang === 'CZ' ? 'Dobírkový příplatek' : 'COD Surcharge'}</span></span>
                       <span className="pof-sdots"></span>
                       <span>{paymentSurcharge} <span className="__om-t">{lang === 'CZ' ? 'Kč' : 'CZK'}</span></span>
                     </div>
                   )}

                   {actualAppliedCredit > 0 && (
                     <div className="pof-srow" style={{ color: 'var(--nv-green)' }}>
                       <span><span className="__om-t">{lang === 'CZ' ? 'Uplatněný kredit' : 'Store Credit applied'}</span></span>
                       <span className="pof-sdots"></span>
                       <span>-{actualAppliedCredit.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} <span className="__om-t">{lang === 'CZ' ? 'Kč' : 'CZK'}</span></span>
                     </div>
                   )}
                 </div>

                <div className="pof-total">
                  <span><span className="__om-t">{lang === 'CZ' ? 'Celkem' : 'Total due'}</span></span>
                  <span className="pof-total-val">{finalTotal.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} <span className="__om-t">{lang === 'CZ' ? 'Kč' : 'CZK'}</span></span>
                </div>

                <button type="submit" className="pof-submit">
                  <span className="__om-t">
                    {payment === 'card' 
                      ? (lang === 'CZ' ? 'Objednat a zaplatit' : 'Place Order & Pay') 
                      : (lang === 'CZ' ? 'Dokončit objednávku' : 'Complete Order')}
                  </span>
                  <span><span className="__om-t">→</span></span>
                </button>

                <div style={{ fontSize: '11px', color: 'var(--text-muted, #8a8a92)', lineHeight: '1.5', marginTop: '14px', textAlign: 'center' }}>
                  {lang === 'CZ' ? (
                    <>
                      Kliknutím na tlačítko souhlasíte s našimi{' '}
                      <span 
                        onClick={() => setActivePage('gdpr-vop', 'vop')} 
                        style={{ color: 'var(--color-gold, #fdbd16)', cursor: 'pointer', textDecoration: 'underline', fontWeight: '500' }}
                      >
                        obchodními podmínkami
                      </span>{' '}
                      a berete na vědomí{' '}
                      <span 
                        onClick={() => setActivePage('gdpr-vop', 'gdpr')} 
                        style={{ color: 'var(--color-gold, #fdbd16)', cursor: 'pointer', textDecoration: 'underline', fontWeight: '500' }}
                      >
                        zpracování osobních údajů
                      </span>.
                    </>
                  ) : (
                    <>
                      By clicking the button, you agree to our{' '}
                      <span 
                        onClick={() => setActivePage('gdpr-vop', 'vop')} 
                        style={{ color: 'var(--color-gold, #fdbd16)', cursor: 'pointer', textDecoration: 'underline', fontWeight: '500' }}
                      >
                        terms and conditions
                      </span>{' '}
                      and acknowledge the{' '}
                      <span 
                        onClick={() => setActivePage('gdpr-vop', 'gdpr')} 
                        style={{ color: 'var(--color-gold, #fdbd16)', cursor: 'pointer', textDecoration: 'underline', fontWeight: '500' }}
                      >
                        privacy policy
                      </span>.
                    </>
                  )}
                </div>
              </div>

              {/* Help & Contact Section */}
              <div className="ckf-help" style={{ marginTop: '24px' }}>
                <span>{t('Cart.help') || (lang === 'CZ' ? 'Nevíte si rady?' : 'Need help?')}</span>
                <a href="tel:+420739666779">+420 739 666 779</a>
                <span style={{ opacity: 0.4 }}>{"/"}</span>
                <a href="mailto:info@northvaletcg.eu">info@northvaletcg.eu</a>
              </div>
            </aside>
          </div>
        </form>
      )}

      {/* ComGate Payment Gateway Simulator Modal */}
      {isGatewayOpen && (
        <div className="co-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="co-modal-content">
            <div className="co-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>💳</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-gold)' }}>
                  {lang === 'CZ' ? 'Zabezpečená platba GP Webpay' : 'Secure GP Webpay Payment'}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsGatewayOpen(false)} 
                disabled={isPaying}
                className="co-modal-close-btn"
              >
                ✕
              </button>
            </div>

            {isPaying ? (
              <div className="co-loader-container">
                <div className="spinner-loader co-spinner"></div>
                <p style={{ marginTop: '16px', fontSize: '14px', fontWeight: '600' }}>
                  {lang === 'CZ' ? 'Zpracování platby, prosím vyčkejte...' : 'Processing payment, please wait...'}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {lang === 'CZ' ? 'Komunikace s bankou...' : 'Communicating with the bank...'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleGatewayPay} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'CZ' ? 'ČÁSTKA K ÚHRADĚ' : 'AMOUNT TO PAY'}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>
                    {finalTotal.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}
                  </div>
                </div>

                <div className="pof-field" style={{ marginBottom: '16px' }}>
                  <span>{lang === 'CZ' ? 'Číslo platební karty' : 'Card Number'}</span>
                  <input 
                    type="text" 
                    required 
                    placeholder="4111 2222 3333 4444"
                    maxLength="19"
                    value={cardNumber}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                      let matches = v.match(/\d{4,16}/g);
                      let match = matches && matches[0] || '';
                      let parts = [];
                      for (let i = 0, len = match.length; i < len; i += 4) {
                        parts.push(match.substring(i, i + 4));
                      }
                      if (parts.length > 0) {
                        setCardNumber(parts.join(' '));
                      } else {
                        setCardNumber(v);
                      }
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div className="pof-field" style={{ flex: 1, marginBottom: '16px' }}>
                    <span>{lang === 'CZ' ? 'Platnost (MM/RR)' : 'Expiry (MM/YY)'}</span>
                    <input 
                      type="text" 
                      required 
                      placeholder="12/28"
                      maxLength="5"
                      value={cardExpiry}
                      onChange={(e) => {
                        let v = e.target.value.replace('/', '').replace(/[^0-9]/gi, '');
                        if (v.length >= 2) {
                          setCardExpiry(v.substring(0, 2) + '/' + v.substring(2, 4));
                        } else {
                          setCardExpiry(v);
                        }
                      }}
                    />
                  </div>
                  <div className="pof-field" style={{ flex: 1, marginBottom: '16px' }}>
                    <span>CVV / CVC</span>
                    <input 
                      type="password" 
                      required 
                      placeholder="123"
                      maxLength="3"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/gi, ''))}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                  {lang === 'CZ' ? 'Zaplatit bezpečně' : 'Pay Securely'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

