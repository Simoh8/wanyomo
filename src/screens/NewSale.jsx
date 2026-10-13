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
    return total;
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
        paymentSplit: paymentSplitData,
        createdBy: user.email,
      };

      await createTransaction(transactionData, stockMovements);

      // Reset cart
      setCart({});
      setCustomPrices({});
      setCustomQuantities({});
      setSelectedCustomer(null);
      setPaymentMethod(PAYMENT_METHODS.CASH);
      setPaymentSplit([]);
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
        <div class="card mb-lg" style="position: sticky; bottom: 0; z-index: 50;">
          <h3 class="mb-md">Cart Summary</h3>
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
    </div>
  );
}
