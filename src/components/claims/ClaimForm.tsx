import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X } from 'lucide-react';

interface Client {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string;
}

interface ClaimFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClaimForm({ onClose, onSuccess }: ClaimFormProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    claimant_name: profile?.full_name || '',
    start_date: today,
    end_date: today,
    description: '',
    is_chargeable: false,
    client_id: '',
  });

  useEffect(() => {
    loadClients();
    loadProfiles();
  }, []);

  async function loadClients() {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (data) {
      setClients(data);
    }
  }

  async function loadProfiles() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');

    if (data) {
      setProfiles(data);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('expense_claims').insert({
      user_id: user?.id,
      claimant_name: formData.claimant_name,
      start_date: formData.start_date,
      end_date: formData.end_date,
      description: formData.description,
      is_chargeable: formData.is_chargeable,
      client_id: formData.is_chargeable && formData.client_id ? formData.client_id : null,
      status: 'draft',
    });

    setLoading(false);

    if (error) {
      console.error('Error creating claim:', error);
      alert('Failed to create claim');
    } else {
      onSuccess();
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">New Expense Claim</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Claimant Name
            </label>
            <select
              required
              value={formData.claimant_name}
              onChange={(e) =>
                setFormData({ ...formData, claimant_name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select claimant</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.full_name}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the purpose of this claim..."
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_chargeable}
                onChange={(e) =>
                  setFormData({ ...formData, is_chargeable: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Chargeable to client
              </span>
            </label>
          </div>

          {formData.is_chargeable && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client
              </label>
              <select
                required={formData.is_chargeable}
                value={formData.client_id}
                onChange={(e) =>
                  setFormData({ ...formData, client_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
