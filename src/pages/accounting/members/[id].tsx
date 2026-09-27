import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Layout } from '../../../components/Layout';
import { Member, ShareBookEntry, SavingBookEntry, LoanBookEntry } from '../../../types/member';
import { formatCurrencyNPR } from '../../../lib/nepaliDate';

export default function MemberDetailsPage() {
  const router = useRouter();
  const { id } = router.query;

  const [activeTab, setActiveTab] = useState<'SHARES' | 'SAVINGS' | 'LOANS'>('SAVINGS');
  const [member, setMember] = useState<Member | null>(null);
  const [shares, setShares] = useState<ShareBookEntry[]>([]);
  const [savings, setSavings] = useState<SavingBookEntry[]>([]);
  const [loans, setLoans] = useState<LoanBookEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/accounting/members/${id}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load member records');
        }
        setMember(data.member);
        setShares(data.shares || []);
        setSavings(data.savings || []);
        setLoans(data.loans || []);
      } catch (err: any) {
        setError(err.message || 'Error loading member details');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  return (
    <Layout title={`Member ${member?.memberNo || 'Passbook'}`}>
      <div className="space-y-6">
        {/* Navigation & Action Bar */}
        <div className="flex items-center justify-between no-print">
          <Link
            href="/accounting/members"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center space-x-1"
          >
            <span>←</span>
            <span>Back to Member Directory</span>
          </Link>

          <div className="flex items-center space-x-3">
            <Link
              href={`/accounting/members/entry?memberNo=${member?.memberNo || ''}`}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition"
            >
              + Record Transaction
            </Link>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition flex items-center space-x-1"
            >
              <span>🖨️</span>
              <span>Print Passbook / Statement</span>
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-xl p-12 text-center text-slate-500">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-emerald-600 border-r-transparent"></div>
            <p className="mt-2 text-xs">Loading member account books...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
            {error}
          </div>
        )}

        {member && (
          <>
            {/* MEMBER PROFILE & BALANCE CARD */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-600 text-white font-bold text-xl flex items-center justify-center shadow-inner">
                    {member.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-bold text-slate-900">{member.fullName}</h2>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {member.memberNo}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span>ठेगाना: {member.address} (वडा: {member.wardNo})</span>
                      <span>•</span>
                      <span>मोबाइल: {member.phone}</span>
                      {member.citizenshipNo && (
                        <>
                          <span>•</span>
                          <span>ना.प्र.नं.: {member.citizenshipNo}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">सदस्यता मिति:</span>
                  <span className="text-sm font-semibold font-mono text-slate-800">
                    {member.membershipDate || '---'} BS
                  </span>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {member.status}
                  </span>
                </div>
              </div>

              {/* THREE INDIVIDUAL BALANCES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <div className="flex justify-between items-center text-xs text-emerald-800 font-semibold">
                    <span>शेयर पूँजी (Share_Book)</span>
                    <span>{member.shareKitta} कित्ता</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-900 mt-2">
                    {formatCurrencyNPR(member.shareAmount)}
                  </div>
                  <span className="text-2xs text-emerald-700 block mt-1">
                    Reconciles with Liabilities 05 (१०)
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200">
                  <div className="flex justify-between items-center text-xs text-sky-800 font-semibold">
                    <span>कुल बचत (Saving_Book)</span>
                    <span>Passbook Active</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-sky-900 mt-2">
                    {formatCurrencyNPR(member.savingBalance)}
                  </div>
                  <span className="text-2xs text-sky-700 block mt-1">
                    Reconciles with Liabilities 05 (३०)
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                  <div className="flex justify-between items-center text-xs text-amber-800 font-semibold">
                    <span>ऋण बाँकी (Loan_Book)</span>
                    <span>Portfolio</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-900 mt-2">
                    {formatCurrencyNPR(member.loanOutstanding)}
                  </div>
                  <span className="text-2xs text-amber-700 block mt-1">
                    Reconciles with Assets-04 (११०)
                  </span>
                </div>
              </div>
            </div>

            {/* THREE SUBSIDIARY BOOKS TABS */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="flex border-b border-slate-200 bg-slate-50 px-4">
                <button
                  onClick={() => setActiveTab('SAVINGS')}
                  className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition ${
                    activeTab === 'SAVINGS'
                      ? 'border-sky-600 text-sky-800 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  📖 १. बचत खाता हिसाब (Saving_Book Passbook) ({savings.length})
                </button>
                <button
                  onClick={() => setActiveTab('SHARES')}
                  className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition ${
                    activeTab === 'SHARES'
                      ? 'border-emerald-600 text-emerald-800 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  📜 २. शेयर अभिलेख पुस्तिका (Share_Book) ({shares.length})
                </button>
                <button
                  onClick={() => setActiveTab('LOANS')}
                  className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition ${
                    activeTab === 'LOANS'
                      ? 'border-amber-600 text-amber-800 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  💼 ३. ऋण लगानी तथा असुली (Loan_Book) ({loans.length})
                </button>
              </div>

              {/* TAB 1: SAVING BOOK */}
              {activeTab === 'SAVINGS' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">मिति (BS)</th>
                        <th className="px-4 py-3 text-left">भौचर नं.</th>
                        <th className="px-4 py-3 text-left">बचत खाता / प्रकार</th>
                        <th className="px-4 py-3 text-left">विवरण (Narration)</th>
                        <th className="px-4 py-3 text-right">जम्मा (Deposit Cr.)</th>
                        <th className="px-4 py-3 text-right">भुक्तानी (Withdraw Dr.)</th>
                        <th className="px-4 py-3 text-right">बाँकी मौज्दात (Balance)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                      {savings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                            No savings transactions recorded in Saving_Book yet.
                          </td>
                        </tr>
                      ) : (
                        savings.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono">{s.bsDate}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-emerald-800">{s.voucherNo}</td>
                            <td className="px-4 py-3 font-semibold">
                              {s.savingType}
                              <span className="block text-2xs text-slate-400 font-mono">{s.accountNo}</span>
                            </td>
                            <td className="px-4 py-3">{s.narration}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-sky-800">
                              {s.deposit > 0 ? formatCurrencyNPR(s.deposit) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-medium text-rose-700">
                              {s.withdraw > 0 ? formatCurrencyNPR(s.withdraw) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrencyNPR(s.balance)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: SHARE BOOK */}
              {activeTab === 'SHARES' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">मिति (BS)</th>
                        <th className="px-4 py-3 text-left">भौचर नं.</th>
                        <th className="px-4 py-3 text-left">कारोबार किसिम</th>
                        <th className="px-4 py-3 text-center">कित्ता</th>
                        <th className="px-4 py-3 text-right">दर (रु.)</th>
                        <th className="px-4 py-3 text-right">खरिद (Credit)</th>
                        <th className="px-4 py-3 text-right">फिर्ता (Debit)</th>
                        <th className="px-4 py-3 text-right">कुल शेयर बाँकी</th>
                        <th className="px-4 py-3 text-left">कैफियत</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                      {shares.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                            No share transactions recorded in Share_Book yet.
                          </td>
                        </tr>
                      ) : (
                        shares.map((sh) => (
                          <tr key={sh.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono">{sh.bsDate}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-emerald-800">{sh.voucherNo}</td>
                            <td className="px-4 py-3 font-semibold">{sh.type}</td>
                            <td className="px-4 py-3 text-center font-mono font-bold">{sh.kitta}</td>
                            <td className="px-4 py-3 text-right font-mono">Rs. {sh.rate}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                              {sh.credit > 0 ? formatCurrencyNPR(sh.credit) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-medium text-rose-700">
                              {sh.debit > 0 ? formatCurrencyNPR(sh.debit) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrencyNPR(sh.balance)}
                            </td>
                            <td className="px-4 py-3 text-slate-500">{sh.narration}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 3: LOAN BOOK */}
              {activeTab === 'LOANS' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">मिति (BS)</th>
                        <th className="px-4 py-3 text-left">भौचर नं.</th>
                        <th className="px-4 py-3 text-left">ऋण प्रयोजन</th>
                        <th className="px-4 py-3 text-right">ऋण लगानी (Dr.)</th>
                        <th className="px-4 py-3 text-right">साँवा असुली (Cr.)</th>
                        <th className="px-4 py-3 text-right">ब्याज भुक्तानी</th>
                        <th className="px-4 py-3 text-right">बाँकी साँवा ऋण</th>
                        <th className="px-4 py-3 text-left">कैफियत</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                      {loans.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                            No loan disbursements or repayments recorded in Loan_Book yet.
                          </td>
                        </tr>
                      ) : (
                        loans.map((ln) => (
                          <tr key={ln.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono">{ln.bsDate}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-emerald-800">{ln.voucherNo}</td>
                            <td className="px-4 py-3 font-semibold">
                              {ln.loanPurpose} कर्जा
                              <span className="block text-2xs text-slate-400 font-mono">{ln.loanAccountNo}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-amber-800">
                              {ln.disbursement > 0 ? formatCurrencyNPR(ln.disbursement) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-medium text-emerald-700">
                              {ln.principalRepaid > 0 ? formatCurrencyNPR(ln.principalRepaid) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-600">
                              {ln.interestPaid > 0 ? formatCurrencyNPR(ln.interestPaid) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrencyNPR(ln.balancePrincipal)}
                            </td>
                            <td className="px-4 py-3 text-slate-500">{ln.narration}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
