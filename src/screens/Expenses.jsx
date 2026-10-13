import { useState, useEffect } from 'preact/hooks';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { collections, createTransaction } from '../db/collections.js';
import { TRANSACTION_TYPES, PAYMENT_METHODS } from '../lib/constants.js';
import { formatCurrency, getTodayDate } from '../lib/utils.js';
import { showToast } from '../components/Toast.jsx';

export default function Expenses({ user }) {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CASH);
  const [note, setNote] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExpenses();
    loadCategories();
  }, []);

  const loadExpenses = async () => {
    try {
      const today = getTodayDate();
      const q = query(
        collections.transactions,
        where('type', '==', TRANSACTION_TYPES.EXPENSE),
        where('date', '>=', today),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const expensesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(expensesList);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const q = query(collections.expenseCategories, where('active', '==', true));
      const snapshot = await getDocs(q);
      const categoriesList = snapshot.docs.map(doc => doc.data().name);
      setCategories(categoriesList);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleAddExpense = async () => {
    if (!amount || !category) {
      showToast('Please enter amount and select category', 'error');
      return;
    }

    const amountValue = parseInt(amount);
    if (amountValue <= 0) {
      showToast('Amount must be greater than 0', 'error');
      return;
    }

    if (addingExpense) {
      return; // Prevent double submission
    }

    setAddingExpense(true);

    try {
      const transactionData = {
        date: new Date().toISOString(),
        type: TRANSACTION_TYPES.EXPENSE,
        customerId: null,
        items: [],
        amount: amountValue,
        paymentSplit: [{ method: paymentMethod, amount: amountValue }],
        category,
        note,
        createdBy: user.email,
      };

      await createTransaction(transactionData, []);

      showToast('Expense recorded', 'success');
      setAmount('');
      setCategory('');
      setNote('');
      loadExpenses();
    } catch (error) {
      console.error('Expense error:', error);
      showToast('Error recording expense: ' + error.message, 'error');
    } finally {
      setAddingExpense(false);
    }
  };

  if (loading) {
    return (
      <div class="flex items-center justify-center" style="min-height: 200px;">
        <div class="spinner"></div>
      </div>
    );
  }

  return (
    <div class="expenses">
      <h2>Expenses</h2>

      {/* Add Expense Form */}
      <div class="card mb-lg">
        <h3>Add Expense</h3>
        
        <div class="mb-md">
          <label>Amount</label>
          <input
            type="number"
            value={amount}
            onInput={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
          />
        </div>

        <div class="mb-md">
          <label>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select category</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div class="mb-md">
          <label>Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value={PAYMENT_METHODS.CASH}>Cash</option>
            <option value={PAYMENT_METHODS.MPESA}>M-Pesa</option>
          </select>
        </div>

        <div class="mb-md">
          <label>Note (optional)</label>
          <input
            type="text"
            value={note}
            onInput={(e) => setNote(e.target.value)}
            placeholder="Add a note"
          />
        </div>

        <button class="btn btn-primary btn-block" onClick={handleAddExpense} disabled={addingExpense}>
          {addingExpense ? 'Adding...' : 'Add Expense'}
        </button>
      </div>

      {/* Today's Expenses */}
      <div class="card">
        <h3>Today's Expenses</h3>
        
        {expenses.length === 0 ? (
          <p class="text-gray text-center">No expenses recorded today</p>
        ) : (
          <div class="grid grid-1">
            {expenses.map(expense => (
              <div key={expense.id} class="flex justify-between items-center" style="padding: var(--space-sm) 0; border-bottom: 1px solid var(--color-gray-200);">
                <div>
                  <div class="font-bold">{expense.category}</div>
                  <div class="text-sm text-gray">{expense.note || 'No note'}</div>
                  <div class="text-sm text-gray">{expense.paymentSplit[0]?.method}</div>
                </div>
                <div class="text-red font-bold">{formatCurrency(expense.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
