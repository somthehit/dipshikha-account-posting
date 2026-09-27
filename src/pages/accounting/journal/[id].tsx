import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Layout } from '../../../components/Layout';
import { JournalEntry, JournalLine } from '../../../types/accounting';
import { DEFAULT_ACCOUNTS } from '../../../lib/chartOfAccounts';
import { formatCurrencyNPR } from '../../../lib/nepaliDate';

export default function JournalDetailsPage() {
  const router = useRouter();
  const { id, print } = router.query;

  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Reversal state
  const [showReversalModal, setShowReversalModal] = useState<boolean>(false);
  const [reversalReason, setReversalReason] = useState<string>('Adjustment / Correction');
  const [reversing, setReversing] = useState<boolean>(false);

  // Edit state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editNarration, setEditNarration] = useState<string>('');
  const [editBsDate, setEditBsDate] = useState<string>('');
  const [editTransactionDate, setEditTransactionDate] = useState<string>('');
  const [editReferenceNo, setEditReferenceNo] = useState<string>('');
  const [editLines, setEditLines] = useState<JournalLine[]>([]);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccessMessage, setEditSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    async function loadJournal() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/accounting/journal/${id}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Journal entry not found');
        }
        setJournal(data.journal);

        if (print === 'true') {
          setTimeout(() => {
            window.print();
          }, 600);
        }
      } catch (err: any) {
        setError(err.message || 'Error loading journal');
      } finally {
        setLoading(false);
      }
    }

    loadJournal();
  }, [id, print]);

  const handleReverse = async () => {
    if (!journal) return;
    try {
      setReversing(true);
      const res = await fetch(`/api/accounting/journal/${journal.journalId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reversalReason,
          user: 'Accountant',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Reversal failed');
      }
      alert(`Reversal voucher created: ${data.reversalJournal.journalNo}`);
      setShowReversalModal(false);
      router.push(`/accounting/journal/${data.reversalJournal.journalId}`);
    } catch (err: any) {
      alert(err.message || 'Error creating reversal');
    } finally {
      setReversing(false);
    }
  };

  const handleOpenEdit = () => {
    if (!journal) return;
    setEditNarration(journal.narration || '');
    setEditBsDate(journal.bsDate || '');
    setEditTransactionDate(journal.transactionDate || '');
    setEditReferenceNo(journal.referenceNo || '');
    setEditLines(
      journal.lines && journal.lines.length > 0
        ? journal.lines.map((l) => ({ ...l }))
        : [
            {
              accountCode: '80',
              accountName: 'Cash in Hand (नगद मौज्दात)',
              accountGroup: 'Assets-04',
              normalBalance: 'DEBIT',
              debit: journal.totalDebit || 0,
              credit: 0,
              narration: journal.narration,
            },
            {
              accountCode: '10',
              accountName: 'Share Capital (शेयर पूँजी)',
              accountGroup: 'Liabilities 05',
              normalBalance: 'CREDIT',
              debit: 0,
              credit: journal.totalCredit || 0,
              narration: journal.narration,
            },
          ]
    );
    setEditError(null);
    setShowEditModal(true);
  };

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

  const handleSaveEdit = async () => {
    if (!journal) return;
    try {
      setSavingEdit(true);
      setEditError(null);

      const totalDr = editLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
      const totalCr = editLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

      if (Math.abs(totalDr - totalCr) > 0.01) {
        throw new Error(
          `डेबिट र क्रेडिट रकम बराबर हुनुपर्छ। Total Debit: रु. ${totalDr.toFixed(2)} ≠ Total Credit: रु. ${totalCr.toFixed(2)}`
        );
      }

      const res = await fetch(`/api/accounting/journal/${journal.journalId}`, {
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

      setJournal(data.journal);
      setShowEditModal(false);
      setEditSuccessMessage('भौचर सफलतापूर्वक सच्याइयो (Voucher corrections saved!)');
    } catch (err: any) {
      setEditError(err.message || 'Error updating transaction');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <Layout title={`Journal ${journal?.journalNo || 'Details'}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Action Bar */}
        <div className="flex items-center justify-between no-print">
          <Link
            href="/accounting/journal-register"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center space-x-1"
          >
            <span>←</span>
            <span>Back to Journal Register</span>
          </Link>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-xs transition flex items-center space-x-1"
            >
              <span>🖨️</span>
              <span>Print Voucher</span>
            </button>
            {journal && journal.status === 'POSTED' && (
              <button
                onClick={handleOpenEdit}
                className="px-3.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-md hover:bg-emerald-100 transition flex items-center space-x-1"
              >
                <span>✏️</span>
                <span>Edit Voucher (सच्याउनुहोस्)</span>
              </button>
            )}
            {journal && journal.status === 'POSTED' && (
              <button
                onClick={() => setShowReversalModal(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 transition"
              >
                Reverse Voucher
              </button>
            )}
          </div>
        </div>

        {editSuccessMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-semibold flex justify-between items-center no-print">
            <span>✓ {editSuccessMessage}</span>
            <button onClick={() => setEditSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">
              ✕
            </button>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl p-12 text-center text-slate-500">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-emerald-600 border-r-transparent"></div>
            <p className="mt-2 text-xs">Loading voucher details...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
            {error}
          </div>
        )}

        {journal && (
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-8 printable-voucher">
            {/* VOUCHER HEADER (Official Cooperative Style) */}
            <div className="text-center border-b-2 border-slate-900 pb-5">
              <h2 className="text-xl font-bold text-slate-900">
                श्री दीपशिखा कृषि सहकारी संस्था लि.
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                गौरीगंगा नगरपालिका-१, चौमाला, कैलाली
              </p>
              <div className="mt-3 inline-block px-3 py-1 bg-slate-100 rounded text-xs font-bold uppercase tracking-wider text-slate-800">
                गोश्वारा भौचर (Journal Voucher)
              </div>
            </div>

            {/* METADATA GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-xs border-b border-slate-200">
              <div>
                <span className="text-slate-400 block">भौचर नं. (Journal No):</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {journal.journalNo}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">मिति / BS Date:</span>
                <span className="font-bold text-slate-800 font-mono text-sm">
                  {journal.bsDate}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Date (AD):</span>
                <span className="font-bold text-slate-800">{journal.transactionDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block">भौचर किसिम (Type):</span>
                <span className="font-bold text-slate-800">{journal.transactionType}</span>
              </div>
              <div>
                <span className="text-slate-400 block">शाखा (Branch):</span>
                <span className="font-bold text-slate-800">{journal.branch}</span>
              </div>
              <div>
                <span className="text-slate-400 block">रेफरेन्स नं. (Ref No):</span>
                <span className="font-semibold text-slate-800">{journal.referenceNo || '---'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">तयार गर्ने (Prepared By):</span>
                <span className="font-semibold text-slate-800">{journal.createdBy}</span>
              </div>
              <div>
                <span className="text-slate-400 block">स्थिति (Status):</span>
                <span
                  className={`font-bold inline-block px-2 py-0.5 rounded text-xs ${
                    journal.status === 'POSTED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {journal.status}
                </span>
              </div>
            </div>

            {/* NARRATION */}
            <div className="py-3 border-b border-slate-200 text-xs">
              <span className="text-slate-500 font-semibold">व्यहोरा (Narration): </span>
              <span className="text-slate-900 font-medium">{journal.narration}</span>
              {journal.reversalJournalId && (
                <div className="mt-1 text-amber-700 font-semibold">
                  ⚠️ This journal was reversed by Journal: {journal.reversalJournalId}
                </div>
              )}
            </div>

            {/* JOURNAL LINES TABLE */}
            <div className="py-4">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600 font-bold uppercase">
                    <th className="py-2 text-left w-12">सि.नं.</th>
                    <th className="py-2 text-left">खाता विवरण (Account Particulars)</th>
                    <th className="py-2 text-left w-28">खाता समूह</th>
                    <th className="py-2 text-right w-36">डेबिट (Dr. Rs.)</th>
                    <th className="py-2 text-right w-36">क्रेडिट (Cr. Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {journal.lines.map((l, idx) => (
                    <tr key={idx} className="py-2">
                      <td className="py-2.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5">
                        <div className="font-semibold text-slate-900">
                          [{l.accountCode}] {l.accountName}
                        </div>
                        {l.narration && l.narration !== journal.narration && (
                          <div className="text-slate-500 text-2xs italic">{l.narration}</div>
                        )}
                      </td>
                      <td className="py-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-700">
                          {l.accountGroup}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono font-medium">
                        {l.debit > 0 ? formatCurrencyNPR(l.debit) : '-'}
                      </td>
                      <td className="py-2.5 text-right font-mono font-medium">
                        {l.credit > 0 ? formatCurrencyNPR(l.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-900 font-bold">
                  <tr>
                    <td colSpan={3} className="py-3 text-right">
                      कुल जम्मा (Total):
                    </td>
                    <td className="py-3 text-right font-mono text-sm text-slate-900">
                      {formatCurrencyNPR(journal.totalDebit)}
                    </td>
                    <td className="py-3 text-right font-mono text-sm text-slate-900">
                      {formatCurrencyNPR(journal.totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* LEDGER IMPACT BREAKDOWN (Requirement 20) */}
            {journal.ledgerImpact && (
              <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs no-print">
                <h4 className="font-bold text-slate-800 mb-2">
                  चार खाता प्रभाव विवरण (4-Khata Ledger Impact)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2.5 rounded bg-white border border-slate-200">
                    <span className="text-slate-500 block">Assets-04</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrencyNPR(journal.ledgerImpact.assetsAmount)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-white border border-slate-200">
                    <span className="text-slate-500 block">Expenses-02</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrencyNPR(journal.ledgerImpact.expensesAmount)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-white border border-slate-200">
                    <span className="text-slate-500 block">Liabilities 05</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrencyNPR(journal.ledgerImpact.liabilitiesAmount)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-white border border-slate-200">
                    <span className="text-slate-500 block">Income-03</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrencyNPR(journal.ledgerImpact.incomeAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SIGNATURE SECTION (Nepali Accounting Standard for print/vouchers) */}
            <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-slate-300 text-center text-xs text-slate-700">
              <div>
                <div className="border-b border-dashed border-slate-400 pb-8"></div>
                <span className="font-bold block mt-2">तयार गर्ने (Prepared By)</span>
                <span className="text-slate-400">{journal.createdBy}</span>
              </div>
              <div>
                <div className="border-b border-dashed border-slate-400 pb-8"></div>
                <span className="font-bold block mt-2">जाँच्ने (Checked By)</span>
                <span className="text-slate-400">आन्तरिक लेखापरीक्षक</span>
              </div>
              <div>
                <div className="border-b border-dashed border-slate-400 pb-8"></div>
                <span className="font-bold block mt-2">सदर गर्ने (Approved By)</span>
                <span className="text-slate-400">व्यवस्थापक / अध्यक्ष</span>
              </div>
            </div>
          </div>
        )}

        {/* REVERSAL MODAL */}
        {showReversalModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                Reverse Journal Entry ({journal?.journalNo})
              </h3>
              <p className="text-xs text-slate-500">
                This will create a new reversal journal with opposite Debit and Credit entries, post to the 4-Khata sheets, and mark this voucher as REVERSED.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Reason for Reversal
                </label>
                <textarea
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowReversalModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reversing}
                  onClick={handleReverse}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold"
                >
                  {reversing ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* EDIT TRANSACTION MODAL (सच्याउने सुविधा / EDIT MISTAKE) */}
        {/* ========================================================= */}
        {showEditModal && journal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-5 my-8 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-bold text-xs rounded">
                      {journal.journalNo}
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
                  onClick={() => setShowEditModal(false)}
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
                  onClick={() => setShowEditModal(false)}
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
      </div>
    </Layout>
  );
}
