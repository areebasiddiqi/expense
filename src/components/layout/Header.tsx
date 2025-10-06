import { LogOut, Receipt } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Header() {
  const { profile, signOut } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-slate-900 p-2 rounded-lg">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Expense Manager</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{profile?.full_name}</p>
              <p className="text-xs text-slate-500 capitalize">{profile?.role}</p>
            </div>
            <button
              onClick={signOut}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
