import { useState, useEffect } from 'preact/hooks';
import { collection, query, where, getDocs, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { collections, createTransaction, updateCustomerBalance, createCustomer, getCustomerTransactions } from '../db/collections.js';
import { formatCurrency, getWhatsAppLink, formatDate } from '../lib/utils.js';
import { PAYMENT_METHODS, TRANSACTION_TYPES } from '../lib/constants.js';
import { showToast } from '../components/Toast.jsx';

export default function Customers({ user }) {
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [viewMode, setViewMode] = useState(null); // 'payment' or 'history'
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CASH);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerBalance, setNewCustomerBalance] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const q = query(collections.customers, where('active', '==', true), orderBy('name'));
      const snapshot = await getDocs(q);
      const customersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomers(customersList);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerTransactions = async (customerId) => {
    setLoadingTransactions(true);
    try {
      const transactions = await getCustomerTransactions(customerId);
      setCustomerTransactions(transactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      showToast('Error loading transaction history', 'error');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleCustomerClick = (customer, mode = 'payment') => {
    setSelectedCustomer(customer);
    setViewMode(mode);
    if (mode === 'history') {
      loadCustomerTransactions(customer.id);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (filter === 'all') return true;
    if (filter === 'owing') return customer.balance < 0;
    if (filter === 'prepaid') return customer.balance > 0;
    return true;
  });

  const handlePayment = async () => {
    if (!selectedCustomer || !paymentAmount) return;

    const amount = parseInt(paymentAmount);
    if (amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (processingPayment) {
      return; // Prevent double submission
    }

    setProcessingPayment(true);

    try {
      // Create payment transaction
      const transactionData = {
        date: new Date().toISOString(),
        type: TRANSACTION_TYPES.PAYMENT,
        customerId: selectedCustomer.id,
        items: [],
        amount,
        paymentSplit: [{ method: paymentMethod, amount }],
        note: 'Payment received',
        createdBy: user.email,
      };

      await createTransaction(transactionData, []);

      // Update customer balance
      await updateCustomerBalance(selectedCustomer.id, amount, transactionData);

      showToast('Payment recorded successfully', 'success');
      setPaymentAmount('');
      setSelectedCustomer(null);
      loadCustomers();
    } catch (error) {
      console.error('Payment error:', error);
      showToast('Error recording payment: ' + error.message, 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      showToast('Please enter a customer name', 'error');
      return;
    }

    if (!newCustomerPhone.trim()) {
      showToast('Please enter a phone number', 'error');
      return;
    }

    if (addingCustomer) {
      return; // Prevent double submission
    }

    setAddingCustomer(true);

    try {
      const initialBalance = newCustomerBalance ? parseInt(newCustomerBalance) : 0;
      
      // First create customer with initial balance
      const customerId = await createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        balance: initialBalance,
      });

      // If there's an initial balance, create a transaction record for audit trail
      if (initialBalance !== 0) {
        const transactionData = {
          date: new Date().toISOString(),
          type: initialBalance > 0 ? TRANSACTION_TYPES.PAYMENT : TRANSACTION_TYPES.SALE,
          customerId: customerId,
          items: [],
          amount: Math.abs(initialBalance),
          paymentSplit: initialBalance > 0 
            ? [{ method: PAYMENT_METHODS.WALLET, amount: initialBalance }]
            : [{ method: PAYMENT_METHODS.CREDIT, amount: Math.abs(initialBalance) }],
          note: initialBalance > 0 ? 'Initial prepaid balance' : 'Initial credit balance',
          createdBy: user.email,
        };

        // Create transaction without stock movements and without triggering balance update
        const transactionRef = doc(collections.transactions);
        await setDoc(transactionRef, {
          ...transactionData,
          id: transactionRef.id,
          status: 'active',
          createdAt: serverTimestamp(),
        });
      }

      showToast('Customer added successfully', 'success');
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerBalance('');
      setShowAddModal(false);
      loadCustomers();
    } catch (error) {
      console.error('Error adding customer:', error);
      showToast('Error adding customer: ' + error.message, 'error');
    } finally {
      setAddingCustomer(false);
    }
  };

  const shareStatement = (customer) => {
    const message = `Statement for ${customer.name}\nBalance: ${formatCurrency(customer.balance)}\n\nLast 10 transactions:\n(Statement details would be here)`;
    const link = getWhatsAppLink(customer.phone, message);
    window.open(link, '_blank');
  };

  if (loading) {
    return (
      <div class="flex items-center justify-center" style="min-height: 200px;">
        <div class="spinner"></div>
      </div>
    );
  }

  return (
    <div class="customers">
      <div class="flex justify-between items-center mb-md">
        <h2>Customers</h2>
        <button class="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + Add Customer
        </button>
      </div>

      {/* Filter Tabs */}
      <div class="flex gap-sm mb-md">
        <button
          class={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilter('all')}
        >
          All ({customers.length})
        </button>
        <button
          class={`btn ${filter === 'owing' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilter('owing')}
        >
          Owing ({customers.filter(c => c.balance < 0).length})
        </button>
        <button
          class={`btn ${filter === 'prepaid' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilter('prepaid')}
        >
          Prepaid ({customers.filter(c => c.balance > 0).length})
        </button>
      </div>

      {/* Customer List */}
      <div class="grid grid-1 mb-lg">
        {filteredCustomers.map(customer => (
          <div
            key={customer.id}
            class="card"
            style="cursor: pointer;"
          >
            <div class="flex justify-between items-center">
              <div
                style="flex: 1; min-width: 0;"
                onClick={() => handleCustomerClick(customer, 'payment')}
              >
                <div class="font-bold">{customer.name}</div>
                <div class="text-sm text-gray">{customer.phone}</div>
              </div>
              <div class="text-right" style="min-width: 100px; padding-left: var(--space-sm);">
                <div class={`font-bold ${customer.balance > 0 ? 'text-green' : customer.balance < 0 ? 'text-red' : ''}`}>
                  {formatCurrency(customer.balance)}
                </div>
                <div class="text-sm text-gray">
                  {customer.balance > 0 ? 'prepaid' : customer.balance < 0 ? 'owing' : 'settled'}
                </div>
              </div>
              <button
                class="btn btn-sm btn-outline"
                style="margin-left: var(--space-sm); flex-shrink: 0;"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCustomerClick(customer, 'history');
                }}
              >
                History
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Customer Modal */}
      {selectedCustomer && (
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; padding: var(--space-md);">
          <div class="card" style="max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div class="flex justify-between items-center mb-md">
              <h3>{viewMode === 'history' ? 'Transaction History' : 'Receive Payment'}</h3>
              <button class="btn btn-ghost" onClick={() => {
                setSelectedCustomer(null);
                setViewMode(null);
                setCustomerTransactions([]);
                setPaymentAmount('');
              }}>✕</button>
            </div>

            {/* Payment View */}
            {viewMode === 'payment' && (
              <>
                <div class="mb-md">
                  <div class="font-bold">{selectedCustomer.name}</div>
                  <div>Current Balance: {formatCurrency(selectedCustomer.balance)}</div>
                </div>

                <div class="mb-md">
                  <label>Amount</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onInput={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>

                <div class="mb-md">
                  <label>Payment Method</label>
                  <div class="grid grid-2">
                    {Object.values(PAYMENT_METHODS).filter(m => m !== PAYMENT_METHODS.CREDIT && m !== PAYMENT_METHODS.WALLET).map(method => (
                      <button
                        key={method}
                        class={`btn ${paymentMethod === method ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setPaymentMethod(method)}
                      >
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <button class="btn btn-primary btn-block" onClick={handlePayment} disabled={processingPayment}>
                  {processingPayment ? 'Recording...' : 'Record Payment'}
                </button>

                <div class="divider"></div>

                <button
                  class="btn btn-outline btn-block"
                  onClick={() => setViewMode('history')}
                >
                  View Transaction History
                </button>

                <div class="divider"></div>

                <button
                  class="btn btn-outline btn-block"
                  onClick={() => shareStatement(selectedCustomer)}
                >
                  Share Statement via WhatsApp
                </button>
              </>
            )}

            {/* History View */}
            {viewMode === 'history' && (
              <>
                <div class="mb-md">
                  <div class="font-bold">{selectedCustomer.name}</div>
                  <div class="text-sm text-gray">{selectedCustomer.phone}</div>
                  <div>Current Balance: <span class={`font-bold ${selectedCustomer.balance > 0 ? 'text-green' : selectedCustomer.balance < 0 ? 'text-red' : ''}`}>
                    {formatCurrency(selectedCustomer.balance)}
                  </span></div>
                </div>

                <div class="divider"></div>

                {loadingTransactions ? (
                  <div class="flex items-center justify-center" style="min-height: 100px;">
                    <div class="spinner"></div>
                  </div>
                ) : customerTransactions.length === 0 ? (
                  <div class="text-center text-gray" style="padding: var(--space-lg);">
                    No transactions found
                  </div>
                ) : (
                  <div style="max-height: 400px; overflow-y: auto;">
                    {customerTransactions.map(transaction => (
                      <div
                        key={transaction.id}
                        class="card"
                        style="padding: var(--space-sm); margin-bottom: var(--space-sm);"
                      >
                        <div class="flex justify-between items-start">
                          <div style="flex: 1;">
                            <div class="font-bold text-sm">
                              {transaction.type === TRANSACTION_TYPES.SALE ? 'Sale' :
                               transaction.type === TRANSACTION_TYPES.PAYMENT ? 'Payment' :
                               transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            </div>
                            <div class="text-xs text-gray">
                              {formatDate(transaction.date)}
                            </div>
                            {transaction.note && (
                              <div class="text-xs text-gray mt-xs">
                                {transaction.note}
                              </div>
                            )}
                            {transaction.items && transaction.items.length > 0 && (
                              <div class="text-xs text-gray mt-xs">
                                {transaction.items.map(item => item.name).join(', ')}
                              </div>
                            )}
                          </div>
                          <div class="text-right">
                            <div class={`font-bold ${transaction.type === TRANSACTION_TYPES.SALE ? 'text-red' : 'text-green'}`}>
                              {transaction.type === TRANSACTION_TYPES.SALE ? '-' : '+'}{formatCurrency(transaction.amount)}
                            </div>
                            {transaction.paymentSplit && transaction.paymentSplit.length > 0 && (
                              <div class="text-xs text-gray">
                                {transaction.paymentSplit.map(p => p.method).join(', ')}
                              </div>
                            )}
                            {transaction.status === 'void' && (
                              <div class="badge badge-gray text-xs mt-xs">Voided</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div class="divider"></div>

                <button
                  class="btn btn-outline btn-block"
                  onClick={() => setViewMode('payment')}
                >
                  Record Payment
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; padding: var(--space-md);">
          <div class="card" style="max-width: 400px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div class="flex justify-between items-center mb-md">
              <h3>Add New Customer</h3>
              <button class="btn btn-ghost" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <div class="mb-md">
              <label>Customer Name</label>
              <input
                type="text"
                value={newCustomerName}
                onInput={(e) => setNewCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>

            <div class="mb-md">
              <label>Phone Number</label>
              <input
                type="tel"
                value={newCustomerPhone}
                onInput={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div class="mb-md">
              <label>Initial Balance (optional)</label>
              <input
                type="number"
                value={newCustomerBalance}
                onInput={(e) => setNewCustomerBalance(e.target.value)}
                placeholder="Enter initial balance"
              />
              <p class="text-sm text-gray mt-sm">
                Positive = prepaid credit, Negative = amount owed
              </p>
            </div>

            <button class="btn btn-primary btn-block" onClick={handleAddCustomer} disabled={addingCustomer}>
              {addingCustomer ? 'Adding...' : 'Add Customer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
