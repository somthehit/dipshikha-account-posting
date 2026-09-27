import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Layout } from '../../../components/Layout';
import { Member } from '../../../types/member';
import { formatCurrencyNPR, getCurrentBSDate } from '../../../lib/nepaliDate';
import { MemberSearchSelect } from '../../../components/MemberSearchSelect';

export default function SavingEntryPage() {
  const router = useRouter();
  const { memberNo: initialMemberNo } = router.query;
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberNo, setSelectedMemberNo] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [actionType, setActionType] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [savingType, setSavingType] = useState('नियमित बचत');
  const [amount, setAmount] = useState(0);
  const [bsDate, setBsDate] = useState(getCurrentBSDate());
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [narration, setNarration] = useState('मासिक नियमित बचत संकलन');
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
  }, [selectedMemberNo, members]);

  useEffect(() => {
    if (selectedMember) {
      if (actionType === 'DEPOSIT') {
        setNarration(savingType + ' जम्मा - [' + selectedMember.memberNo + '] ' + selectedMember.fullName);
      } else {
        setNarration(savingType + ' फिर्ता / भुक्तानी - [' + selectedMember.memberNo + '] ' + selectedMember.fullName);
      }
    }
  }, [actionType, savingType, selectedMember]);

  const currentBalance = selectedMember ? selectedMember.savingBalance : 0;
  const newBalance =
    actionType === 'DEPOSIT'
      ? currentBalance + (amount || 0)
      : currentBalance - (amount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      alert('Please select a member.');
      return;
    }
    if (amount <= 0) {
      alert('Please enter a valid transaction amount.');
      return;
    }
    if (actionType === 'WITHDRAW' && amount > currentBalance) {
      alert('Insufficient savings balance. Available: Rs. ' + currentBalance + ', Requested: Rs. ' + amount);
      return;
    }

    try {
      setSubmitting(true);
      setResultMessage(null);
      const res = await fetch('/api/accounting/members/saving', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberNo: selectedMember.memberNo,
          amount,
          type: actionType,
          savingType,
          paymentMethod,
          narration,
          bsDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to record saving transaction');
      setResultMessage({
        type: 'success',
        text: '✓ ' + data.message,
        journalNo: data.journalNo,
      });
      setSelectedMember({ ...selectedMember, savingBalance: newBalance });
      setTimeout(() => {
        router.push('/accounting/members/' + selectedMember.memberNo);
      }, 1500);
    } catch (err: any) {
      setResultMessage({ type: 'error', text: err.message || 'Saving entry recording failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="Saving Entry Form">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between no-print">
          <Link href="/accounting/members" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Back to Members
          </Link>
          <span className="text-xs text-slate-500">Saving_Book & 4-Khata Liabilities 05 Integration</span>
        </div>
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-8 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-0.5 rounded uppercase">
              बचत खाता प्रविष्टि (Saving Book)
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">Saving Entry Form (सदस्य बचत प्रविष्टि फारम)</h1>
            <p className="text-xs text-slate-500 mt-0.5">Record member deposits or withdrawals. Automatically appends to Saving_Book, updates Member-Data, and posts to Liabilities 05 and Assets-04.</p>
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
              entryType="SAVING"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">कारोबार किसिम</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setActionType('DEPOSIT')} className={`py-2 px-3 rounded-lg text-xs font-bold border ${actionType === 'DEPOSIT' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-700'}`}>
                    📥 बचत जम्मा (Deposit Cr.)
                  </button>
                  <button type="button" onClick={() => setActionType('WITHDRAW')} className={`py-2 px-3 rounded-lg text-xs font-bold border ${actionType === 'WITHDRAW' ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-700'}`}>
                    📤 बचत फिर्ता (Withdraw Dr.)
                  </button>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">बचतको प्रकार</label>
                <select value={savingType} onChange={(e) => setSavingType(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white">
                  <option value="नियमित बचत">नियमित बचत (Regular Savings)</option>
                  <option value="ऐच्छिक बचत">ऐच्छिक बचत (Voluntary Savings)</option>
                  <option value="बाल बचत">बाल बचत (Child Savings)</option>
                  <option value="आवधिक बचत">आवधिक बचत (Fixed Term)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">रकम / Amount (रु.) *</label>
                <input type="number" step="0.01" min="1" required value={amount || ''} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} className="w-full text-base font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
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
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500 block">साविक मौज्दात:</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{formatCurrencyNPR(currentBalance)}</span>
              </div>
              <div className="text-center font-bold text-base text-slate-400">{actionType === 'DEPOSIT' ? '+' : '-'}</div>
              <div>
                <span className="text-slate-500 block">कारोबार रकम:</span>
                <span className={`font-mono font-bold text-sm ${actionType === 'DEPOSIT' ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrencyNPR(amount)}</span>
              </div>
              <div className="text-center font-bold text-base text-slate-400">=</div>
              <div className="text-right">
                <span className="text-slate-500 block">नयाँ बाँकी मौज्दात:</span>
                <span className="font-mono font-bold text-base text-slate-900">{formatCurrencyNPR(newBalance)}</span>
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">कैफियत / व्यहोरा</label>
              <input type="text" value={narration} onChange={(e) => setNarration(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg" />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Link href="/accounting/members" className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium">Cancel</Link>
              <button type="submit" disabled={submitting} className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md transition">
                {submitting ? 'Saving...' : 'Record Saving (बचत सुरक्षित गर्नुहोस्)'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
