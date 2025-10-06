import { useState, useEffect } from 'react';
import { Save, Mail, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EmailTemplate {
  id: string;
  template_type: string;
  subject: string;
  body: string;
  updated_at: string;
}

const TEMPLATE_TYPES = [
  { value: 'claim_submitted', label: 'Claim Submitted', description: 'Sent when a claim is submitted for approval' },
  { value: 'claim_approved', label: 'Claim Approved', description: 'Sent when a claim is approved' },
  { value: 'claim_rejected', label: 'Claim Rejected', description: 'Sent when a claim is rejected' },
];

const PLACEHOLDERS = [
  { placeholder: '{{claimant_name}}', description: 'Name of the person who submitted the claim' },
  { placeholder: '{{claim_description}}', description: 'Description of the claim' },
  { placeholder: '{{claim_amount}}', description: 'Total amount of the claim' },
  { placeholder: '{{claim_start_date}}', description: 'Start date of the claim period' },
  { placeholder: '{{claim_end_date}}', description: 'End date of the claim period' },
  { placeholder: '{{claim_status}}', description: 'Current status of the claim' },
  { placeholder: '{{recipient_name}}', description: 'Name of the email recipient' },
  { placeholder: '{{reviewer_name}}', description: 'Name of the reviewer (for approved/rejected)' },
  { placeholder: '{{review_notes}}', description: 'Notes from the reviewer (for approved/rejected)' },
];

export function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<string>('claim_submitted');
  const [currentTemplate, setCurrentTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    const template = templates.find(t => t.template_type === selectedType);
    setCurrentTemplate(template || null);
  }, [selectedType, templates]);

  async function loadTemplates() {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('template_type');

    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  }

  async function saveTemplate() {
    if (!currentTemplate) return;

    setSaving(true);
    const { error } = await supabase
      .from('email_templates')
      .update({
        subject: currentTemplate.subject,
        body: currentTemplate.body,
        updated_at: new Date().toISOString(),
      })
      .eq('template_type', currentTemplate.template_type);

    if (!error) {
      await loadTemplates();
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="text-center py-8">Loading templates...</div>;
  }

  const selectedTypeInfo = TEMPLATE_TYPES.find(t => t.value === selectedType);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TEMPLATE_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setSelectedType(type.value)}
            className={`p-4 text-left border-2 rounded-lg transition ${
              selectedType === type.value
                ? 'border-slate-900 bg-slate-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <Mail className="w-5 h-5 text-slate-700" />
              <h3 className="font-semibold text-slate-900">{type.label}</h3>
            </div>
            <p className="text-sm text-slate-600">{type.description}</p>
          </button>
        ))}
      </div>

      {currentTemplate && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{selectedTypeInfo?.label}</h3>
              <p className="text-sm text-slate-600 mt-1">{selectedTypeInfo?.description}</p>
            </div>
            <div className="text-xs text-slate-500">
              Last updated: {new Date(currentTemplate.updated_at).toLocaleDateString()}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Subject
              </label>
              <input
                type="text"
                value={currentTemplate.subject}
                onChange={(e) =>
                  setCurrentTemplate({ ...currentTemplate, subject: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="Email subject line..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Body
              </label>
              <textarea
                value={currentTemplate.body}
                onChange={(e) =>
                  setCurrentTemplate({ ...currentTemplate, body: e.target.value })
                }
                rows={12}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none font-mono text-sm"
                placeholder="Email body content..."
              />
            </div>

            <button
              onClick={saveTemplate}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Template'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Available Placeholders</h4>
            <p className="text-sm text-blue-800 mb-3">
              Use these placeholders in your email templates. They will be automatically replaced with actual values when emails are sent.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {PLACEHOLDERS.map((item) => (
                <div key={item.placeholder} className="text-sm">
                  <code className="bg-blue-100 text-blue-900 px-2 py-1 rounded font-mono text-xs">
                    {item.placeholder}
                  </code>
                  <span className="text-blue-700 ml-2">{item.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
