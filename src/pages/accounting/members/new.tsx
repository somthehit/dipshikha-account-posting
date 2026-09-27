import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Layout } from '../../../components/Layout';
import { getCurrentBSDate } from '../../../lib/nepaliDate';

export default function AddNewMemberPage() {
  const router = useRouter();
  const [memberNo, setMemberNo] = useState('');
  const [membershipDate, setMembershipDate] = useState(getCurrentBSDate());
  const [fullNameNp, setFullNameNp] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [gender, setGender] = useState<'महिला' | 'पुरुष' | 'अन्य' | 'संस्थागत'>('पुरुष');
  const [dobBs, setDobBs] = useState('2045-05-10');
  const [citizenshipNo, setCitizenshipNo] = useState('');
  const [citizenDistrict, setCitizenDistrict] = useState('कैलाली');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [spouseName, setSpouseName] = useState('');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('');
  const [province, setProvince] = useState('सुदूरपश्चिम प्रदेश');
  const [district, setDistrict] = useState('कैलाली');
  const [municipality, setMunicipality] = useState('गौरीगंगा नगरपालिका');
  const [wardNo, setWardNo] = useState('१');
  const [tole, setTole] = useState('चौमाला');
  const [initialShareKitta, setInitialShareKitta] = useState(10);
  const [admissionFee, setAdmissionFee] = useState(100);
  const [initialDeposit, setInitialDeposit] = useState(500);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadNextNo() {
      try {
        const res = await fetch('/api/accounting/members');
        const data = await res.json();
        if (data.members) {
          const nextIdx = data.members.length + 1;
          setMemberNo('M-' + nextIdx.toString().padStart(3, '0'));
        }
      } catch {
        setMemberNo('M-004');
      }
    }
    loadNextNo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!fullNameNp || !phone) {
      setErrorMessage('Please provide member full name and mobile phone number.');
      return;
    }
    try {
      setSubmitting(true);
      const fullAddress = municipality + '-' + wardNo + ', ' + tole + ', ' + district;
      const res = await fetch('/api/accounting/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberNo,
          fullName: fullNameNp,
          fullNameEn,
          citizenshipNo,
          phone,
          address: fullAddress,
          wardNo,
          gender,
          membershipDate,
          status: 'ACTIVE',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to register member.');

      const assignedMemberNo = data.member?.memberNo || memberNo;

      if (initialShareKitta > 0) {
        const shareRes = await fetch('/api/accounting/members/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberNo: assignedMemberNo,
            kitta: initialShareKitta,
            type: 'PURCHASE',
            paymentMethod,
            narration: 'Initial membership share subscription - [' + assignedMemberNo + '] ' + fullNameNp,
            bsDate: membershipDate,
          }),
        });
        if (!shareRes.ok) {
          const shareData = await shareRes.json();
          console.warn('Initial share subscription warning:', shareData.error);
        }
      }

      if (initialDeposit > 0) {
        const savingRes = await fetch('/api/accounting/members/saving', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberNo: assignedMemberNo,
            amount: initialDeposit,
            type: 'DEPOSIT',
            savingType: 'नियमित बचत',
            paymentMethod,
            narration: 'Initial regular savings deposit - [' + assignedMemberNo + '] ' + fullNameNp,
            bsDate: membershipDate,
          }),
        });
        if (!savingRes.ok) {
          const savingData = await savingRes.json();
          console.warn('Initial savings deposit warning:', savingData.error);
        }
      }

      alert('Member ' + assignedMemberNo + ' registered successfully!');
      router.push('/accounting/members/' + assignedMemberNo);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating member.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="Add New Member">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between no-print">
          <Link href="/accounting/members" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Back to Member Directory
          </Link>
          <span className="text-xs text-slate-500">श्री दीपशिखा कृषि सहकारी संस्था लि. • सदस्यता लगत</span>
        </div>
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-8 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded uppercase">
              नयाँ सदस्यता फारम
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">Add New Member (नयाँ सदस्य दर्ता फारम)</h1>
            <p className="text-xs text-slate-500 mt-0.5">Register member profile into Member-Data and initialize Share & Saving Books.</p>
          </div>
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800">
              ⚠️ {errorMessage}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b pb-2">१. सदस्यता तथा व्यक्तिगत पहिचान</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">सदस्य नं. (Member No) *</label>
                  <input type="text" required value={memberNo} onChange={(e) => setMemberNo(e.target.value)} className="w-full text-sm font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-emerald-800" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">सदस्यता मिति (Date BS)</label>
                  <input type="text" required value={membershipDate} onChange={(e) => setMembershipDate(e.target.value)} className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">लिङ्ग (Gender)</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value as any)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    <option value="पुरुष">पुरुष (Male)</option>
                    <option value="महिला">महिला (Female)</option>
                    <option value="अन्य">अन्य (Other)</option>
                    <option value="संस्थागत">संस्थागत (Institutional)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">सदस्यको पूरा नाम (नेपालीमा) *</label>
                  <input type="text" required placeholder="e.g. राम प्रसाद चौधरी" value={fullNameNp} onChange={(e) => setFullNameNp(e.target.value)} className="w-full text-sm font-semibold px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name (English)</label>
                  <input type="text" placeholder="e.g. Ram Prasad Chaudhary" value={fullNameEn} onChange={(e) => setFullNameEn(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">नागरिकता नं. (Citizenship No)</label>
                  <input type="text" value={citizenshipNo} onChange={(e) => setCitizenshipNo(e.target.value)} className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">नागरिकता जारी जिल्ला</label>
                  <input type="text" value={citizenDistrict} onChange={(e) => setCitizenDistrict(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">जन्म मिति (DOB BS)</label>
                  <input type="text" value={dobBs} onChange={(e) => setDobBs(e.target.value)} className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 border-b pb-2">२. ठेगाना तथा सम्पर्क</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">प्रदेश</label>
                  <input type="text" value={province} onChange={(e) => setProvince(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">जिल्ला</label>
                  <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">नगरपालिका</label>
                  <input type="text" value={municipality} onChange={(e) => setMunicipality(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">वडा नं.</label>
                  <input type="text" value={wardNo} onChange={(e) => setWardNo(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">टोल / गाउँ</label>
                  <input type="text" value={tole} onChange={(e) => setTole(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">मोबाइल नं. *</label>
                  <input type="text" required placeholder="98XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">इमेल</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 border-b pb-2">३. पारिवारिक तथा हकवाला विवरण</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">बाबुको नाम</label>
                  <input type="text" value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">आमाको नाम</label>
                  <input type="text" value={motherName} onChange={(e) => setMotherName(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">पति/पत्नीको नाम</label>
                  <input type="text" value={spouseName} onChange={(e) => setSpouseName(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">हकवालाको नाम (Nominee)</label>
                  <input type="text" value={nomineeName} onChange={(e) => setNomineeName(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">हकवालासँगको नाता</label>
                  <input type="text" placeholder="e.g. छोरा, छोरी, श्रीमान्, श्रीमती" value={nomineeRelation} onChange={(e) => setNomineeRelation(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 border-b pb-2">४. सुरुवाती शेयर तथा बचत खाता खोल्ने विवरण</h2>
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">सुरुवाती शेयर कित्ता</label>
                  <input type="number" min="1" value={initialShareKitta} onChange={(e) => setInitialShareKitta(parseInt(e.target.value, 10) || 0)} className="w-full text-sm font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                  <span className="text-2xs text-slate-500 mt-1 block">रकम: रु. {(initialShareKitta * 100).toLocaleString()}</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">प्रवेश शुल्क (रु.)</label>
                  <input type="number" value={admissionFee} onChange={(e) => setAdmissionFee(parseFloat(e.target.value) || 0)} className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">सुरुवाती नियमित बचत (रु.)</label>
                  <input type="number" value={initialDeposit} onChange={(e) => setInitialDeposit(parseFloat(e.target.value) || 0)} className="w-full text-sm font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg bg-white text-emerald-800" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">भुक्तानी माध्यम</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    <option value="CASH">नगद (Cash in Hand - ८०)</option>
                    <option value="BANK">बैंक (Cash at Bank - ९०)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 rounded-xl flex justify-between items-center text-sm font-bold text-slate-800">
              <span>कुल सुरुवाती रकम (Total Initial Payment):</span>
              <span className="text-lg font-mono text-emerald-900">
                Rs. {(initialShareKitta * 100 + admissionFee + initialDeposit).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Link href="/accounting/members" className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium">Cancel</Link>
              <button type="submit" disabled={submitting} className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md transition">
                {submitting ? 'Registering...' : 'Register Member (सदस्य दर्ता गर्नुहोस्)'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
