import { Receipt, Users, Settings, CheckSquare, History } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const { isAdmin, isApprover } = useAuth();

  const tabs = [
    { id: 'expenses', label: 'My Expenses', icon: Receipt, show: true },
    { id: 'approvals', label: 'Approvals', icon: CheckSquare, show: isApprover || isAdmin },
    { id: 'history', label: 'History', icon: History, show: isApprover || isAdmin },
    { id: 'users', label: 'Users', icon: Users, show: isAdmin },
    { id: 'settings', label: 'Settings', icon: Settings, show: isAdmin },
  ];

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1">
          {tabs.filter(tab => tab.show).map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-slate-900 text-slate-900 font-medium'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
