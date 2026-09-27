import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layout } from '../../components/Layout';
import { JournalEntry, JournalLine } from '../../types/accounting';
import { DEFAULT_ACCOUNTS } from '../../lib/chartOfAccounts';
import { formatCurrencyNPR, formatAccountingDate } from '../../lib/nepaliDate';

export default function JournalRegisterPage() {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Reversal Modal State
  const [selectedJournalForReversal, setSelectedJournalForReversal] = useState<JournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('Incorrect entry / Entry cancellation');
  const [reversing, setReversing] = useState<boolean>(false);
  const [reversalSuccess, setReversalSuccess] = useState<string | null>(null);

  // Edit Transaction Modal State
  const [editingJournal, setEditingJournal] = useState<JournalEntry | null>(null);
  const [editNarration, setEditNarration] = useState<string>('');
  const [editBsDate, setEditBsDate] = useState<string>('');
  const [editTransactionDate, setEditTransactionDate] = useState<string>('');
  const [editReferenceNo, setEditReferenceNo] = useState<string>('');
  const [editLines, setEditLines] = useState<JournalLine[]>([]);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  const fetchJournals = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = '/api/accounting/journal?';
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (statusFilter !== 'ALL') url += `status=${encodeURIComponent(statusFilter)}&`;
      if (dateFrom) url += `dateFrom=${encodeURIComponent(dateFrom)}&`;
      if (dateTo) url += `dateTo=${encodeURIComponent(dateTo)}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load journal register');
      }
      setJournals(data.journals || []);
    } catch (err: any) {
      setError(err.message || 'Error loading journals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournals();
  }, [statusFilter, dateFrom, dateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJournals();
  };

  // Perform Reversal
  const handleConfirmReversal = async () => {
    if (!selectedJournalForReversal) return;

    try {
      setReversing(true);
      const res = await fetch(`/api/accounting/journal/${selectedJournalForReversal.journalId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reversalReason,
          user: 'Accountant',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reverse journal entry');
      }

      setReversalSuccess(
        `Successfully reversed! New Reversal Journal created: ${data.reversalJournal.journalNo}`
      );
      setSelectedJournalForReversal(null);
      fetchJournals();
    } catch (err: any) {
      alert(err.message || 'Reversal failed');
    } finally {
      setReversing(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (j: JournalEntry) => {
    setEditingJournal(j);
    setEditNarration(j.narration || '');
    setEditBsDate(j.bsDate || '');
    setEditTransactionDate(j.transactionDate || '');
    setEditReferenceNo(j.referenceNo || '');
    setEditLines(
      j.lines && j.lines.length > 0
        ? j.lines.map((l) => ({ ...l }))
        : [
            {
              accountCode: '80',
              accountName: 'Cash in Hand (नगद मौज्दात)',
              accountGroup: 'Assets-04',
              normalBalance: 'DEBIT',
              debit: j.totalDebit || 0,
              credit: 0,
              narration: j.narration,
            },
            {
              accountCode: '10',
              accountName: 'Share Capital (शेयर पूँजी)',
              accountGroup: 'Liabilities 05',
              normalBalance: 'CREDIT',
              debit: 0,
              credit: j.totalCredit || 0,
              narration: j.narration,
            },
          ]
    );
    setEditError(null);
  };

  // Line Handlers
  const handleLineChange = (index: number, field: string, val: any) => {
    const updated = [...editLines];
    if (field === 'accountCode') {
      const acct = DEFAULT_ACCOUNTS.find((a) => a.code === val);
      updated[index] = {
        ...updated[index],
        accountCode: val,
        accountName: acct ? acct.nameNp || acct.name : updated[index].accountName,
        accountGroup: acct ? acct.group : updated[index].accountGroup,
        normalBalance: acct ? acct.normalBalance : updated[index].normalBalance,
      };
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setEditLines(updated);
  };

  const handleAddLine = () => {
    setEditLines([
      ...editLines,
      {
        accountCode: '80',
        accountName: 'Cash in Hand (नगद मौज्दात)',
        accountGroup: 'Assets-04',
        normalBalance: 'DEBIT',
        debit: 0,
        credit: 0,
        narration: editNarration,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (editLines.length <= 2) {
      alert('दोहोरो लेखा प्रणालीमा कम्तीमा २ पङ्क्ति (Debit र Credit) अनिवार्य हुनुपर्छ।');
      return;
    }
    setEditLines(editLines.filter((_, i) => i !== idx));
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingJournal) return;
    try {
      setSavingEdit(true);
      setEditError(null);

      const totalDr = editLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
      const totalCr = editLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

      if (Math.abs(totalDr - totalCr) > 0.01) {
        throw new Error(
          `डेबिट र क्रेडिट रकम बराबर हुनुपर्छ। Total Debit: रु. ${totalDr.toFixed(2)} ≠ Total Credit: रु. ${totalCr.toFixed(2)} (अन्तर: रु. ${Math.abs(totalDr - totalCr).toFixed(2)})`
        );
      }

      const res = await fetch(`/api/accounting/journal/${editingJournal.journalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narration: editNarration,
          bsDate: editBsDate,
          transactionDate: editTransactionDate,
          referenceNo: editReferenceNo,
          lines: editLines.map((l) => ({
            ...l,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
          })),
          updatedBy: 'Accountant',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update transaction');
      }

      setEditSuccess(`भौचर नं. ${editingJournal.journalNo} सफलतापूर्वक सच्याइयो (Transaction corrected & updated!)`);
      setEditingJournal(null);
      fetchJournals();
    } catch (err: any) {
      setEditError(err.message || 'Error updating transaction');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <Layout title="Journal Register (गोश्वारा भौचर दर्ता)">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              गोश्वारा भौचर दर्ता (Journal Register)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete historical ledger of double-entry vouchers recorded in Google Sheets.
            </p>
          </div>
          <Link
            href="/accounting/journal-entry"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs transition"
          >
            + New Journal Entry
          </Link>
        </div>

        {reversalSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-semibold flex justify-between items-center">
            <span>✓ {reversalSuccess}</span>
            <button onClick={() => setReversalSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
              ✕
            </button>
          </div>
        )}

        {editSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-semibold flex justify-between items-center">
            <span>✓ {editSuccess}</span>
            <button onClick={() => setEditSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
              ✕
            </button>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Search Journals</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Journal No, Narration, Ref No..."
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="POSTED">Posted (सक्रिय)</option>
                <option value="REVERSED">Reversed (उल्टाइएको)</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </form>
        </div>

        {/* JOURNAL LIST TABLE */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          {loading && (
            <div className="p-12 text-center text-slate-500">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-emerald-600 border-r-transparent"></div>
              <p className="mt-2 text-xs">Loading journal records...</p>
            </div>
          )}

          {!loading && error && (
            <div className="p-6 text-center text-rose-600 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Journal No</th>
                    <th className="px-4 py-3 text-left">Date (AD)</th>
                    <th className="px-4 py-3 text-left">मिति (BS)</th>
                    <th className="px-4 py-3 text-left">Narration (व्यहोरा)</th>
                    <th className="px-4 py-3 text-right">Debit (रु.)</th>
                    <th className="px-4 py-3 text-right">Credit (रु.)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {journals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">
                        No journal records match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    journals.map((j) => (
                      <tr key={j.journalId} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-semibold font-mono text-emerald-800">
                          <Link href={`/accounting/journal/${j.journalId}`} className="hover:underline">
                            {j.journalNo}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {formatAccountingDate(j.transactionDate)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                          {formatAccountingDate(j.bsDate)}
                        </td>
                        <td className="px-4 py-3 max-w-md truncate" title={j.narration}>
                          {j.narration}
                          {j.reversalJournalId && (
                            <span className="block text-xs text-amber-600">
                              Reversed by: {j.reversalJournalId}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium font-mono text-slate-900">
                          {formatCurrencyNPR(j.totalDebit)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium font-mono text-slate-900">
                          {formatCurrencyNPR(j.totalCredit)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              j.status === 'POSTED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : j.status === 'REVERSED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center space-x-1.5 whitespace-nowrap">
                          <Link
                            href={`/accounting/journal/${j.journalId}`}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-1.5 py-0.5"
                          >
                            View
                          </Link>
                          {j.status === 'POSTED' && (
                            <button
                              onClick={() => handleOpenEdit(j)}
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 transition"
                              title="Edit transaction / कारोबार सच्याउनुहोस्"
                            >
                              ✏️ Edit
                            </button>
                          )}
                          <Link
                            href={`/accounting/journal/${j.journalId}?print=true`}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-1.5 py-0.5"
                          >
                            Print
                          </Link>
                          {j.status === 'POSTED' && (
                            <button
                              onClick={() => setSelectedJournalForReversal(j)}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-1.5 py-0.5"
                            >
                              Reverse
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* EDIT TRANSACTION MODAL (सच्याउने सुविधा / EDIT MISTAKE) */}
        {/* ========================================================= */}
        {editingJournal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-5 my-8 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-bold text-xs rounded">
                      {editingJournal.journalNo}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      कारोबार सच्याउनुहोस् (Edit Transaction / Fix Mistake)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    भौचरको विवरण, मिति, खाता वा रकममा भएको गल्ती सच्याएर सिधा गुगल सिटमा सुरक्षित गर्नुहोस्।
                  </p>
                </div>
                <button
                  onClick={() => setEditingJournal(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg p-1"
                >
                  ✕
                </button>
              </div>

              {editError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
                  ⚠️ {editError}
                </div>
              )}

              {/* General Voucher Info Form */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    मिति (BS Date)
                  </label>
                  <input
                    type="text"
                    value={editBsDate}
                    onChange={(e) => setEditBsDate(e.target.value)}
                    placeholder="2083-06-10"
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    अंग्रेजी मिति (AD Date)
                  </label>
                  <input
                    type="date"
                    value={editTransactionDate}
                    onChange={(e) => setEditTransactionDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    सन्दर्भ नं. (Reference No)
                  </label>
                  <input
                    type="text"
                    value={editReferenceNo}
                    onChange={(e) => setEditReferenceNo(e.target.value)}
                    placeholder="M-001, बिल नं, आदि"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    मुख्य व्यहोरा (Main Narration)
                  </label>
                  <input
                    type="text"
                    value={editNarration}
                    onChange={(e) => setEditNarration(e.target.value)}
                    placeholder="कारोबारको पूर्ण विवरण..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white font-medium"
                  />
                </div>
              </div>

              {/* Journal Line Items Editor */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    लेखा पङ्क्तिहरू (Double Entry Voucher Lines)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition flex items-center space-x-1"
                  >
                    <span>+</span>
                    <span>पङ्क्ति थप्नुहोस् (Add Line)</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-48">खाता (Account)</th>
                        <th className="py-2 px-3">पङ्क्ति विवरण (Line Narration)</th>
                        <th className="py-2 px-3 w-28 text-right">डेबिट (Dr. रु.)</th>
                        <th className="py-2 px-3 w-28 text-right">क्रेडिट (Cr. रु.)</th>
                        <th className="py-2 px-2 w-10 text-center">हटाउनु</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editLines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="p-2">
                            <select
                              value={line.accountCode}
                              onChange={(e) => handleLineChange(idx, 'accountCode', e.target.value)}
                              className="w-full text-2xs p-1.5 border border-slate-300 rounded bg-white font-medium"
                            >
                              {DEFAULT_ACCOUNTS.map((a) => (
                                <option key={a.code} value={a.code}>
                                  {a.code} - {a.nameNp} ({a.group})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={line.narration || ''}
                              onChange={(e) => handleLineChange(idx, 'narration', e.target.value)}
                              placeholder="पङ्क्ति व्यहोरा..."
                              className="w-full text-2xs p-1.5 border border-slate-300 rounded bg-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.debit || ''}
                              onChange={(e) => handleLineChange(idx, 'debit', Number(e.target.value) || 0)}
                              className="w-full text-2xs p-1.5 border border-slate-300 rounded font-mono text-right bg-white"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.credit || ''}
                              onChange={(e) => handleLineChange(idx, 'credit', Number(e.target.value) || 0)}
                              className="w-full text-2xs p-1.5 border border-slate-300 rounded font-mono text-right bg-white"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="text-slate-400 hover:text-rose-600 font-bold text-sm"
                              title="हटाउनुहोस्"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals & Difference Row */}
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                      {(() => {
                        const totalDr = editLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
                        const totalCr = editLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
                        const diff = Math.abs(Math.round((totalDr - totalCr) * 100) / 100);
                        const isBalanced = diff < 0.01 && totalDr > 0;

                        return (
                          <>
                            <tr>
                              <td colSpan={2} className="py-2.5 px-3 text-right text-slate-700">
                                कुल जम्मा (Total):
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-800 text-xs">
                                रु. {totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-800 text-xs">
                                रु. {totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td></td>
                            </tr>
                            <tr>
                              <td colSpan={5} className="py-2 px-3 bg-slate-100/80">
                                <div className="flex justify-between items-center text-xs">
                                  <span>
                                    {isBalanced ? (
                                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                                        ✓ सन्तुलित छ (Debit = Credit: 100% Balanced)
                                      </span>
                                    ) : (
                                      <span className="text-rose-600 font-bold flex items-center gap-1">
                                        ⚠️ असन्तुलित (Difference): रु. {diff.toFixed(2)}
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-2xs text-slate-500">
                                    दोहोरो लेखा नियम: डेबिट र क्रेडिट सधैँ बराबर हुनुपर्छ।
                                  </span>
                                </div>
                              </td>
                            </tr>
                          </>
                        );
                      })()}
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingJournal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg transition"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={handleSaveEdit}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
                >
                  {savingEdit ? (
                    <>
                      <span className="animate-spin">🔄</span>
                      <span>सुरक्षित गरिँदैछ...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>सच्याएर सुरक्षित गर्नुहोस् (Save Corrections)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REVERSAL CONFIRMATION MODAL */}
        {selectedJournalForReversal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Reverse Journal Entry ({selectedJournalForReversal.journalNo})
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Accounting Rule: Existing records are never deleted. A reversal journal entry with inverted debits and credits will be generated and auto-posted.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedJournalForReversal(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Reversal Reason (उल्ट्याउनुको कारण)
                </label>
                <textarea
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-rose-500 focus:border-rose-500"
                  placeholder="Reason for reversing this journal voucher..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedJournalForReversal(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reversing}
                  onClick={handleConfirmReversal}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm font-bold shadow-xs transition"
                >
                  {reversing ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
