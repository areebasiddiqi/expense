import { useState, useEffect } from 'react';
import { X, Upload, MapPin, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Database } from '../../lib/database.types';

type Expense = Database['public']['Tables']['expenses']['Row'];
type Category = Database['public']['Tables']['expense_categories']['Row'];
type MileageRate = Database['public']['Tables']['mileage_rates']['Row'];

interface ExpenseFormProps {
  claimId?: string;
  expense?: Expense | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExpenseForm({ claimId, expense, onClose, onSuccess }: ExpenseFormProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mileageRates, setMileageRates] = useState<MileageRate[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amountBeforeVat, setAmountBeforeVat] = useState('');
  const [vatAmount, setVatAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');

  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [distanceMiles, setDistanceMiles] = useState('');
  const [chargerType, setChargerType] = useState<'home' | 'public'>('home');

  const [mileageCategory, setMileageCategory] = useState<Category | null>(null);

  useEffect(() => {
    loadCategories();
    loadMileageRates();

    if (expense) {
      setTitle(expense.title);
      setDescription(expense.description);
      setCategoryId(expense.category_id || '');
      setAmountBeforeVat(expense.amount_before_vat?.toString() || '0');
      setVatAmount(expense.vat_amount?.toString() || '0');
      setExpenseDate(expense.expense_date);
      setNotes(expense.notes);
      setReceiptUrl(expense.receipt_url || '');
      loadMileageData(expense.id);
    } else {
      setExpenseDate(new Date().toISOString().split('T')[0]);
    }
  }, [expense]);

  async function loadCategories() {
    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    setCategories(data || []);

    const mileageCat = data?.find(cat => cat.name.toLowerCase() === 'mileage');
    setMileageCategory(mileageCat || null);
  }

  async function loadMileageRates() {
    const { data } = await supabase
      .from('mileage_rates')
      .select('*')
      .lte('effective_from', new Date().toISOString())
      .or('effective_to.is.null,effective_to.gte.' + new Date().toISOString());
    setMileageRates(data || []);
  }

  async function loadMileageData(expenseId: string) {
    const { data } = await supabase
      .from('mileage_expenses')
      .select('*')
      .eq('expense_id', expenseId)
      .maybeSingle();

    if (data) {
      setStartLocation(data.start_location);
      setEndLocation(data.end_location);
      setDistanceMiles(data.distance_miles.toString());
      if (data.charger_type) {
        setChargerType(data.charger_type as 'home' | 'public');
      }
    }
  }

  const isMileage = mileageCategory && categoryId === mileageCategory.id;

  useEffect(() => {
    if (isMileage && distanceMiles && profile) {
      const isElectric = profile.vehicle_type === 'electric';
      const rate = mileageRates.find(r =>
        r.vehicle_type === profile.vehicle_type &&
        (isElectric ? r.charger_type === chargerType : r.charger_type === null)
      );
      if (rate) {
        const calculatedAmount = parseFloat(distanceMiles) * rate.rate_per_mile;
        setAmountBeforeVat(calculatedAmount.toFixed(2));
        setVatAmount('0.00');
      }
    }
  }, [isMileage, distanceMiles, profile, mileageRates, chargerType]);

  const calculateNetCost = () => {
    const beforeVat = parseFloat(amountBeforeVat) || 0;
    const vat = parseFloat(vatAmount) || 0;
    return (beforeVat + vat).toFixed(2);
  };

  async function handleSave() {
    if (!user) return;

    setLoading(true);

    let uploadedReceiptUrl = receiptUrl;

    if (receiptFile) {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile);

      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);
        uploadedReceiptUrl = publicUrl;
      }
    }

    const netCost = parseFloat(calculateNetCost());

    const expenseData = {
      user_id: user.id,
      claim_id: claimId || null,
      title,
      description,
      category_id: categoryId || null,
      amount_before_vat: parseFloat(amountBeforeVat) || 0,
      vat_amount: parseFloat(vatAmount) || 0,
      amount: netCost,
      expense_date: expenseDate,
      notes,
      receipt_url: uploadedReceiptUrl,
      updated_at: new Date().toISOString(),
    };

    if (expense) {
      await supabase
        .from('expenses')
        .update(expenseData)
        .eq('id', expense.id);

      if (isMileage) {
        const isElectric = profile?.vehicle_type === 'electric';
        const rate = mileageRates.find(r =>
          r.vehicle_type === profile?.vehicle_type &&
          (isElectric ? r.charger_type === chargerType : r.charger_type === null)
        );
        await supabase
          .from('mileage_expenses')
          .upsert({
            expense_id: expense.id,
            start_location: startLocation,
            end_location: endLocation,
            distance_miles: parseFloat(distanceMiles),
            vehicle_type: profile?.vehicle_type || 'standard',
            charger_type: isElectric ? chargerType : null,
            rate_applied: rate?.rate_per_mile || 0,
          });
      }
    } else {
      const { data: newExpense } = await supabase
        .from('expenses')
        .insert(expenseData)
        .select()
        .single();

      if (isMileage && newExpense) {
        const isElectric = profile?.vehicle_type === 'electric';
        const rate = mileageRates.find(r =>
          r.vehicle_type === profile?.vehicle_type &&
          (isElectric ? r.charger_type === chargerType : r.charger_type === null)
        );
        await supabase
          .from('mileage_expenses')
          .insert({
            expense_id: newExpense.id,
            start_location: startLocation,
            end_location: endLocation,
            distance_miles: parseFloat(distanceMiles),
            vehicle_type: profile?.vehicle_type || 'standard',
            charger_type: isElectric ? chargerType : null,
            rate_applied: rate?.rate_per_mile || 0,
          });
      }
    }

    setLoading(false);
    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {expense ? 'Edit Expense' : 'New Expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              placeholder="e.g., Client Lunch Meeting"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none resize-none"
              placeholder="Provide details about this expense..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {isMileage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center space-x-2 text-blue-900 font-medium">
                <MapPin className="w-5 h-5" />
                <span>Mileage Details</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Start Postcode
                  </label>
                  <input
                    type="text"
                    value={startLocation}
                    onChange={(e) => setStartLocation(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                    placeholder="e.g., SW1A 1AA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    End Postcode
                  </label>
                  <input
                    type="text"
                    value={endLocation}
                    onChange={(e) => setEndLocation(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                    placeholder="e.g., EC1A 1BB"
                  />
                </div>
              </div>
              {profile?.vehicle_type === 'electric' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Charger Type
                  </label>
                  <select
                    value={chargerType}
                    onChange={(e) => setChargerType(e.target.value as 'home' | 'public')}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  >
                    <option value="home">Home Charger</option>
                    <option value="public">Public Charger</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Distance (miles)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={distanceMiles}
                  onChange={(e) => setDistanceMiles(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  placeholder="0.0"
                />
              </div>
              <div className="text-sm text-slate-600">
                Vehicle Type: <span className="font-medium capitalize">{profile?.vehicle_type}</span>
                {profile?.vehicle_type && (
                  <span className="ml-2">
                    (Rate: £{(() => {
                      const isElectric = profile.vehicle_type === 'electric';
                      const rate = mileageRates.find(r =>
                        r.vehicle_type === profile.vehicle_type &&
                        (isElectric ? r.charger_type === chargerType : r.charger_type === null)
                      );
                      return rate?.rate_per_mile || 0;
                    })()}/mile)
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cost Before VAT * (£)
              </label>
              <input
                type="number"
                step="0.01"
                value={amountBeforeVat}
                onChange={(e) => setAmountBeforeVat(e.target.value)}
                required
                disabled={isMileage}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none disabled:bg-slate-100"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                VAT (£)
              </label>
              <input
                type="number"
                step="0.01"
                value={vatAmount}
                onChange={(e) => setVatAmount(e.target.value)}
                disabled={isMileage}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none disabled:bg-slate-100"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Net Cost (£)
              </label>
              <input
                type="text"
                value={calculateNetCost()}
                disabled
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Receipt
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                <Upload className="w-4 h-4" />
                <span className="text-sm">Upload Receipt</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {(receiptFile || receiptUrl) && (
                <span className="text-sm text-slate-600">
                  {receiptFile ? receiptFile.name : 'Receipt uploaded'}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none resize-none"
              placeholder="Any additional notes..."
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Expense'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
