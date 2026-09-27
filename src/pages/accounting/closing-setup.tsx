import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import Link from 'next/link';
import { YearEndAuditReport, YearEndChecklistItem } from '../../lib/closingEngine';
import { formatCurrencyNPR, getCurrentBSDate } from '../../lib/nepaliDate';
import { AccountMaster, AuditLog } from '../../types/accounting';

export default function ClosingSetupPage() {
  const [activeStep, setActiveStep] = useState<'AUDIT' | 'ADJUST' | 'ALLOCATION' | 'ROLLOVER' | 'CERTIFICATE' | 'AUDIT_LOG'>('AUDIT');
  const [report, setReport] = useState<YearEndAuditReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fiscal Year Settings (Default to active FY 2083/84)
  const [currentFY, setCurrentFY] = useState('2083/84');
  const [nextFY, setNextFY] = useState('2084/85');
  const [closingDate, setClosingDate] = useState('2084-03-31');
  const [newYearOpeningDate, setNewYearOpeningDate] = useState('2084-04-01');

  // Surplus Allocation State (Cooperative Act Sec 56)
  const [agmResolutionNo, setAgmResolutionNo] = useState('AGM-2083-RES-01');
  const [allocationDecisionDate, setAllocationDecisionDate] = useState(getCurrentBSDate());
  const [allocationSplits, setAllocationSplits] = useState([
    { accountCode: '20.1', accountName: 'साधारण जगेडा कोष (General Reserve - २५%)', percentage: 25, amount: 0, fundType: 'GENERAL_RESERVE' },
    { accountCode: '20.2', accountName: 'संरक्षित पूँजी फिर्ता कोष (Capital Return - २५%)', percentage: 25, amount: 0, fundType: 'CAPITAL_RETURN' },
    { accountCode: '20.3', accountName: 'सहकारी शिक्षा कोष (Cooperative Education - ५%)', percentage: 5, amount: 0, fundType: 'EDUCATION' },
    { accountCode: '20.4', accountName: 'कर्मचारी बोनस कोष (Staff Bonus - १०%)', percentage: 10, amount: 0, fundType: 'EMPLOYEE_BONUS' },
    { accountCode: '20.5', accountName: 'शेयर लाभांश कोष (Share Dividend - १५%)', percentage: 15, amount: 0, fundType: 'DIVIDEND' },
    { accountCode: '20.6', accountName: 'सहकारी प्रवर्द्धन कोष (Promotion Fund - ५%)', percentage: 5, amount: 0, fundType: 'OTHER' },
    { accountCode: '25', accountName: 'बाँकी संचित बचत (Retained Surplus - १५%)', percentage: 15, amount: 0, fundType: 'OTHER' },
  ]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Adjustment Account Selection / Creation
  const [selectedAdjAccountCode, setSelectedAdjAccountCode] = useState('9999');
  const [selectedSurplusAccountCode, setSelectedSurplusAccountCode] = useState('25');
  const [customCOAModal, setCustomCOAModal] = useState(false);
  const [newCOACode, setNewCOACode] = useState('');
  const [newCOAName, setNewCOAName] = useState('');
  const [newCOANameNp, setNewCOANameNp] = useState('');
  const [newCOAGroup, setNewCOAGroup] = useState<'Liabilities 05' | 'Assets-04'>('Liabilities 05');

  // Manual Adjustment Lines
  const [manualModal, setManualModal] = useState(false);
  const [manualNarration, setManualNarration] = useState('वर्षान्त हिसाब मिलान प्रविष्टि');
  const [manualLines, setManualLines] = useState([
    { accountCode: '9999', accountName: 'हिसाब मिलान तथा सस्पेन्स खाता', accountGroup: 'Liabilities 05', normalBalance: 'CREDIT', debit: 0, credit: 0, narration: '' },
    { accountCode: '80', accountName: 'Cash in Hand (नगद मौज्दात)', accountGroup: 'Assets-04', normalBalance: 'DEBIT', debit: 0, credit: 0, narration: '' },
  ]);

  // Execution State & Result
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [closingResult, setClosingResult] = useState<any | null>(null);
  const [archiveSheets, setArchiveSheets] = useState(true);

  const fetchAuditReport = async (overrideFY?: string, overrideDate?: string) => {
    const fyToUse = overrideFY || currentFY;
    const dateToUse = overrideDate || closingDate;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/accounting/closing/audit?fiscalYear=${encodeURIComponent(fyToUse)}&asOfDate=${encodeURIComponent(dateToUse)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate audit report');
      }
      setReport(data.report);
      if (data.report.fiscalYear) setCurrentFY(data.report.fiscalYear);
    } catch (err: any) {
      setError(err?.message || 'Error loading audit data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initFiscalYearSettings = async () => {
      try {
        const res = await fetch('/api/accounting/settings/organization');
        const data = await res.json();
        const activeFY = data?.profile?.activeFiscalYear || '2083/84';
        const startYr = parseInt(activeFY.split('/')[0], 10) || 2083;
        const nextYrStart = startYr + 1;
        const nextYrEndShort = (nextYrStart + 1).toString().slice(-2);
        const nextFYVal = `${nextYrStart}/${nextYrEndShort}`;
        const closeDt = `${nextYrStart}-03-31`; // End of that fiscal year (Ashadh 31)
        const openDt = `${nextYrStart}-04-01`; // Start of next fiscal year (Shrawan 1)

        setCurrentFY(activeFY);
        setNextFY(nextFYVal);
        setClosingDate(closeDt);
        setNewYearOpeningDate(openDt);
        await fetchAuditReport(activeFY, closeDt);
      } catch (e) {
        await fetchAuditReport('2083/84', '2084-03-31');
      }
    };
    initFiscalYearSettings();
  }, []);

  // Auto-calculate statutory surplus fund amounts when report loads
  useEffect(() => {
    if (report && report.nominalAccounts.netSurplus > 0) {
      const net = report.nominalAccounts.netSurplus;
      setAllocationSplits((prev) =>
        prev.map((item) => ({
          ...item,
          amount: Math.round(((net * item.percentage) / 100) * 100) / 100,
        }))
      );
    }
  }, [report]);

  const fetchAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch('/api/accounting/audit-log');
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeStep === 'AUDIT_LOG') {
      fetchAuditLogs();
    }
  }, [activeStep]);

  // Execute Statutory Surplus Allocation (Cooperative Act Sec 56)
  const handleExecuteSurplusAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agmResolutionNo.trim()) {
      alert('कृपया साधारण सभा / सञ्चालक समिति निर्णय नम्बर उल्लेख गर्नुहोस्।');
      return;
    }
    const totalAlloc = allocationSplits.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const netSurplus = report?.nominalAccounts.netSurplus || 0;
    if (Math.abs(totalAlloc - netSurplus) > 0.05 && netSurplus > 0) {
      const proceed = window.confirm(
        `बाँडफाँड रकम (रु. ${totalAlloc.toLocaleString()}) र कुल खुद बचत (रु. ${netSurplus.toLocaleString()}) बीच रु. ${Math.abs(totalAlloc - netSurplus).toLocaleString()} को अन्तर छ। के तपाईं अगाडि बढ्न निश्चित हुनुहुन्छ?`
      );
      if (!proceed) return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setActionSuccess(null);
      const res = await fetch('/api/accounting/closing/allocate-surplus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fiscalYear: currentFY,
          decisionDate: allocationDecisionDate,
          agmResolutionNo,
          allocations: allocationSplits,
          user: 'Admin Auditor / Board',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Allocation failed');
      setActionSuccess(data.message);
      await fetchAuditReport();
      setActiveStep('ROLLOVER');
    } catch (err: any) {
      setError(err?.message || 'Surplus allocation failed');
    } finally {
      setActionLoading(false);
    }
  };

  // 1. Auto-Fix Differences
  const handleAutoFix = async () => {
    try {
      setActionLoading(true);
      setActionSuccess(null);
      setError(null);
      const res = await fetch('/api/accounting/closing/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'AUTO',
          fiscalYear: currentFY,
          closingDate,
          adjustmentAccountCode: selectedAdjAccountCode,
          user: 'Admin Auditor',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Auto-fix failed');
      setActionSuccess(data.message);
      await fetchAuditReport();
    } catch (err: any) {
      setError(err?.message || 'Auto-fix error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Create Custom COA
  const handleCreateCOA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCOACode || !newCOANameNp) {
      alert('Account code and Nepali name are required');
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch('/api/accounting/closing/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'CREATE_COA',
          newAccount: {
            code: newCOACode,
            name: newCOAName || newCOANameNp,
            nameNp: newCOANameNp,
            group: newCOAGroup,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create account');
      alert(data.message);
      setSelectedAdjAccountCode(data.account.code);
      setCustomCOAModal(false);
      setNewCOACode('');
      setNewCOAName('');
      setNewCOANameNp('');
      await fetchAuditReport();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Post Manual Adjustment
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalDr = manualLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCr = manualLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    if (Math.abs(totalDr - totalCr) > 0.01) {
      alert(`Debit (Rs. ${totalDr}) must equal Credit (Rs. ${totalCr})!`);
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch('/api/accounting/closing/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'MANUAL',
          fiscalYear: currentFY,
          closingDate,
          manualLines,
          narration: manualNarration,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Adjustment failed');
      setManualModal(false);
      setActionSuccess(data.message);
      await fetchAuditReport();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Execute Year-End Closing and Rollover to Opening Balances
  const handleExecuteClosing = async () => {
    const confirmPrompt = window.confirm(
      `के तपाईं आर्थिक वर्ष ${currentFY} को सम्पूर्ण खर्च र आम्दानी बन्द गरी, नयाँ आर्थिक वर्ष ${nextFY} को प्रारम्भिक मौज्दात (अ=ल्या=) कायम गर्न निश्चित हुनुहुन्छ?`
    );
    if (!confirmPrompt) return;

    try {
      setActionLoading(true);
      setError(null);
      setActionSuccess(null);
      const res = await fetch('/api/accounting/closing/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentFiscalYear: currentFY,
          nextFiscalYear: nextFY,
          closingDate,
          newYearOpeningDate,
          surplusAccountCode: selectedSurplusAccountCode,
          archivePreviousYearSheets: archiveSheets,
          user: 'Admin Auditor',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Year-end closing failed');
      setClosingResult(data);
      setActionSuccess(data.message);
      setActiveStep('CERTIFICATE');
      await fetchAuditReport();
    } catch (err: any) {
      setError(err?.message || 'Execution error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Layout title="Fiscal Year Closing, Audit & Rollover Suite">
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center text-2xl shadow-xs">
              🔒
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded uppercase">
                  लेखा वर्षान्त इन्जिन (Year-End Closing Suite)
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-mono">आ.व. {currentFY} → {nextFY}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                वर्षान्त हिसाब बन्द, अडिट तथा अ=ल्या= प्रणाली (Fiscal Year End & B/F)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                लेखापरीक्षण प्रतिवेदन, स्वतः फरक मिलान (Auto/Manual Fix), नाफा-नोक्सान बन्द र नयाँ वर्षको अ=ल्या= सुरुवाती मौज्दात
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAuditReport()}
              disabled={loading || actionLoading}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center space-x-1"
            >
              <span className={loading ? 'animate-spin' : ''}>🔄</span>
              <span>पुनः अडिट जाँच्नुहोस्</span>
            </button>
            <Link
              href="/accounting/sheets-status?tab=Cross-Check"
              className="px-3.5 py-2 text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded-lg transition"
            >
              ⚖️ ४-खाता मिलान हेर्नुहोस्
            </Link>
          </div>
        </div>

        {/* Global Notifications */}
        {actionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs sm:text-sm font-semibold flex justify-between items-center shadow-xs">
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs sm:text-sm font-semibold flex justify-between items-center shadow-xs">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">✕</button>
          </div>
        )}

        {/* Stepper Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveStep('AUDIT')}
            className={`py-2 px-2.5 rounded-lg transition flex items-center justify-center space-x-1 ${
              activeStep === 'AUDIT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>१.</span>
            <span>📊 अडिट र ९-चेकलिस्ट</span>
          </button>

          <button
            onClick={() => setActiveStep('ADJUST')}
            className={`py-2 px-2.5 rounded-lg transition flex items-center justify-center space-x-1 ${
              activeStep === 'ADJUST' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>२.</span>
            <span>⚖️ फरक मिलान र COA</span>
          </button>

          <button
            onClick={() => setActiveStep('ALLOCATION')}
            className={`py-2 px-2.5 rounded-lg transition flex items-center justify-center space-x-1 ${
              activeStep === 'ALLOCATION' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>३.</span>
            <span>🏛️ बचत बाँडफाँड</span>
          </button>

          <button
            onClick={() => setActiveStep('ROLLOVER')}
            className={`py-2 px-2.5 rounded-lg transition flex items-center justify-center space-x-1 ${
              activeStep === 'ROLLOVER' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>४.</span>
            <span>🚀 बन्द तथा अ=ल्या=</span>
          </button>

          <button
            onClick={() => setActiveStep('CERTIFICATE')}
            className={`py-2 px-2.5 rounded-lg transition flex items-center justify-center space-x-1 ${
              activeStep === 'CERTIFICATE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>५.</span>
            <span>📜 प्रमाणपत्र</span>
          </button>

          <button
            onClick={() => setActiveStep('AUDIT_LOG')}
            className={`py-2 px-2.5 rounded-lg transition flex items-center justify-center space-x-1 ${
              activeStep === 'AUDIT_LOG' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>६.</span>
            <span>📋 अडिट ट्रेल</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: AUDIT REPORT & DIFFERENCE DETECTION */}
        {/* ========================================================================= */}
        {activeStep === 'AUDIT' && report && (
          <div className="space-y-6">
            {/* Readiness Banner */}
            <div
              className={`p-5 rounded-xl border shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                report.isAllBalanced
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-950'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-950'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{report.isAllBalanced ? '✅' : '⚠️'}</span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    {report.isAllBalanced
                      ? 'बहीखाता पूर्ण सन्तुलित छ (१००% Ready to Close)'
                      : 'हिसाबमा बेमेल फेला पर्यो (Discrepancies Require Adjustment)'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {report.isAllBalanced
                      ? 'सन्तुलन परीक्षण, ४-खाता, र वासलात समीकरण सबै बराबर छन्। सिधै वर्षान्त बन्द गर्न सकिन्छ।'
                      : `कुल ${report.discrepancies.length} वटा बेमेल फेला परेको छ। वर्षान्त अगाडि स्वतः वा म्यानुअल मिलान गर्नुहोस्।`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!report.isAllBalanced ? (
                  <button
                    onClick={() => setActiveStep('ADJUST')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    ⚡ फरक मिलान गर्न जानुहोस्
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveStep('ROLLOVER')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    🚀 वर्षान्त बन्द प्रक्रिया सुरु गर्नुहोस् →
                  </button>
                )}
              </div>
            </div>

            {/* 4 Comparative Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Trial Balance */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-500 font-semibold">१. सन्तुलन परीक्षण (Trial Balance)</span>
                  <span
                    className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                      report.trialBalance.isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {report.trialBalance.isBalanced ? '✓ Balanced' : '✕ Imbalanced'}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-2xs">
                  <div className="flex justify-between text-slate-600">
                    <span>कुल डेबिट (Dr):</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrencyNPR(report.trialBalance.totalDebit)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>कुल क्रेडिट (Cr):</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrencyNPR(report.trialBalance.totalCredit)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-semibold">
                    <span className="text-slate-500">फरक (Diff):</span>
                    <span className={`font-mono ${report.trialBalance.isBalanced ? 'text-emerald-700' : 'text-rose-700 font-bold'}`}>
                      {formatCurrencyNPR(report.trialBalance.difference)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Share Capital Control vs Books */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-500 font-semibold">२. शेयर पूँजी (Share Book)</span>
                  <span
                    className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                      report.crossCheck.share.isMatched ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {report.crossCheck.share.isMatched ? '✓ Matched' : '⚠️ Diff'}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-2xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Liabilities 05 (१०):</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrencyNPR(report.crossCheck.share.khataBalance)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>सदस्य लगत (Books):</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrencyNPR(report.crossCheck.share.bookBalance)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-semibold">
                    <span className="text-slate-500">फरक (Diff):</span>
                    <span className={`font-mono ${report.crossCheck.share.isMatched ? 'text-emerald-700' : 'text-amber-700 font-bold'}`}>
                      {formatCurrencyNPR(Math.abs(report.crossCheck.share.difference))}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Member Savings Control vs Books */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-500 font-semibold">३. सदस्य बचत (Saving Book)</span>
                  <span
                    className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                      report.crossCheck.saving.isMatched ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {report.crossCheck.saving.isMatched ? '✓ Matched' : '⚠️ Diff'}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-2xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Liabilities 05 (३०):</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrencyNPR(report.crossCheck.saving.khataBalance)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>बचत लगत (Books):</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrencyNPR(report.crossCheck.saving.bookBalance)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-semibold">
                    <span className="text-slate-500">फरक (Diff):</span>
                    <span className={`font-mono ${report.crossCheck.saving.isMatched ? 'text-emerald-700' : 'text-amber-700 font-bold'}`}>
                      {formatCurrencyNPR(Math.abs(report.crossCheck.saving.difference))}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Net Surplus / Profit Preview */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-500 font-semibold">४. खुद बचत/मुनाफा (P&L Surplus)</span>
                  <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {report.nominalAccounts.netSurplus >= 0 ? 'मुनाफा (Surplus)' : 'नोक्सान (Deficit)'}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-2xs">
                  <div className="flex justify-between text-slate-600">
                    <span>कुल आम्दानी (Income):</span>
                    <span className="font-mono font-bold text-emerald-700">{formatCurrencyNPR(report.nominalAccounts.totalIncome)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>कुल खर्च (Expenses):</span>
                    <span className="font-mono font-bold text-rose-700">{formatCurrencyNPR(report.nominalAccounts.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 font-semibold">
                    <span className="text-slate-500">स्थानान्तरण बचत:</span>
                    <span className="font-mono font-bold text-indigo-900">{formatCurrencyNPR(report.nominalAccounts.netSurplus)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 9-Point Statutory Audit Checklist Grid */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <span>📑 सहकारी वर्षान्त ९-बुँदे लेखापरीक्षण चेकलिस्ट (9-Point Year-End Audit Checklist)</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {report.checklist?.filter((c) => c.status === 'VERIFIED').length || 0}/9 प्रमाणित
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    सहकारी ऐन, मापदण्ड तथा दोहोरो लेखा प्रणाली अनुसार वर्षान्त बन्द पूर्व अनिवार्य प्रमाणित हुनुपर्ने ९ मुख्य आधारहरू
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded">
                    ✓ प्रमाणित
                  </span>
                  <span className="inline-flex items-center gap-1 text-2xs font-semibold text-amber-800 bg-amber-50 px-2 py-1 rounded">
                    ⚠️ ध्यानाकर्षण
                  </span>
                  <span className="inline-flex items-center gap-1 text-2xs font-semibold text-rose-800 bg-rose-50 px-2 py-1 rounded">
                    ✕ मिलान आवश्यक
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                {report.checklist?.map((chk) => {
                  const isVerified = chk.status === 'VERIFIED';
                  const isWarning = chk.status === 'WARNING';

                  return (
                    <div
                      key={chk.id}
                      className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                        isVerified
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isWarning
                          ? 'bg-amber-50/50 border-amber-300'
                          : 'bg-rose-50/50 border-rose-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-2xs font-bold text-slate-500">
                            #{chk.order}. {chk.id}
                          </span>
                          <span
                            className={`text-3xs font-bold px-2 py-0.5 rounded-full uppercase ${
                              isVerified
                                ? 'bg-emerald-100 text-emerald-800'
                                : isWarning
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-rose-100 text-rose-900'
                            }`}
                          >
                            {isVerified ? '✓ प्रमाणित' : isWarning ? '⚠️ ध्यानाकर्षण' : '✕ मिलान आवश्यक'}
                          </span>
                        </div>

                        <h4 className="font-bold text-xs text-slate-900 mt-1.5 leading-snug">
                          {chk.titleNp}
                        </h4>
                        <p className="text-3xs text-slate-500 font-medium">
                          {chk.titleEn}
                        </p>

                        <p className="text-2xs text-slate-600 mt-2 leading-relaxed bg-white/70 p-2 rounded-lg border border-slate-200/60">
                          {chk.details}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between">
                        {typeof chk.summaryAmount === 'number' && chk.summaryAmount > 0 ? (
                          <span className="text-2xs font-mono font-bold text-rose-700">
                            फरक: {formatCurrencyNPR(chk.summaryAmount)}
                          </span>
                        ) : (
                          <span className="text-3xs text-emerald-700 font-semibold">
                            सन्तुलन ठीक छ
                          </span>
                        )}

                        {chk.actionUrl && (
                          <Link
                            href={chk.actionUrl}
                            className="text-2xs font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-0.5"
                          >
                            <span>खाता जाँच्नुहोस्</span>
                            <span>→</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Discrepancy Breakdown Table */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <span>📋 लेखापरीक्षण बेमेल सूची (Identified Audit Discrepancies)</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {report.discrepancies.length} विषय
                  </span>
                </h3>
                {report.discrepancies.length > 0 && (
                  <button
                    onClick={() => setActiveStep('ADJUST')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    ⚡ स्वतः मिलान गर्नुहोस् (Auto-Fix)
                  </button>
                )}
              </div>

              {report.discrepancies.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-3xl block">✨</span>
                  <p className="font-bold text-slate-800 text-sm mt-2">कुनै पनि बेमेल भेटिएन!</p>
                  <p className="text-xs text-slate-500 mt-1">
                    सबै खाताहरू पूर्ण सन्तुलित छन्। तपाईं वर्षान्त बन्द र अ=ल्या= प्रक्रिया अघि बढाउन सक्नुहुन्छ।
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-2xs uppercase tracking-wider">
                        <th className="py-2.5 px-3">प्रकार (Type)</th>
                        <th className="py-2.5 px-3">विवरण (Description)</th>
                        <th className="py-2.5 px-3 text-right">फरक रकम (Difference)</th>
                        <th className="py-2.5 px-3 text-center">गम्भीरता (Severity)</th>
                        <th className="py-2.5 px-3 text-center">कार्य (Action)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.discrepancies.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-3 font-semibold text-slate-900">{d.titleNp}</td>
                          <td className="py-3 px-3 text-slate-600 max-w-md">{d.description}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">
                            {formatCurrencyNPR(d.difference)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-3xs font-bold ${
                                d.severity === 'HIGH'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {d.severity}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedAdjAccountCode(d.suggestedAccountCode || '9999');
                                setActiveStep('ADJUST');
                              }}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold text-2xs"
                            >
                              मिलाउनुहोस्
                            </button>
                            <Link
                              href="/accounting/journal-register"
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-2xs"
                            >
                              भौचर हेर्नुहोस्
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: FIX DIFFERENCES & SELECT/CREATE ADJUSTMENT COA */}
        {/* ========================================================================= */}
        {activeStep === 'ADJUST' && report && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-6">
              <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    २. फरक मिलान तथा खाता (COA) छनोट (Reconciliation & COA Selection)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    वर्षान्त हिसाब बन्द गर्न बाँकी रहेका फरकहरूलाई सस्पेन्स, जगेडा कोष वा संचित बचत खातामा समायोजन गर्नुहोस्।
                  </p>
                </div>
                <button
                  onClick={() => setCustomCOAModal(true)}
                  className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition flex items-center space-x-1"
                >
                  <span>➕</span>
                  <span>नयाँ खाता (COA) बनाउनुहोस्</span>
                </button>
              </div>

              {/* COA Selection & 1-Click Auto Fix */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      समायोजन गरिने खाता (Select Adjustment COA Account) *
                    </label>
                    <select
                      value={selectedAdjAccountCode}
                      onChange={(e) => setSelectedAdjAccountCode(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      {report.availableClosingAccounts.map((a) => (
                        <option key={a.code} value={a.code}>
                          [{a.code}] {a.nameNp} ({a.group})
                        </option>
                      ))}
                    </select>
                    <span className="text-3xs text-slate-500 mt-1 block">
                      कुनै बेमेल रकम भेटिएमा यो खातामा काउण्टर प्रविष्टि गरी बहीखाता पूर्ण सन्तुलित बनाइनेछ।
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      नाफा/नोक्सान स्थानान्तरण खाता (Surplus Transfer COA) *
                    </label>
                    <select
                      value={selectedSurplusAccountCode}
                      onChange={(e) => setSelectedSurplusAccountCode(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      {report.availableClosingAccounts.map((a) => (
                        <option key={a.code} value={a.code}>
                          [{a.code}] {a.nameNp} ({a.group})
                        </option>
                      ))}
                    </select>
                    <span className="text-3xs text-slate-500 mt-1 block">
                      वर्षान्तमा सबै आम्दानी र खर्चको खुद बचत यो खातामा स्थानान्तरण गरिनेछ।
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      ⚡ १-क्लिक स्वचालित मिलान (1-Click Auto-Reconciliation)
                    </span>
                    <span className="text-2xs text-slate-500">
                      प्रणालीले सबै फेला परेका बेमेलहरूको लागि काउण्टर भौचर प्रविष्टि गरी तुरुन्तै १००% सन्तुलित बनाउँछ।
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setManualModal(true)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition"
                    >
                      ✏️ म्यानुअल मिलान
                    </button>
                    <button
                      type="button"
                      onClick={handleAutoFix}
                      disabled={actionLoading}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center space-x-1"
                    >
                      <span className={actionLoading ? 'animate-spin' : ''}>⚡</span>
                      <span>सबै फरक स्वतः मिलाउनुहोस्</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Back to Step 1 or Next Step */}
              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={() => setActiveStep('AUDIT')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  ← १. अडिट प्रतिवेदनमा फर्कनुहोस्
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep('ALLOCATION')}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
                >
                  ३. बचत बाँडफाँड (Surplus Allocation) मा जानुहोस् →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: STATUTORY SURPLUS ALLOCATION (सहकारी ऐन २०७४ दफा ५६ बचत बाँडफाँड) */}
        {/* ========================================================================= */}
        {activeStep === 'ALLOCATION' && report && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-8 space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded uppercase">
                  सहकारी ऐन, २०७४ दफा ५६ बमोजिम वैधानिक कोष बाँडफाँड
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  वार्षिक खुद बचत (नाफा) बाँडफाँड भौचर खडा (Statutory Surplus Fund Allocation)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  सहकारी ऐन अनुसार वार्षिक खुद बचतलाई स्वतः पूँजीकरण गर्न पाइँदैन। साधारण सभा/सञ्चालक समितिको निर्णय बमोजिम जगेडा कोष (न्यूनतम २५%), संरक्षित पूँजी फिर्ता कोष (न्यूनतम २५%) लगायत वैधानिक कोषहरूमा बाँडफाँड गरी आधिकारिक भौचर खडा गरिन्छ।
                </p>
              </div>

              {/* Net Surplus Card */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-2xs font-bold uppercase text-indigo-700 tracking-wider">
                    कुल बाँडफाँड योग्य खुद बचत (Net Surplus to Allocate)
                  </span>
                  <div className="text-2xl font-black font-mono text-indigo-950 mt-0.5">
                    {formatCurrencyNPR(report.nominalAccounts.netSurplus)}
                  </div>
                  <span className="text-2xs text-slate-600 mt-0.5 block">
                    आम्दानी रु. {report.nominalAccounts.totalIncome.toLocaleString()} - खर्च रु. {report.nominalAccounts.totalExpenses.toLocaleString()}
                  </span>
                </div>
                <div className="text-xs font-semibold text-right">
                  <span className="text-slate-500 block">आर्थिक वर्ष: {currentFY}</span>
                  <span className="text-emerald-700 font-bold block mt-0.5">सन्तुलित तथा प्रमाणित ✓</span>
                </div>
              </div>

              {/* Allocation Form */}
              <form onSubmit={handleExecuteSurplusAllocation} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      साधारण सभा / सञ्चालक समिति निर्णय नं (AGM / Board Resolution No.) *
                    </label>
                    <input
                      type="text"
                      value={agmResolutionNo}
                      onChange={(e) => setAgmResolutionNo(e.target.value)}
                      placeholder="e.g. AGM-2083-RES-01"
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      निर्णय मिति (Decision Date BS) *
                    </label>
                    <input
                      type="text"
                      value={allocationDecisionDate}
                      onChange={(e) => setAllocationDecisionDate(e.target.value)}
                      placeholder="e.g. 2083-04-15"
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono bg-white"
                      required
                    />
                  </div>
                </div>

                {/* Fund Splits Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-2xs uppercase">
                        <th className="py-2.5 px-3">खाता कोड</th>
                        <th className="py-2.5 px-3">कोष तथा बाँडफाँड शीर्षक</th>
                        <th className="py-2.5 px-3 text-center">कानुनी मापदण्ड</th>
                        <th className="py-2.5 px-3 text-right w-24">प्रतिशत (%)</th>
                        <th className="py-2.5 px-3 text-right w-36">बाँडफाँड रकम (रु.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allocationSplits.map((split, idx) => (
                        <tr key={split.accountCode} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {split.accountCode}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {split.accountName}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {split.accountCode === '20.1' || split.accountCode === '20.2' ? (
                              <span className="bg-amber-100 text-amber-900 text-3xs font-bold px-2 py-0.5 rounded">
                                न्यूनतम २५% अनिवार्य
                              </span>
                            ) : (
                              <span className="text-slate-400 text-3xs">साधारण सभा निर्णय अनुसार</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={split.percentage}
                              onChange={(e) => {
                                const newPct = parseFloat(e.target.value) || 0;
                                const net = report.nominalAccounts.netSurplus;
                                const updated = [...allocationSplits];
                                updated[idx].percentage = newPct;
                                updated[idx].amount = Math.round(((net * newPct) / 100) * 100) / 100;
                                setAllocationSplits(updated);
                              }}
                              className="w-20 text-right px-2 py-1 border border-slate-300 rounded font-mono text-xs font-bold"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrencyNPR(split.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t border-slate-300">
                        <td colSpan={3} className="py-2.5 px-3 text-right text-slate-700">
                          कुल जम्मा (Total Allocation):
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span
                            className={
                              Math.abs(allocationSplits.reduce((s, i) => s + i.percentage, 0) - 100) < 0.1
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }
                          >
                            {allocationSplits.reduce((s, i) => s + i.percentage, 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                          {formatCurrencyNPR(allocationSplits.reduce((s, i) => s + i.amount, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Statutory Validation Notice */}
                {Math.abs(allocationSplits.reduce((s, i) => s + i.percentage, 0) - 100) >= 0.1 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-semibold flex items-center gap-2">
                    <span>⚠️</span>
                    <span>कुल बाँडफाँड १००% हुनुपर्छ। हाल {allocationSplits.reduce((s, i) => s + i.percentage, 0).toFixed(1)}% मात्र छ।</span>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveStep('ADJUST')}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    ← २. फरक मिलानमा फर्कनुहोस्
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep('ROLLOVER')}
                      className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition"
                    >
                      बाँडफाँड छाडेर सिधै बन्द गर्ने →
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center space-x-1.5"
                    >
                      <span className={actionLoading ? 'animate-spin' : ''}>🏛️</span>
                      <span>वैधानिक बाँडफाँड भौचर खडा गर्नुहोस् (Post Allocation Journal)</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: EXECUTE CLOSING & ROLLOVER (अन्तिम बन्द र नयाँ वर्षको अ=ल्या=) */}
        {/* ========================================================================= */}
        {activeStep === 'ROLLOVER' && report && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-8 space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded uppercase">
                  अन्तिम वर्षान्त बन्द र सुरुवाती मौज्दात (Final Year-End Close & B/F)
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  आर्थिक वर्ष {currentFY} बन्द गरी {nextFY} को अ=ल्या= कायम गर्नुहोस्
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  यस प्रक्रियाले खर्च र आम्दानी खाताहरू बन्द गर्दछ र सम्पूर्ण सम्पत्ति तथा दायित्वको अन्तिम मौज्दात नयाँ आर्थिक वर्षको सुरुवाती मौज्दात (अ=ल्या= भौचर) मा रूपान्तरण गर्दछ।
                </p>
              </div>

              {/* Rollover Settings Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">बन्द गरिने आर्थिक वर्ष (Current FY)</label>
                  <input
                    type="text"
                    value={currentFY}
                    onChange={(e) => setCurrentFY(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">नयाँ आर्थिक वर्ष (Next FY)</label>
                  <input
                    type="text"
                    value={nextFY}
                    onChange={(e) => setNextFY(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">वर्षान्त अन्तिम मिति (Closing BS Date)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={closingDate}
                      onChange={(e) => setClosingDate(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => fetchAuditReport(currentFY, closingDate)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg whitespace-nowrap"
                    >
                      🔄 जाँच्नुहोस्
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">नयाँ वर्ष सुरु मिति (Opening BS Date)</label>
                  <input
                    type="text"
                    value={newYearOpeningDate}
                    onChange={(e) => setNewYearOpeningDate(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Zero Balances Warning */}
              {report.balanceSheet.totalAssets === 0 && report.balanceSheet.totalLiabilities === 0 && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950">
                    <span>⚠️</span>
                    <span>कुनै पनि सम्पत्ति वा दायित्वको मौज्दात भेटिएन (Zero Balances Detected)</span>
                  </div>
                  <p className="text-2xs text-amber-800">
                    छनोट गरिएको वर्षान्त मिति ({closingDate}) सम्म कुनै कारोबार प्रविष्टि नभएकोले सरेर जाने सम्पत्ति र दायित्व शून्य छ। कृपया चालु आर्थिक वर्ष ({currentFY}) को कारोबार भएको मिति (उदा. {getCurrentBSDate()} वा २०८४-०३-३१) छनोट गरी <strong>"🔄 जाँच्नुहोस्"</strong> थिच्नुहोस्।
                  </p>
                </div>
              )}

              {/* Summary Impact Preview */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <h4 className="font-bold text-slate-900">वर्षान्त बन्द गर्दा हुने प्रमुख प्रभावहरू (Actions to Execute):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-2xs">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">१. नाफा-नोक्सान बन्द</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      आम्दानी रु. {report.nominalAccounts.totalIncome.toLocaleString()} - खर्च रु. {report.nominalAccounts.totalExpenses.toLocaleString()}
                    </span>
                    <span className="text-indigo-700 font-bold block mt-1">
                      खुद नाफा: रु. {report.nominalAccounts.netSurplus.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">२. सरेर जाने सम्पत्ति (Assets B/F)</span>
                    <span className="font-bold text-sky-800 text-sm mt-1 block font-mono">
                      {formatCurrencyNPR(report.balanceSheet.totalAssets)}
                    </span>
                    <span className="text-slate-400 block mt-1">नयाँ वर्षको डेबिट मौज्दात</span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">३. सरेर जाने दायित्व (Liab & Equity B/F)</span>
                    <span className="font-bold text-emerald-800 text-sm mt-1 block font-mono">
                      {formatCurrencyNPR(report.balanceSheet.totalLiabilities + report.nominalAccounts.netSurplus)}
                    </span>
                    <span className="text-slate-400 block mt-1">नयाँ वर्षको क्रेडिट मौज्दात</span>
                  </div>
                </div>
              </div>

              {/* Automated Google Sheets Archival Toggle */}
              <div className="p-4 bg-sky-50/80 border border-sky-200 rounded-xl space-y-2">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={archiveSheets}
                    onChange={(e) => setArchiveSheets(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block flex items-center space-x-1.5">
                      <span>📑</span>
                      <span>गत आर्थिक वर्ष ({currentFY}) का पानाहरू Google Sheet मा स्वतः नयाँ प्रतिलिपि (Archive Duplicate) गर्नुहोस् (सिफारिस गरिएको / Recommended)</span>
                    </span>
                    <span className="text-slate-600 block mt-1 leading-relaxed">
                      यसले Google Spreadsheet मा Assets-04, Liabilities 05, Expenses-02, Income-03, Journal, Trial Balance, र Balance Sheet का सम्पूर्ण कारोबारहरूलाई <strong>(2083-84 Archive)</strong> नाम दिएर सुरक्षित राख्दछ र चालु पानाहरूलाई नयाँ आर्थिक वर्षका लागि सफा गरी अ=ल्या= मौज्दात प्रविष्टि गर्दछ।
                    </span>
                  </div>
                </label>
              </div>

              {/* Execution Action Button */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveStep('ALLOCATION')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  ← ३. बचत बाँडफाँडमा फर्कनुहोस्
                </button>

                <button
                  type="button"
                  onClick={handleExecuteClosing}
                  disabled={actionLoading || (report.balanceSheet.totalAssets === 0 && report.balanceSheet.totalLiabilities === 0)}
                  className={`px-6 py-3 font-bold rounded-xl shadow-md transition flex items-center space-x-2 text-xs sm:text-sm ${
                    report.balanceSheet.totalAssets === 0 && report.balanceSheet.totalLiabilities === 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <span className={actionLoading ? 'animate-spin' : ''}>🔒</span>
                  <span>वर्षान्त हिसाब बन्द र अ=ल्या= सम्पन्न गर्नुहोस् (Close & Rollover)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: CLOSING CERTIFICATE & AUDIT CONFIRMATION */}
        {/* ========================================================================= */}
        {activeStep === 'CERTIFICATE' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-8 space-y-6 print:border-none print:shadow-none">
              <div className="border-b border-slate-200 pb-5 text-center space-y-1">
                <span className="text-4xl block mb-2">📜</span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-0.5 rounded-full inline-block">
                  वर्षान्त तथा लेखापरीक्षण प्रमाणपत्र (Year-End Audit Certificate)
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  श्री दीपशिखा कृषि सहकारी संस्था लि.
                </h2>
                <p className="text-xs text-slate-500">गौरीगंगा नगरपालिका-१, चौमाला, कैलाली • प्यान नं: ६०१२३४५६७</p>
                <p className="text-xs font-mono font-bold text-slate-800 pt-1">
                  आर्थिक वर्ष {currentFY} को अन्तिम बन्द तथा आ.व. {nextFY} को अ=ल्या= प्रतिवेदन
                </p>
              </div>

              {closingResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 text-xs">
                  <div className="flex justify-between font-bold text-emerald-900">
                    <span>बन्द भौचर (Closing Voucher):</span>
                    <span className="font-mono">{closingResult.nominalClosing?.closingJournal?.journalNo || 'CLS-COMPLETED'}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-900">
                    <span>अ=ल्या= प्रारम्भिक भौचर (Opening B/F Voucher):</span>
                    <span className="font-mono">{closingResult.openingRollover?.openingJournal?.journalNo || 'OPN-COMPLETED'}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-800">
                    <span>नयाँ सक्रिय आर्थिक वर्ष (New Active FY):</span>
                    <span className="font-mono font-bold">{nextFY}</span>
                  </div>

                  {/* Archived Sheets Confirmation */}
                  {closingResult.openingRollover?.archivedSheets && closingResult.openingRollover.archivedSheets.length > 0 && (
                    <div className="pt-2 border-t border-emerald-200/60">
                      <div className="font-bold text-emerald-950 mb-1.5 flex items-center space-x-1.5">
                        <span>🗄️</span>
                        <span>Google Sheet मा सफलतापूर्वक सुरक्षित (Duplicate) गरिएका पानाहरू:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {closingResult.openingRollover.archivedSheets.map((sheetTitle: string) => (
                          <span
                            key={sheetTitle}
                            className="px-2 py-0.5 bg-white border border-emerald-300 rounded font-mono text-2xs text-emerald-900 font-semibold"
                          >
                            📑 {sheetTitle}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Certified Financial Figures */}
              {report && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-2xs block">सरेर आएको कुल सम्पत्ति</span>
                    <span className="font-bold font-mono text-slate-900 text-sm mt-0.5 block">
                      {formatCurrencyNPR(report.balanceSheet.totalAssets)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-2xs block">सरेर आएको कुल दायित्व</span>
                    <span className="font-bold font-mono text-slate-900 text-sm mt-0.5 block">
                      {formatCurrencyNPR(report.balanceSheet.totalLiabilities)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-2xs block">संचित बचत / नाफा</span>
                    <span className="font-bold font-mono text-emerald-800 text-sm mt-0.5 block">
                      {formatCurrencyNPR(report.nominalAccounts.netSurplus)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-2xs block">बहीखाता सन्तुलन स्थिति</span>
                    <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
                      ✓ १००% सन्तुलित
                    </span>
                  </div>
                </div>
              )}

              {/* Signatures Row */}
              <div className="pt-12 grid grid-cols-3 gap-6 text-center text-xs font-semibold text-slate-700">
                <div className="border-t border-slate-300 pt-2">
                  <span>तयार गर्ने (लेखापाल)</span>
                </div>
                <div className="border-t border-slate-300 pt-2">
                  <span>जाँच गर्ने (लेखा सुपरिवेक्षण समिति)</span>
                </div>
                <div className="border-t border-slate-300 pt-2">
                  <span>सदर गर्ने (अध्यक्ष / व्यवस्थापक)</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-6 border-t border-slate-200 no-print">
                <button
                  type="button"
                  onClick={() => setActiveStep('AUDIT')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  ← अडिट प्रतिवेदनमा फर्कनुहोस्
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition flex items-center space-x-1"
                  >
                    <span>🖨️</span>
                    <span>प्रमाणपत्र प्रिन्ट गर्नुहोस्</span>
                  </button>
                  <button
                    onClick={() => setActiveStep('AUDIT_LOG')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
                  >
                    ६. अडिट ट्रेल हेर्नुहोस् →
                  </button>
                  <Link
                    href="/accounting/journal-register"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    नयाँ भौचर दर्ता हेर्नुहोस् →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: IMMUTABLE AUDIT LOG & REVERSAL HISTORY (अपरिवर्तनीय अडिट ट्रेल) */}
        {/* ========================================================================= */}
        {activeStep === 'AUDIT_LOG' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-white text-xs font-bold px-2 py-0.5 rounded">
                      कानुनी अपरिवर्तनीय अभिलेख
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">
                      ६. संस्थागत अडिट ट्रेल तथा भौचर इतिहास (Audit Trail & Reversal Register)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    सहकारी ऐन तथा दोहोरो लेखा प्रणाली अनुसार पोष्ट भइसकेका भौचरहरू कहिल्यै डिलिट हुँदैनन्। सबै उल्ट्याइएका भौचर (Reversed Entries), फरक मिलान र वर्षान्त बन्दका प्रमाणिक अडिट लगहरू यहाँ सुरक्षित राखिन्छ।
                  </p>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  disabled={loadingLogs}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                >
                  <span className={loadingLogs ? 'animate-spin' : ''}>🔄</span>
                  <span>रिफ्रेस गर्नुहोस्</span>
                </button>
              </div>

              {loadingLogs ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <div className="animate-spin text-2xl mb-2">⏳</div>
                  अडिट लगहरू लोड हुँदैछन्...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-3xl block">📋</span>
                  <p className="font-bold text-slate-800 text-sm mt-2">कुनै अडिट गतिविधि दर्ता भएको छैन।</p>
                  <p className="text-xs text-slate-500 mt-1">
                    भौचर उल्ट्याउँदा वा समायोजन गर्दा यहाँ स्वचालित रूपमा अपरिवर्तनीय लग रेकर्ड हुनेछ।
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-2xs uppercase">
                        <th className="py-2.5 px-3">समय (Timestamp)</th>
                        <th className="py-2.5 px-3">कार्य (Action)</th>
                        <th className="py-2.5 px-3">प्रयोगकर्ता (User)</th>
                        <th className="py-2.5 px-3">सन्दर्भ (Reference)</th>
                        <th className="py-2.5 px-3 text-center">स्थिति</th>
                        <th className="py-2.5 px-3">विस्तृत विवरण (Details)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log, i) => (
                        <tr key={log.logId || i} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono text-2xs text-slate-600 whitespace-nowrap">
                            {log.timestamp || '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-3xs font-bold font-mono ${
                                log.action === 'REVERSE_JOURNAL'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : log.action === 'SURPLUS_ALLOCATION'
                                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                                  : log.action === 'YEAR_END_CLOSING'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {log.user || 'System'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs font-bold text-slate-900">
                            {log.entityId || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-3xs font-bold ${
                                log.status === 'SUCCESS'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-md">
                            {log.details || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveStep('CERTIFICATE')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  ← ५. अडिट प्रमाणपत्रमा फर्कनुहोस्
                </button>
                <Link
                  href="/accounting/journal-register"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
                >
                  भौचर दर्ता किताब हेर्नुहोस् →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Create Custom COA Account */}
        {customCOAModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">नयाँ खाता (COA) दर्ता गर्नुहोस्</h3>
                <button onClick={() => setCustomCOAModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleCreateCOA} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">खाता कोड (Account Code) *</label>
                  <input
                    type="text"
                    value={newCOACode}
                    onChange={(e) => setNewCOACode(e.target.value)}
                    placeholder="e.g. 20.2, 25, 9999, 3900"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">खाताको नाम (नेपालीमा) *</label>
                  <input
                    type="text"
                    value={newCOANameNp}
                    onChange={(e) => setNewCOANameNp(e.target.value)}
                    placeholder="e.g. संचित नाफा/नोक्सान हिसाब"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">खाता समूह (Account Group) *</label>
                  <select
                    value={newCOAGroup}
                    onChange={(e) => setNewCOAGroup(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                  >
                    <option value="Liabilities 05">Liabilities 05 (दायित्व तथा कोष हिसाब)</option>
                    <option value="Assets-04">Assets-04 (सम्पत्ति हिसाब)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCustomCOAModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700"
                  >
                    खाता सुरक्षित गर्नुहोस्
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Manual Adjustment Entry */}
        {manualModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">म्यानुअल फरक समायोजन भौचर (Manual Audit Adjustment)</h3>
                <button onClick={() => setManualModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">समायोजन व्यहोरा (Narration) *</label>
                  <input
                    type="text"
                    value={manualNarration}
                    onChange={(e) => setManualNarration(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700">समायोजन हरफहरू (Debits & Credits)</label>
                  {manualLines.map((l, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="col-span-5">
                        <select
                          value={l.accountCode}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...manualLines];
                            updated[idx].accountCode = val;
                            setManualLines(updated);
                          }}
                          className="w-full text-2xs px-2 py-1.5 border border-slate-300 rounded bg-white"
                        >
                          {report?.availableClosingAccounts.map((a) => (
                            <option key={a.code} value={a.code}>
                              [{a.code}] {a.nameNp}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder="डेबिट (Dr)"
                          value={l.debit || ''}
                          onChange={(e) => {
                            const updated = [...manualLines];
                            updated[idx].debit = Number(e.target.value) || 0;
                            if (updated[idx].debit > 0) updated[idx].credit = 0;
                            setManualLines(updated);
                          }}
                          className="w-full text-2xs px-2 py-1.5 border border-slate-300 rounded font-mono"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder="क्रेडिट (Cr)"
                          value={l.credit || ''}
                          onChange={(e) => {
                            const updated = [...manualLines];
                            updated[idx].credit = Number(e.target.value) || 0;
                            if (updated[idx].credit > 0) updated[idx].debit = 0;
                            setManualLines(updated);
                          }}
                          className="w-full text-2xs px-2 py-1.5 border border-slate-300 rounded font-mono"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        {manualLines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setManualLines(manualLines.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setManualLines([
                        ...manualLines,
                        { accountCode: '9999', accountName: 'सस्पेन्स खाता', accountGroup: 'Liabilities 05', normalBalance: 'CREDIT', debit: 0, credit: 0, narration: '' },
                      ])
                    }
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    + हरफ थप्नुहोस्
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setManualModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700"
                  >
                    समायोजन भौचर प्रविष्टि गर्नुहोस्
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
