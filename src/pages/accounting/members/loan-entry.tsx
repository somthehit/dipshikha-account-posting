import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Layout } from '../../../components/Layout';
import { Member } from '../../../types/member';
import { formatCurrencyNPR, getCurrentBSDate } from '../../../lib/nepaliDate';
import { MemberSearchSelect } from '../../../components/MemberSearchSelect';

export default function LoanEntryPage() {
  const router = useRouter();
  const { memberNo: initialMemberNo } = router.query;
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberNo, setSelectedMemberNo] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loanMode, setLoanMode] = useState<'REPAYMENT' | 'DISBURSEMENT'>('REPAYMENT');
  const [loanPurpose, setLoanPurpose] = useState('कृषि');
  const [loanAccountNo, setLoanAccountNo] = useState('');
  const [interestRate, setInterestRate] = useState(14.0);
  const [tenureMonths, setTenureMonths] = useState(12);
  const [principalAmount, setPrincipalAmount] = useState(0);
  const [interestAmount, setInterestAmount] = useState(0);
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [bsDate, setBsDate] = useState(getCurrentBSDate());
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [narration, setNarration] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string; journalNo?: string } | null>(null);

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

  useEffect(() => {
    const found = members.find((m) => m.memberNo === selectedMemberNo);
    setSelectedMember(found || null);
    if (found) {
      setLoanAccountNo('LN-' + found.memberNo + '-' + loanPurpose.substring(0, 3));
    }
  }, [selectedMemberNo, members, loanPurpose]);

  useEffect(() => {
    if (selectedMember) {
      if (loanMode === 'DISBURSEMENT') {
        setNarration(loanPurpose + ' कर्जा लगानी निकासा - [' + selectedMember.memberNo + '] ' + selectedMember.fullName);
      } else {
        setNarration('ऋण किस्ता तथा ब्याज असुली - [' + selectedMember.memberNo + '] ' + selectedMember.fullName);
      }
    }
  }, [loanMode, loanPurpose, selectedMember]);

  const currentOutstanding = selectedMember ? selectedMember.loanOutstanding : 0;
  const newOutstanding =
    loanMode === 'DISBURSEMENT'
      ? currentOutstanding + (principalAmount || 0)
      : Math.max(0, currentOutstanding - (principalAmount || 0));
  const totalReceipt = (principalAmount || 0) + (interestAmount || 0) + (penaltyAmount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      alert('Please select a member.');
      return;
    }
    if (principalAmount <= 0 && interestAmount <= 0) {
      alert('Please enter at least principal or interest amount.');
      return;
    }
    if (loanMode === 'REPAYMENT' && principalAmount > currentOutstanding) {
      alert('Principal repayment cannot exceed outstanding loan. Outstanding: Rs. ' + currentOutstanding);
      return;
    }

    try {
      setSubmitting(true);
      setResultMessage(null);
      const res = await fetch('/api/accounting/members/loan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberNo: selectedMember.memberNo,
          amount: principalAmount,
          interestAmount,
          penaltyAmount,
          type: loanMode,
          loanPurpose,
          loanAccountNo,
          paymentMethod,
          narration,
          bsDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to record loan transaction');
      setResultMessage({
        type: 'success',
        text: '✓ ' + data.message,
        journalNo: data.journalNo,
      });
      setSelectedMember({ ...selectedMember, loanOutstanding: newOutstanding });
      setTimeout(() => {
        router.push('/accounting/members/' + selectedMember.memberNo);
      }, 1500);
    } catch (err: any) {
      setResultMessage({ type: 'error', text: err.message || 'Loan transaction recording failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="Loan Entry Form">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between no-print">
          <Link href="/accounting/members" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Back to Members
          </Link>
          <span className="text-xs text-slate-500">Loan_Book & 4-Khata Assets-04 (११०) Integration</span>
        </div>
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-8 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded uppercase">
              ऋण लगानी तथा असुली (Loan Book)
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">Loan Entry Form (सदस्य ऋण प्रविष्टि फारम)</h1>
            <p className="text-xs text-slate-500 mt-0.5">Disburse new loans or record principal recoveries and interest. Automatically updates Loan_Book, Member-Data, and posts to Assets-04 and Income-03.</p>
          </div>
          {resultMessage && (
            <div className={`p-4 rounded-lg text-xs font-bold ${resultMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              {resultMessage.text}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
            <MemberSearchSelect
              members={members}
              selectedMemberNo={selectedMemberNo}
              onSelectMember={(m) => {
                setSelectedMemberNo(m.memberNo);
                setSelectedMember(m);
              }}
              entryType="LOAN"
            />
            <div>
              <label className="block font-semibold text-slate-700 mb-1">कारोबार किसिम</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setLoanMode('REPAYMENT')} className={`py-2 px-3 rounded-lg text-xs font-bold border ${loanMode === 'REPAYMENT' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-700'}`}>
                  📥 ऋण साँवा तथा ब्याज असुली (Repayment Cr.)
                </button>
                <button type="button" onClick={() => setLoanMode('DISBURSEMENT')} className={`py-2 px-3 rounded-lg text-xs font-bold border ${loanMode === 'DISBURSEMENT' ? 'bg-amber-600 text-white' : 'bg-slate-50 text-slate-700'}`}>
                  📤 नयाँ ऋण लगानी / निकासा (Disbursement Dr.)
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ऋण प्रयोजन</label>
                <select value={loanPurpose} onChange={(e) => setLoanPurpose(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white">
                  <option value="कृषि">कृषि ऋण (Agriculture)</option>
                  <option value="पशुपालन">पशुपालन ऋण (Livestock)</option>
                  <option value="व्यवसाय">व्यवसायिक ऋण (Business)</option>
                  <option value="घर खर्च">घर खर्च / सामाजिक ऋण (Social)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ऋण खाता नं.</label>
                <input type="text" value={loanAccountNo} onChange={(e) => setLoanAccountNo(e.target.value)} className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg bg-slate-50" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">वार्षिक ब्याजदर (%)</label>
                <input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)} className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{loanMode === 'DISBURSEMENT' ? 'निकासा रकम (Principal Dr.) *' : 'साँवा असुली (Principal Cr.) *'}</label>
                  <input type="number" step="0.01" min="0" required value={principalAmount || ''} onChange={(e) => setPrincipalAmount(parseFloat(e.target.value) || 0)} className="w-full text-base font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                </div>
                {loanMode === 'REPAYMENT' ? (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">ब्याज असुली (Interest Paid)</label>
                      <input type="number" step="0.01" min="0" value={interestAmount || ''} onChange={(e) => setInterestAmount(parseFloat(e.target.value) || 0)} className="w-full text-base font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">हर्जाना (Penalty)</label>
                      <input type="number" step="0.01" min="0" value={penaltyAmount || ''} onChange={(e) => setPenaltyAmount(parseFloat(e.target.value) || 0)} className="w-full text-base font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ऋण अवधि (महिना)</label>
                    <input type="number" min="1" value={tenureMonths} onChange={(e) => setTenureMonths(parseInt(e.target.value, 10) || 12)} className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                  </div>
                )}
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block">{loanMode === 'REPAYMENT' ? 'कुल प्राप्त रकम:' : 'कुल निकासा रकम:'}</span>
                  <span className="font-mono font-bold text-lg text-emerald-800">{formatCurrencyNPR(loanMode === 'REPAYMENT' ? totalReceipt : principalAmount)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">नयाँ बाँकी साँवा ऋण:</span>
                  <span className="font-mono font-bold text-lg text-amber-900">{formatCurrencyNPR(newOutstanding)}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">मिति (BS Date)</label>
                <input type="text" value={bsDate} onChange={(e) => setBsDate(e.target.value)} className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">भुक्तानी माध्यम</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white">
                  <option value="CASH">नगद (Cash in Hand - ८०)</option>
                  <option value="BANK">बैंक (Cash at Bank - ९०)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">कैफियत / व्यहोरा</label>
              <input type="text" value={narration} onChange={(e) => setNarration(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg" />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Link href="/accounting/members" className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium">Cancel</Link>
              <button type="submit" disabled={submitting} className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md transition">
                {submitting ? 'Saving...' : 'Record Loan (ऋण प्रविष्टि सुरक्षित गर्नुहोस्)'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
