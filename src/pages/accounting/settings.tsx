import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { OrganizationProfile } from '../../types/settings';
import { DEFAULT_ORG_PROFILE } from '../../lib/settingsService';

export default function SettingsPage() {
  const [profile, setProfile] = useState<OrganizationProfile>(DEFAULT_ORG_PROFILE);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/accounting/settings/organization');
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      } catch (err: any) {
        console.error('Failed to load settings:', err);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/accounting/settings/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'सहकारी प्रोफाइल र विवरण सफलतापूर्वक सुरक्षित गरियो (Settings saved successfully)!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'सुरक्षित गर्न असफल भयो' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error saving settings' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Organization Settings & Setup">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <span className="text-3xl">⚙️</span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">सहकारी विवरण तथा प्रणाली सेटअप (Settings)</h1>
              <p className="text-sm text-slate-500">संस्थाको आधारभूत जानकारी, ठेगाना, पान नम्बर र सक्रिय आर्थिक वर्ष व्यवस्थापन गर्नुहोस्</p>
            </div>
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg mb-6 text-sm font-medium ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  संस्थाको नाम (नेपालीमा) *
                </label>
                <input
                  type="text"
                  name="nameNp"
                  value={profile.nameNp}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Organization Name (English) *
                </label>
                <input
                  type="text"
                  name="nameEn"
                  value={profile.nameEn}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  ठेगाना (नेपालीमा) *
                </label>
                <input
                  type="text"
                  name="addressNp"
                  value={profile.addressNp}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Address (English) *
                </label>
                <input
                  type="text"
                  name="addressEn"
                  value={profile.addressEn}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  सक्रिय आर्थिक वर्ष (Active Fiscal Year) *
                </label>
                <input
                  type="text"
                  name="activeFiscalYear"
                  value={profile.activeFiscalYear}
                  onChange={handleChange}
                  placeholder="2081/82"
                  required
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  स्थायी लेखा नं. (PAN No.)
                </label>
                <input
                  type="text"
                  name="panNo"
                  value={profile.panNo}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  दर्ता नं. (Registration No.)
                </label>
                <input
                  type="text"
                  name="registrationNo"
                  value={profile.registrationNo}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  सम्पर्क फोन (Contact No.)
                </label>
                <input
                  type="text"
                  name="contactNo"
                  value={profile.contactNo}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  इमेल ठेगाना (Email)
                </label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  आबद्ध संघ / निकाय (Affiliated Union)
                </label>
                <input
                  type="text"
                  name="affiliatedUnion"
                  value={profile.affiliatedUnion || ''}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition disabled:opacity-50"
              >
                {saving ? 'सुरक्षित गर्दै...' : 'विवरण सुरक्षित गर्नुहोस् (Save Settings)'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
