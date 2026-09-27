import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Layout } from '../../../components/Layout';
import { getCurrentBSDate } from '../../../lib/nepaliDate';
import {
  BankReconciliationItem,
  BankReconciliationStatement,
} from '../../../types/reconciliation';

export default function BankReconciliationPage() {
  const currentBS = getCurrentBSDate();

  const [bankAccountCode, setBankAccountCode] = useState('90');
  const [asOfBSDate, setAsOfBSDate] = useState(currentBS);
  const [bankStatementBalance, setBankStatementBalance] = useState<number>(0);
  const [bookBalance, setBookBalance] = useState<number>(0);
  const [items, setItems] = useState<BankReconciliationItem[]>([]);

  const [directCredits, setDirectCredits] = useState<number>(0); // e.g. bank interest
  const [directDebits, setDirectDebits] = useState<number>(0);   // e.g. bank service charges

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Adjustment voucher modal state
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjType, setAdjType] = useState<'INTEREST_RECEIVED' | 'BANK_CHARGES' | 'DISCREPANCY_ADJUSTMENT'>('BANK_CHARGES');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjOffsetAccount, setAdjOffsetAccount] = useState<string>('150.8');
  const [adjNarration, setAdjNarration] = useState<string>('');
  const [adjPosting, setAdjPosting] = useState(false);

  // History tab
  const [activeTab, setActiveTab] = useState<'reconcile' | 'history'>('reconcile');
  const [history, setHistory] = useState<BankReconciliationStatement[]>([]);

  // Load Bank Transactions
  const fetchBankData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/accounting/reconciliation?accountCode=${bankAccountCode}&asOfBSDate=${asOfBSDate}`
      );
      const data = await res.json();
      if (data.success) {
        setBookBalance(data.data.bookBalance);
        setItems(data.data.items);
        if (bankStatementBalance === 0) {
          setBankStatementBalance(data.data.bookBalance); // Initialize to book balance for convenience
        }
      } else {
        setErrorMessage(data.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'बैंक विवरण लोड गर्न समस्या भयो।');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/accounting/reconciliation?history=true');
      const data = await res.json();
      if (data.success) {
        setHistory(data.history || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchBankData();
  }, [bankAccountCode, asOfBSDate]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const toggleItemCleared = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isCleared: !item.isCleared,
              clearedDate: !item.isCleared ? asOfBSDate : '',
            }
          : item
      )
    );
  };

  const markAllCleared = (status: boolean) => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        isCleared: status,
        clearedDate: status ? asOfBSDate : '',
      }))
    );
  };

  // Calculations
  const unclearedDeposits = items
    .filter((i) => !i.isCleared && i.type === 'DEPOSIT')
    .reduce((sum, i) => sum + i.amount, 0);

  const unpresentedCheques = items
    .filter((i) => !i.isCleared && i.type === 'WITHDRAWAL')
    .reduce((sum, i) => sum + i.amount, 0);

  const adjustedBankBalance =
    Number(bankStatementBalance || 0) + unclearedDeposits - unpresentedCheques;

  const adjustedBookBalance =
    Number(bookBalance || 0) + Number(directCredits || 0) - Number(directDebits || 0);

  const difference = Math.abs(Math.round((adjustedBankBalance - adjustedBookBalance) * 100) / 100);
  const isReconciled = difference < 0.05;

  // Format currency
  const formatNpr = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return '०.००';
    return val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Save Reconciliation Statement
  const handleSaveReconciliation = async () => {
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/accounting/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountCode: bankAccountCode,
          accountName: 'बैंक मौज्दात ९०',
          asOfDateAD: new Date().toISOString().split('T')[0],
          asOfDateBS: asOfBSDate,
          bankStatementBalance: Number(bankStatementBalance),
          bookBalance: Number(bookBalance),
          items,
          unrecordedBankCredits: Number(directCredits),
          unrecordedBankDebits: Number(directDebits),
          user: 'Accountant',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage('बैंक हिसाब मिलान स्टेटमेन्ट सफलतापूर्वक सुरक्षित गरियो!');
        fetchHistory();
      } else {
        setErrorMessage(data.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'सुरक्षित गर्न असफल भयो।');
    } finally {
      setSaving(false);
    }
  };

  // Open adjustment modal prefilled
  const openAdjustmentModal = (type: 'INTEREST_RECEIVED' | 'BANK_CHARGES' | 'DISCREPANCY_ADJUSTMENT') => {
    setAdjType(type);
    if (type === 'INTEREST_RECEIVED') {
      setAdjOffsetAccount('160.3'); // Interest on investments/bank
      setAdjAmount(directCredits > 0 ? directCredits : difference);
      setAdjNarration('बैंक खातामा ब्याज प्राप्त हिसाब मिलान समायोजन');
    } else if (type === 'BANK_CHARGES') {
      setAdjOffsetAccount('150.8'); // Misc expense / bank charges
      setAdjAmount(directDebits > 0 ? directDebits : difference);
      setAdjNarration('बैंक सेवा शुल्क तथा कमिसन कट्टी हिसाब मिलान');
    } else {
      setAdjOffsetAccount('9999'); // Suspense / hisab milan
      setAdjAmount(difference);
      setAdjNarration('बैंक मौज्दात हिसाब मिलान तथा सस्पेन्स समायोजन');
    }
    setShowAdjModal(true);
  };

  // Post adjustment journal voucher
  const handlePostAdjustmentVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjAmount || adjAmount <= 0) {
      alert('रकम ० भन्दा बढी हुनुपर्दछ।');
      return;
    }

    setAdjPosting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/accounting/reconciliation/post-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountCode,
          adjustmentType: adjType,
          amount: Number(adjAmount),
          offsetAccountCode: adjOffsetAccount,
          narration: adjNarration,
          bsDate: asOfBSDate,
          user: 'Accountant',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(
          `बैंक हिसाब मिलान समायोजन भौचर नं. ${data.journalNo} सफलतापूर्वक जारी गरियो!`
        );
        setShowAdjModal(false);
        // Refresh bank ledger
        await fetchBankData();
      } else {
        setErrorMessage(data.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'भौचर जारी गर्न असफल भयो।');
    } finally {
      setAdjPosting(false);
    }
  };

  return (
    <Layout title="बैंक हिसाब मिलान (Bank Reconciliation)">
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
              <span>🏦</span>
              <span>बैंक हिसाब मिलान प्रणाली (Bank Reconciliation)</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              बैंक विवरण (Bank Statement) र संस्थाको खाता बही (Ledger) बीचको कारोबार मिलान तथा समायोजन भौचर
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('reconcile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'reconcile'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              हिसाब मिलान फारम
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'history'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              मिलान इतिहास ({history.length})
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <span>✓ {successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">✕</button>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-900">✕</button>
          </div>
        )}

        {/* MAIN RECONCILIATION TAB */}
        {activeTab === 'reconcile' && (
          <div className="space-y-6">
            {/* Top Config & Input Controls */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  बैंक खाता छनौट गर्नुहोस्:
                </label>
                <select
                  value={bankAccountCode}
                  onChange={(e) => setBankAccountCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="90">९० - बैंक मौज्दात (मुख्य बैंक खाता)</option>
                  <option value="90.1">९०.१ - राष्ट्रिय वाणिज्य बैंक लि.</option>
                  <option value="90.2">९०.२ - कृषि विकास बैंक लि.</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  मिलान मिति (As-of BS Date):
                </label>
                <input
                  type="text"
                  value={asOfBSDate}
                  onChange={(e) => setAsOfBSDate(e.target.value)}
                  placeholder="2081-12-30"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  लेजर बही मौज्दात (Book Balance):
                </label>
                <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800">
                  रु. {formatNpr(bookBalance)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-800 mb-1">
                  बैंक स्टेटमेन्ट अन्तिम मौज्दात:
                </label>
                <input
                  type="number"
                  step="any"
                  value={bankStatementBalance}
                  onChange={(e) => setBankStatementBalance(Number(e.target.value))}
                  className="w-full px-3 py-2 border-2 border-emerald-400 rounded-lg text-xs font-mono font-bold text-emerald-900 bg-emerald-50/30 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Reconciliation Statement Summary Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-xl shadow-md p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-700 pb-4 mb-4">
                <div>
                  <h2 className="text-base font-bold flex items-center space-x-2">
                    <span>📋</span>
                    <span>बैंक हिसाब मिलान विवरण (Bank Reconciliation Statement)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    खाता: {bankAccountCode} • मिति: {asOfBSDate} B.S.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1.5 ${
                      isReconciled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    }`}
                  >
                    <span>{isReconciled ? '✓ हिसाब पूर्ण रूपमा मिलेको (Reconciled)' : '⚠️ अन्तर फेला परेको (Discrepancy)'}</span>
                  </span>
                  <button
                    onClick={handleSaveReconciliation}
                    disabled={saving}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-semibold text-white shadow-xs transition"
                  >
                    {saving ? 'सुरक्षित गर्दै...' : '💾 स्टेटमेन्ट सेभ गर्नुहोस्'}
                  </button>
                </div>
              </div>

              {/* Formula & Calculation Breakdown Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                {/* Bank Statement Side */}
                <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/80 space-y-2.5">
                  <div className="font-bold text-slate-300 uppercase tracking-wider border-b border-slate-700 pb-1">
                    (क) बैंक स्टेटमेन्ट अनुसार मिलान
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>बैंक स्टेटमेन्ट अनुसार मौज्दात:</span>
                    <span className="font-mono font-semibold">रु. {formatNpr(bankStatementBalance)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>(+) दाखिला हुन बाँकी चेकहरू (Uncleared Deposits):</span>
                    <span className="font-mono font-semibold">+ रु. {formatNpr(unclearedDeposits)}</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>(-) भुक्तानी हुन बाँकी चेकहरू (Unpresented Cheques):</span>
                    <span className="font-mono font-semibold">- रु. {formatNpr(unpresentedCheques)}</span>
                  </div>
                  <div className="border-t border-slate-700 pt-2 flex justify-between font-bold text-white text-sm">
                    <span>समायोजित बैंक मौज्दात (Adjusted Bank):</span>
                    <span className="font-mono text-emerald-400">रु. {formatNpr(adjustedBankBalance)}</span>
                  </div>
                </div>

                {/* Ledger Book Side */}
                <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/80 space-y-2.5">
                  <div className="font-bold text-slate-300 uppercase tracking-wider border-b border-slate-700 pb-1">
                    (ख) संस्थाको खाता बही (Book) अनुसार मिलान
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>संस्थाको खाता बही अनुसार मौज्दात:</span>
                    <span className="font-mono font-semibold">रु. {formatNpr(bookBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400">
                    <span>(+) बैंकबाट प्राप्त ब्याज / सिधै दाखिला:</span>
                    <input
                      type="number"
                      step="any"
                      value={directCredits || ''}
                      onChange={(e) => setDirectCredits(Number(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-24 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-right font-mono text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-between items-center text-rose-400">
                    <span>(-) बैंक सेवा शुल्क / कट्टी खर्च:</span>
                    <input
                      type="number"
                      step="any"
                      value={directDebits || ''}
                      onChange={(e) => setDirectDebits(Number(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-24 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-right font-mono text-xs text-white"
                    />
                  </div>
                  <div className="border-t border-slate-700 pt-2 flex justify-between font-bold text-white text-sm">
                    <span>समायोजित खाता मौज्दात (Adjusted Book):</span>
                    <span className="font-mono text-emerald-400">रु. {formatNpr(adjustedBookBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Variance & Voucher Quick Action Bar */}
              <div className="mt-4 pt-4 border-t border-slate-700/80 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-slate-400">फरक रकम (Variance / Difference):</span>
                  <span className={`font-mono text-base font-bold ${difference < 0.05 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    रु. {formatNpr(difference)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">समायोजन भौचर जारी गर्नुहोस्:</span>
                  <button
                    onClick={() => openAdjustmentModal('INTEREST_RECEIVED')}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-xs font-semibold text-white transition"
                  >
                    + बैंक ब्याज आम्दानी भौचर
                  </button>
                  <button
                    onClick={() => openAdjustmentModal('BANK_CHARGES')}
                    className="px-2.5 py-1 bg-amber-700 hover:bg-amber-600 rounded text-xs font-semibold text-white transition"
                  >
                    + बैंक शुल्क कट्टी भौचर
                  </button>
                  {difference >= 0.05 && (
                    <button
                      onClick={() => openAdjustmentModal('DISCREPANCY_ADJUSTMENT')}
                      className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 rounded text-xs font-semibold text-white transition"
                    >
                      + हिसाब मिलान (सस्पेन्स) भौचर
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Transaction Checklist Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    बैंक कारोबार सूची तथा क्लियरेन्स चेकलिस्ट (Cheques & Deposits)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    बैंक स्टेटमेन्टमा देखिएका कारोबारहरूलाई "क्लियर्ड" चिन्ह लगाउनुहोस्।
                  </p>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <button
                    onClick={() => markAllCleared(true)}
                    className="px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-50 text-slate-700"
                  >
                    सबैलाई क्लियर्ड चिन्ह
                  </button>
                  <button
                    onClick={() => markAllCleared(false)}
                    className="px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-50 text-slate-700"
                  >
                    सबै अनक्लियर्ड
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center">क्लियर्ड?</th>
                      <th className="py-2.5 px-3">मिति (BS)</th>
                      <th className="py-2.5 px-3">भौचर नं</th>
                      <th className="py-2.5 px-3">विवरण (Description)</th>
                      <th className="py-2.5 px-3 text-center">प्रकार (Type)</th>
                      <th className="py-2.5 px-3 text-right">रकम (रु.)</th>
                      <th className="py-2.5 px-3 text-center">अवस्था (Status)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                          यस बैंक खातामा कुनै कारोबार फेला परेन।
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            item.isCleared ? 'bg-emerald-50/20' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.isCleared}
                              onChange={() => toggleItemCleared(item.id)}
                              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 text-slate-700">{item.bsDate}</td>
                          <td className="py-2 px-3 font-semibold text-emerald-800">
                            <Link href={`/accounting/journal-register?search=${item.journalNo}`} className="hover:underline">
                              {item.journalNo}
                            </Link>
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-900 max-w-xs truncate">
                            {item.description}
                          </td>
                          <td className="py-2 px-3 text-center font-sans">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.type === 'DEPOSIT'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-purple-50 text-purple-700'
                              }`}
                            >
                              {item.type === 'DEPOSIT' ? 'दाखिला (Deposit)' : 'चेक निकासी (Withdrawal)'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {formatNpr(item.amount)}
                          </td>
                          <td className="py-2 px-3 text-center font-sans">
                            {item.isCleared ? (
                              <span className="text-emerald-700 font-semibold text-[11px] flex items-center justify-center space-x-1">
                                <span>✓</span>
                                <span>क्लियर्ड</span>
                              </span>
                            ) : (
                              <span className="text-amber-700 font-medium text-[11px]">
                                {item.type === 'DEPOSIT' ? 'दाखिला हुन बाँकी' : 'भुक्तानी हुन बाँकी'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-800">
              विगतका बैंक हिसाब मिलान स्टेटमेन्टहरू (Saved Reconciliation Statements)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">स्टेटमेन्ट नं</th>
                    <th className="py-2.5 px-3">खाता</th>
                    <th className="py-2.5 px-3">मिति (BS)</th>
                    <th className="py-2.5 px-3 text-right">बैंक मौज्दात</th>
                    <th className="py-2.5 px-3 text-right">लेजर मौज्दात</th>
                    <th className="py-2.5 px-3 text-right">फरक (Difference)</th>
                    <th className="py-2.5 px-3 text-center">अवस्था</th>
                    <th className="py-2.5 px-3">तयार गर्ने</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                        हालसम्म कुनै मिलान स्टेटमेन्ट सेभ गरिएको छैन।
                      </td>
                    </tr>
                  ) : (
                    history.map((stmt) => (
                      <tr key={stmt.reconciliationId} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">{stmt.reconciliationId}</td>
                        <td className="py-2 px-3 font-sans">{stmt.accountName}</td>
                        <td className="py-2 px-3">{stmt.asOfDateBS}</td>
                        <td className="py-2 px-3 text-right">{formatNpr(stmt.bankStatementBalance)}</td>
                        <td className="py-2 px-3 text-right">{formatNpr(stmt.bookBalance)}</td>
                        <td className={`py-2 px-3 text-right font-bold ${stmt.difference === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {formatNpr(stmt.difference)}
                        </td>
                        <td className="py-2 px-3 text-center font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            stmt.isReconciled ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                          }`}>
                            {stmt.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600">{stmt.reconciledBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: POST ADJUSTMENT JOURNAL VOUCHER (हिसाब मिलान भौचर) */}
        {showAdjModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
              <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
                <h3 className="font-bold text-sm flex items-center space-x-2">
                  <span>✍️</span>
                  <span>बैंक हिसाब मिलान समायोजन भौचर प्रविष्टि</span>
                </h3>
                <button
                  onClick={() => setShowAdjModal(false)}
                  className="text-white/80 hover:text-white text-base font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handlePostAdjustmentVoucher} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    समायोजन भौचर प्रकार:
                  </label>
                  <select
                    value={adjType}
                    onChange={(e: any) => {
                      const t = e.target.value;
                      setAdjType(t);
                      if (t === 'INTEREST_RECEIVED') {
                        setAdjOffsetAccount('160.3');
                        setAdjNarration('बैंक खातामा ब्याज प्राप्त हिसाब मिलान समायोजन');
                      } else if (t === 'BANK_CHARGES') {
                        setAdjOffsetAccount('150.8');
                        setAdjNarration('बैंक सेवा शुल्क तथा कमिसन कट्टी हिसाब मिलान');
                      } else {
                        setAdjOffsetAccount('9999');
                        setAdjNarration('बैंक मौज्दात हिसाब मिलान तथा सस्पेन्स समायोजन');
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="BANK_CHARGES">बैंक सेवा शुल्क / कट्टी खर्च (Dr: 150.8, Cr: Bank 90)</option>
                    <option value="INTEREST_RECEIVED">बैंक ब्याज आम्दानी (Dr: Bank 90, Cr: 160.3 Interest)</option>
                    <option value="DISCREPANCY_ADJUSTMENT">हिसाब मिलान तथा सस्पेन्स (Code 9999)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      समायोजन रकम (रु.):
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={adjAmount}
                      onChange={(e) => setAdjAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      विपक्षी खाता (Offset Account):
                    </label>
                    <input
                      type="text"
                      required
                      value={adjOffsetAccount}
                      onChange={(e) => setAdjOffsetAccount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    भौचर व्यहोरा / कैफियत (Narration):
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={adjNarration}
                    onChange={(e) => setAdjNarration(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-[11px] leading-relaxed">
                  💡 यो भौचर प्रविष्टि गर्नासाथ स्वचालित रूपमा गोश्वारा भौचर, लेजर, ४-खाता प्रत्यक्ष सिट (Assets-04/Expenses-02/Income-03) मा पोष्टिङ हुनेछ।
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAdjModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="submit"
                    disabled={adjPosting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs transition"
                  >
                    {adjPosting ? 'भौचर जारी हुँदैछ...' : '✓ समायोजन भौचर जारी गर्नुहोस्'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
