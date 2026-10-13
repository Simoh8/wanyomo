import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  getTodayDate,
  daysBetween,
  getDebtAgingBucket,
  roundToTwo,
  getInitials,
  formatPhoneNumber,
  getWhatsAppLink,
  isValidEmail,
  isValidPhone,
  eggsToTrays,
  traysToEggs,
  calculatePercentage,
  sortByDate,
  groupBy,
  unique,
  calculateWeightedAverageCost,
} from './utils.js';

describe('formatCurrency', () => {
  it('should format positive numbers', () => {
    expect(formatCurrency(1250)).toBe('KES 1,250');
    expect(formatCurrency(100)).toBe('KES 100');
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('KES 0');
  });

  it('should handle null/undefined', () => {
    expect(formatCurrency(null)).toBe('KES 0');
    expect(formatCurrency(undefined)).toBe('KES 0');
  });
});

describe('formatDate', () => {
  it('should format date in DD/MM/YYYY', () => {
    expect(formatDate('2024-01-15')).toBe('15/01/2024');
  });
});

describe('getTodayDate', () => {
  it('should return today in YYYY-MM-DD format', () => {
    const today = getTodayDate();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('daysBetween', () => {
  it('should calculate days between dates', () => {
    expect(daysBetween('2024-01-15', '2024-01-10')).toBe(5);
    expect(daysBetween('2024-01-10', '2024-01-15')).toBe(-5);
  });
});

describe('getDebtAgingBucket', () => {
  it('should return correct bucket for days overdue', () => {
    expect(getDebtAgingBucket(5)).toBe('current');
    expect(getDebtAgingBucket(10)).toBe('overdue');
    expect(getDebtAgingBucket(20)).toBe('late');
    expect(getDebtAgingBucket(35)).toBe('critical');
  });
});

describe('roundToTwo', () => {
  it('should round to 2 decimal places', () => {
    expect(roundToTwo(1.234)).toBe(1.23);
    expect(roundToTwo(1.235)).toBe(1.24);
    expect(roundToTwo(1.2)).toBe(1.2);
  });
});

describe('getInitials', () => {
  it('should extract initials from name', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('Jane')).toBe('J');
  });

  it('should handle empty/null', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials(null)).toBe('?');
  });
});

describe('formatPhoneNumber', () => {
  it('should format Kenyan phone numbers', () => {
    expect(formatPhoneNumber('0712345678')).toBe('+254712345678');
    expect(formatPhoneNumber('712345678')).toBe('+254712345678');
    expect(formatPhoneNumber('254712345678')).toBe('+254712345678');
  });
});

describe('getWhatsAppLink', () => {
  it('should generate WhatsApp link', () => {
    const link = getWhatsAppLink('0712345678', 'Hello');
    expect(link).toContain('wa.me');
    expect(link).toContain('254712345678');
  });
});

describe('isValidEmail', () => {
  it('should validate email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('should validate Kenyan phone numbers', () => {
    expect(isValidPhone('0712345678')).toBe(true);
    expect(isValidPhone('254712345678')).toBe(true);
    expect(isValidPhone('123')).toBe(false);
  });
});

describe('egg conversions', () => {
  it('should convert eggs to trays', () => {
    expect(eggsToTrays(30)).toBe(1);
    expect(eggsToTrays(60)).toBe(2);
    expect(eggsToTrays(45)).toBe(1);
  });

  it('should convert trays to eggs', () => {
    expect(traysToEggs(1)).toBe(30);
    expect(traysToEggs(2)).toBe(60);
  });
});

describe('calculatePercentage', () => {
  it('should calculate percentage', () => {
    expect(calculatePercentage(25, 100)).toBe(25);
    expect(calculatePercentage(1, 3)).toBe(33.33);
  });

  it('should handle zero total', () => {
    expect(calculatePercentage(10, 0)).toBe(0);
  });
});

describe('sortByDate', () => {
  it('should sort array by date descending', () => {
    const arr = [
      { date: '2024-01-10', id: 1 },
      { date: '2024-01-15', id: 2 },
      { date: '2024-01-05', id: 3 },
    ];
    const sorted = sortByDate(arr, 'date', 'desc');
    expect(sorted[0].id).toBe(2);
    expect(sorted[2].id).toBe(3);
  });
});

describe('groupBy', () => {
  it('should group array by key', () => {
    const arr = [
      { category: 'food', name: 'Milk' },
      { category: 'food', name: 'Bread' },
      { category: 'drink', name: 'Coffee' },
    ];
    const grouped = groupBy(arr, 'category');
    expect(grouped.food).toHaveLength(2);
    expect(grouped.drink).toHaveLength(1);
  });
});

describe('unique', () => {
  it('should return unique values', () => {
    expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    expect(unique(['a', 'b', 'a'])).toEqual(['a', 'b']);
  });
});

describe('calculateWeightedAverageCost', () => {
  it('should calculate weighted average cost', () => {
    const movements = [
      { qty: 10, unitCost: 50 },
      { qty: 20, unitCost: 60 },
      { qty: 5, unitCost: 55 },
    ];
    const result = calculateWeightedAverageCost(movements);
    // (10*50 + 20*60 + 5*55) / 35 = 1975 / 35 = 56.43
    expect(result).toBeCloseTo(56.43, 2);
  });

  it('should handle empty movements', () => {
    expect(calculateWeightedAverageCost([])).toBe(0);
  });

  it('should ignore negative quantities', () => {
    const movements = [
      { qty: 10, unitCost: 50 },
      { qty: -5, unitCost: 60 },
    ];
    const result = calculateWeightedAverageCost(movements);
    expect(result).toBe(50);
  });
});
