import { useState, useEffect } from 'preact/hooks';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { collections } from '../db/collections.js';
import { getTodayDate, formatCurrency } from '../lib/utils.js';
import { ROLES } from '../auth/index.js';
import { showToast } from '../components/Toast.jsx';

export default function Dashboard({ user, onNavigate }) {
  const [todaySales, setTodaySales] = useState(0);
  const [cashIn, setCashIn] = useState(0);
  const [mpesaIn, setMpesaIn] = useState(0);
  const [creditGiven, setCreditGiven] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const today = getTodayDate();
    
    try {
      // Get today's transactions
      const transactionsQuery = query(
        collections.transactions,
        where('date', '>=', today),
        where('status', '==', 'active')
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      
      let sales = 0;
      let cash = 0;
      let mpesa = 0;
      let credit = 0;
      
      transactionsSnapshot.forEach(doc => {
        const tx = doc.data();
        if (tx.type === 'sale') {
          sales += tx.amount;
          tx.paymentSplit.forEach(p => {
            if (p.method === 'cash') cash += p.amount;
            if (p.method === 'mpesa') mpesa += p.amount;
            if (p.method === 'credit') credit += p.amount;
          });
        }
      });
      
      setTodaySales(sales);
      setCashIn(cash);
      setMpesaIn(mpesa);
      setCreditGiven(credit);
      
      // Get total debt (only for managers/owners)
      if (user.role !== ROLES.ATTENDANT) {
        const customersSnapshot = await getDocs(collections.customers);
        let debt = 0;
        customersSnapshot.forEach(doc => {
          const balance = doc.data().balance || 0;
          if (balance < 0) debt += Math.abs(balance);
        });
        setTotalDebt(debt);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      showToast('Error loading dashboard data', 'error');
    } finally {
      setLoading(false);
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
    <div class="dashboard">
      <h2>Dashboard</h2>
      
      <div class="grid grid-2 mb-lg">
        <div class="card">
          <div class="text-sm text-gray">Today's Sales</div>
          <div class="font-bold text-lg">{formatCurrency(todaySales)}</div>
        </div>
        
        <div class="card">
          <div class="text-sm text-gray">Cash In</div>
          <div class="font-bold text-lg text-green">{formatCurrency(cashIn)}</div>
        </div>
        
        <div class="card">
          <div class="text-sm text-gray">M-Pesa In</div>
          <div class="font-bold text-lg text-green">{formatCurrency(mpesaIn)}</div>
        </div>
        
        <div class="card">
          <div class="text-sm text-gray">Credit Given</div>
          <div class="font-bold text-lg text-red">{formatCurrency(creditGiven)}</div>
        </div>
        
        {user.role !== ROLES.ATTENDANT && (
          <>
            <div class="card">
              <div class="text-sm text-gray">Total Debt Owed</div>
              <div class="font-bold text-lg text-red">{formatCurrency(totalDebt)}</div>
            </div>
          </>
        )}
      </div>

      <div class="card">
        <h3>Quick Actions</h3>
        <div class="grid grid-2">
          <button class="btn btn-primary" onClick={() => onNavigate && onNavigate('sale')}>New Sale</button>
          <button class="btn btn-secondary" onClick={() => onNavigate && onNavigate('customers')}>Receive Payment</button>
          <button class="btn btn-outline" onClick={() => onNavigate && onNavigate('stock')}>Receive Stock</button>
          <button class="btn btn-outline" onClick={() => onNavigate && onNavigate('expenses')}>Add Expense</button>
        </div>
      </div>
    </div>
  );
}
