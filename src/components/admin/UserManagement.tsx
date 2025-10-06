import { useEffect, useState } from 'react';
import { Users, Plus, CreditCard as Edit2, Trash2, Shield, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserFormData {
  id?: string;
  email: string;
  full_name: string;
  role: 'staff' | 'admin';
  vehicle_type: string;
  charger_type: string;
}

export function UserManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [approvers, setApprovers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    full_name: '',
    role: 'staff',
    vehicle_type: 'standard',
    charger_type: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    const { data: approverData } = await supabase
      .from('approvers')
      .select('user_id')
      .eq('is_active', true);

    setProfiles(profileData || []);
    setApprovers(approverData?.map(a => a.user_id) || []);
    setLoading(false);
  }

  async function toggleApprover(userId: string) {
    const isApprover = approvers.includes(userId);

    if (isApprover) {
      await supabase
        .from('approvers')
        .delete()
        .eq('user_id', userId);
    } else {
      await supabase
        .from('approvers')
        .insert({ user_id: userId });
    }

    loadData();
  }

  async function updateRole(userId: string, newRole: 'staff' | 'admin') {
    await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    loadData();
  }

  async function updateVehicleType(userId: string, vehicleType: string) {
    await supabase
      .from('profiles')
      .update({ vehicle_type: vehicleType })
      .eq('id', userId);

    loadData();
  }

  function openCreateForm() {
    setEditingUser(null);
    setFormData({
      email: '',
      full_name: '',
      role: 'staff',
      vehicle_type: 'standard',
      charger_type: '',
    });
    setShowUserForm(true);
  }

  function openEditForm(user: Profile) {
    setEditingUser(user);
    setFormData({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      vehicle_type: user.vehicle_type,
      charger_type: user.charger_type || '',
    });
    setShowUserForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingUser) {
      const { error } = await supabase
        .from('profiles')
        .update({
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          vehicle_type: formData.vehicle_type,
          charger_type: formData.charger_type || null,
        })
        .eq('id', editingUser.id);

      if (error) {
        alert('Error updating user: ' + error.message);
        return;
      }
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          vehicle_type: formData.vehicle_type,
          charger_type: formData.charger_type || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert('Error creating user: ' + (result.error || 'Unknown error'));
        return;
      }
    }

    setShowUserForm(false);
    setEditingUser(null);
    loadData();
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management/${userId}`;

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      alert('Error deleting user: ' + (result.error || 'Unknown error'));
      return;
    }

    loadData();
  }

  if (loading) {
    return <div className="text-slate-500">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-slate-600 mt-1">Manage users, roles, and approvers</p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Add User</span>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Vehicle Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Approver
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {profiles.map((profile) => (
              <tr key={profile.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  {profile.full_name}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {profile.email}
                </td>
                <td className="px-6 py-4">
                  <select
                    value={profile.role}
                    onChange={(e) => updateRole(profile.id, e.target.value as 'staff' | 'admin')}
                    className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={profile.vehicle_type}
                    onChange={(e) => updateVehicleType(profile.id, e.target.value)}
                    className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  >
                    <option value="standard">Standard</option>
                    <option value="electric">Electric</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleApprover(profile.id)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition ${
                      approvers.includes(profile.id)
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>{approvers.includes(profile.id) ? 'Active' : 'Inactive'}</span>
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditForm(profile)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit user"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(profile.id, profile.full_name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={() => setShowUserForm(false)}
                className="p-2 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!editingUser}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none disabled:bg-slate-100"
                />
                {editingUser && (
                  <p className="text-xs text-slate-500 mt-1">Email cannot be changed after user creation</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'staff' | 'admin' })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vehicle Type
                </label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                >
                  <option value="standard">Standard</option>
                  <option value="electric">Electric</option>
                </select>
              </div>

              {formData.vehicle_type === 'electric' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Charger Type
                  </label>
                  <select
                    value={formData.charger_type}
                    onChange={(e) => setFormData({ ...formData, charger_type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  >
                    <option value="">None</option>
                    <option value="home">Home</option>
                    <option value="workplace">Workplace</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserForm(false)}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
