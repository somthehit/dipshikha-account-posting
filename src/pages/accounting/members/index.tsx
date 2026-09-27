import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layout } from '../../../components/Layout';
import { Member } from '../../../types/member';
import { formatCurrencyNPR } from '../../../lib/nepaliDate';

export default function MembersListPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [crossCheck, setCrossCheck] = useState<any>(null);
  const [crossCheckLoading, setCrossCheckLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchCrossCheck = async () => {
    try {
      setCrossCheckLoading(true);
      const res = await fetch('/api/accounting/cross-check');
      const data = await res.json();
      if (data.success) {
        setCrossCheck(data.crossCheck || data);
      }
    } catch (e) {
      console.error('Error fetching cross-check:', e);
    } finally {
      setCrossCheckLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = '/api/accounting/members';
      if (searchTerm) url += `?search=${encodeURIComponent(searchTerm)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load members');
      }
      setMembers(data.members || []);
    } catch (err: any) {
      setError(err.message || 'Error loading member records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchCrossCheck();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMembers();
  };

  const totalShareCapital = members.reduce((sum, m) => sum + (m.shareAmount || 0), 0);
  const totalSavings = members.reduce((sum, m) => sum + (m.savingBalance || 0), 0);
  const totalLoans = members.reduce((sum, m) => sum + (m.loanOutstanding || 0), 0);

  return (
    <Layout title="Member Directory & Subsidiary Records">
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded uppercase">
                सदस्य व्यक्तिगत लगत पुस्तिका
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">Member-Data, Saving_Book, Share_Book, Loan_Book</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Member Directory & Records (सदस्य खाता विवरण)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage member profiles, share certificates, savings passbooks, and active loan portfolios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/accounting/members/new"
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition flex items-center space-x-1"
            >
              <span>👤</span>
              <span>Add Member</span>
            </Link>
            <Link
              href="/accounting/members/saving-entry"
              className="px-3.5 py-2 text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded-lg shadow-xs transition flex items-center space-x-1"
            >
              <span>📥</span>
              <span>Saving Entry</span>
            </Link>
            <Link
              href="/accounting/members/share-entry"
              className="px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-xs transition flex items-center space-x-1"
            >
              <span>📜</span>
              <span>Share Entry</span>
            </Link>
            <Link
              href="/accounting/members/loan-entry"
              className="px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-xs transition flex items-center space-x-1"
            >
              <span>💼</span>
              <span>Loan Entry</span>
            </Link>
          </div>
        </div>

        {/* Cross Check Alert Banner if discrepancy exists */}
        {crossCheck && !crossCheck.isAllBalanced && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-amber-900">
                  ४-खाता र सदस्य खाता बीच मौज्दात बेमेल फेला पर्यो (Discrepancy in 4-Khata Reconciliation)
                </h4>
                <p className="text-2xs text-amber-700">
                  ४-खाता नियन्त्रण खाता र सदस्य पुस्तिकाको योगफल ठ्याक्कै मिल्नु पर्दछ। कुनै गल्ती भए भौचर सच्याउनुहोस्।
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/accounting/sheets-status?tab=Cross-Check"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition"
              >
                ⚖️ मिलान अडिट हेर्नुहोस्
              </Link>
              <Link
                href="/accounting/journal-register"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition"
              >
                ✏️ भौचर सच्याउनुहोस्
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 block">Total Registered Members</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{members.length}</span>
            <span className="text-2xs text-slate-400 mt-1 block">Active Cooperative Members</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-start">
              <span className="text-xs text-slate-500 block">Total Member Shares (Share_Book)</span>
              {crossCheck && (
                <span
                  className={`text-3xs font-bold px-1.5 py-0.5 rounded-full ${
                    crossCheck.share?.isMatched
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {crossCheck.share?.isMatched ? '✓ ४-खाता सन्तुलित' : `⚠️ बेमेल: रु. ${Math.abs(crossCheck.share?.difference || 0).toLocaleString()}`}
                </span>
              )}
            </div>
            <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
              {formatCurrencyNPR(totalShareCapital)}
            </span>
            <div className="flex justify-between items-center text-2xs text-slate-400 mt-1">
              <span>Liabilities 05 (१०):</span>
              <span className="font-mono text-slate-600 font-semibold">
                {crossCheck ? `रु. ${(crossCheck.share?.khataBalance || 0).toLocaleString()}` : '...'}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-start">
              <span className="text-xs text-slate-500 block">Total Member Savings (Saving_Book)</span>
              {crossCheck && (
                <span
                  className={`text-3xs font-bold px-1.5 py-0.5 rounded-full ${
                    crossCheck.saving?.isMatched
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {crossCheck.saving?.isMatched ? '✓ ४-खाता सन्तुलित' : `⚠️ बेमेल: रु. ${Math.abs(crossCheck.saving?.difference || 0).toLocaleString()}`}
                </span>
              )}
            </div>
            <span className="text-2xl font-bold font-mono text-sky-700 mt-1 block">
              {formatCurrencyNPR(totalSavings)}
            </span>
            <div className="flex justify-between items-center text-2xs text-slate-400 mt-1">
              <span>Liabilities 05 (३०):</span>
              <span className="font-mono text-slate-600 font-semibold">
                {crossCheck ? `रु. ${(crossCheck.saving?.khataBalance || 0).toLocaleString()}` : '...'}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-start">
              <span className="text-xs text-slate-500 block">Loan Portfolio (Loan_Book)</span>
              {crossCheck && (
                <span
                  className={`text-3xs font-bold px-1.5 py-0.5 rounded-full ${
                    crossCheck.loan?.isMatched
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {crossCheck.loan?.isMatched ? '✓ ४-खाता सन्तुलित' : `⚠️ बेमेल: रु. ${Math.abs(crossCheck.loan?.difference || 0).toLocaleString()}`}
                </span>
              )}
            </div>
            <span className="text-2xl font-bold font-mono text-amber-700 mt-1 block">
              {formatCurrencyNPR(totalLoans)}
            </span>
            <div className="flex justify-between items-center text-2xs text-slate-400 mt-1">
              <span>Assets-04 (११०):</span>
              <span className="font-mono text-slate-600 font-semibold">
                {crossCheck ? `रु. ${(crossCheck.loan?.khataBalance || 0).toLocaleString()}` : '...'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Member No (e.g. M-001), Full Name, Phone, or Citizenship No..."
              className="w-full text-xs sm:text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition"
            >
              Search
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          {loading && (
            <div className="p-12 text-center text-slate-500">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-emerald-600 border-r-transparent"></div>
              <p className="mt-2 text-xs">Loading member database from Google Sheets...</p>
            </div>
          )}

          {!loading && error && (
            <div className="p-6 text-center text-rose-600 text-sm">{error}</div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">सदस्य नं. (No)</th>
                    <th className="px-4 py-3 text-left">सदस्यको नाम (Name)</th>
                    <th className="px-4 py-3 text-left">ठेगाना (Address)</th>
                    <th className="px-4 py-3 text-left">सम्पर्क नं. (Phone)</th>
                    <th className="px-4 py-3 text-right">शेयर रकम (रु.)</th>
                    <th className="px-4 py-3 text-right">बचत मौज्दात (रु.)</th>
                    <th className="px-4 py-3 text-right">ऋण बाँकी (रु.)</th>
                    <th className="px-4 py-3 text-center">स्थिति</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">
                        No members found. Click Add Member to register members.
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => (
                      <tr key={m.memberNo} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-semibold font-mono text-emerald-800 whitespace-nowrap">
                          <Link href={`/accounting/members/${m.memberNo}`} className="hover:underline">
                            {m.memberNo}
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                          {m.fullName}
                          {m.fullNameEn && (
                            <span className="block text-2xs text-slate-400 font-normal">{m.fullNameEn}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{m.address}</td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-600 whitespace-nowrap">{m.phone}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                          {formatCurrencyNPR(m.shareAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-sky-800 whitespace-nowrap">
                          {formatCurrencyNPR(m.savingBalance)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-amber-800 whitespace-nowrap">
                          {formatCurrencyNPR(m.loanOutstanding)}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              m.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap space-x-1.5">
                          <Link
                            href={`/accounting/members/${m.memberNo}`}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded transition"
                          >
                            Statement →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
