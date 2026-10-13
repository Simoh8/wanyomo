import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, addDoc, serverTimestamp, writeBatch, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

// Collection references
export const collections = {
  users: collection(db, 'users'),
  products: collection(db, 'products'),
  productCosts: collection(db, 'productCosts'),
  customers: collection(db, 'customers'),
  transactions: collection(db, 'transactions'),
  stockMovements: collection(db, 'stockMovements'),
  stockTakes: collection(db, 'stockTakes'),
  suppliers: collection(db, 'suppliers'),
  expenseCategories: collection(db, 'expenseCategories'),
  dayClosings: collection(db, 'dayClosings'),
  dailySummaries: collection(db, 'dailySummaries'),
  auditLog: collection(db, 'auditLog'),
  settings: collection(db, 'settings'),
};

// Product helpers
export async function createProduct(productData) {
  const { costPrice, ...publicData } = productData;
  
  const batch = writeBatch(db);
  
  // Create product
  const productRef = doc(collections.products);
  batch.set(productRef, {
    ...publicData,
    id: productRef.id,
    active: true,
    trackStock: publicData.trackStock ?? true,
    createdAt: serverTimestamp(),
  });
  
  // Create cost (restricted)
  if (costPrice !== undefined) {
    const costRef = doc(collections.productCosts, productRef.id);
    batch.set(costRef, {
      id: productRef.id,
      costPrice,
      updatedAt: serverTimestamp(),
    });
  }
  
  await batch.commit();
  return productRef.id;
}

