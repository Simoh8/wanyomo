import { useState, useEffect } from 'preact/hooks';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { collections, createTransaction, getCurrentStock } from '../db/collections.js';
import { PAYMENT_METHODS, TRANSACTION_TYPES } from '../lib/constants.js';
import { formatCurrency, roundToTwo } from '../lib/utils.js';
import { showToast } from '../components/Toast.jsx';

export default function NewSale({ user }) {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cart, setCart] = useState({});
  const [customPrices, setCustomPrices] = useState({});
  const [customQuantities, setCustomQuantities] = useState({});
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CASH);
  const [paymentSplit, setPaymentSplit] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingSale, setProcessingSale] = useState(false);
  const [stockLevels, setStockLevels] = useState({});
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSaleData, setLastSaleData] = useState(null);

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, []);

  const loadProducts = async () => {
    const q = query(collections.products, where('active', '==', true));
    const snapshot = await getDocs(q);
    const productsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setProducts(productsList);

    // Load stock levels
    const levels = {};
    for (const product of productsList) {
      if (product.trackStock) {
        levels[product.id] = await getCurrentStock(product.id);
      }
    }
    setStockLevels(levels);
  };

  const loadCustomers = async () => {
    const q = query(collections.customers, where('active', '==', true));
    const snapshot = await getDocs(q);
    const customersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCustomers(customersList);
  };

  const updateCart = (productId, delta) => {
    setCart(prev => {
      const newCart = { ...prev };
      const currentQty = newCart[productId] || 0;
      const newQty = currentQty + delta;
      
      if (newQty <= 0) {
        delete newCart[productId];
        setCustomPrices(prev => {
          const newPrices = { ...prev };
          delete newPrices[productId];
          return newPrices;
        });
        setCustomQuantities(prev => {
          const newQtys = { ...prev };
          delete newQtys[productId];
          return newQtys;
        });
      } else {
        newCart[productId] = newQty;
      }
      
      return newCart;
    });
  };

  const updateCustomPrice = (productId, price) => {
    setCustomPrices(prev => ({
      ...prev,
      [productId]: parseFloat(price) || 0
    }));
  };

  const updateCustomQuantity = (productId, qty) => {
    setCustomQuantities(prev => ({
      ...prev,
      [productId]: parseFloat(qty) || 0
    }));
  };

  const getTotal = () => {
    let total = 0;
    for (const [productId, qty] of Object.entries(cart)) {
      const product = products.find(p => p.id === productId);
      if (product) {
        const actualQty = customQuantities[productId] || qty;
        const price = customPrices[productId] || product.sellPrice;
        total += price * actualQty;
      }
    }
    return total + (deliveryFee || 0);
  };

  const canCompleteSale = () => {
    if (Object.keys(cart).length === 0) return false;
    
    // Check stock for walk-in sales or credit sales
    if (!selectedCustomer || paymentMethod === PAYMENT_METHODS.CREDIT) {
      for (const [productId, qty] of Object.entries(cart)) {
        const product = products.find(p => p.id === productId);
        const actualQty = customQuantities[productId] || qty;
        
        if (product?.trackStock) {
          // Convert sale quantity to stock quantity if conversion factor exists
          const stockQty = product.conversionFactor 
            ? actualQty / product.conversionFactor 
            : actualQty;
          
          if ((stockLevels[productId] || 0) < stockQty) {
            return false;
          }
        }
      }
    }
    
    return true;
  };

  const handleSale = async () => {
    if (!canCompleteSale()) {
      showToast('Insufficient stock or empty cart', 'error');
      return;
    }

    if (processingSale) {
      return; // Prevent double submission
    }

    setProcessingSale(true);

    try {
      const items = [];
      const stockMovements = [];
      let total = 0;

      for (const [productId, qty] of Object.entries(cart)) {
        const product = products.find(p => p.id === productId);
        if (!product) continue;

        const customPrice = customPrices[productId];
        const customQty = customQuantities[productId];
        const actualPrice = customPrice || product.sellPrice;
        const actualQty = customQty || qty;
        const lineTotal = actualPrice * actualQty;
        total += lineTotal;

        items.push({
          productId,
          name: product.name,
          qty: actualQty,
          unit: product.saleUnit || product.unit,
          unitPrice: actualPrice,
          lineTotal,
          customPrice: customPrice || null,
          customQuantity: customQty || null,
        });

        // Create stock movement
        if (product.trackStock) {
          // Convert sale quantity to stock quantity if conversion factor exists
          const stockQty = product.conversionFactor 
            ? actualQty / product.conversionFactor 
            : actualQty;
          
          stockMovements.push({
            productId,
            type: 'sale',
            qty: -stockQty,
            unitCost: 0, // Will be fetched from productCosts
            reference: null, // Will be set to transaction ID
            reason: 'Sale',
            createdBy: user.email,
          });
        }
      }

      const paymentSplitData = paymentSplit.length > 0
        ? paymentSplit
        : [{ method: paymentMethod, amount: total }];

      const transactionData = {
        date: new Date().toISOString(),
        type: TRANSACTION_TYPES.SALE,
        customerId: selectedCustomer?.id || null,
        items,
        amount: total,
        deliveryFee: deliveryFee || 0,
        paymentSplit: paymentSplitData,
        createdBy: user.email,
      };

      await createTransaction(transactionData, stockMovements);

      // Store sale data for invoice
      setLastSaleData({
        transactionData,
        items,
        customer: selectedCustomer,
        total,
        deliveryFee: deliveryFee || 0,
        date: new Date(),
      });

      // Reset cart
      setCart({});
      setCustomPrices({});
      setCustomQuantities({});
      setSelectedCustomer(null);
      setPaymentMethod(PAYMENT_METHODS.CASH);
      setPaymentSplit([]);
      setDeliveryFee(0);
      setShowInvoice(true);
      showToast('Sale completed successfully!', 'success');
    } catch (error) {
      console.error('Sale error:', error);
      showToast('Error completing sale: ' + error.message, 'error');
    } finally {
      setProcessingSale(false);
      loadProducts(); // Refresh stock levels
    }
  };

  const getStockBadge = (product) => {
    if (!product.trackStock) return null;
    const stock = stockLevels[product.id] || 0;
    const isLow = stock <= product.reorderLevel;
    const isOut = stock === 0;

    // Convert stock to sale unit if conversion factor exists
    const displayStock = product.conversionFactor 
      ? (stock * product.conversionFactor).toFixed(1)
      : stock;
    const displayUnit = product.saleUnit || product.unit;

    if (isOut) {
      return <span class="badge badge-red">Out of stock</span>;
    }
    if (isLow) {
      return <span class="badge badge-red">Low: {displayStock} {displayUnit}</span>;
    }
    return <span class="badge badge-green">{displayStock} {displayUnit}</span>;
  };

  return (
    <div class="new-sale">
      <h2>New Sale</h2>

      {/* Customer Selection */}
      <div class="card mb-md">
        <label>Select Customer (optional)</label>
        <select
          value={selectedCustomer?.id || ''}
          onChange={(e) => {
            const customerId = e.target.value;
            const customer = customers.find(c => c.id === customerId);
            setSelectedCustomer(customer || null);
          }}
        >
          <option value="">Walk-in Customer</option>
          {customers.map(customer => (
            <option key={customer.id} value={customer.id}>
              {customer.name} {customer.balance !== 0 && `(${formatCurrency(customer.balance)})`}
            </option>
          ))}
        </select>

        {selectedCustomer && (
          <div class="mt-sm">
            <span class="text-sm">
              Balance: <span class={selectedCustomer.balance > 0 ? 'text-green' : 'text-red'}>
                {formatCurrency(selectedCustomer.balance)}
              </span>
              {selectedCustomer.balance > 0 && ' (prepaid)'}
              {selectedCustomer.balance < 0 && ' (owing)'}
            </span>
          </div>
        )}
      </div>

      {/* Product Grid */}
      <div class="grid grid-2 mb-lg">
        {products.map(product => (
          <div
            key={product.id}
            class="card"
            style={{
              cursor: 'pointer',
              border: cart[product.id] ? '2px solid var(--color-green)' : '1px solid var(--color-gray-200)',
            }}
          >
            <div class="flex justify-between items-center mb-sm">
              <span class="font-bold">{product.name}</span>
              {getStockBadge(product)}
            </div>
            <div class="text-sm text-gray mb-sm">
              Default: {formatCurrency(product.sellPrice)} / {product.saleUnit || product.unit}
              {product.saleUnit && product.saleUnit !== product.unit && (
                <span class="text-xs text-gray ml-sm">
                  (Stock: {product.unit})
                </span>
              )}
            </div>
            {cart[product.id] > 0 && (
              <>
                <div class="mb-sm">
                  <label class="text-xs">Custom Quantity (optional)</label>
                  <input
                    type="number"
                    class="input input-sm"
                    value={customQuantities[product.id] || ''}
                    onChange={(e) => updateCustomQuantity(product.id, e.target.value)}
                    placeholder={`Default: ${cart[product.id]}`}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div class="mb-sm">
                  <label class="text-xs">Custom Price (optional)</label>
                  <input
                    type="number"
                    class="input input-sm"
                    value={customPrices[product.id] || ''}
                    onChange={(e) => updateCustomPrice(product.id, e.target.value)}
                    placeholder={`Default: ${product.sellPrice}`}
                    step="0.01"
                    min="0"
                  />
                </div>
              </>
            )}
            <div class="flex items-center justify-between">
              <button
                class="btn btn-secondary btn-sm"
                onClick={() => updateCart(product.id, -1)}
                disabled={!cart[product.id]}
              >
                -
              </button>
              <span class="font-bold">{cart[product.id] || 0}</span>
              <button
                class="btn btn-primary btn-sm"
                onClick={() => updateCart(product.id, 1)}
                disabled={(() => {
                  if (!product.trackStock) return false;
                  const currentQty = customQuantities[product.id] || cart[product.id] || 0;
                  const nextQty = currentQty + 1;
                  const stockQty = product.conversionFactor 
                    ? nextQty / product.conversionFactor 
                    : nextQty;
                  return (stockLevels[product.id] || 0) < stockQty;
                })()}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cart Summary */}
      {Object.keys(cart).length > 0 && (
        <div class="card mb-lg cart-summary">
          <h3 class="mb-md">Cart Summary</h3>

          {/* Delivery Fee */}
          <div class="mb-md">
            <label>Delivery Fee (optional)</label>
            <input
              type="number"
              value={deliveryFee || ''}
              onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>
          {Object.entries(cart).map(([productId, qty]) => {
            const product = products.find(p => p.id === productId);
            if (!product) return null;
            const customPrice = customPrices[productId];
            const customQty = customQuantities[productId];
            const actualPrice = customPrice || product.sellPrice;
            const actualQty = customQty || qty;
            const lineTotal = actualPrice * actualQty;
            return (
              <div key={productId} class="flex justify-between items-center mb-sm">
                <div>
                  <span class="font-bold">{product.name}</span>
                  <span class="text-sm text-gray"> x{actualQty} {product.saleUnit || product.unit}</span>
                  {(customPrice || customQty) && (
                    <span class="badge badge-yellow ml-sm">Custom</span>
                  )}
                </div>
                <div class="text-right">
                  <div class="text-sm">
                    {formatCurrency(actualPrice)} / {product.saleUnit || product.unit}
                  </div>
                  <div class="font-bold">{formatCurrency(lineTotal)}</div>
                </div>
              </div>
            );
          })}
          <div class="border-t pt-md mt-md">
            <div class="flex justify-between items-center mb-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(getTotal() - (deliveryFee || 0))}</span>
            </div>
            {deliveryFee > 0 && (
              <div class="flex justify-between items-center mb-sm">
                <span>Delivery Fee</span>
                <span>{formatCurrency(deliveryFee)}</span>
              </div>
            )}
            <div class="flex justify-between items-center mb-md">
              <span class="font-bold">Total</span>
              <span class="font-bold text-lg">{formatCurrency(getTotal())}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div class="mb-md">
            <label>Payment Method</label>
            <div class="grid grid-2">
              {Object.values(PAYMENT_METHODS).map(method => (
                <button
                  key={method}
                  class={`btn ${paymentMethod === method ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setPaymentMethod(method)}
                  disabled={
                    method === PAYMENT_METHODS.WALLET && (!selectedCustomer || selectedCustomer.balance <= 0)
                  }
                >
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button
            class="btn btn-primary btn-block btn-lg"
            onClick={handleSale}
            disabled={processingSale || !canCompleteSale()}
          >
            {processingSale ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoice && lastSaleData && (
        <div class="invoice-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-md)',
        }}>
          <div class="invoice-content card" style={{
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 'var(--space-lg)',
          }}>
            <div id="invoice-print" style={{
              padding: 'var(--space-lg)',
              backgroundColor: 'white',
              color: 'black',
            }}>
              {/* Invoice Header */}
              <div style={{
                textAlign: 'center',
                marginBottom: 'var(--space-lg)',
                borderBottom: '2px solid var(--color-green)',
                paddingBottom: 'var(--space-md)',
              }}>
                <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)', color: 'var(--color-green)' }}>
                  INVOICE
                </h1>
                <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-sm)' }}>
                  Shamba Books
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#666' }}>
                  Your Trusted Farm Management System
                </p>
              </div>

              {/* Invoice Details */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--space-lg)',
                marginBottom: 'var(--space-lg)',
              }}>
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-sm)', borderBottom: '1px solid #ddd', paddingBottom: 'var(--space-xs)' }}>
                    Bill To:
                  </h3>
                  {lastSaleData.customer ? (
                    <>
                      <p style={{ fontWeight: '600', marginBottom: 'var(--space-xs)' }}>
                        {lastSaleData.customer.name}
                      </p>
                      {lastSaleData.customer.phone && (
                        <p style={{ fontSize: '0.875rem', marginBottom: 'var(--space-xs)' }}>
                          Phone: {lastSaleData.customer.phone}
                        </p>
                      )}
                      {lastSaleData.customer.email && (
                        <p style={{ fontSize: '0.875rem', marginBottom: 'var(--space-xs)' }}>
                          Email: {lastSaleData.customer.email}
                        </p>
                      )}
                      {lastSaleData.customer.address && (
                        <p style={{ fontSize: '0.875rem' }}>
                          Address: {lastSaleData.customer.address}
                        </p>
                      )}
                    </>
                  ) : (
                    <p style={{ fontSize: '0.875rem' }}>Walk-in Customer</p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-sm)', borderBottom: '1px solid #ddd', paddingBottom: 'var(--space-xs)' }}>
                    Invoice Details:
                  </h3>
                  <p style={{ fontSize: '0.875rem', marginBottom: 'var(--space-xs)' }}>
                    <strong>Invoice #:</strong> {lastSaleData.transactionData.date.replace(/[:.]/g, '-').slice(0, -5)}
                  </p>
                  <p style={{ fontSize: '0.875rem', marginBottom: 'var(--space-xs)' }}>
                    <strong>Date:</strong> {lastSaleData.date.toLocaleDateString()}
                  </p>
                  <p style={{ fontSize: '0.875rem', marginBottom: 'var(--space-xs)' }}>
                    <strong>Time:</strong> {lastSaleData.date.toLocaleTimeString()}
                  </p>
                  <p style={{ fontSize: '0.875rem' }}>
                    <strong>Served By:</strong> {user.displayName || user.email}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: 'var(--space-lg)',
              }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-green)', color: 'white' }}>
                    <th style={{ padding: 'var(--space-sm)', textAlign: 'left', border: '1px solid #ddd' }}>Item</th>
                    <th style={{ padding: 'var(--space-sm)', textAlign: 'center', border: '1px solid #ddd' }}>Qty</th>
                    <th style={{ padding: 'var(--space-sm)', textAlign: 'right', border: '1px solid #ddd' }}>Unit Price</th>
                    <th style={{ padding: 'var(--space-sm)', textAlign: 'right', border: '1px solid #ddd' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lastSaleData.items.map((item, index) => (
                    <tr key={index}>
                      <td style={{ padding: 'var(--space-sm)', border: '1px solid #ddd' }}>
                        {item.name}
                      </td>
                      <td style={{ padding: 'var(--space-sm)', textAlign: 'center', border: '1px solid #ddd' }}>
                        {item.qty} {item.unit}
                      </td>
                      <td style={{ padding: 'var(--space-sm)', textAlign: 'right', border: '1px solid #ddd' }}>
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td style={{ padding: 'var(--space-sm)', textAlign: 'right', border: '1px solid #ddd' }}>
                        {formatCurrency(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ marginLeft: 'auto', maxWidth: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)', padding: 'var(--space-sm)', backgroundColor: '#f5f5f5' }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(lastSaleData.total - lastSaleData.deliveryFee)}</span>
                </div>
                {lastSaleData.deliveryFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)', padding: 'var(--space-sm)', backgroundColor: '#f5f5f5' }}>
                    <span>Delivery Fee:</span>
                    <span>{formatCurrency(lastSaleData.deliveryFee)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-md)', backgroundColor: 'var(--color-green)', color: 'white', fontWeight: 'bold', fontSize: '1.25rem' }}>
                  <span>Total:</span>
                  <span>{formatCurrency(lastSaleData.total)}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '2px solid #ddd' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-sm)' }}>Payment Method:</h3>
                <p style={{ fontSize: '0.875rem' }}>
                  {lastSaleData.transactionData.paymentSplit.map(p => `${p.method}: ${formatCurrency(p.amount)}`).join(', ')}
                </p>
              </div>

              {/* Footer */}
              <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '1px solid #ddd', textAlign: 'center', fontSize: '0.75rem', color: '#666' }}>
                <p>Thank you for your business!</p>
                <p>For inquiries, contact us at support@shambabooks.com</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: 'var(--space-md)',
              marginTop: 'var(--space-lg)',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              <button
                class="btn btn-primary"
                onClick={() => {
                  const printContent = document.getElementById('invoice-print').innerHTML;
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Invoice</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 20px; }
                          table { width: 100%; border-collapse: collapse; }
                          th, td { border: 1px solid #ddd; padding: 8px; }
                          th { background-color: #2d5a27; color: white; }
                        </style>
                      </head>
                      <body>${printContent}</body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.print();
                }}
              >
                🖨️ Print Invoice
              </button>
              <button
                class="btn btn-secondary"
                onClick={() => {
                  const subject = `Invoice from Shamba Books - ${lastSaleData.date.toLocaleDateString()}`;
                  const body = `
Dear ${lastSaleData.customer?.name || 'Customer'},

Thank you for your purchase!

Invoice Details:
- Date: ${lastSaleData.date.toLocaleDateString()}
- Invoice #: ${lastSaleData.transactionData.date.replace(/[:.]/g, '-').slice(0, -5)}
- Total: ${formatCurrency(lastSaleData.total)}

Items:
${lastSaleData.items.map(item => `- ${item.name} x${item.qty} ${item.unit}: ${formatCurrency(item.lineTotal)}`).join('\n')}

${lastSaleData.deliveryFee > 0 ? `Delivery Fee: ${formatCurrency(lastSaleData.deliveryFee)}\n` : ''}
Payment Method: ${lastSaleData.transactionData.paymentSplit.map(p => p.method).join(', ')}

Thank you for your business!
                  `.trim();
                  window.location.href = `mailto:${lastSaleData.customer?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                }}
                disabled={!lastSaleData.customer?.email}
              >
                📧 Send Email
              </button>
              <button
                class="btn btn-outline"
                onClick={() => {
                  const message = `
*INVOICE - Shamba Books*
━━━━━━━━━━━━━━━━━━━━

📅 Date: ${lastSaleData.date.toLocaleDateString()}
🔢 Invoice #: ${lastSaleData.transactionData.date.replace(/[:.]/g, '-').slice(0, -5)}

👤 Customer: ${lastSaleData.customer?.name || 'Walk-in'}

📦 Items:
${lastSaleData.items.map(item => `• ${item.name} x${item.qty} ${item.unit} = ${formatCurrency(item.lineTotal)}`).join('\n')}

${lastSaleData.deliveryFee > 0 ? `🚚 Delivery Fee: ${formatCurrency(lastSaleData.deliveryFee)}\n` : ''}
━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL: ${formatCurrency(lastSaleData.total)}*

💳 Payment: ${lastSaleData.transactionData.paymentSplit.map(p => p.method).join(', ')}

Thank you for your business! 🙏
                  `.trim();
                  const phone = lastSaleData.customer?.phone?.replace(/[^0-9]/g, '');
                  if (phone) {
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                  } else {
                    showToast('Customer phone number not available', 'error');
                  }
                }}
                disabled={!lastSaleData.customer?.phone}
              >
                📱 Send WhatsApp
              </button>
              <button
                class="btn btn-ghost"
                onClick={() => setShowInvoice(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .new-sale {
          padding-bottom: 200px;
        }

        .cart-summary {
          position: sticky;
          bottom: 0;
          z-index: 50;
          margin-top: var(--space-lg);
        }

        @media (max-width: 768px) {
          .new-sale {
            padding-bottom: 280px;
          }

          .cart-summary {
            bottom: 0;
            max-height: 50vh;
            overflow-y: auto;
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
          }

          .cart-summary h3 {
            position: sticky;
            top: 0;
            background-color: var(--color-cream);
            padding: var(--space-md) 0;
            border-bottom: 1px solid var(--color-gray-200);
            margin-bottom: var(--space-md);
            z-index: 10;
          }

          .cart-summary .flex.justify-between.items-center.mb-sm {
            flex-wrap: wrap;
            gap: var(--space-xs);
          }

          .cart-summary .text-right {
            text-align: right;
            min-width: 80px;
          }

          .cart-summary .text-sm {
            font-size: var(--font-size-xs);
            line-height: 1.3;
          }

          .cart-summary .badge {
            font-size: 0.65rem;
            padding: 2px 6px;
          }
        }

        @media (max-width: 480px) {
          .new-sale {
            padding-bottom: 320px;
          }

          .cart-summary {
            max-height: 45vh;
          }

          .cart-summary .btn {
            font-size: var(--font-size-sm);
            padding: var(--space-sm) var(--space-md);
          }

          .new-sale .card {
            overflow: hidden;
          }

          .new-sale .card .text-sm {
            font-size: var(--font-size-xs);
            line-height: 1.4;
            word-break: break-word;
          }

          .new-sale .card .flex.justify-between.items-center {
            flex-wrap: wrap;
            gap: var(--space-xs);
          }

          .new-sale .card .font-bold {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .new-sale .card .badge {
            flex-shrink: 0;
            font-size: 0.65rem;
            padding: 2px 6px;
          }
        }
      `}</style>
    </div>
  );
}
