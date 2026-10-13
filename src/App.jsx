import { useState, useEffect } from 'preact/hooks';
import { onAuthStateChange, signOut as authSignOut, ROLES } from './auth/index.js';
import AuthScreen from './screens/AuthScreen.jsx';
import Dashboard from './screens/Dashboard.jsx';
import NewSale from './screens/NewSale.jsx';
import Customers from './screens/Customers.jsx';
import Stock from './screens/Stock.jsx';
import Expenses from './screens/Expenses.jsx';
import DayClose from './screens/DayClose.jsx';
import Analytics from './screens/Analytics.jsx';
import Settings from './screens/Settings.jsx';
import ToastContainer from './components/Toast.jsx';
import './index.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleSignOut = async () => {
    await authSignOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div class="flex items-center justify-center" style="min-height: 100vh;">
        <div class="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <Dashboard user={user} onNavigate={setCurrentScreen} />;
      case 'sale':
        return <NewSale user={user} />;
      case 'customers':
        return <Customers user={user} />;
      case 'stock':
        return <Stock user={user} />;
      case 'expenses':
        return <Expenses user={user} />;
      case 'dayclose':
        return <DayClose user={user} />;
      case 'analytics':
        return user.role === ROLES.ATTENDANT ? <Dashboard user={user} onNavigate={setCurrentScreen} /> : <Analytics user={user} />;
      case 'settings':
        return <Settings user={user} onSignOut={handleSignOut} />;
      default:
        return <Dashboard user={user} onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div class="app">
      <header class="header">
        <div class="container flex items-center justify-between" style="padding: var(--space-md);">
          <h1 style="font-size: var(--font-size-xl); margin: 0;">Shamba Books</h1>
          <div class="flex items-center gap-sm">
            <button
              class="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              )}
            </button>
            <div class="avatar avatar-sm">{user.displayName?.[0] || '?'}</div>
            <span class="text-sm text-gray" style="display: none;">{user.displayName}</span>
            <button
              class="burger-menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                {isMobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </>
                ) : (
                  <>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main class="main">
        {renderScreen()}
      </main>

      <nav class={`nav ${isMobileMenuOpen ? 'nav-open' : ''}`}>
        <button
          class={`nav-item ${currentScreen === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('dashboard')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>Dashboard</span>
        </button>

        <button
          class={`nav-item ${currentScreen === 'sale' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('sale')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <span>Sale</span>
        </button>

        <button
          class={`nav-item ${currentScreen === 'customers' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('customers')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>Customers</span>
        </button>

        <button
          class={`nav-item ${currentScreen === 'stock' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('stock')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <span>Stock</span>
        </button>

        <button
          class={`nav-item ${currentScreen === 'expenses' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('expenses')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          <span>Expenses</span>
        </button>

        {user.role !== ROLES.ATTENDANT && (
          <button
            class={`nav-item ${currentScreen === 'dayclose' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('dayclose')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Day Close</span>
          </button>
        )}

        {user.role !== ROLES.ATTENDANT && (
          <button
            class={`nav-item ${currentScreen === 'analytics' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('analytics')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            <span>Analytics</span>
          </button>
        )}

        <button
          class={`nav-item ${currentScreen === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentScreen('settings')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>Settings</span>
        </button>
      </nav>

      <ToastContainer />

      <style>{`
        .app {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .header {
          background-color: var(--color-green);
          color: white;
          position: sticky;
          top: 0;
          z-index: 100;
          transition: background-color var(--transition-base);
        }

        .main {
          flex: 1;
          padding: var(--space-lg);
          padding-bottom: 80px;
        }

        .nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: var(--color-cream);
          border-top: 1px solid var(--color-gray-200);
          display: flex;
          overflow-x: auto;
          z-index: 100;
          padding: var(--space-sm) 0;
          transition: transform var(--transition-base), background-color var(--transition-base), border-color var(--transition-base);
        }

        .burger-menu {
          display: none;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: var(--space-sm);
          transition: transform var(--transition-base);
        }

        .burger-menu:hover {
          transform: scale(1.1);
        }

        .theme-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: var(--space-sm);
          border-radius: var(--radius-md);
          transition: background-color var(--transition-base);
        }

        .theme-toggle:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 768px) {
          .burger-menu {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .nav {
            position: fixed;
            bottom: auto;
            top: 60px;
            left: 0;
            right: 0;
            flex-direction: column;
            padding: var(--space-md);
            max-height: calc(100vh - 60px);
            overflow-y: auto;
            transform: translateY(-100%);
            opacity: 0;
            pointer-events: none;
          }

          .nav.nav-open {
            transform: translateY(0);
            opacity: 1;
            pointer-events: auto;
          }

          .nav-item {
            flex-direction: row;
            justify-content: flex-start;
            width: 100%;
            padding: var(--space-md);
            border-radius: var(--radius-md);
          }

          .nav-item span {
            font-size: var(--font-size-base);
          }

          .nav-item.active::after {
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 60%;
          }
        }

        .nav-item {
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-sm) var(--space-md);
          background: none;
          border: none;
          color: var(--color-gray-500);
          cursor: pointer;
          transition: color var(--transition-base), background-color var(--transition-base);
          min-width: 60px;
          border-radius: var(--radius-md);
          position: relative;
        }

        .nav-item:hover {
          color: var(--color-green);
          background-color: rgba(45, 90, 39, 0.1);
        }

        .nav-item.active {
          color: var(--color-green);
          background-color: rgba(45, 90, 39, 0.15);
        }

        .nav-item.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 40%;
          height: 3px;
          background-color: var(--color-green);
          border-radius: var(--radius-full);
        }

        .nav-item span {
          font-size: var(--font-size-xs);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 480px) {
          .nav-item span {
            font-size: 0.65rem;
          }
        }

        @media (min-width: 769px) {
          .app {
            flex-direction: row;
          }

          .header {
            position: static;
            flex: 0 0 250px;
            height: 100vh;
            flex-direction: column;
            display: flex;
            padding: var(--space-lg);
          }

          .nav {
            position: static;
            flex-direction: column;
            border-top: none;
            padding: var(--space-lg) 0;
            overflow-x: visible;
          }

          .nav-item {
            flex-direction: row;
            justify-content: flex-start;
            gap: var(--space-md);
            padding: var(--space-md);
            min-width: auto;
            width: 100%;
            border-radius: var(--radius-md);
          }

          .nav-item:hover {
            background-color: rgba(45, 90, 39, 0.1);
          }

          .nav-item.active {
            background-color: rgba(45, 90, 39, 0.15);
          }

          .nav-item.active::after {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 60%;
            background-color: var(--color-green);
            border-radius: var(--radius-full);
          }

          .nav-item span {
            font-size: var(--font-size-base);
          }

          .main {
            flex: 1;
            padding-bottom: var(--space-lg);
          }
        }
      `}</style>
    </div>
  );
}
