import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layout } from '../../components/Layout';
import { AccountMaster, LedgerEntry } from '../../types/accounting';
import { formatCurrencyNPR } from '../../lib/nepaliDate';

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountMaster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [journalNo, setJournalNo] = useState<string>('');
  const [branch, setBranch] = useState<string>('');

  // Load Accounts list
  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch('/api/accounting/accounts');
        const data = await res.json();
        if (data.accounts) {
          setAccounts(data.accounts);
        }
      } catch (err) {
        console.error('Failed to load accounts for ledger:', err);
      }
    }
    loadAccounts();
  }, []);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = '/api/accounting/ledger?';
      if (selectedAccount) url += `accountCode=${encodeURIComponent(selectedAccount)}&`;
      if (selectedGroup) url += `group=${encodeURIComponent(selectedGroup)}&`;
      if (dateFrom) url += `dateFrom=${encodeURIComponent(dateFrom)}&`;
      if (dateTo) url += `dateTo=${encodeURIComponent(dateTo)}&`;
      if (journalNo) url += `journalNo=${encodeURIComponent(journalNo)}&`;
      if (branch) url += `branch=${encodeURIComponent(branch)}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch ledger');
      }
      setEntries(data.entries || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching ledger data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [selectedAccount, selectedGroup, dateFrom, dateTo]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLedger();
  };

  const handleResetFilters = () => {
    setSelectedAccount('');
    setSelectedGroup('');
    setDateFrom('');
    setDateTo('');
    setJournalNo('');
    setBranch('');
  };

  // Compute summary totals
  const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
  const netBalance = entries.length > 0 ? entries[entries.length - 1].runningBalance : 0;

  return (
    <Layout title="General Ledger (खाता बही)">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              खाता बही (General Ledger)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Read directly from Google Sheets datastore with running balance computations.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-xs transition flex items-center space-x-1 no-print"
          >
            <span>🖨️</span>
            <span>Print Ledger</span>
          </button>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 no-print">
          <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Account Selector */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Account (खाता छान्नुहोस्)
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full text-xs sm:text-sm px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All Accounts (सबै खाताहरू)</option>
                {accounts.map((a) => (
                  <option key={a.code} value={a.code}>
                    [{a.code}] {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Group */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Account Group
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full text-xs sm:text-sm px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All Groups</option>
                <option value="Assets-04">Assets-04 (सम्पत्ति)</option>
                <option value="Expenses-02">Expenses-02 (खर्च)</option>
                <option value="Liabilities 05">Liabilities 05 (दायित्व)</option>
                <option value="Income-03">Income-03 (आम्दानी)</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full text-xs sm:text-sm px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full text-xs sm:text-sm px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Reset */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition"
              >
                Reset Filters
              </button>
            </div>
          </form>
        </div>

        {/* LEDGER SUMMARY BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block">Total Debits in View</span>
            <span className="text-xl font-bold font-mono text-slate-900">
              {formatCurrencyNPR(totalDebit)}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block">Total Credits in View</span>
            <span className="text-xl font-bold font-mono text-slate-900">
              {formatCurrencyNPR(totalCredit)}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block">Net Running Balance</span>
            <span className="text-xl font-bold font-mono text-emerald-800">
              {formatCurrencyNPR(netBalance)}
            </span>
          </div>
        </div>

        {/* LEDGER ENTRIES TABLE */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          {loading && (
            <div className="p-12 text-center text-slate-500">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-emerald-600 border-r-transparent"></div>
              <p className="mt-2 text-xs">Loading ledger entries from Google Sheets...</p>
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
                    <th className="px-4 py-3 text-left">Date (AD)</th>
                    <th className="px-4 py-3 text-left">मिति (BS)</th>
                    <th className="px-4 py-3 text-left">Journal No</th>
                    <th className="px-4 py-3 text-left">Account (खाता)</th>
                    <th className="px-4 py-3 text-left">Description (विवरण)</th>
                    <th className="px-4 py-3 text-right">Debit (रु.)</th>
                    <th className="px-4 py-3 text-right">Credit (रु.)</th>
                    <th className="px-4 py-3 text-right">Running Balance (रु.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">
                        No ledger entries found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    entries.map((e) => (
                      <tr key={e.entryId} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {e.date}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                          {e.bsDate}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-emerald-800 whitespace-nowrap">
                          <Link href={`/accounting/journal-register`} className="hover:underline">
                            {e.journalNo}
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            [{e.accountCode}] {e.accountName}
                          </div>
                          <span className="text-2xs px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {e.accountGroup}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-sm truncate text-slate-700" title={e.description}>
                          {e.description}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                          {e.debit > 0 ? formatCurrencyNPR(e.debit) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                          {e.credit > 0 ? formatCurrencyNPR(e.credit) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                          {formatCurrencyNPR(e.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">
                      {formatCurrencyNPR(totalDebit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">
                      {formatCurrencyNPR(totalCredit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-800">
                      {formatCurrencyNPR(netBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
