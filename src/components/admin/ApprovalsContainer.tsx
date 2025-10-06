import { useState } from 'react';
import { CheckSquare, Send } from 'lucide-react';
import { ApprovalQueue } from './ApprovalQueue';
import { XeroSyncQueue } from './XeroSyncQueue';

export function ApprovalsContainer() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'xero'>('approvals');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Approvals</h2>
        <p className="text-slate-600 mt-1">Review claims and sync to Xero</p>
      </div>

      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition ${
            activeTab === 'approvals'
              ? 'border-slate-900 text-slate-900 font-medium'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Approval Queue</span>
        </button>
        <button
          onClick={() => setActiveTab('xero')}
          className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition ${
            activeTab === 'xero'
              ? 'border-slate-900 text-slate-900 font-medium'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Xero Sync</span>
        </button>
      </div>

      {activeTab === 'approvals' && <ApprovalQueue />}
      {activeTab === 'xero' && <XeroSyncQueue />}
    </div>
  );
}
