import { CURRENCY, TIMEZONE } from './constants.js';

/**
 * Format currency as KES
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) {
    return `${CURRENCY} 0`;
  }
  return `${CURRENCY} ${amount.toLocaleString('en-KE')}`;
}

/**
 * Format date in DD/MM/YYYY format
 */
export function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format date and time
 */
export function formatDateTime(date) {
  const d = new Date(date);
  const dateStr = formatDate(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date range for a period
 */
export function getDateRange(period) {
  const now = new Date();
  const start = new Date();
  const end = new Date();
  
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_month':
      start.setMonth(now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }
  
  return { start, end };
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);
  return Math.round((firstDate - secondDate) / oneDay);
}

/**
 * Get debt aging bucket
 */
export function getDebtAgingBucket(daysOverdue) {
  if (daysOverdue <= 7) return 'current';
  if (daysOverdue <= 14) return 'overdue';
  if (daysOverdue <= 30) return 'late';
  return 'critical';
}

/**
 * Round to 2 decimal places
 */
export function roundToTwo(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate initials from name
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format phone number for Kenya
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Add +254 if not present
  if (cleaned.startsWith('0')) {
    return '+254' + cleaned.slice(1);
  }
  if (cleaned.startsWith('7')) {
    return '+254' + cleaned;
  }
  if (cleaned.startsWith('254')) {
    return '+' + cleaned;
  }
  return cleaned;
}

/**
 * Generate WhatsApp link
 */
export function getWhatsAppLink(phone, message = '') {
  const formattedPhone = formatPhoneNumber(phone).replace('+', '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

/**
 * Validate email
 */
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate phone number (Kenya)
 */
export function isValidPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 12;
}

/**
 * Convert eggs between trays and pieces
 */
export function eggsToTrays(pieces) {
  return Math.floor(pieces / 30);
}

export function traysToEggs(trays) {
  return trays * 30;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value, total) {
  if (total === 0) return 0;
  return roundToTwo((value / total) * 100);
}

/**
 * Sort array by date
 */
export function sortByDate(array, dateField = 'date', order = 'desc') {
  return array.sort((a, b) => {
    const dateA = new Date(a[dateField]);
    const dateB = new Date(b[dateField]);
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
}

/**
 * Group array by key
 */
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
}

/**
 * Get unique values from array
 */
export function unique(array) {
  return [...new Set(array)];
}

/**
 * Calculate weighted average cost
 */
export function calculateWeightedAverageCost(movements) {
  let totalQty = 0;
  let totalCost = 0;
  
  for (const movement of movements) {
    if (movement.qty > 0 && movement.unitCost) {
      totalQty += movement.qty;
      totalCost += movement.qty * movement.unitCost;
    }
  }
  
  if (totalQty === 0) return 0;
  return totalCost / totalQty;
}
