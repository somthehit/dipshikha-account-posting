import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '../../components/Layout';
import { AccountMaster, JournalLine, TransactionType } from '../../types/accounting';
import { convertADtoBS, getCurrentBSDate, formatCurrencyNPR } from '../../lib/nepaliDate';

export default function JournalEntryPage() {
  const router = useRouter();

  // Header State
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [bsDate, setBsDate] = useState<string>(getCurrentBSDate());
  const [journalNo, setJournalNo] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [transactionType, setTransactionType] = useState<TransactionType>('Journal');
  const [branch, setBranch] = useState<string>('चौमाला मुख्य शाखा (Main Branch)');
  const [narration, setNarration] = useState<string>('');
  const [createdBy, setCreatedBy] = useState<string>('लेखा अधिकृत (Accountant)');

  // Accounts master list
  const [accounts, setAccounts] = useState<AccountMaster[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true);

  // Journal Lines
  const [lines, setLines] = useState<JournalLine[]>([
    {
      id: 'L1',
      accountCode: '',
      accountName: '',
      accountGroup: 'Expenses-02',
      normalBalance: 'DEBIT',
      debit: 0,
      credit: 0,
      narration: '',
    },
    {
      id: 'L2',
      accountCode: '',
      accountName: '',
      accountGroup: 'Assets-04',
      normalBalance: 'DEBIT',
      debit: 0,
      credit: 0,
      narration: '',
    },
  ]);

  // Posting & Status State
  const [posting, setPosting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [bankBalance, setBankBalance] = useState<number>(0);

  // Load Accounts from API
  useEffect(() => {
    async function loadAccounts() {
      try {
        setLoadingAccounts(true);
        const res = await fetch('/api/accounting/accounts');
        const data = await res.json();
        if (data.accounts) {
          setAccounts(data.accounts);
        }
        if (data.cashBalance !== undefined) setCashBalance(data.cashBalance);
        if (data.bankBalance !== undefined) setBankBalance(data.bankBalance);
      } catch (err) {
        console.error('Failed to fetch accounts:', err);
      } finally {
        setLoadingAccounts(false);
      }
    }
    loadAccounts();

    // Generate next Journal No
    const currBS = getCurrentBSDate();
    const year = currBS.split('-')[0] || '2083';
    const randSeq = Math.floor(1 + Math.random() * 900);
    setJournalNo(`JE-${year}-${randSeq.toString().padStart(6, '0')}`);

    // Check for saved draft in localStorage
    try {
      const savedDraft = localStorage.getItem('accounting_journal_draft');
      if (savedDraft) {
        setDraftNotice('A saved draft is available. Click to restore.');
      }
    } catch {}
  }, []);

  // Update BS Date when AD Date changes
  const handleDateChange = (adVal: string) => {
    setTransactionDate(adVal);
    const converted = convertADtoBS(adVal);
    if (converted) setBsDate(converted);
  };

  // Add a line
  const handleAddLine = () => {
    const nextId = `L${lines.length + 1}`;
    setLines([
      ...lines,
      {
        id: nextId,
        accountCode: '',
        accountName: '',
        accountGroup: 'Assets-04',
        normalBalance: 'DEBIT',
        debit: 0,
        credit: 0,
        narration: '',
      },
    ]);
  };

  // Remove a line
  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) {
      alert('A journal entry must contain at least 2 lines for double-entry bookkeeping.');
      return;
    }
    setLines(lines.filter((_, idx) => idx !== index));
  };

  // When account is selected in a line
  const handleAccountSelect = (index: number, code: string) => {
    const acct = accounts.find((a) => a.code === code);
    if (!acct) return;

    const newLines = [...lines];
    newLines[index] = {
      ...newLines[index],
      accountCode: acct.code,
      accountName: acct.name,
      accountGroup: acct.group,
      normalBalance: acct.normalBalance,
    };
    setLines(newLines);
  };

  // Change amount
  const handleAmountChange = (index: number, field: 'debit' | 'credit', val: string) => {
    const num = parseFloat(val) || 0;
    const newLines = [...lines];
    newLines[index][field] = num;
    // Mutually exclusive: if debit entered, credit should be 0, and vice versa
    if (field === 'debit' && num > 0) {
      newLines[index].credit = 0;
    } else if (field === 'credit' && num > 0) {
      newLines[index].debit = 0;
    }
    setLines(newLines);
  };

  // Calculation: Total Debit, Total Credit, Difference
  const totalDebit = Math.round(lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0) * 100) / 100;
  const totalCredit = Math.round(lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0) * 100) / 100;
  const difference = Math.abs(Math.round((totalDebit - totalCredit) * 100) / 100);
  const isBalanced = difference === 0 && totalDebit > 0;

  // Save Draft
  const handleSaveDraft = () => {
    const draftPayload = {
      transactionDate,
      bsDate,
      journalNo,
      referenceNo,
      transactionType,
      branch,
      narration,
      lines,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('accounting_journal_draft', JSON.stringify(draftPayload));
    alert('Journal entry saved to local draft!');
    setDraftNotice(null);
  };

  // Restore Draft
  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem('accounting_journal_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.transactionDate) setTransactionDate(parsed.transactionDate);
        if (parsed.bsDate) setBsDate(parsed.bsDate);
        if (parsed.journalNo) setJournalNo(parsed.journalNo);
        if (parsed.referenceNo) setReferenceNo(parsed.referenceNo);
        if (parsed.transactionType) setTransactionType(parsed.transactionType);
        if (parsed.branch) setBranch(parsed.branch);
        if (parsed.narration) setNarration(parsed.narration);
        if (parsed.lines) setLines(parsed.lines);
        setDraftNotice(null);
      }
    } catch {}
  };

  // Clear Form
  const handleClear = () => {
    if (confirm('Are you sure you want to clear all fields in this journal entry?')) {
      const currBS = getCurrentBSDate();
      const year = currBS.split('-')[0] || '2083';
      const randSeq = Math.floor(1 + Math.random() * 900);
      setJournalNo(`JE-${year}-${randSeq.toString().padStart(6, '0')}`);
      setReferenceNo('');
      setNarration('');
      setLines([
        {
          id: 'L1',
          accountCode: '',
          accountName: '',
          accountGroup: 'Expenses-02',
          normalBalance: 'DEBIT',
          debit: 0,
          credit: 0,
          narration: '',
        },
        {
          id: 'L2',
          accountCode: '',
          accountName: '',
          accountGroup: 'Assets-04',
          normalBalance: 'DEBIT',
          debit: 0,
          credit: 0,
          narration: '',
        },
      ]);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  // Submit / Post Journal
  const handlePostJournal = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Frontend validation
    if (!isBalanced) {
      setErrorMessage(`Journal Entry is not balanced. Total Debit (Rs. ${totalDebit.toFixed(2)}) must equal Total Credit (Rs. ${totalCredit.toFixed(2)}). Difference: Rs. ${difference.toFixed(2)}`);
      return;
    }

    if (!narration || narration.trim().length === 0) {
      setErrorMessage('Please provide a narration/description for this journal entry.');
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].accountCode) {
        setErrorMessage(`Please select an account for line ${i + 1}.`);
        return;
      }
      if (lines[i].debit === 0 && lines[i].credit === 0) {
        setErrorMessage(`Line ${i + 1} has zero debit and zero credit.`);
        return;
      }
    }

    // Cash & Bank Negative Balance Prevention
    if (transactionType !== 'Opening') {
      const netCashChange = lines
        .filter((l) => l.accountCode === '80')
        .reduce((sum, l) => sum + (Number(l.debit) || 0) - (Number(l.credit) || 0), 0);

      const netBankChange = lines
        .filter((l) => l.accountCode === '90')
        .reduce((sum, l) => sum + (Number(l.debit) || 0) - (Number(l.credit) || 0), 0);

      if (netCashChange < 0 && (cashBalance + netCashChange) < -0.009) {
        setErrorMessage(
          `अपर्याप्त नगद मौज्दात (Insufficient Cash in Hand)! हालको नगद मौज्दात रु. ${cashBalance.toLocaleString()} मात्र छ। यो भौचरले रु. ${Math.abs(netCashChange).toLocaleString()} खर्च/भुक्तानी गर्न खोजेकोले नगद ऋणात्मक (रु. ${(cashBalance + netCashChange).toLocaleString()}) हुन जान्छ। नगद खाता (८०) ऋणात्मक बनाउन पाइँदैन।`
        );
        return;
      }

      if (netBankChange < 0 && (bankBalance + netBankChange) < -0.009) {
        setErrorMessage(
          `अपर्याप्त बैंक मौज्दात (Insufficient Bank Balance)! हालको बैंक मौज्दात रु. ${bankBalance.toLocaleString()} मात्र छ। यो भौचरले रु. ${Math.abs(netBankChange).toLocaleString()} खर्च/भुक्तानी गर्न खोजेकोले बैंक मौज्दात ऋणात्मक (रु. ${(bankBalance + netBankChange).toLocaleString()}) हुन जान्छ। बैंक खाता (९०) ऋणात्मक (Overdraft) बनाउन पाइँदैन।`
        );
        return;
      }
    }

    // Prepare immutable journal ID for idempotency
    const journalId = `JE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payload = {
      journalId,
      journalNo,
      transactionDate,
      bsDate,
      referenceNo,
      transactionType,
      branch,
      narration,
      createdBy,
      lines,
    };

    try {
      setPosting(true);
      const res = await fetch('/api/accounting/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Journal posting failed. Please verify the accounting records.');
      }

      setSuccessMessage(`Journal ${journalNo} successfully posted! Auto-posted to 4-Khata sheets.`);
      localStorage.removeItem('accounting_journal_draft');

      setTimeout(() => {
        router.push(`/accounting/journal/${journalId}`);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Journal posting failed. Please verify the accounting records.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Layout title="New Journal Entry">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Title & Organization header */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded uppercase">
                  गोश्वारा भौचर (Journal Voucher)
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">Double Entry 4-Khata System</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">
                New Journal Entry (नयाँ गोश्वारा भौचर प्रविष्टि)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Entries auto-post directly to Assets-04, Expenses-02, Liabilities 05, and Income-03 in Google Sheets.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
              >
                💾 Save Draft
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition"
              >
                Clear
              </button>
            </div>
          </div>

          {draftNotice && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-800">
              <span>{draftNotice}</span>
              <button
                onClick={handleRestoreDraft}
                className="font-bold underline text-amber-900 hover:text-amber-950 ml-2"
              >
                Restore Draft
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800 flex items-center space-x-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center space-x-2">
              <span>✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* VOUCHER HEADER FIELDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
            {/* Transaction Date (AD) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Transaction Date (AD)
              </label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              />
            </div>

            {/* BS Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                मिति / BS Date (वि.सं.)
              </label>
              <input
                type="text"
                value={bsDate}
                onChange={(e) => setBsDate(e.target.value)}
                placeholder="2083-06-10"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50"
              />
            </div>

            {/* Journal Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Journal No (भौचर नं=)
              </label>
              <input
                type="text"
                value={journalNo}
                onChange={(e) => setJournalNo(e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold font-mono border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 text-emerald-800"
              />
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Reference / Bill No
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Bill #, Cheque #, etc."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              />
            </div>

            {/* Transaction Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Transaction Type
              </label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="Journal">General Journal (गोश्वारा)</option>
                <option value="Cash">Cash Voucher (नगद भौचर)</option>
                <option value="Bank">Bank Voucher (बैंक भौचर)</option>
                <option value="Transfer">Transfer Voucher (सरुवा भौचर)</option>
                <option value="Adjusting">Adjusting Entry (समायोजन)</option>
              </select>
            </div>

            {/* Branch */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Branch (शाखा)</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              />
            </div>

            {/* Prepared By */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Prepared By</label>
              <input
                type="text"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              />
            </div>

            {/* Narration */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Narration / भौचरको विवरण <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="कारोबारको स्पष्ट व्यहोरा (e.g. Office rent payment for the month of Ashwin)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* LIVE CASH & BANK BALANCE GUARD BAR */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-bold">🛡️</span>
              <div>
                <span className="font-bold text-xs sm:text-sm text-slate-900 block">मौज्दात सुरक्षा गार्ड (Cash & Bank Balance Guard)</span>
                <span className="text-2xs text-slate-500 block">नगद तथा बैंक मौज्दात ऋणात्मक (Negative) हुने कारोबार प्रणालीले स्वतः रोक्दछ।</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className={`px-3 py-1.5 rounded-lg border text-xs flex items-center space-x-2 ${
                cashBalance >= 0 ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}>
                <span className="text-emerald-700 font-semibold">💵 नगद मौज्दात (८०):</span>
                <span className="font-mono font-bold text-sm">रु. {cashBalance.toLocaleString()}</span>
              </div>

              <div className={`px-3 py-1.5 rounded-lg border text-xs flex items-center space-x-2 ${
                bankBalance >= 0 ? 'bg-sky-50/70 border-sky-300 text-sky-900' : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <span className="text-sky-700 font-semibold">🏦 बैंक मौज्दात (९०):</span>
                <span className="font-mono font-bold text-sm">रु. {bankBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* JOURNAL LINES TABLE */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Journal Lines (खाता प्रविष्टि विवरण)
              </h2>
              <p className="text-xs text-slate-500">
                Account Group and Normal Balance are automatically determined from the existing Google Sheet Chart of Accounts.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddLine}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition"
            >
              + Add Line
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3 text-left w-12">#</th>
                  <th className="px-3 py-3 text-left w-64">Account (खाता)</th>
                  <th className="px-3 py-3 text-left w-36">Account Group</th>
                  <th className="px-3 py-3 text-center w-28">Normal Balance</th>
                  <th className="px-3 py-3 text-right w-40">Debit (डेबिट रु.)</th>
                  <th className="px-3 py-3 text-right w-40">Credit (क्रेडिट रु.)</th>
                  <th className="px-3 py-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm">
                {lines.map((line, index) => {
                  const groupColor =
                    line.accountGroup === 'Assets-04'
                      ? 'text-sky-700 bg-sky-50 border-sky-200'
                      : line.accountGroup === 'Expenses-02'
                      ? 'text-rose-700 bg-rose-50 border-rose-200'
                      : line.accountGroup === 'Liabilities 05'
                      ? 'text-amber-700 bg-amber-50 border-amber-200'
                      : 'text-emerald-700 bg-emerald-50 border-emerald-200';

                  return (
                    <tr key={index} className="hover:bg-slate-50/70 transition">
                      <td className="px-3 py-2.5 text-xs font-mono text-slate-400">{index + 1}</td>

                      {/* Account Selector */}
                      <td className="px-3 py-2.5">
                        <select
                          value={line.accountCode}
                          onChange={(e) => handleAccountSelect(index, e.target.value)}
                          className="w-full text-xs sm:text-sm px-2.5 py-1.5 border border-slate-300 rounded focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                        >
                          <option value="">-- Select Account --</option>
                          {accounts.map((a) => (
                            <option key={a.code} value={a.code}>
                              [{a.code}] {a.name} ({a.group})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Auto-populated Account Group */}
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${groupColor}`}
                        >
                          {line.accountGroup || '---'}
                        </span>
                      </td>

                      {/* Auto-populated Normal Balance */}
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            line.normalBalance === 'DEBIT'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {line.normalBalance}
                        </span>
                      </td>

                      {/* Debit Input */}
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit || ''}
                          onChange={(e) => handleAmountChange(index, 'debit', e.target.value)}
                          placeholder="0.00"
                          className="w-full text-right text-sm px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </td>

                      {/* Credit Input */}
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit || ''}
                          onChange={(e) => handleAmountChange(index, 'credit', e.target.value)}
                          placeholder="0.00"
                          className="w-full text-right text-sm px-2.5 py-1.5 border border-slate-300 rounded font-mono focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </td>

                      {/* Remove Line */}
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(index)}
                          className="text-slate-400 hover:text-rose-600 transition"
                          title="Remove line"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* TOTALS & BALANCING FOOTER */}
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 text-sm font-bold text-slate-800">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right">
                    कुल जम्मा (Total):
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-base text-slate-900">
                    {formatCurrencyNPR(totalDebit)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-base text-slate-900">
                    {formatCurrencyNPR(totalCredit)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* LIVE BALANCING BAR */}
          <div
            className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isBalanced
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center space-x-2 text-sm font-semibold">
              <span className="text-base">{isBalanced ? '✓' : '⚠️'}</span>
              <span>
                {isBalanced
                  ? 'Journal Entry is balanced (डेबिट र क्रेडिट रकम बराबर छ).'
                  : `Journal Entry is not balanced. Difference: Rs. ${difference.toFixed(2)}`}
              </span>
            </div>

            <div className="text-xs space-x-4">
              <span>Debit: <strong>Rs. {totalDebit.toFixed(2)}</strong></span>
              <span>Credit: <strong>Rs. {totalCredit.toFixed(2)}</strong></span>
              <span className={difference > 0 ? 'text-rose-700 font-bold' : ''}>
                Difference: <strong>Rs. {difference.toFixed(2)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* AUTO-POSTING DESTINATIONS PREVIEW */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-2">
            Auto-Posting Impact Preview (चार खाता गन्तव्य)
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Each line will be posted to the primary Google Sheets datastore automatically upon submission:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {['Assets-04', 'Expenses-02', 'Liabilities 05', 'Income-03'].map((grp) => {
              const matchingLines = lines.filter((l) => l.accountGroup === grp && l.accountCode);
              return (
                <div
                  key={grp}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs"
                >
                  <div className="font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>{grp}</span>
                    <span className="px-1.5 py-0.2 bg-white rounded border border-slate-200 font-mono">
                      {matchingLines.length} line(s)
                    </span>
                  </div>
                  {matchingLines.length === 0 ? (
                    <span className="text-slate-400 italic">No lines posting here</span>
                  ) : (
                    <ul className="space-y-1 mt-1 text-slate-700">
                      {matchingLines.map((ml, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span className="truncate pr-1">[{ml.accountCode}] {ml.accountName.split(' ')[0]}</span>
                          <span className="font-mono font-semibold">
                            {ml.debit > 0 ? `+Dr ${ml.debit}` : `+Cr ${ml.credit}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={handleAddLine}
            className="px-4 py-2 border border-slate-300 text-slate-700 font-medium text-sm rounded-md hover:bg-slate-50 transition"
          >
            + Add Line
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 border border-transparent text-slate-600 font-medium text-sm hover:text-slate-900 transition"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={!isBalanced || posting}
              onClick={handlePostJournal}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition flex items-center space-x-2 ${
                isBalanced && !posting
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {posting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"></div>
                  <span>Posting to Google Sheets...</span>
                </>
              ) : (
                <span>Post Journal (भौचर सुरक्षित गर्नुहोस्)</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
