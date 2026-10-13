import { useState } from 'preact/hooks';
import { signIn } from '../auth/index.js';
import { showToast } from '../components/Toast.jsx';

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await signIn();
    } catch (err) {
      showToast(err.message, 'error');
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div class="flex items-center justify-center" style="min-height: 100vh; background-color: var(--color-cream);">
      <div class="card" style="max-width: 400px; width: 100%; margin: var(--space-md);">
        <div class="text-center mb-lg">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" stroke-width="2" style="margin-bottom: var(--space-md);">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <h1 style="margin-bottom: var(--space-sm);">Shamba Books</h1>
          <p class="text-gray">Dairy Farm Shop Management</p>
        </div>

        {error && (
          <div class="card bg-red" style="background-color: #fee2e2; color: var(--color-red); margin-bottom: var(--space-md);">
            <p class="text-sm" style="margin: 0;">{error}</p>
          </div>
        )}

        <button
          class="btn btn-primary btn-block"
          onClick={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <>
              <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
              Signing in...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        <p class="text-center text-sm text-gray mt-lg">
          Access is by invitation only
        </p>
      </div>
    </div>
  );
}
