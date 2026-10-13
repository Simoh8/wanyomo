// App constants
export const CURRENCY = 'KES';
export const TIMEZONE = 'Africa/Nairobi';

// Transaction types
export const TRANSACTION_TYPES = {
  SALE: 'sale',
  PAYMENT: 'payment',
  EXPENSE: 'expense',
  ADJUSTMENT: 'adjustment',
};

// Payment methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  MPESA: 'mpesa',
  CREDIT: 'credit',
  WALLET: 'wallet',
};

// Stock movement types
export const STOCK_MOVEMENT_TYPES = {
  OPENING: 'opening',
  RECEIVE_PURCHASE: 'receive_purchase',
  RECEIVE_FARM: 'receive_farm',
  SALE: 'sale',
  WASTAGE: 'wastage',
  SPOILAGE: 'spoilage',
  DAMAGE: 'damage',
  RETURN_FROM_CUSTOMER: 'return_from_customer',
  RETURN_TO_SUPPLIER: 'return_to_supplier',
  STOCKTAKE_ADJUST: 'stocktake_adjust',
  TRANSFER_INTERNAL: 'transfer_internal',
  SALE_REVERSAL: 'sale_reversal',
  REVERSAL: 'reversal',
};

// Debt aging buckets (days)
export const DEBT_AGING_BUCKETS = {
  CURRENT: { min: 0, max: 7, label: '0-7 days' },
  OVERDUE: { min: 8, max: 14, label: '8-14 days' },
  LATE: { min: 15, max: 30, label: '15-30 days' },
  CRITICAL: { min: 31, max: Infinity, label: '30+ days' },
};

// Date formats
export const DATE_FORMAT = 'DD/MM/YYYY';
export const TIME_FORMAT = 'HH:mm';

// Egg conversion
export const EGGS_PER_TRAY = 30;

// Default settings
export const DEFAULT_SETTINGS = {
  allowNegativeStock: false,
  expiryAlertDays: 2,
  wastageAlertPercent: 10,
  autoLockMinutes: 10,
};
