import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.js';

const googleProvider = new GoogleAuthProvider();

// Role definitions
export const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  ATTENDANT: 'attendant',
};

// Role permissions
export const PERMISSIONS = {
  [ROLES.OWNER]: [
    'view_all',
    'edit_all',
    'manage_users',
    'manage_products',
    'manage_prices',
    'view_costs',
    'view_profit',
    'void_transactions',
    'adjust_stock',
    'close_day',
    'reopen_day',
    'view_analytics',
    'export_data',
    'view_audit_log',
  ],
  [ROLES.MANAGER]: [
    'view_all',
    'record_sales',
    'record_payments',
    'record_expenses',
    'adjust_stock',
    'close_day',
    'view_analytics',
    'view_customers',
    'view_stock',
  ],
  [ROLES.ATTENDANT]: [
    'record_sales',
    'record_payments',
    'view_dashboard_today',
    'view_customers',
    'view_stock',
  ],
};

/**
 * Sign in with Google
 */
export async function signIn() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user is authorized
    const userDoc = await getDoc(doc(db, 'users', user.email));
    
    if (!userDoc.exists()) {
      // First sign-in - check if this is the first user ever (super admin)
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      if (usersSnapshot.empty) {
        // First user becomes super admin/owner
        await setDoc(doc(db, 'users', user.email), {
          email: user.email,
          name: user.displayName,
          role: ROLES.OWNER,
          active: true,
          invitedBy: null,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        });
        return { user, role: ROLES.OWNER, authorized: true };
      } else {
        await firebaseSignOut(auth);
        throw new Error('Access denied. Ask the owner to invite you.');
      }
    }

    const userData = userDoc.data();
    
    if (!userData.active) {
      await firebaseSignOut(auth);
      throw new Error('Your account has been deactivated. Contact the owner.');
    }

    // Update last login
    await setDoc(doc(db, 'users', user.email), {
      lastLoginAt: serverTimestamp(),
    }, { merge: true });

    return { user, role: userData.role, authorized: true };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

/**
 * Sign out
 */
export async function signOut() {
  await firebaseSignOut(auth);
}

/**
 * Check if user has permission
 */
export function hasPermission(role, permission) {
  return PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Get current user with role
 */
export async function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      
      if (!user) {
        resolve(null);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.email));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          resolve({
            ...user,
            role: userData.role,
            active: userData.active,
          });
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        resolve(null);
      }
    });
  });
}

/**
 * Auth state change listener
 */
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.email));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        callback({
          ...user,
          role: userData.role,
          active: userData.active,
        });
      } else {
        callback(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      callback(null);
    }
  });
}