export async function updateProduct(productId, productData) {
  const { costPrice, ...publicData } = productData;
  
  const batch = writeBatch(db);
  
  // Update product
  const productRef = doc(collections.products, productId);
  batch.update(productRef, {
    ...publicData,
    updatedAt: serverTimestamp(),
  });
  
  // Update cost if provided
  if (costPrice !== undefined) {
    const costRef = doc(collections.productCosts, productId);
    batch.set(costRef, {
      id: productId,
      costPrice,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
  
  await batch.commit();
}

export async function getProductCost(productId) {
  const costDoc = await getDoc(doc(collections.productCosts, productId));
  if (costDoc.exists()) {
    return costDoc.data().costPrice;
  }
  return null;
}

// Customer helpers
export async function createCustomer(customerData) {
  const customerRef = doc(collections.customers);
  await setDoc(customerRef, {
    ...customerData,
    id: customerRef.id,
    active: true,
    balance: customerData.balance || 0,
    createdAt: serverTimestamp(),
  });
  return customerRef.id;
}

export async function updateCustomerBalance(customerId, delta, transaction) {
  await runTransaction(db, async (t) => {
    const customerRef = doc(collections.customers, customerId);
    const customerDoc = await t.get(customerRef);
    
    if (!customerDoc.exists()) {
      throw new Error('Customer not found');
    }
    
    const currentBalance = customerDoc.data().balance || 0;
    const newBalance = currentBalance + delta;
    
    t.update(customerRef, { balance: newBalance });
  });
}

// Transaction helpers
export async function createTransaction(transactionData, stockMovements = []) {
  const batch = writeBatch(db);
  
  // Create transaction
  const transactionRef = doc(collections.transactions);
  batch.set(transactionRef, {
    ...transactionData,
    id: transactionRef.id,
    status: 'active',
    createdAt: serverTimestamp(),
  });
  
  // Create stock movements for sales
  for (const movement of stockMovements) {
    const movementRef = doc(collections.stockMovements);
    batch.set(movementRef, {
      ...movement,
      id: movementRef.id,
      createdAt: serverTimestamp(),
    });
  }
  
  // Update customer balance if applicable
  if (transactionData.customerId && transactionData.type === 'sale') {
    const creditAmount = transactionData.paymentSplit
      .filter(p => p.method === 'credit')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const walletAmount = transactionData.paymentSplit
      .filter(p => p.method === 'wallet')
      .reduce((sum, p) => sum + p.amount, 0);
    
    if (creditAmount > 0 || walletAmount > 0) {
      const customerRef = doc(collections.customers, transactionData.customerId);
      const customerDoc = await getDoc(customerRef);
      
      if (customerDoc.exists()) {
        const currentBalance = customerDoc.data().balance || 0;
        // Credit increases debt (negative), wallet decreases prepaid (positive becomes less positive)
        const balanceDelta = -creditAmount - walletAmount;
        batch.update(customerRef, { balance: currentBalance + balanceDelta });
      }
    }
  }
  
  // Update daily summary
  const date = new Date().toISOString().split('T')[0];
  const summaryRef = doc(collections.dailySummaries, date);
  batch.set(summaryRef, {
    date,
    totalSales: transactionData.type === 'sale' ? transactionData.amount : 0,
    totalExpenses: transactionData.type === 'expense' ? transactionData.amount : 0,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  
  await batch.commit();
  return transactionRef.id;
}

export async function voidTransaction(transactionId, reason, user) {
  await runTransaction(db, async (t) => {
    const transactionRef = doc(collections.transactions, transactionId);
    const transactionDoc = await t.get(transactionRef);
    
    if (!transactionDoc.exists()) {
      throw new Error('Transaction not found');
    }
    
    const transaction = transactionDoc.data();
    
    if (transaction.status === 'void') {
      throw new Error('Transaction already voided');
    }
    
    // Mark as void
    t.update(transactionRef, {
      status: 'void',
      voidedBy: user.email,
      voidReason: reason,
      voidedAt: serverTimestamp(),
    });
    
    // Reverse stock movements
    const movementsQuery = query(
      collections.stockMovements,
      where('reference', '==', transactionId)
    );
    const movementsSnapshot = await getDocs(movementsQuery);
    
    movementsSnapshot.forEach((doc) => {
      const movement = doc.data();
      const reversalRef = doc(collections.stockMovements);
      t.set(reversalRef, {
        productId: movement.productId,
        type: movement.type === 'sale' ? 'sale_reversal' : 'reversal',
        qty: -movement.qty, // Reverse the quantity
        unitCost: movement.unitCost,
        reference: transactionId,
        reason: `Void of transaction ${transactionId}`,
        createdBy: user.email,
        createdAt: serverTimestamp(),
      });
    });
    
    // Reverse customer balance if applicable
    if (transaction.customerId && transaction.type === 'sale') {
      const creditAmount = transaction.paymentSplit
        .filter(p => p.method === 'credit')
        .reduce((sum, p) => sum + p.amount, 0);
      
      const walletAmount = transaction.paymentSplit
        .filter(p => p.method === 'wallet')
        .reduce((sum, p) => sum + p.amount, 0);
      
      if (creditAmount > 0 || walletAmount > 0) {
        const customerRef = doc(collections.customers, transaction.customerId);
        const customerDoc = await t.get(customerRef);
        
        if (customerDoc.exists()) {
          const currentBalance = customerDoc.data().balance || 0;
          // Reverse the balance change
          const balanceDelta = creditAmount + walletAmount;
          t.update(customerRef, { balance: currentBalance + balanceDelta });
        }
      }
    }
    
    // Add audit log
    const auditRef = doc(collections.auditLog);
    t.set(auditRef, {
      action: 'void_transaction',
      entity: 'transaction',
      entityId: transactionId,
      before: transaction,
      after: { status: 'void', voidReason: reason },
      by: user.email,
      at: serverTimestamp(),
    });
  });
}

// Stock movement helpers
export async function createStockMovement(movementData) {
  const movementRef = doc(collections.stockMovements);
  await setDoc(movementRef, {
    ...movementData,
    id: movementRef.id,
    createdAt: serverTimestamp(),
  });
  return movementRef.id;
}

export async function getCurrentStock(productId) {
  const movementsQuery = query(
    collections.stockMovements,
    where('productId', '==', productId)
  );
  const movementsSnapshot = await getDocs(movementsQuery);
  
  let total = 0;
  movementsSnapshot.forEach((doc) => {
    total += doc.data().qty;
  });
  
  return total;
}

// Audit log helper
export async function addAuditLog(action, entity, entityId, before, after, user) {
  const auditRef = doc(collections.auditLog);
  await setDoc(auditRef, {
    action,
    entity,
    entityId,
    before,
    after,
    by: user.email,
    at: serverTimestamp(),
  });
}

// Settings helper
export async function getSetting(key) {
  const docRef = doc(collections.settings, key);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data().value : null;
}

export async function setSetting(key, value) {
  await setDoc(doc(collections.settings, key), {
    value,
    updatedAt: serverTimestamp(),
  });
}

// Customer transaction history helper
export async function getCustomerTransactions(customerId) {
  const q = query(
    collections.transactions,
    where('customerId', '==', customerId),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
