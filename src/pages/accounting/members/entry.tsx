import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '../../../components/Layout';
import { Member } from '../../../types/member';
import { getCurrentBSDate } from '../../../lib/nepaliDate';

export default function MemberTransactionEntryPage() {
  const router = useRouter();
  const { memberNo: initialMemberNo } = router.query;

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberNo, setSelectedMemberNo] = useState<string>('');
  const [category, setCategory] = useState<'SAVINGS' | 'SHARES' | 'LOANS'>('SAVINGS');

  const [bsDate, setBsDate] = useState<string>(getCurrentBSDate());
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [narration, setNarration] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Savings specific fields
  const [savingType, setSavingType] = useState<string>('नियमित बचत');
  const [savingAction, setSavingAction] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [savingAmount, setSavingAmount] = useState<number>(0);

  // Shares specific fields
  const [shareAction, setShareAction] = useState<'PURCHASE' | 'REFUND'>('PURCHASE');
  const [shareKitta, setShareKitta] = useState<number>(10);

  // Loans specific fields
  const [loanAction, setLoanAction] = useState<'DISBURSEMENT' | 'REPAYMENT'>('REPAYMENT');
  const [loanPurpose, setLoanPurpose] = useState<string>('कृषि');
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [interestAmount, setInterestAmount] = useState<number>(0);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(0);

  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await fetch('/api/accounting/members');
        const data = await res.json();
        if (data.members) {
          setMembers(data.members);
          if (initialMemberNo && typeof initialMemberNo === 'string') {
            setSelectedMemberNo(initialMemberNo);
          } else if (data.members.length > 0) {
            setSelectedMemberNo(data.members[0].memberNo);
          }
        }
      } catch (err) {
        console.error('Failed to load members:', err);
      }
    }
    loadMembers();
  }, [initialMemberNo]);

  const selectedMember = members.find((m) => m.memberNo === selectedMemberNo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberNo) {
      alert('Please select a member.');
      return;
    }

    setSubmitting(true);
    setResultMessage(null);

    try {
      let endpoint = '';
      let payload: any = {
        memberNo: selectedMemberNo,
        paymentMethod,
        narration,
        bsDate,
      };

      if (category === 'SAVINGS') {
        endpoint = '/api/accounting/members/saving';
        payload = {
          ...payload,
          amount: savingAmount,
          type: savingAction,
          savingType,
        };
      } else if (category === 'SHARES') {
        endpoint = '/api/accounting/members/share';
        payload = {
          ...payload,
          kitta: shareKitta,
          type: shareAction,
        };
      } else if (category === 'LOANS') {
        endpoint = '/api/accounting/members/loan';
        payload = {
          ...payload,
          amount: loanAmount,
          interestAmount,
          penaltyAmount,
          type: loanAction,
          loanPurpose,
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Transaction failed');
      }

      setResultMessage({
        type: 'success',
        text: `✓ ${data.message}`,
      });

      setTimeout(() => {
        router.push(`/accounting/members/${selectedMemberNo}`);
      }, 1200);
    } catch (err: any) {
      setResultMessage({
        type: 'error',
        text: err.message || 'Transaction recording failed',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="Member Transaction Entry">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded uppercase">
              व्यक्तिगत कारोबार प्रविष्टि
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">Auto Journal Voucher & 4-Khata Posting</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Member Subsidiary Transaction Entry
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Simultaneously updates the individual member passbook and auto-posts to the 4-Khata general ledger.
          </p>

          {resultMessage && (
            <div
              className={`mt-4 p-4 rounded-lg text-xs font-bold flex items-center space-x-2 ${
                resultMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              <span>{resultMessage.type === 'success' ? '✓' : '⚠️'}</span>
              <span>{resultMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5 text-xs">
            {/* 1. SELECT MEMBER */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                सदस्य छान्नुहोस् (Select Member) <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedMemberNo}
                onChange={(e) => setSelectedMemberNo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-emerald-500 focus:border-emerald-500"
              >
                {members.map((m) => (
                  <option key={m.memberNo} value={m.memberNo}>
                    [{m.memberNo}] {m.fullName} - {m.address} (बचत: रु {m.savingBalance}, शेयर: रु {m.shareAmount})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. TRANSACTION CATEGORY */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                कारोबार क्षेत्र (Transaction Category)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setCategory('SAVINGS')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                    category === 'SAVINGS'
                      ? 'bg-sky-50 border-sky-400 text-sky-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  📖 बचत खाता (Saving_Book)
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('SHARES')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                    category === 'SHARES'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  📜 शेयर खाता (Share_Book)
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('LOANS')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                    category === 'LOANS'
                      ? 'bg-amber-50 border-amber-400 text-amber-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  💼 ऋण खाता (Loan_Book)
                </button>
              </div>
            </div>

            {/* 3. DYNAMIC FIELDS PER CATEGORY */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
              {/* SAVINGS FORM */}
              {category === 'SAVINGS' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Action</label>
                      <select
                        value={savingAction}
                        onChange={(e) => setSavingAction(e.target.value as any)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-sm"
                      >
                        <option value="DEPOSIT">बचत जम्मा (Deposit Cr.)</option>
                        <option value="WITHDRAW">बचत फिर्ता / भुक्तानी (Withdraw Dr.)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">बचत प्रकार (Saving Product)</label>
                      <select
                        value={savingType}
                        onChange={(e) => setSavingType(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-sm"
                      >
                        <option value="नियमित बचत">नियमित बचत (Regular Savings)</option>
                        <option value="ऐच्छिक बचत">ऐच्छिक बचत (Voluntary Savings)</option>
                        <option value="बाल बचत">बाल बचत (Child Savings)</option>
                        <option value="आवधिक बचत">आवधिक बचत (Fixed Term)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      रकम / Amount (रु.) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={savingAmount || ''}
                      onChange={(e) => setSavingAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-base font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              {/* SHARES FORM */}
              {category === 'SHARES' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Action</label>
                      <select
                        value={shareAction}
                        onChange={(e) => setShareAction(e.target.value as any)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-sm"
                      >
                        <option value="PURCHASE">शेयर खरिद (Share Purchase Cr.)</option>
                        <option value="REFUND">शेयर फिर्ता (Share Refund Dr.)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        कित्ता संख्या (Share Units)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={shareKitta || ''}
                        onChange={(e) => setShareKitta(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-sm font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-100/50 rounded border border-emerald-200 flex justify-between items-center text-xs text-emerald-900 font-semibold">
                    <span>कुल शेयर रकम (At Rs. 100/share):</span>
                    <span className="font-mono text-base font-bold">Rs. {(shareKitta * 100).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* LOANS FORM */}
              {category === 'LOANS' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Action</label>
                      <select
                        value={loanAction}
                        onChange={(e) => setLoanAction(e.target.value as any)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-sm"
                      >
                        <option value="REPAYMENT">ऋण साँवा तथा ब्याज असुली (Repayment Cr.)</option>
                        <option value="DISBURSEMENT">नयाँ ऋण लगानी / निकासा (Disbursement Dr.)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">ऋण प्रयोजन (Purpose)</label>
                      <select
                        value={loanPurpose}
                        onChange={(e) => setLoanPurpose(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-sm"
                      >
                        <option value="कृषि">कृषि ऋण (Agriculture Loan)</option>
                        <option value="पशुपालन">पशुपालन ऋण (Livestock Loan)</option>
                        <option value="व्यवसाय">व्यवसायिक ऋण (Business Loan)</option>
                        <option value="घर खर्च">घर खर्च / सामाजिक ऋण (Social Loan)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        {loanAction === 'DISBURSEMENT' ? 'निकासा रकम' : 'साँवा असुली (Principal)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={loanAmount || ''}
                        onChange={(e) => setLoanAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-sm font-mono font-bold"
                      />
                    </div>

                    {loanAction === 'REPAYMENT' && (
                      <>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">ब्याज (Interest)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={interestAmount || ''}
                            onChange={(e) => setInterestAmount(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-sm font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-1">हर्जाना (Penalty)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={penaltyAmount || ''}
                            onChange={(e) => setPenaltyAmount(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-sm font-mono"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 4. DATE & PAYMENT DETAILS */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">मिति / BS Date (वि.सं.)</label>
                <input
                  type="text"
                  value={bsDate}
                  onChange={(e) => setBsDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">भुक्तानी माध्यम (Payment Method)</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                >
                  <option value="CASH">नगद (Cash in Hand - ८०)</option>
                  <option value="BANK">बैंक (Cash at Bank - ९०)</option>
                </select>
              </div>
            </div>

            {/* 5. NARRATION */}
            <div>
              <label className="block font-semibold text-slate-600 mb-1">कैफियत / विवरण (Narration)</label>
              <input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="e.g. मासिक बचत संकलन, कृषि ऋण निकासा, शेयर खरिद..."
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              />
            </div>

            {/* 6. SUBMIT BUTTON */}
            <div className="flex justify-end pt-3 border-t">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-xs transition"
              >
                {submitting ? 'Recording & Auto-Posting...' : 'Record Transaction (प्रविष्टि सुरक्षित गर्नुहोस्)'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
