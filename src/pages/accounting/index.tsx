import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layout } from '../../components/Layout';
import { DashboardSummary } from '../../types/accounting';
import { formatCurrencyNPR } from '../../lib/nepaliDate';

export default function AccountingDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/accounting/dashboard');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch dashboard summary');
      }
      setData(json.data);
      setSpreadsheetId(json.spreadsheetId || '');
      setIsConfigured(json.isConfigured || false);
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <Layout title="Accounting Dashboard">
      <div className="space-y-6">
        {/* Header / Intro banner */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              चार खाता लेखा ड्यासबोर्ड (4-Khata Accounting)
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Primary Datastore: Google Sheets • Double Entry Auto-Posting to Assets-04, Expenses-02, Liabilities 05, and Income-03
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchDashboard}
              className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center space-x-1"
            >
              <span>🔄</span>
              <span>Refresh Data</span>
            </button>
            <Link
              href="/accounting/journal-entry"
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition flex items-center space-x-1"
            >
              <span>✍️</span>
              <span>New Journal Entry</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="text-center py-16">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
            <p className="mt-3 text-sm text-slate-500">Connecting to Google Sheets datastore...</p>
          </div>
        )}

        {data && (
          <>
            {/* 1. FOUR MAIN 4-KHATA GROUP CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Assets-04 */}
              <div className="bg-white rounded-xl shadow-xs border-l-4 border-l-sky-500 border border-slate-200 p-5 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                      Group 04 • Assets
                    </span>
                    <h3 className="text-base font-semibold text-slate-800 mt-2">
                      Assets-04 (सम्पत्ति)
                    </h3>
                  </div>
                  <span className="text-2xl">🏦</span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrencyNPR(data.assetsTotal)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Normal Balance: <span className="font-semibold text-sky-700">DEBIT</span>
                  </p>
                </div>
              </div>

              {/* Expenses-02 */}
              <div className="bg-white rounded-xl shadow-xs border-l-4 border-l-rose-500 border border-slate-200 p-5 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                      Group 02 • Expenses
                    </span>
                    <h3 className="text-base font-semibold text-slate-800 mt-2">
                      Expenses-02 (खर्च)
                    </h3>
                  </div>
                  <span className="text-2xl">💸</span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrencyNPR(data.expensesTotal)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Normal Balance: <span className="font-semibold text-rose-700">DEBIT</span>
                  </p>
                </div>
              </div>

              {/* Liabilities 05 */}
              <div className="bg-white rounded-xl shadow-xs border-l-4 border-l-amber-500 border border-slate-200 p-5 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      Group 05 • Liabilities
                    </span>
                    <h3 className="text-base font-semibold text-slate-800 mt-2">
                      Liabilities 05 (दायित्व)
                    </h3>
                  </div>
                  <span className="text-2xl">📑</span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrencyNPR(data.liabilitiesTotal)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Normal Balance: <span className="font-semibold text-amber-700">CREDIT</span>
                  </p>
                </div>
              </div>

              {/* Income-03 */}
              <div className="bg-white rounded-xl shadow-xs border-l-4 border-l-emerald-500 border border-slate-200 p-5 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      Group 03 • Income
                    </span>
                    <h3 className="text-base font-semibold text-slate-800 mt-2">
                      Income-03 (आम्दानी)
                    </h3>
                  </div>
                  <span className="text-2xl">📈</span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrencyNPR(data.incomeTotal)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Normal Balance: <span className="font-semibold text-emerald-700">CREDIT</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 2. STATS & FISCAL OVERVIEW BAR */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block">Total Debit</span>
                <span className="text-lg font-bold text-slate-800">
                  {formatCurrencyNPR(data.totalDebit)}
                </span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block">Total Credit</span>
                <span className="text-lg font-bold text-slate-800">
                  {formatCurrencyNPR(data.totalCredit)}
                </span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block">Total Journals</span>
                <span className="text-lg font-bold text-slate-800">{data.numberOfJournals}</span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block">Today's Entries</span>
                <span className="text-lg font-bold text-slate-800">{data.todayTransactionsCount}</span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                <span className="text-xs text-slate-500 block">Fiscal Year</span>
                <span className="text-lg font-bold text-emerald-700">{data.currentFiscalYear}</span>
              </div>
            </div>

            {/* 3. DOUBLE-ENTRY INTEGRITY CHECK */}
            <div
              className={`rounded-xl p-5 border ${
                data.isBalanced
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${
                      data.isBalanced ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  >
                    {data.isBalanced ? '✓' : '!'}
                  </div>
                  <div>
                    <h4
                      className={`text-base font-bold ${
                        data.isBalanced ? 'text-emerald-900' : 'text-rose-900'
                      }`}
                    >
                      {data.isBalanced
                        ? 'चार खाता दोहोरो सन्तुलन मिलान (Double Entry Balance Verified)'
                        : 'असममित चेतावनी (Double Entry Imbalance Detected)'}
                    </h4>
                    <p
                      className={`text-sm mt-0.5 ${
                        data.isBalanced ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      सम्पत्ति (Assets) + खर्च (Expenses) = दायित्व (Liabilities) + आम्दानी (Income)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-6 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">Debit Side (Assets + Exp)</span>
                    <span className="font-bold text-slate-800">
                      {formatCurrencyNPR(data.assetsTotal + data.expensesTotal)}
                    </span>
                  </div>
                  <div className="text-xl font-bold text-slate-400">=</div>
                  <div>
                    <span className="text-xs text-slate-500 block">Credit Side (Liab + Inc)</span>
                    <span className="font-bold text-slate-800">
                      {formatCurrencyNPR(data.liabilitiesTotal + data.incomeTotal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Status</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-xs ${
                        data.isBalanced
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {data.isBalanced ? 'सन्तुलित (PASS)' : 'असममित (FAIL)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. RECENT JOURNALS */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recent Journal Entries</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Latest double entry transactions posted to Google Sheets
                  </p>
                </div>
                <Link
                  href="/accounting/journal-register"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  View Full Register →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Journal No</th>
                      <th className="px-4 py-3 text-left">BS Date</th>
                      <th className="px-4 py-3 text-left">AD Date</th>
                      <th className="px-4 py-3 text-left">Narration</th>
                      <th className="px-4 py-3 text-right">Debit (Rs.)</th>
                      <th className="px-4 py-3 text-right">Credit (Rs.)</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {data.recentJournals.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">
                          No journal entries yet. Click{' '}
                          <Link
                            href="/accounting/journal-entry"
                            className="text-emerald-600 underline font-medium"
                          >
                            + New Journal Entry
                          </Link>{' '}
                          to post your first transaction!
                        </td>
                      </tr>
                    ) : (
                      data.recentJournals.map((j) => (
                        <tr key={j.journalId} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 font-semibold text-emerald-800">
                            <Link href={`/accounting/journal/${j.journalId}`}>{j.journalNo}</Link>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{j.bsDate}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{j.transactionDate}</td>
                          <td className="px-4 py-3 max-w-xs truncate" title={j.narration}>
                            {j.narration}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrencyNPR(j.totalDebit)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrencyNPR(j.totalCredit)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                j.status === 'POSTED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : j.status === 'REVERSED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {j.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Link
                              href={`/accounting/journal/${j.journalId}`}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                            >
                              View / Print
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
