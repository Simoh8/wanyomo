import { useState, useEffect } from 'preact/hooks';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { collections, createStockMovement, getCurrentStock } from '../db/collections.js';
import { STOCK_MOVEMENT_TYPES } from '../lib/constants.js';
import { formatCurrency } from '../lib/utils.js';
import { showToast } from '../components/Toast.jsx';

export default function Stock({ user }) {
  const [products, setProducts] = useState([]);
  const [stockLevels, setStockLevels] = useState({});
  const [activeTab, setActiveTab] = useState('list');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [movementType, setMovementType] = useState(STOCK_MOVEMENT_TYPES.RECEIVE_PURCHASE);
  const [convertFromProduct, setConvertFromProduct] = useState(null);
  const [convertToProduct, setConvertToProduct] = useState(null);
  const [convertQty, setConvertQty] = useState('');
  const [convertYield, setConvertYield] = useState('1');
  const [stocktakeCounts, setStocktakeCounts] = useState({});
  const [processingMovement, setProcessingMovement] = useState(false);
  const [processingConversion, setProcessingConversion] = useState(false);
  const [processingStocktake, setProcessingStocktake] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const q = query(collections.products, where('active', '==', true));
      const snapshot = await getDocs(q);
      const productsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsList);

      const levels = {};
      for (const product of productsList) {
        if (product.trackStock) {
          levels[product.id] = await getCurrentStock(product.id);
        }
      }
      setStockLevels(levels);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStockMovement = async () => {
    if (!selectedProduct || !quantity) {
      showToast('Please select a product and enter quantity', 'error');
      return;
    }

    const qty = parseFloat(quantity);
    if (qty <= 0) {
      showToast('Quantity must be greater than 0', 'error');
      return;
    }

    if (processingMovement) {
      return; // Prevent double submission
    }

    setProcessingMovement(true);

    try {
      const cost = unitCost ? parseFloat(unitCost) : 0;
      const isNegative = [STOCK_MOVEMENT_TYPES.SALE, STOCK_MOVEMENT_TYPES.WASTAGE, STOCK_MOVEMENT_TYPES.SPOILAGE, STOCK_MOVEMENT_TYPES.DAMAGE].includes(movementType);

      await createStockMovement({
        productId: selectedProduct.id,
        type: movementType,
        qty: isNegative ? -qty : qty,
        unitCost: cost,
        reference: null,
        reason: movementType.replace(/_/g, ' '),
        createdBy: user.email,
      });

      showToast('Stock movement recorded', 'success');
      setSelectedProduct(null);
      setQuantity('');
      setUnitCost('');
      loadProducts();
    } catch (error) {
      console.error('Stock movement error:', error);
      showToast('Error recording stock movement: ' + error.message, 'error');
    } finally {
      setProcessingMovement(false);
    }
  };

  const handleConversion = async () => {
    if (!convertFromProduct || !convertToProduct || !convertQty) {
      showToast('Please select both products and enter quantity', 'error');
      return;
    }

    const qty = parseFloat(convertQty);
    if (qty <= 0) {
      showToast('Quantity must be greater than 0', 'error');
      return;
    }

    if (processingConversion) {
      return; // Prevent double submission
    }

    setProcessingConversion(true);

    const yieldQty = qty * parseFloat(convertYield);

    try {
      // Deduct from source product
      await createStockMovement({
        productId: convertFromProduct.id,
        type: STOCK_MOVEMENT_TYPES.TRANSFER_INTERNAL,
        qty: -qty,
        unitCost: 0,
        reference: null,
        reason: `Converted to ${convertToProduct.name}`,
        createdBy: user.email,
      });

      // Add to target product
      await createStockMovement({
        productId: convertToProduct.id,
        type: STOCK_MOVEMENT_TYPES.TRANSFER_INTERNAL,
        qty: yieldQty,
        unitCost: 0,
        reference: null,
        reason: `Converted from ${convertFromProduct.name}`,
        createdBy: user.email,
      });

      showToast('Conversion recorded', 'success');
      setConvertFromProduct(null);
      setConvertToProduct(null);
      setConvertQty('');
      setConvertYield('1');
      loadProducts();
    } catch (error) {
      console.error('Conversion error:', error);
      showToast('Error recording conversion: ' + error.message, 'error');
    } finally {
      setProcessingConversion(false);
    }
  };

  const handleStocktake = async () => {
    const movements = [];
    
    for (const [productId, countedQty] of Object.entries(stocktakeCounts)) {
      const systemQty = stockLevels[productId] || 0;
      const variance = countedQty - systemQty;
      
      if (variance !== 0) {
        movements.push({
          productId,
          type: STOCK_MOVEMENT_TYPES.STOCKTAKE_ADJUST,
          qty: variance,
          unitCost: 0,
          reference: null,
          reason: 'Stocktake adjustment',
          createdBy: user.email,
        });
      }
    }

    if (movements.length === 0) {
      showToast('No variances to record', 'warning');
      return;
    }

    if (processingStocktake) {
      return; // Prevent double submission
    }

    setProcessingStocktake(true);

    try {
      for (const movement of movements) {
        await createStockMovement(movement);
      }

      showToast('Stocktake recorded', 'success');
      setStocktakeCounts({});
      loadProducts();
    } catch (error) {
      console.error('Stocktake error:', error);
      showToast('Error recording stocktake: ' + error.message, 'error');
    } finally {
      setProcessingStocktake(false);
    }
  };

  const getStockStatus = (product) => {
    const stock = stockLevels[product.id] || 0;
    if (stock === 0) return { color: 'red', label: 'Out of stock' };
    if (stock <= product.reorderLevel) return { color: 'red', label: 'Low stock' };
    return { color: 'green', label: 'In stock' };
  };

  if (loading) {
    return (
      <div class="flex items-center justify-center" style="min-height: 200px;">
        <div class="spinner"></div>
      </div>
    );
  }

  return (
    <div class="stock">
      <h2>Stock Management</h2>

      {/* Tabs */}
      <div class="flex gap-sm mb-md">
        <button
          class={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('list')}
        >
          Stock List
        </button>
        <button
          class={`btn ${activeTab === 'receive' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('receive')}
        >
          Receive Stock
        </button>
        <button
          class={`btn ${activeTab === 'wastage' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('wastage')}
        >
          Wastage
        </button>
        <button
          class={`btn ${activeTab === 'convert' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('convert')}
        >
          Convert
        </button>
        <button
          class={`btn ${activeTab === 'stocktake' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('stocktake')}
        >
          Stocktake
        </button>
      </div>

      {activeTab === 'list' && (
        <div class="grid grid-1">
          {products.map(product => {
            if (!product.trackStock) return null;
            const stock = stockLevels[product.id] || 0;
            const status = getStockStatus(product);
            
            return (
              <div key={product.id} class="card">
                <div class="flex justify-between items-center">
                  <div>
                    <div class="font-bold">{product.name}</div>
                    <div class="text-sm text-gray">{product.unit}</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold">{stock} {product.unit}</div>
                    <span class={`badge badge-${status.color}`}>{status.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'receive' && (
        <div class="card">
          <h3>Receive Stock</h3>
          
          <div class="mb-md">
            <label>Product</label>
            <select
              value={selectedProduct?.id || ''}
              onChange={(e) => {
                const product = products.find(p => p.id === e.target.value);
                setSelectedProduct(product || null);
              }}
            >
              <option value="">Select product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>

          <div class="mb-md">
            <label>Quantity</label>
            <input
              type="number"
              value={quantity}
              onInput={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
            />
          </div>

          <div class="mb-md">
            <label>Unit Cost (optional)</label>
            <input
              type="number"
              value={unitCost}
              onInput={(e) => setUnitCost(e.target.value)}
              placeholder="Enter cost per unit"
            />
          </div>

          <div class="mb-md">
            <label>Source</label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
            >
              <option value={STOCK_MOVEMENT_TYPES.RECEIVE_PURCHASE}>Purchase</option>
              <option value={STOCK_MOVEMENT_TYPES.RECEIVE_FARM}>Farm Production</option>
            </select>
          </div>

          <button class="btn btn-primary btn-block" onClick={handleStockMovement} disabled={processingMovement}>
            {processingMovement ? 'Recording...' : 'Record Receipt'}
          </button>
        </div>
      )}

      {activeTab === 'wastage' && (
        <div class="card">
          <h3>Record Wastage</h3>
          
          <div class="mb-md">
            <label>Product</label>
            <select
              value={selectedProduct?.id || ''}
              onChange={(e) => {
                const product = products.find(p => p.id === e.target.value);
                setSelectedProduct(product || null);
              }}
            >
              <option value="">Select product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>

          <div class="mb-md">
            <label>Quantity</label>
            <input
              type="number"
              value={quantity}
              onInput={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
            />
          </div>

          <div class="mb-md">
            <label>Reason</label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
            >
              <option value={STOCK_MOVEMENT_TYPES.WASTAGE}>Wastage</option>
              <option value={STOCK_MOVEMENT_TYPES.SPOILAGE}>Spoilage</option>
              <option value={STOCK_MOVEMENT_TYPES.DAMAGE}>Damage</option>
            </select>
          </div>

          <button class="btn btn-danger btn-block" onClick={handleStockMovement} disabled={processingMovement}>
            {processingMovement ? 'Recording...' : 'Record Wastage'}
          </button>
        </div>
      )}

      {activeTab === 'convert' && (
        <div class="card">
          <h3>Internal Conversion</h3>
          <p class="text-sm text-gray mb-md">Convert one product to another (e.g., milk to mala)</p>
          
          <div class="mb-md">
            <label>From Product</label>
            <select
              value={convertFromProduct?.id || ''}
              onChange={(e) => {
                const product = products.find(p => p.id === e.target.value);
                setConvertFromProduct(product || null);
              }}
            >
              <option value="">Select source product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>

          <div class="mb-md">
            <label>To Product</label>
            <select
              value={convertToProduct?.id || ''}
              onChange={(e) => {
                const product = products.find(p => p.id === e.target.value);
                setConvertToProduct(product || null);
              }}
            >
              <option value="">Select target product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>

          <div class="mb-md">
            <label>Quantity to Convert</label>
            <input
              type="number"
              value={convertQty}
              onInput={(e) => setConvertQty(e.target.value)}
              placeholder="Enter quantity"
            />
          </div>

          <div class="mb-md">
            <label>Yield Ratio (default 1:1)</label>
            <input
              type="number"
              value={convertYield}
              onInput={(e) => setConvertYield(e.target.value)}
              placeholder="e.g., 0.9 for 90% yield"
              step="0.1"
            />
          </div>

          {convertQty && convertYield && (
            <div class="mb-md text-sm text-gray">
              Will produce: {parseFloat(convertQty) * parseFloat(convertYield)} {convertToProduct?.unit}
            </div>
          )}

          <button class="btn btn-primary btn-block" onClick={handleConversion} disabled={processingConversion}>
            {processingConversion ? 'Recording...' : 'Record Conversion'}
          </button>
        </div>
      )}

      {activeTab === 'stocktake' && (
        <div class="card">
          <h3>Stocktake</h3>
          <p class="text-sm text-gray mb-md">Count and adjust stock levels</p>
          
          {products.filter(p => p.trackStock).map(product => {
            const systemQty = stockLevels[product.id] || 0;
            const countedQty = stocktakeCounts[product.id] !== undefined ? stocktakeCounts[product.id] : systemQty;
            const variance = countedQty - systemQty;
            
            return (
              <div key={product.id} class="mb-md" style="padding: var(--space-md); border: 1px solid var(--color-gray-200); border-radius: var(--radius-md);">
                <div class="flex justify-between items-center mb-sm">
                  <span class="font-bold">{product.name}</span>
                  <span class="text-sm text-gray">System: {systemQty}</span>
                </div>
                <div class="mb-sm">
                  <label>Counted Quantity</label>
                  <input
                    type="number"
                    value={countedQty}
                    onInput={(e) => setStocktakeCounts(prev => ({
                      ...prev,
                      [product.id]: parseFloat(e.target.value) || 0,
                    }))}
                  />
                </div>
                {variance !== 0 && (
                  <div class={`text-sm ${variance > 0 ? 'text-green' : 'text-red'}`}>
                    Variance: {variance > 0 ? '+' : ''}{variance}
                  </div>
                )}
              </div>
            );
          })}

          <button class="btn btn-primary btn-block" onClick={handleStocktake} disabled={processingStocktake}>
            {processingStocktake ? 'Recording...' : 'Record Stocktake'}
          </button>
        </div>
      )}
    </div>
  );
}
