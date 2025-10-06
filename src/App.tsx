import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import ClaimsList from './components/claims/ClaimsList';
import ClaimForm from './components/claims/ClaimForm';
import ClaimDetails from './components/claims/ClaimDetails';
import { ApprovalsContainer } from './components/admin/ApprovalsContainer';
import { History } from './components/admin/History';
import { UserManagement } from './components/admin/UserManagement';
import { Settings } from './components/admin/Settings';
import { XeroCallback } from './components/admin/XeroCallback';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('expenses');
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const hasCode = urlParams.has('code');
  const hasState = urlParams.has('state');
  const savedState = sessionStorage.getItem('xero_oauth_state');
  const hasXeroCode = hasCode && hasState && savedState;
  const isXeroCallback = window.location.pathname.includes('/admin/xero-callback') || hasXeroCode;

  console.log('🔍 APP ROUTING CHECK:', {
    pathname: window.location.pathname,
    href: window.location.href,
    search: window.location.search,
    hasCode,
    hasState,
    savedState: savedState ? 'exists' : 'null',
    hasXeroCode,
    isXeroCallback,
    willRenderCallback: isXeroCallback,
    loading,
    hasUser: !!user
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  if (isXeroCallback) {
    console.log('Rendering XeroCallback component - bypassing auth checks');
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="text-slate-600">Loading session...</div>
        </div>
      );
    }
    return <XeroCallback />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'expenses' && !selectedClaimId && (
          <ClaimsList
            onSelectClaim={(claimId) => setSelectedClaimId(claimId)}
            onCreateClaim={() => setShowClaimForm(true)}
          />
        )}
        {activeTab === 'expenses' && selectedClaimId && (
          <ClaimDetails
            claimId={selectedClaimId}
            onBack={() => setSelectedClaimId(null)}
          />
        )}
        {activeTab === 'approvals' && <ApprovalsContainer />}
        {activeTab === 'history' && <History />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'settings' && <Settings />}
      </main>

      {showClaimForm && (
        <ClaimForm
          onClose={() => setShowClaimForm(false)}
          onSuccess={() => {
            setShowClaimForm(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
