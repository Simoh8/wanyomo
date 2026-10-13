import { useState, useEffect } from 'preact/hooks';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { collections } from '../db/collections.js';
import { TRANSACTION_TYPES, PAYMENT_METHODS } from '../lib/constants.js';
import { formatCurrency, getDateRange, groupBy } from '../lib/utils.js';

export default function Analytics({ user }) {
  const [period, setPeriod] = useState('week');
  const [salesData, setSalesData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [period]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    
    try {
      const { start, end } = getDateRange(period);
      
      // Get sales
      const salesQuery = query(
        collections.transactions,
        where('type', '==', TRANSACTION_TYPES.SALE),
        where('date', '>=', start.toISOString()),
        where('date', '<=', end.toISOString()),
        where('status', '==', 'active'),
        orderBy('date', 'desc')
      );
      const salesSnapshot = await getDocs(salesQuery);
      const salesList = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSalesData(salesList);

      // Get expenses
      const expensesQuery = query(
        collections.transactions,
        where('type', '==', TRANSACTION_TYPES.EXPENSE),
        where('date', '>=', start.toISOString()),
        where('date', '<=', end.toISOString()),
        where('status', '==', 'active'),
        orderBy('date', 'desc')
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const expensesList = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpensesData(expensesList);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalSales = () => {
    return salesData.reduce((sum, sale) => sum + sale.amount, 0);
  };

  const getTotalExpenses = () => {
    return expensesData.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getSalesByPaymentMethod = () => {
    const byMethod = { cash: 0, mpesa: 0, credit: 0, wallet: 0 };
    salesData.forEach(sale => {
      sale.paymentSplit.forEach(p => {
        if (byMethod[p.method] !== undefined) {
          byMethod[p.method] += p.amount;
        }
      });
    });
    return byMethod;
  };

  const getExpensesByCategory = () => {
    const byCategory = {};
    expensesData.forEach(expense => {
      const category = expense.category || 'Other';
      byCategory[category] = (byCategory[category] || 0) + expense.amount;
    });
    return byCategory;
  };

  const getSalesByDay = () => {
    const byDay = groupBy(salesData, tx => tx.date.split('T')[0]);
    return Object.entries(byDay).map(([date, txs]) => ({
      date,
      total: txs.reduce((sum, tx) => sum + tx.amount, 0),
    })).reverse();
  };

  if (loading) {
    return (
      <div class="flex items-center justify-center" style="min-height: 200px;">
        <div class="spinner"></div>
      </div>
    );
  }

  const paymentMethods = getSalesByPaymentMethod();
  const expensesByCategory = getExpensesByCategory();
  const salesByDay = getSalesByDay();

  return (
    <div class="analytics">
      <h2>Analytics</h2>

      {/* Period Selector */}
      <div class="flex gap-sm mb-lg">
        {['today', 'week', 'month', 'last_month'].map(p => (
          <button
            key={p}
            class={`btn ${period === p ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setPeriod(p)}
          >
            {p.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div class="grid grid-2 mb-lg">
        <div class="card">
          <div class="text-sm text-gray">Total Sales</div>
          <div class="font-bold text-lg">{formatCurrency(getTotalSales())}</div>
        </div>
        
        <div class="card">
          <div class="text-sm text-gray">Total Expenses</div>
          <div class="font-bold text-lg text-red">{formatCurrency(getTotalExpenses())}</div>
        </div>
        
        <div class="card">
          <div class="text-sm text-gray">Net Revenue</div>
          <div class="font-bold text-lg text-green">{formatCurrency(getTotalSales() - getTotalExpenses())}</div>
        </div>
        
        <div class="card">
          <div class="text-sm text-gray">Transactions</div>
          <div class="font-bold text-lg">{salesData.length}</div>
        </div>
      </div>

      {/* Payment Methods */}
      <div class="card mb-lg">
        <h3>Sales by Payment Method</h3>
        <div class="grid grid-2">
          {Object.entries(paymentMethods).map(([method, amount]) => (
            <div key={method} class="flex justify-between items-center">
              <span class="text-sm">{method.charAt(0).toUpperCase() + method.slice(1)}</span>
              <span class="font-bold">{formatCurrency(amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses by Category */}
      <div class="card mb-lg">
        <h3>Expenses by Category</h3>
        {Object.keys(expensesByCategory).length === 0 ? (
          <p class="text-gray text-center">No expenses recorded</p>
        ) : (
          <div class="grid grid-1">
            {Object.entries(expensesByCategory).map(([category, amount]) => (
              <div key={category} class="flex justify-between items-center" style="padding: var(--space-sm) 0; border-bottom: 1px solid var(--color-gray-200);">
                <span>{category}</span>
                <span class="font-bold text-red">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sales Trend */}
      <div class="card">
        <h3>Sales Trend</h3>
        {salesByDay.length === 0 ? (
          <p class="text-gray text-center">No sales data</p>
        ) : (
          <div class="grid grid-1">
            {salesByDay.map(({ date, total }) => (
              <div key={date} class="flex justify-between items-center" style="padding: var(--space-sm) 0; border-bottom: 1px solid var(--color-gray-200);">
                <span class="text-sm">{date}</span>
                <span class="font-bold">{formatCurrency(total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
