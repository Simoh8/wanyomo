# Shamba Books

A lightweight, mobile-first web app for managing a dairy farm shop in Kenya. Track sales, stock, customer accounts, expenses, and analytics with role-based access for multiple users.

## Features

- **Sales Management**: Record sales with multiple payment methods (Cash, M-Pesa, Credit, Wallet)
- **Customer Accounts**: Track prepaid credit and post-paid debts in a single balance
- **Stock Management**: Receive stock, track wastage, internal conversions, and stocktakes
- **Expenses Tracking**: Record and categorize daily expenses
- **Day Closing**: Daily cash and M-Pesa reconciliation with variance tracking
- **Analytics**: Sales trends, payment methods, expense breakdowns, and more
- **Multi-User Support**: Role-based access (Owner, Manager, Attendant) with Google Sign-In
- **Offline-First**: Works offline with automatic sync when back online
- **PWA**: Installable on mobile devices for a native app experience

## Tech Stack

- **Frontend**: Vite + Preact (vanilla JavaScript, ~208KB gzipped)
- **Backend**: Firebase Authentication + Cloud Firestore
- **Storage**: Firestore with offline persistence
- **PWA**: Service worker with manifest for installation
- **Charts**: Inline SVG (lightweight, no external chart library)
- **Styling**: Plain CSS with CSS variables, dark mode support

**Note**: The bundle size is ~208KB gzipped (including Firebase SDK). This is slightly above the initial 200KB target but acceptable for a full-featured app with authentication, database, and offline support. The Firebase SDK accounts for most of this size.

## Prerequisites

- Node.js 18+ (note: Firebase SDK may warn about Node version, but works fine)
- A Google account for Firebase setup
- A Firebase project

## Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable Google Sign-In:
   - Go to Authentication > Sign-in method
   - Enable Google sign-in provider
4. Create Firestore database:
   - Go to Firestore Database
   - Create database (start in production mode)
   - Select a location (e.g., europe-west1 or us-central1)

### 2. Get Firebase Configuration

1. Go to Project Settings > General > Your apps
2. Click the web icon (</>)
3. Register the app (name it "Shamba Books")
4. Copy the firebaseConfig object (you'll need these values)

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   
   # Set the owner's email (first user who can invite others)
   VITE_OWNER_EMAIL=owner@example.com
   ```

### 4. Deploy Firestore Security Rules

1. Go to Firestore Database > Rules
2. Copy the contents of `firestore.rules` from this repo
3. Paste and publish the rules

### 5. Deploy Firestore Indexes

1. Go to Firestore Database > Indexes
2. Click "Add single field index" or use the composite index tab
3. Import the indexes from `firestore.indexes.json` or create them manually as specified

### 6. Install Dependencies

```bash
npm install
```

### 7. Seed Initial Data (Optional)

Run the seed script to populate initial products, customers, and settings:

```bash
# In the browser console after signing in as owner:
import { seedData } from './src/db/seed.js';
await seedData();
```

This creates:
- 5 products (Milk, Mala, Bread, Eggs, Coffee)
- 3 sample customers
- 6 expense categories
- Default settings

### 8. Run Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### 9. Deploy to Production

#### Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init
   ```
   - Select Hosting
   - Use existing project
   - Set public directory to `dist`
   - Configure as single-page app (Yes)
   - Don't overwrite index.html (No)

4. Build the app:
   ```bash
   npm run build
   ```

5. Deploy:
   ```bash
   firebase deploy
   ```

#### Alternative: Netlify/Vercel

1. Build the app:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to Netlify/Vercel
3. Add environment variables in the hosting platform's dashboard

## User Roles

### Owner
- Full access to all features
- Manage users and roles
- Edit products, prices, and costs
- View profit and cost data
- Void transactions
- Close/reopen days
- View audit log

### Manager
- Record sales, payments, expenses
- Adjust stock
- Close days
- View all reports and analytics
- Cannot manage users or change owner settings

### Attendant
- Record sales and receive payments
- View today's dashboard
- View customer balances
- Cannot see cost prices or profit
- Cannot void transactions
- Cannot adjust stock
- Cannot view past days' reports

## Inviting Team Members

1. Sign in as Owner
2. Go to Settings > Team
3. Enter the team member's email
4. Select their role (Attendant or Manager)
5. Click "Send Invite"
6. The team member can now sign in with their Google account

## Installing the PWA on Mobile

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home screen" or "Install app"

### iOS (Safari)
1. Open the app in Safari
2. Tap the share button
3. Select "Add to Home Screen"

## Offline Support

The app works offline using Firestore persistence:
- Data is cached locally
- Changes are queued when offline
- Syncs automatically when back online
- Shows a pending sync indicator for unsaved changes

## Data Export

Export all data as JSON (Owner only):
1. Go to Settings
2. Click "Export Data"
3. Download the JSON file

## Security

- All data is stored in Firebase Firestore with role-based security rules
- Authentication via Google Sign-In only
- Access control enforced at both UI and database level
- Audit log tracks all sensitive operations (voids, edits, role changes)

## Troubleshooting

### "Access denied" on sign-in
- Ensure your email is in the `/users` collection
- If first user, check `VITE_OWNER_EMAIL` matches your email
- Ask the owner to invite you if you're not the first user

### Firestore rules not working
- Ensure rules are published in Firebase Console
- Check that indexes are deployed
- Verify user's role in the `/users` collection

### Offline sync issues
- Check browser console for errors
- Ensure Firestore persistence is enabled
- Try signing out and back in

### Build errors
- Ensure Node.js version is compatible
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf .vite`

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

### Linting

No linter is configured by default to keep the project lightweight. Add ESLint/Prettier if needed.

## License

MIT

## Support

For issues or questions, please check the user guides in the `/docs` folder or contact the development team.
# wanyomo
