import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ReviewNotesModalProps {
  approved: boolean;
  onConfirm: (notes: string) => void;
  onClose: () => void;
}

export function ReviewNotesModal({ approved, onConfirm, onClose }: ReviewNotesModalProps) {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            {approved ? 'Approve Claim' : 'Reject Claim'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Review Notes {approved ? '(optional)' : '(required)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none resize-none"
              placeholder={approved ? 'Add any notes about your approval...' : 'Please explain why this claim is being rejected...'}
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(notes)}
              disabled={!approved && !notes.trim()}
              className={`px-4 py-2 text-white rounded-lg transition ${
                approved
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed'
              }`}
            >
              {approved ? 'Approve' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
