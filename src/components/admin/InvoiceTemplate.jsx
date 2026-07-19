import React from 'react';

export default function InvoiceTemplate({ order, onClose, lang = 'CZ' }) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  // Calculations for Czech VAT (21% standard rate)
  const itemsOnly = order.items ? order.items.filter(i => !i.isService) : [];
  const itemsSubtotal = itemsOnly.reduce((sum, item) => sum + item.total, 0);
  const shippingCost = order.shippingCost || 0;
  const paymentSurcharge = order.paymentSurcharge || 0;
  const totalWithVat = order.totalPrice || order.finalTotal || order.total || (itemsSubtotal + shippingCost + paymentSurcharge);

  // Since e-shop prices are shown with DPH (DPH inclusive)
  const vatRate = 0.21;
  const totalBase = totalWithVat / (1 + vatRate);
  const totalVat = totalWithVat - totalBase;

  return (
    <div className="invoice-preview-container">
      {/* Action Bar (hidden on print) */}
      <div className="invoice-actions-bar no-print">
        <button className="orders-action-btn" onClick={onClose}>
          {lang === 'CZ' ? '← Zpět na detail' : '← Back to Detail'}
        </button>
        <button className="orders-action-btn orders-action-btn-primary" onClick={handlePrint}>
          🖨️ {lang === 'CZ' ? 'Vytisknout fakturu' : 'Print Invoice'}
        </button>
      </div>

      {/* Invoice Document (Print Area) */}
      <div id="invoice-print-area" className="invoice-document">
        <header className="invoice-header">
          <div className="invoice-title-section">
            <h1>{lang === 'CZ' ? 'FAKTURA – DAŇOVÝ DOKLAD' : 'INVOICE – TAX DOCUMENT'}</h1>
            <p className="invoice-number-label">
              {lang === 'CZ' ? 'Číslo dokladu:' : 'Document No:'} <strong>{order.id}</strong>
            </p>
          </div>
          <div className="invoice-meta-section">
            <p>{lang === 'CZ' ? 'Variabilní symbol:' : 'Variable Symbol:'} <strong>{order.id}</strong></p>
            <p>{lang === 'CZ' ? 'Konstantní symbol:' : 'Constant Symbol:'} <strong>0308</strong></p>
          </div>
        </header>

        <hr className="invoice-divider" />

        <div className="invoice-parties-section">
          {/* Supplier (Dodavatel) */}
          <div className="invoice-party invoice-supplier">
            <h2>{lang === 'CZ' ? 'Dodavatel:' : 'Supplier:'}</h2>
            <p className="party-name"><strong>NORTHVALE s.r.o.</strong></p>
            <p>Bratří Čapků 1095</p>
            <p>534 01 Holice</p>
            <p>{lang === 'CZ' ? 'Česká republika' : 'Czech Republic'}</p>
            <div className="party-tax-ids" style={{ marginTop: '10px' }}>
              <p>IČO: <strong>29618142</strong></p>
              <p>DIČ: <strong>CZ29618142</strong></p>
            </div>
            <p className="invoice-legal-note" style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
              {lang === 'CZ' 
                ? 'Společnost zapsaná v obchodním rejstříku vedeném Krajským soudem v Hradci Králové, oddíl C, vložka 29618.'
                : 'Company registered in the Commercial Register maintained by the Regional Court in Hradec Králové, Section C, File 29618.'}
            </p>
          </div>

          {/* Customer (Odběratel) */}
          <div className="invoice-party invoice-customer">
            <h2>{lang === 'CZ' ? 'Odběratel:' : 'Customer:'}</h2>
            {order.isCompany && order.companyName ? (
              <>
                <p className="party-name"><strong>{order.companyName}</strong></p>
                <p>{lang === 'CZ' ? 'Jméno:' : 'Name:'} {order.customerName}</p>
              </>
            ) : (
              <p className="party-name"><strong>{order.customerName}</strong></p>
            )}
            <p>{order.street}</p>
            <p>{order.city}, {order.zip}</p>
            <p>Země: CZ</p>
            {order.isCompany && (
              <div className="party-tax-ids" style={{ marginTop: '10px' }}>
                {order.ico && <p>IČO: <strong>{order.ico}</strong></p>}
                {order.dic && <p>DIČ: <strong>{order.dic}</strong></p>}
              </div>
            )}
            <div style={{ marginTop: '10px', fontSize: '12px' }}>
              <p>Email: {order.email}</p>
              <p>Tel: {order.phone}</p>
            </div>
          </div>
        </div>

        <hr className="invoice-divider" />

        {/* Date and Payment Metadata */}
        <div className="invoice-dates-section">
          <div className="date-col">
            <p>{lang === 'CZ' ? 'Datum vystavení:' : 'Date of Issue:'} <strong>{order.date}</strong></p>
            <p>{lang === 'CZ' ? 'Datum uskutečnění zdanitelného plnění (DUZP):' : 'Date of Taxable Supply (DUZP):'} <strong>{order.date}</strong></p>
            <p>{lang === 'CZ' ? 'Datum splatnosti:' : 'Due Date:'} <strong>{lang === 'CZ' ? 'Uhrazeno' : 'Paid'}</strong></p>
          </div>
          <div className="payment-col">
            <p>{lang === 'CZ' ? 'Forma úhrady:' : 'Method of Payment:'} <strong>{order.paymentMethod}</strong></p>
            <p>{lang === 'CZ' ? 'Bankovní účet:' : 'Bank Account:'} <strong>1854161005 / 2700</strong> (UniCredit Bank)</p>
            <p>IBAN: <strong>CZ37 2700 0000 0018 5416 1005</strong></p>
          </div>
        </div>

        {/* Items Table */}
        <div className="invoice-items-table-container">
          <table className="invoice-items-table">
            <thead>
              <tr>
                <th>{lang === 'CZ' ? 'Název položky' : 'Description'}</th>
                <th style={{ textAlign: 'center' }}>{lang === 'CZ' ? 'Množství' : 'Qty'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'CZ' ? 'Cena za ks' : 'Unit Price'}</th>
                <th style={{ textAlign: 'center' }}>{lang === 'CZ' ? 'Sazba DPH' : 'VAT Rate'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'CZ' ? 'Celkem s DPH' : 'Total with VAT'}</th>
              </tr>
            </thead>
            <tbody>
              {itemsOnly.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity} ks</td>
                  <td style={{ textAlign: 'right' }}>{item.price.toLocaleString()} Kč</td>
                  <td style={{ textAlign: 'center' }}>21%</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>{item.total.toLocaleString()} Kč</td>
                </tr>
              ))}
              {shippingCost > 0 && (
                <tr>
                  <td>{order.shippingMethod || (lang === 'CZ' ? 'Náklady na doručení' : 'Shipping fee')}</td>
                  <td style={{ textAlign: 'center' }}>1 ks</td>
                  <td style={{ textAlign: 'right' }}>{shippingCost.toLocaleString()} Kč</td>
                  <td style={{ textAlign: 'center' }}>21%</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>{shippingCost.toLocaleString()} Kč</td>
                </tr>
              )}
              {paymentSurcharge > 0 && (
                <tr>
                  <td>{lang === 'CZ' ? 'Dobírkový příplatek' : 'COD surcharge'}</td>
                  <td style={{ textAlign: 'center' }}>1 ks</td>
                  <td style={{ textAlign: 'right' }}>{paymentSurcharge.toLocaleString()} Kč</td>
                  <td style={{ textAlign: 'center' }}>21%</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>{paymentSurcharge.toLocaleString()} Kč</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* VAT Breakdown and Summary */}
        <div className="invoice-summary-section">
          {/* VAT Summary Box */}
          <div className="invoice-vat-summary">
            <table>
              <thead>
                <tr>
                  <th>{lang === 'CZ' ? 'Sazba DPH' : 'VAT Rate'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'CZ' ? 'Základ (bez DPH)' : 'Base (excl. VAT)'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'CZ' ? 'Částka DPH' : 'VAT Amount'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'CZ' ? 'Celkem s DPH' : 'Total (incl. VAT)'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>21%</td>
                  <td style={{ textAlign: 'right' }}>{totalBase.toFixed(2)} Kč</td>
                  <td style={{ textAlign: 'right' }}>{totalVat.toFixed(2)} Kč</td>
                  <td style={{ textAlign: 'right' }}>{totalWithVat.toFixed(2)} Kč</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Final Total Box */}
          <div className="invoice-final-total-box">
            <div className="invoice-total-row">
              <span className="total-label">{lang === 'CZ' ? 'Celkem k úhradě:' : 'Total to Pay:'}</span>
              <span className="total-value">{totalWithVat.toLocaleString()} Kč</span>
            </div>
            <p className="invoice-payment-status">
              🟢 {lang === 'CZ' ? 'Uhrazeno – neplaťte' : 'Paid – Do not pay'}
            </p>
          </div>
        </div>

        {order.notes && (
          <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: '3px solid var(--nv-gold, #fdbd16)', fontSize: '13px', textAlign: 'left' }}>
            <strong>{lang === 'CZ' ? 'Poznámka k objednávce:' : 'Order Note:'}</strong> {order.notes}
          </div>
        )}

        <footer className="invoice-document-footer">
          <p>{lang === 'CZ' ? 'Děkujeme za Váš nákup na Northvale TCG!' : 'Thank you for shopping at Northvale TCG!'}</p>
          <p className="legal-disclaimer">
            {lang === 'CZ' 
              ? 'Faktura slouží jako doklad o zakoupení zboží a potvrzení platby.' 
              : 'The invoice serves as proof of purchase and payment confirmation.'}
          </p>
        </footer>
      </div>

      {/* Styled JSX for layout and print optimization */}
      <style>{`
        .invoice-preview-container {
          background: #111;
          color: #fff;
          padding: 24px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          max-width: 850px;
          margin: 0 auto;
        }
        .invoice-actions-bar {
          display: flex;
          justify-content: space-between;
          margin-bottom: 24px;
          background: #18181b;
          padding: 12px 16px;
          border-radius: 6px;
        }
        .invoice-document {
          background: #ffffff !important;
          color: #1a1a1a !important;
          padding: 40px;
          font-family: 'Outfit', 'Inter', 'Helvetica Neue', sans-serif;
          border-radius: 4px;
          font-size: 14px;
          line-height: 1.5;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .invoice-title-section h1 {
          font-size: 24px;
          margin: 0 0 6px 0;
          color: #000;
          font-weight: 700;
        }
        .invoice-number-label {
          font-size: 16px;
          margin: 0;
        }
        .invoice-meta-section {
          text-align: right;
          font-size: 13px;
        }
        .invoice-meta-section p {
          margin: 3px 0;
        }
        .invoice-divider {
          border: 0;
          border-top: 1px solid #ddd;
          margin: 20px 0;
        }
        .invoice-parties-section {
          display: flex;
          justify-content: space-between;
          gap: 40px;
          margin-bottom: 20px;
        }
        .invoice-party {
          flex: 1;
        }
        .invoice-party h2 {
          font-size: 13px;
          text-transform: uppercase;
          color: #777;
          margin: 0 0 10px 0;
          border-bottom: 1px solid #eee;
          padding-bottom: 4px;
        }
        .party-name {
          font-size: 16px;
          margin: 0 0 6px 0;
          color: #000;
        }
        .invoice-party p {
          margin: 3px 0;
        }
        .invoice-dates-section {
          display: flex;
          justify-content: space-between;
          gap: 40px;
          margin-bottom: 30px;
          font-size: 13px;
        }
        .date-col p, .payment-col p {
          margin: 4px 0;
        }
        .invoice-items-table-container {
          margin-bottom: 30px;
        }
        .invoice-items-table {
          width: 100%;
          border-collapse: collapse;
        }
        .invoice-items-table th {
          background: #f5f5f7;
          border-bottom: 2px solid #ddd;
          padding: 8px 12px;
          font-size: 12px;
          text-transform: uppercase;
          color: #555;
          text-align: left;
        }
        .invoice-items-table td {
          border-bottom: 1px solid #eee;
          padding: 10px 12px;
        }
        .invoice-summary-section {
          display: flex;
          justify-content: space-between;
          gap: 40px;
          align-items: flex-start;
          margin-bottom: 40px;
        }
        .invoice-vat-summary {
          flex: 1.5;
        }
        .invoice-vat-summary table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .invoice-vat-summary th {
          border-bottom: 1px solid #ddd;
          padding: 6px 8px;
          color: #777;
          text-align: left;
        }
        .invoice-vat-summary td {
          padding: 6px 8px;
          border-bottom: 1px solid #eee;
        }
        .invoice-final-total-box {
          flex: 1;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 6px;
          text-align: right;
          border: 1px solid #e9ecef;
        }
        .invoice-total-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 8px;
        }
        .total-label {
          font-size: 14px;
          color: #555;
        }
        .total-value {
          font-size: 22px;
          font-weight: 700;
          color: #2e7d32;
        }
        .invoice-payment-status {
          font-size: 13px;
          font-weight: 600;
          margin: 0;
          color: #2e7d32;
        }
        .invoice-document-footer {
          text-align: center;
          color: #777;
          font-size: 12px;
          border-top: 1px solid #eee;
          padding-top: 20px;
          margin-top: 20px;
        }
        .invoice-document-footer p {
          margin: 4px 0;
        }
        .legal-disclaimer {
          font-style: italic;
          font-size: 10px;
        }

        /* PRINT STYLES */
        @media print {
          body * {
            visibility: hidden !important;
          }
          .invoice-preview-container, .invoice-preview-container * {
            visibility: visible !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
          .invoice-preview-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #fff !important;
            padding: 0 !important;
            border: none !important;
          }
          .invoice-document {
            padding: 0 !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
