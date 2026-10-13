import { useState, useEffect } from 'preact/hooks';
import { collection, query, where, getDocs, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { collections } from '../db/collections.js';
import { TRANSACTION_TYPES, PAYMENT_METHODS } from '../lib/constants.js';
import { formatCurrency, getTodayDate, formatDate } from '../lib/utils.js';
import { showToast } from '../components/Toast.jsx';

export default function DayClose({ user }) {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [openingCash, setOpeningCash] = useState(0);
  const [openingMpesa, setOpeningMpesa] = useState(0);
  const [cashSales, setCashSales] = useState(0);
  const [mpesaSales, setMpesaSales] = useState(0);
  const [paymentsReceived, setPaymentsReceived] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [countedCash, setCountedCash] = useState('');
  const [countedMpesa, setCountedMpesa] = useState('');
  const [notes, setNotes] = useState('');
  const [isClosed, setIsClosed] = useState(false);
  const [closingDay, setClosingDay] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDayData();
  }, [selectedDate]);

  const loadDayData = async () => {
    setLoading(true);
    
    try {
      // Get previous day's closing (for opening)
      const prevDate = new Date(selectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      
      const prevCloseDoc = await getDoc(doc(collections.dayClosings, prevDateStr));
      if (prevCloseDoc.exists()) {
        const prevClose = prevCloseDoc.data();
        setOpeningCash(prevClose.countedCash || 0);
        setOpeningMpesa(prevClose.countedMpesa || 0);
      }

      // Get current day's closing status
      const currentCloseDoc = await getDoc(doc(collections.dayClosings, selectedDate));
      if (currentCloseDoc.exists()) {
        const currentClose = currentCloseDoc.data();
        setIsClosed(true);
        setCountedCash(currentClose.countedCash?.toString() || '');
        setCountedMpesa(currentClose.countedMpesa?.toString() || '');
        setNotes(currentClose.notes || '');
      } else {
        setIsClosed(false);
        setCountedCash('');
        setCountedMpesa('');
        setNotes('');
      }

      // Get today's transactions
      const q = query(
        collections.transactions,
        where('date', '>=', selectedDate),
        where('date', '<', selectedDate + 'T23:59:59'),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      
      let cash = 0;
      let mpesa = 0;
      let payments = 0;
      let expenseTotal = 0;
      
      snapshot.forEach(doc => {
        const tx = doc.data();
        if (tx.type === TRANSACTION_TYPES.SALE) {
          tx.paymentSplit.forEach(p => {
            if (p.method === PAYMENT_METHODS.CASH) cash += p.amount;
            if (p.method === PAYMENT_METHODS.MPESA) mpesa += p.amount;
          });
        } else if (tx.type === TRANSACTION_TYPES.PAYMENT) {
          tx.paymentSplit.forEach(p => {
            if (p.method === PAYMENT_METHODS.CASH) payments += p.amount;
            if (p.method === PAYMENT_METHODS.MPESA) payments += p.amount;
          });
        } else if (tx.type === TRANSACTION_TYPES.EXPENSE) {
          tx.paymentSplit.forEach(p => {
            if (p.method === PAYMENT_METHODS.CASH) expenseTotal += p.amount;
            if (p.method === PAYMENT_METHODS.MPESA) expenseTotal += p.amount;
          });
        }
      });
      
      setCashSales(cash);
      setMpesaSales(mpesa);
      setPaymentsReceived(payments);
      setExpenses(expenseTotal);
    } catch (error) {
      console.error('Error loading day data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExpectedCash = () => {
    return openingCash + cashSales + paymentsReceived - expenses;
  };

  const getExpectedMpesa = () => {
    return openingMpesa + mpesaSales;
  };

  const getCashVariance = () => {
    if (!countedCash) return 0;
    return parseInt(countedCash) - getExpectedCash();
  };

  const getMpesaVariance = () => {
    if (!countedMpesa) return 0;
    return parseInt(countedMpesa) - getExpectedMpesa();
  };

  const handleCloseDay = async () => {
    if (!countedCash || !countedMpesa) {
      showToast('Please enter counted cash and M-Pesa amounts', 'error');
      return;
    }

    if (closingDay) {
      return; // Prevent double submission
    }

    setClosingDay(true);

    try {
      await setDoc(doc(collections.dayClosings, selectedDate), {
        date: selectedDate,
        openingCash,
        openingMpesa,
        cashSales,
        mpesaSales,
        paymentsReceived,
        expenses,
        expectedCash: getExpectedCash(),
        expectedMpesa: getExpectedMpesa(),
        countedCash: parseInt(countedCash),
        countedMpesa: parseInt(countedMpesa),
        cashVariance: getCashVariance(),
        mpesaVariance: getMpesaVariance(),
        notes,
        closedBy: user.email,
        lockedAt: new Date().toISOString(),
      });

      showToast('Day closed successfully', 'success');
      setIsClosed(true);
    } catch (error) {
      console.error('Error closing day:', error);
      showToast('Error closing day: ' + error.message, 'error');
    } finally {
      setClosingDay(false);
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
    <div class="day-close">
      <h2>Day Close</h2>

      {/* Date Picker */}
      <div class="card mb-md">
        <label>Select Date</label>
        <input
          type="date"
          value={selectedDate}
          onInput={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {/* Opening Balances */}
      <div class="card mb-md">
        <h3>Opening Balances</h3>
        <div class="flex justify-between mb-sm">
          <span>Cash</span>
          <span class="font-bold">{formatCurrency(openingCash)}</span>
        </div>
        <div class="flex justify-between">
          <span>M-Pesa</span>
          <span class="font-bold">{formatCurrency(openingMpesa)}</span>
        </div>
      </div>

      {/* Today's Activity */}
      <div class="card mb-md">
        <h3>Today's Activity</h3>
        <div class="flex justify-between mb-sm">
          <span>Cash Sales</span>
          <span class="font-bold text-green">{formatCurrency(cashSales)}</span>
        </div>
        <div class="flex justify-between mb-sm">
          <span>M-Pesa Sales</span>
          <span class="font-bold text-green">{formatCurrency(mpesaSales)}</span>
        </div>
        <div class="flex justify-between mb-sm">
          <span>Payments Received</span>
          <span class="font-bold text-green">{formatCurrency(paymentsReceived)}</span>
        </div>
        <div class="flex justify-between">
          <span>Expenses</span>
          <span class="font-bold text-red">{formatCurrency(expenses)}</span>
        </div>
      </div>

      {/* Expected Closing */}
      <div class="card mb-md">
        <h3>Expected Closing</h3>
        <div class="flex justify-between mb-sm">
          <span>Cash</span>
          <span class="font-bold">{formatCurrency(getExpectedCash())}</span>
        </div>
        <div class="flex justify-between">
          <span>M-Pesa</span>
          <span class="font-bold">{formatCurrency(getExpectedMpesa())}</span>
        </div>
      </div>

      {/* Count */}
      <div class="card mb-md">
        <h3>Counted Amounts</h3>
        
        <div class="mb-md">
          <label>Cash Counted</label>
          <input
            type="number"
            value={countedCash}
            onInput={(e) => setCountedCash(e.target.value)}
            placeholder="Enter counted cash"
            disabled={isClosed}
          />
        </div>

        <div class="mb-md">
          <label>M-Pesa Counted</label>
          <input
            type="number"
            value={countedMpesa}
            onInput={(e) => setCountedMpesa(e.target.value)}
            placeholder="Enter counted M-Pesa"
            disabled={isClosed}
          />
        </div>

        <div class="mb-md">
          <label>Notes</label>
          <textarea
            value={notes}
            onInput={(e) => setNotes(e.target.value)}
            placeholder="Add notes about the day"
            disabled={isClosed}
            rows="3"
          />
        </div>
      </div>

      {/* Variance */}
      {countedCash && countedMpesa && (
        <div class="card mb-md">
          <h3>Variance</h3>
          <div class="flex justify-between mb-sm">
            <span>Cash Variance</span>
            <span class={`font-bold ${getCashVariance() !== 0 ? 'text-red' : 'text-green'}`}>
              {formatCurrency(getCashVariance())}
            </span>
          </div>
          <div class="flex justify-between">
            <span>M-Pesa Variance</span>
            <span class={`font-bold ${getMpesaVariance() !== 0 ? 'text-red' : 'text-green'}`}>
              {formatCurrency(getMpesaVariance())}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      {!isClosed ? (
        <button class="btn btn-primary btn-block" onClick={handleCloseDay} disabled={closingDay}>
          {closingDay ? 'Closing...' : 'Close Day'}
        </button>
      ) : (
        <div class="card bg-green" style="background-color: #dcfce7; color: var(--color-green-dark);">
          <p class="text-center font-bold">Day Closed</p>
        </div>
      )}
    </div>
  );
}
