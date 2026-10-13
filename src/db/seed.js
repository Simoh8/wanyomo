import { db } from '../lib/firebase.js';
import { collections } from './collections.js';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';

/**
 * Seed initial data for the app
 * Run this once after setting up Firebase
 */
export async function seedData() {
  console.log('Seeding initial data...');
  
  // Seed products
  const products = [
    {
      name: 'Milk',
      category: 'dairy',
      unit: 'litre',
      sellPrice: 60,
      costPrice: 40,
      active: true,
      trackStock: true,
      reorderLevel: 20,
      perishable: true,
      shelfLifeDays: 7,
    },
    {
      name: 'Mala',
      category: 'dairy',
      unit: 'litre',
      sellPrice: 80,
      costPrice: 55,
      active: true,
      trackStock: true,
      reorderLevel: 15,
      perishable: true,
      shelfLifeDays: 5,
    },
    {
      name: 'Bread',
      category: 'bakery',
      unit: 'loaf',
      sellPrice: 70,
      costPrice: 45,
      active: true,
      trackStock: true,
      reorderLevel: 30,
      perishable: true,
      shelfLifeDays: 3,
    },
    {
      name: 'Eggs',
      category: 'poultry',
      unit: 'piece',
      sellPrice: 20,
      costPrice: 15,
      active: true,
      trackStock: true,
      reorderLevel: 60,
      perishable: true,
      shelfLifeDays: 21,
    },
    {
      name: 'Coffee',
      category: 'beverages',
      unit: 'pack',
      sellPrice: 150,
      costPrice: 100,
      active: true,
      trackStock: true,
      reorderLevel: 10,
      perishable: false,
      shelfLifeDays: 365,
    },
  ];
  
  for (const product of products) {
    const { costPrice, ...publicData } = product;
    const productRef = doc(collections.products);
    await setDoc(productRef, {
      ...publicData,
      id: productRef.id,
      createdAt: serverTimestamp(),
    });
    
    await setDoc(doc(collections.productCosts, productRef.id), {
      id: productRef.id,
      costPrice,
      updatedAt: serverTimestamp(),
    });
    
    console.log(`Created product: ${product.name}`);
  }
  
  // Seed customers
  const customers = [
    {
      name: 'John Kamau',
      phone: '+254712345678',
      notes: 'Regular customer, pays on time',
      active: true,
      creditLimit: 5000,
    },
    {
      name: 'Mary Wanjiku',
      phone: '+254723456789',
      notes: 'Prepaid customer',
      active: true,
      creditLimit: 3000,
    },
    {
      name: 'Peter Njoroge',
      phone: '+254734567890',
      notes: 'New customer',
      active: true,
      creditLimit: 2000,
    },
  ];
  
  for (const customer of customers) {
    const customerRef = doc(collections.customers);
    await setDoc(customerRef, {
      ...customer,
      id: customerRef.id,
      balance: 0,
      createdAt: serverTimestamp(),
    });
    console.log(`Created customer: ${customer.name}`);
  }
  
  // Seed expense categories
  const expenseCategories = [
    { name: 'Transport', active: true },
    { name: 'Utilities', active: true },
    { name: 'Supplies', active: true },
    { name: 'Staff Wages', active: true },
    { name: 'Maintenance', active: true },
    { name: 'Other', active: true },
  ];
  
  for (const category of expenseCategories) {
    const categoryRef = doc(collections.expenseCategories);
    await setDoc(categoryRef, {
      ...category,
      id: categoryRef.id,
      createdAt: serverTimestamp(),
    });
    console.log(`Created expense category: ${category.name}`);
  }
  
  // Seed settings
  const settings = {
    allowNegativeStock: false,
    expiryAlertDays: 2,
    wastageAlertPercent: 10,
    autoLockMinutes: 10,
    currency: 'KES',
    timezone: 'Africa/Nairobi',
  };
  
  for (const [key, value] of Object.entries(settings)) {
    await setDoc(doc(collections.settings, key), {
      value,
      updatedAt: serverTimestamp(),
    });
  }
  
  console.log('Seed data completed successfully!');
}

/**
 * Clear all seed data (use with caution!)
 */
export async function clearSeedData() {
  console.log('Clearing seed data...');
  // This would delete all collections - implement carefully
  console.log('Clear seed data - implement manually for safety');
}
