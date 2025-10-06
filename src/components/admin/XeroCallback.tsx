import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function XeroCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Xero authorization...');

  console.log('XeroCallback component mounted!', {
    pathname: window.location.pathname,
    search: window.location.search,
    href: window.location.href
  });

  useEffect(() => {
    console.log('XeroCallback useEffect running');
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      console.log('Xero callback params:', {
        code: code ? code.substring(0, 10) + '...' : null,
        state,
        error,
        errorDescription,
        fullUrl: window.location.href
      });

      if (error) {
        const errorMsg = errorDescription || error;
        throw new Error(`Authorization failed: ${errorMsg}`);
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      const savedState = sessionStorage.getItem('xero_oauth_state');
      const savedRedirectUri = sessionStorage.getItem('xero_redirect_uri');
      console.log('State validation:', { received: state, saved: savedState });

      // If session storage was cleared, try to reconstruct redirect URI from current URL
      let redirectUri = savedRedirectUri;
      if (!redirectUri) {
        redirectUri = `${window.location.origin}/admin/xero-callback`;
        console.log('Session storage cleared, using reconstructed redirect URI:', redirectUri);
      }

      // Only validate state if we have a saved state (more lenient for development)
      if (savedState && state !== savedState) {
        throw new Error('Invalid state parameter - security check failed');
      }
      
      if (!savedState) {
        console.warn('⚠️ Session storage was cleared during OAuth flow. This can happen due to browser refresh or multiple tabs. Proceeding with caution...');
      }

      sessionStorage.removeItem('xero_oauth_state');
      sessionStorage.removeItem('xero_redirect_uri');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/xero-oauth-callback`;
      console.log('Calling edge function:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
          'Origin': redirectUri ? new URL(redirectUri).origin : window.location.origin,
        },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      });

      const result = await response.json();
      console.log('Edge function response:', result);

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to exchange authorization code');
      }

      setStatus('success');
      setMessage('Successfully connected to Xero! Redirecting...');

      setTimeout(() => {
        window.location.href = '/?tab=settings';
      }, 2000);
    } catch (error) {
      console.error('Xero callback error:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unknown error occurred');

      setTimeout(() => {
        window.location.href = '/?tab=settings';
      }, 5000);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-200 p-8 max-w-md w-full">
        <div className="flex flex-col items-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <h2 className="text-xl font-semibold text-slate-900">Connecting to Xero</h2>
              <p className="text-sm text-slate-600 text-center">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-600" />
              <h2 className="text-xl font-semibold text-slate-900">Success!</h2>
              <p className="text-sm text-slate-600 text-center">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-600" />
              <h2 className="text-xl font-semibold text-slate-900">Connection Failed</h2>
              <p className="text-sm text-slate-600 text-center whitespace-pre-wrap">{message}</p>
              <p className="text-xs text-slate-500 text-center mt-2">
                Check the browser console for more details
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
