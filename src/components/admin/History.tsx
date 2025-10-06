import { useState } from 'react';
import { ClaimsHistory } from './ClaimsHistory';
import { ExpensesHistory } from './ExpensesHistory';

export function History() {
  const [activeView, setActiveView] = useState<'claims' | 'expenses'>('claims');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-1 inline-flex">
        <button
          onClick={() => setActiveView('claims')}
          className={`px-6 py-2 rounded-md font-medium transition ${
            activeView === 'claims'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Claims History
        </button>
        <button
          onClick={() => setActiveView('expenses')}
          className={`px-6 py-2 rounded-md font-medium transition ${
            activeView === 'expenses'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Expenses History
        </button>
      </div>

      {activeView === 'claims' ? <ClaimsHistory /> : <ExpensesHistory />}
    </div>
  );
}
