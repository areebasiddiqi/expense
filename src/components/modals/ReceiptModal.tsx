import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ReceiptModalProps {
  receiptUrl: string;
  onClose: () => void;
}

export function ReceiptModal({ receiptUrl, onClose }: ReceiptModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div className="relative max-w-6xl max-h-[90vh] w-full bg-white rounded-lg shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Receipt</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-slate-50">
          <img
            src={receiptUrl}
            alt="Receipt"
            className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}
