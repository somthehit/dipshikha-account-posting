import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Layout } from '../../../components/Layout';
import { getCurrentBSDate } from '../../../lib/nepaliDate';
import {
  TrialBalanceReport,
  ProfitLossReport,
  BalanceSheetReport,
  CashFlowReport,
  SalesReport,
  PurchaseReport,
} from '../../../types/reports';

type ReportTab = 'trial-balance' | 'profit-loss' | 'balance-sheet' | 'cash-flow' | 'sales' | 'purchases';

export default function AdvancedReportsPage() {
  const currentBS = getCurrentBSDate();
  const currentYear = currentBS.split('-')[0] || '2081';

  const [activeTab, setActiveTab] = useState<ReportTab>('trial-balance');
  const [bsDateFrom, setBsDateFrom] = useState(`${currentYear}-04-01`);
  const [bsDateTo, setBsDateTo] = useState(currentBS);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Report states
  const [trialBalance, setTrialBalance] = useState<TrialBalanceReport | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowReport | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [purchaseReport, setPurchaseReport] = useState<PurchaseReport | null>(null);

  // Fetch report data
  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        bsDateFrom,
        bsDateTo,
        asOfBSDate: bsDateTo,
      });

      if (activeTab === 'trial-balance') {
        const res = await fetch(`/api/accounting/reports/trial-balance?${params}`);
        const data = await res.json();
        if (data.success) setTrialBalance(data.report);
        else setError(data.message);
      } else if (activeTab === 'profit-loss') {
        const res = await fetch(`/api/accounting/reports/profit-loss?${params}`);
        const data = await res.json();
        if (data.success) setProfitLoss(data.report);
        else setError(data.message);
      } else if (activeTab === 'balance-sheet') {
        const res = await fetch(`/api/accounting/reports/balance-sheet?${params}`);
        const data = await res.json();
        if (data.success) setBalanceSheet(data.report);
        else setError(data.message);
      } else if (activeTab === 'cash-flow') {
        const res = await fetch(`/api/accounting/reports/cash-flow?${params}`);
        const data = await res.json();
        if (data.success) setCashFlow(data.report);
        else setError(data.message);
      } else if (activeTab === 'sales') {
        const res = await fetch(`/api/accounting/reports/sales?${params}`);
        const data = await res.json();
        if (data.success) setSalesReport(data.report);
        else setError(data.message);
      } else if (activeTab === 'purchases') {
        const res = await fetch(`/api/accounting/reports/purchases?${params}`);
        const data = await res.json();
        if (data.success) setPurchaseReport(data.report);
        else setError(data.message);
      }
    } catch (err: any) {
      setError(err?.message || 'रिपोर्ट लोड गर्न असफल भयो।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab]);

  const formatNpr = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return '०.००';
    return val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeTab === 'trial-balance' && trialBalance) {
      csvContent += 'Account Code,Account Name,Nepali Name,Group,Normal,Opening Dr,Opening Cr,Period Dr,Period Cr,Closing Dr,Closing Cr\n';
      trialBalance.items.forEach((i) => {
        csvContent += `"${i.accountCode}","${i.accountName}","${i.accountNameNp}","${i.accountGroup}","${i.normalBalance}",${i.openingDebit},${i.openingCredit},${i.periodDebit},${i.periodCredit},${i.closingDebit},${i.closingCredit}\n`;
      });
      csvContent += `Total,,,,,,${trialBalance.totalOpeningDebit},${trialBalance.totalOpeningCredit},${trialBalance.totalPeriodDebit},${trialBalance.totalPeriodCredit},${trialBalance.totalClosingDebit},${trialBalance.totalClosingCredit}\n`;
    } else if (activeTab === 'profit-loss' && profitLoss) {
      csvContent += 'Section,Account Code,Account Name,Amount\n';
      profitLoss.tradingRevenue.forEach((i) => csvContent += `"Revenue","${i.accountCode}","${i.accountNameNp}",${i.amount}\n`);
      profitLoss.otherIncome.forEach((i) => csvContent += `"Other Income","${i.accountCode}","${i.accountNameNp}",${i.amount}\n`);
      csvContent += `"Total Income",,,${profitLoss.totalIncome}\n`;
      profitLoss.operatingExpenses.forEach((i) => csvContent += `"Operating Expense","${i.accountCode}","${i.accountNameNp}",${i.amount}\n`);
      profitLoss.administrativeExpenses.forEach((i) => csvContent += `"Admin Expense","${i.accountCode}","${i.accountNameNp}",${i.amount}\n`);
      profitLoss.depreciationExpenses.forEach((i) => csvContent += `"Depreciation","${i.accountCode}","${i.accountNameNp}",${i.amount}\n`);
      csvContent += `"Total Expenses",,,${profitLoss.totalExpenses}\n`;
      csvContent += `"Net Surplus/Deficit",,,${profitLoss.netSurplus}\n`;
    } else if (activeTab === 'sales' && salesReport) {
      csvContent += 'Voucher No,Date BS,Party/Bill,Payment Mode,Gross,Discount,Net Amount\n';
      salesReport.entries.forEach((e) => {
        csvContent += `"${e.journalNo}","${e.dateBS}","${e.partyName}","${e.paymentMode}",${e.grossAmount},${e.discountAmount},${e.netAmount}\n`;
      });
      csvContent += `Total,,,,${salesReport.totalGrossSales},${salesReport.totalDiscount},${salesReport.totalNetSales}\n`;
    } else if (activeTab === 'purchases' && purchaseReport) {
      csvContent += 'Voucher No,Date BS,Vendor/Bill,Payment Mode,Purchase,Freight,Discount,Net Cost\n';
      purchaseReport.entries.forEach((e) => {
        csvContent += `"${e.journalNo}","${e.dateBS}","${e.vendorName}","${e.paymentMode}",${e.purchaseAmount},${e.freightAndWages},${e.discountReceived},${e.netPurchaseCost}\n`;
      });
      csvContent += `Total,,,,${purchaseReport.totalPurchases},${purchaseReport.totalFreight},${purchaseReport.totalDiscountReceived},${purchaseReport.netTotalCost}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTab}_${bsDateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout title="वित्तीय विवरणहरू (Financial Statements)">
      <div className="space-y-6">
        {/* Header with Title and Export Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 no-print">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
              <span>📈</span>
              <span>सहकारी वित्तीय विवरणहरू (Financial Reports)</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              चार खाता दोहोरो लेखा प्रणालीमा आधारित सम्पूर्ण आधिकारिक वित्तीय विवरणहरू
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={exportCSV}
              className="inline-flex items-center space-x-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition"
            >
              <span>📥</span>
              <span>CSV निर्यात</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-2 border border-transparent rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition"
            >
              <span>🖨️</span>
              <span>प्रिन्ट / PDF</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 space-x-1 no-print overflow-x-auto">
          <button
            onClick={() => setActiveTab('trial-balance')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors ${
              activeTab === 'trial-balance'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span>⚖️</span>
            <span>सन्तुलन परीक्षण (Trial Balance)</span>
          </button>
          <button
            onClick={() => setActiveTab('profit-loss')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors ${
              activeTab === 'profit-loss'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span>📊</span>
            <span>नाफा-नोक्सान हिसाब (Profit & Loss)</span>
          </button>
          <button
            onClick={() => setActiveTab('balance-sheet')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors ${
              activeTab === 'balance-sheet'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span>🏛️</span>
            <span>वासलात (Balance Sheet)</span>
          </button>
          <button
            onClick={() => setActiveTab('cash-flow')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors ${
              activeTab === 'cash-flow'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span>💵</span>
            <span>नगद प्रवाह विवरण (Cash Flow)</span>
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors ${
              activeTab === 'sales'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span>🛍️</span>
            <span>बिक्री खाता / प्रतिवेदन (Sales)</span>
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors ${
              activeTab === 'purchases'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span>📦</span>
            <span>खरिद खाता / प्रतिवेदन (Purchases)</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                सुरु मिति (BS From):
              </label>
              <input
                type="text"
                value={bsDateFrom}
                onChange={(e) => setBsDateFrom(e.target.value)}
                placeholder="2081-04-01"
                className="w-32 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                अन्तिम मिति (BS To):
              </label>
              <input
                type="text"
                value={bsDateTo}
                onChange={(e) => setBsDateTo(e.target.value)}
                placeholder={currentBS}
                className="w-32 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="self-end">
              <button
                onClick={fetchReport}
                disabled={loading}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center space-x-1"
              >
                <span>{loading ? 'लोड हुँदै...' : '🔍 फिल्टर लागू गर्नुहोस्'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500">द्रुत छनौट:</span>
            <button
              onClick={() => {
                setBsDateFrom(`${currentYear}-04-01`);
                setBsDateTo(currentBS);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium transition"
            >
              चालु आ.व.
            </button>
            <button
              onClick={() => {
                setBsDateFrom(`${currentYear}-04-01`);
                setBsDateTo(`${currentYear}-06-30`);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium transition"
            >
              प्रथम त्रैमासिक
            </button>
            <button
              onClick={() => {
                setBsDateFrom(`${currentYear}-04-01`);
                setBsDateTo(`${currentYear}-09-30`);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium transition"
            >
              अर्ध-वार्षिक
            </button>
          </div>
        </div>

        {/* Printable Organization Header */}
        <div className="text-center py-4 border-b border-slate-200 print:block">
          <h2 className="text-xl font-bold text-slate-900">
            श्री दीपशिखा कृषि सहकारी संस्था लि.
          </h2>
          <p className="text-xs text-slate-600">
            गौरादह-१, झापा • दर्ता नं: १२५/०६८/०६९ • स्थायी लेखा नं (PAN): ३००२१५६८९
          </p>
          <h3 className="text-base font-bold text-emerald-800 mt-2">
            {activeTab === 'trial-balance' && 'सन्तुलन परीक्षण (TRIAL BALANCE)'}
            {activeTab === 'profit-loss' && 'नाफा-नोक्सान हिसाब (PROFIT & LOSS ACCOUNT)'}
            {activeTab === 'balance-sheet' && 'वासलात (BALANCE SHEET)'}
            {activeTab === 'cash-flow' && 'नगद प्रवाह विवरण (CASH FLOW STATEMENT)'}
            {activeTab === 'sales' && 'बिक्री खाता तथा प्रतिवेदन (SALES REGISTER & REPORT)'}
            {activeTab === 'purchases' && 'खरिद खाता तथा प्रतिवेदन (PURCHASE REGISTER & REPORT)'}
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            अवधि: {bsDateFrom} देखि {bsDateTo} सम्म (B.S.)
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            {error}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-500">वित्तीय विवरण तयार गरिँदैछ...</p>
          </div>
        )}

        {/* TAB 1: TRIAL BALANCE */}
        {!loading && activeTab === 'trial-balance' && trialBalance && (
          <div className="space-y-4">
            {/* Status Banner */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${trialBalance.isBalanced ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                <span className="text-xs font-bold text-slate-800">
                  {trialBalance.isBalanced
                    ? '✓ दोहोरो लेखा प्रणाली सन्तुलन परीक्षण पूर्ण रूपमा मिलेको छ (Total Debit = Total Credit)'
                    : `⚠️ सन्तुलनमा फरक देखियो: रु. ${formatNpr(trialBalance.variance)}`}
                </span>
              </div>
              <div className="text-xs font-mono font-semibold text-slate-600">
                कुल खाता संख्या: {trialBalance.items.length}
              </div>
            </div>

            {/* Trial Balance Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200">संकेत</th>
                      <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200">खाताको नाम (Account Head)</th>
                      <th rowSpan={2} className="py-2.5 px-2 border-r border-slate-200 text-center">खाता समूह</th>
                      <th colSpan={2} className="py-1 px-2 border-r border-slate-200 text-center bg-slate-200/60">सुरु मौज्दात (Opening)</th>
                      <th colSpan={2} className="py-1 px-2 border-r border-slate-200 text-center bg-emerald-50 text-emerald-800">अवधि कारोबार (Period Trans)</th>
                      <th colSpan={2} className="py-1 px-2 text-center bg-indigo-50 text-indigo-900">अन्तिम मौज्दात (Closing Balance)</th>
                    </tr>
                    <tr className="border-t border-slate-200 text-[11px]">
                      <th className="py-1.5 px-2 text-right bg-slate-200/40 border-r border-slate-200">डेबिट (Dr)</th>
                      <th className="py-1.5 px-2 text-right bg-slate-200/40 border-r border-slate-200">क्रेडिट (Cr)</th>
                      <th className="py-1.5 px-2 text-right bg-emerald-50/60 border-r border-slate-200">डेबिट (Dr)</th>
                      <th className="py-1.5 px-2 text-right bg-emerald-50/60 border-r border-slate-200">क्रेडिट (Cr)</th>
                      <th className="py-1.5 px-2 text-right bg-indigo-50/60 border-r border-slate-200">डेबिट (Dr)</th>
                      <th className="py-1.5 px-2 text-right bg-indigo-50/60">क्रेडिट (Cr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {trialBalance.items.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-100">
                          {row.accountCode}
                        </td>
                        <td className="py-2 px-3 font-sans border-r border-slate-100 font-medium text-slate-900">
                          <div>{row.accountNameNp}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{row.accountName}</div>
                        </td>
                        <td className="py-2 px-2 text-center font-sans text-[11px] border-r border-slate-100">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              row.accountGroup === 'Assets-04'
                                ? 'bg-blue-50 text-blue-700'
                                : row.accountGroup === 'Liabilities 05'
                                ? 'bg-purple-50 text-purple-700'
                                : row.accountGroup === 'Expenses-02'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {row.accountGroup}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">
                          {row.openingDebit > 0 ? formatNpr(row.openingDebit) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-600">
                          {row.openingCredit > 0 ? formatNpr(row.openingCredit) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right border-r border-slate-100 text-emerald-700 font-semibold">
                          {row.periodDebit > 0 ? formatNpr(row.periodDebit) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right border-r border-slate-100 text-emerald-700 font-semibold">
                          {row.periodCredit > 0 ? formatNpr(row.periodCredit) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right border-r border-slate-100 text-indigo-900 font-bold bg-indigo-50/20">
                          {row.closingDebit > 0 ? formatNpr(row.closingDebit) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right text-indigo-900 font-bold bg-indigo-50/20">
                          {row.closingCredit > 0 ? formatNpr(row.closingCredit) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-200/80 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 font-sans text-center">
                        कुल जम्मा (GRAND TOTAL)
                      </td>
                      <td className="py-2.5 px-2 text-right border-r border-slate-300">
                        {formatNpr(trialBalance.totalOpeningDebit)}
                      </td>
                      <td className="py-2.5 px-2 text-right border-r border-slate-300">
                        {formatNpr(trialBalance.totalOpeningCredit)}
                      </td>
                      <td className="py-2.5 px-2 text-right border-r border-slate-300 text-emerald-800">
                        {formatNpr(trialBalance.totalPeriodDebit)}
                      </td>
                      <td className="py-2.5 px-2 text-right border-r border-slate-300 text-emerald-800">
                        {formatNpr(trialBalance.totalPeriodCredit)}
                      </td>
                      <td className="py-2.5 px-2 text-right border-r border-slate-300 text-indigo-900 bg-indigo-100/60">
                        {formatNpr(trialBalance.totalClosingDebit)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-indigo-900 bg-indigo-100/60">
                        {formatNpr(trialBalance.totalClosingCredit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROFIT & LOSS / INCOME STATEMENT */}
        {!loading && activeTab === 'profit-loss' && profitLoss && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <span className="text-xs font-semibold text-emerald-700">कुल आम्दानी (Total Income)</span>
                <div className="text-xl font-bold font-mono text-emerald-900 mt-1">
                  रु. {formatNpr(profitLoss.totalIncome)}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <span className="text-xs font-semibold text-amber-700">कुल खर्च (Total Expenses)</span>
                <div className="text-xl font-bold font-mono text-amber-900 mt-1">
                  रु. {formatNpr(profitLoss.totalExpenses)}
                </div>
              </div>
              <div className={`p-4 rounded-xl border ${
                profitLoss.netSurplus >= 0
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <span className="text-xs font-semibold">
                  {profitLoss.netSurplus >= 0 ? 'खुद नाफा / बचत (Net Surplus)' : 'खुद नोक्सान (Net Deficit)'}
                </span>
                <div className="text-xl font-bold font-mono mt-1">
                  रु. {formatNpr(profitLoss.netSurplus)}
                </div>
              </div>
            </div>

            {/* P&L Two-Column / Detailed Layout */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                {/* Left: Expenses */}
                <div className="p-4 space-y-4">
                  <div className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-2 flex justify-between">
                    <span>(क) खर्चहरू (EXPENSES)</span>
                    <span>रकम (रु.)</span>
                  </div>

                  {/* Operating Expenses */}
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      १. सञ्चालन तथा खरिद खर्च
                    </div>
                    {profitLoss.operatingExpenses.map((e, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-1 hover:bg-slate-50">
                        <span className="text-slate-700">{e.accountNameNp} ({e.accountCode})</span>
                        <span className="font-mono text-slate-900">{formatNpr(e.amount)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Administrative Expenses */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      २. प्रशासनिक तथा कार्यालय खर्च
                    </div>
                    {profitLoss.administrativeExpenses.map((e, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-1 hover:bg-slate-50">
                        <span className="text-slate-700">{e.accountNameNp} ({e.accountCode})</span>
                        <span className="font-mono text-slate-900">{formatNpr(e.amount)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Financial & Depreciation Expenses */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      ३. वित्तीय तथा ह्रासकट्टी खर्च
                    </div>
                    {profitLoss.financialExpenses.map((e, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-1 hover:bg-slate-50">
                        <span className="text-slate-700">{e.accountNameNp} ({e.accountCode})</span>
                        <span className="font-mono text-slate-900">{formatNpr(e.amount)}</span>
                      </div>
                    ))}
                    {profitLoss.depreciationExpenses.map((e, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-1 hover:bg-slate-50 font-semibold text-amber-800">
                        <span>{e.accountNameNp} ({e.accountCode})</span>
                        <span className="font-mono">{formatNpr(e.amount)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t-2 border-slate-300 pt-3 flex justify-between text-sm font-bold text-slate-900">
                    <span>जम्मा खर्च (Total Expenses)</span>
                    <span className="font-mono">रु. {formatNpr(profitLoss.totalExpenses)}</span>
                  </div>
                </div>

                {/* Right: Income */}
                <div className="p-4 space-y-4">
                  <div className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-2 flex justify-between">
                    <span>(ख) आम्दानीहरू (INCOME & REVENUE)</span>
                    <span>रकम (रु.)</span>
                  </div>

                  {/* Trading Revenue */}
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      १. कारोबार तथा व्यापारिक आम्दानी
                    </div>
                    {profitLoss.tradingRevenue.map((i, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-1 hover:bg-slate-50">
                        <span className="text-slate-700">{i.accountNameNp} ({i.accountCode})</span>
                        <span className="font-mono text-slate-900">{formatNpr(i.amount)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Other Income & Interest */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      २. ब्याज तथा अन्य सञ्चालन आम्दानी
                    </div>
                    {profitLoss.otherIncome.map((i, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-1 hover:bg-slate-50">
                        <span className="text-slate-700">{i.accountNameNp} ({i.accountCode})</span>
                        <span className="font-mono text-slate-900">{formatNpr(i.amount)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t-2 border-slate-300 pt-3 flex justify-between text-sm font-bold text-slate-900">
                    <span>जम्मा आम्दानी (Total Income)</span>
                    <span className="font-mono">रु. {formatNpr(profitLoss.totalIncome)}</span>
                  </div>

                  {/* Net Surplus Summary Box */}
                  <div className={`mt-8 p-3 rounded-xl border ${
                    profitLoss.netSurplus >= 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span>खुद नाफा / (नोक्सान) - Net Result:</span>
                      <span className="font-mono text-base">रु. {formatNpr(profitLoss.netSurplus)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BALANCE SHEET (वासलात) */}
        {!loading && activeTab === 'balance-sheet' && balanceSheet && (
          <div className="space-y-4">
            {/* Balance Sheet Verification Banner */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${balanceSheet.isBalanced ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                <span className="text-xs font-bold text-slate-800">
                  {balanceSheet.isBalanced
                    ? '✓ वासलात सन्तुलित छ: कुल पूँजी तथा दायित्व = कुल सम्पत्ति तथा जायजेथा'
                    : `⚠️ वासलातमा फरक: रु. ${formatNpr(balanceSheet.variance)}`}
                </span>
              </div>
              <div className="text-xs font-mono font-semibold text-slate-600">
                आ.व. {balanceSheet.fiscalYear} • मिति: {balanceSheet.asOfDateBS}
              </div>
            </div>

            {/* Dual Column Layout (T-Format Standard) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                {/* Left: Liabilities & Equity (पूँजी तथा दायित्व) */}
                <div className="p-4 space-y-4">
                  <div className="bg-purple-50 text-purple-900 px-3 py-2 rounded-lg font-bold text-xs flex justify-between uppercase tracking-wider">
                    <span>पूँजी तथा दायित्व (LIABILITIES & EQUITY)</span>
                    <span>रकम (रु.)</span>
                  </div>

                  {/* Share Capital */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>१. शेयर पूँजी (Share Capital १०)</span>
                      <span className="font-mono">{formatNpr(balanceSheet.liabilitiesAndEquity.totalShareCapital)}</span>
                    </div>
                  </div>

                  {/* Reserves & Surplus */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>२. जगेडा तथा अन्य कोषहरू (Reserves & Funds २०, २५)</span>
                      <span className="font-mono">{formatNpr(balanceSheet.liabilitiesAndEquity.totalReservesAndSurplus)}</span>
                    </div>
                    {balanceSheet.liabilitiesAndEquity.currentPeriodSurplus !== 0 && (
                      <div className="flex justify-between text-[11px] text-emerald-700 pl-3">
                        <span>• चालु वर्षको खुद बचत/मुनाफा (Current Net Profit):</span>
                        <span className="font-mono">{formatNpr(balanceSheet.liabilitiesAndEquity.currentPeriodSurplus)}</span>
                      </div>
                    )}
                  </div>

                  {/* Member Deposits */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>३. सदस्य बचत तथा निक्षेप (Savings & Deposits ३०)</span>
                      <span className="font-mono">{formatNpr(balanceSheet.liabilitiesAndEquity.totalMemberDeposits)}</span>
                    </div>
                  </div>

                  {/* Borrowings */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>४. लिएको ऋण तथा सापट (Borrowings ४०)</span>
                      <span className="font-mono">{formatNpr(balanceSheet.liabilitiesAndEquity.totalBorrowings)}</span>
                    </div>
                  </div>

                  {/* Grants */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>५. पूँजीगत अनुदान (Grants & Subsidies ५०)</span>
                      <span className="font-mono">{formatNpr(balanceSheet.liabilitiesAndEquity.totalGrants)}</span>
                    </div>
                  </div>

                  {/* Current Liabilities */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>६. अन्य भुक्तानी दिनुपर्ने दायित्वहरू (Payables ६०, ७०)</span>
                      <span className="font-mono">{formatNpr(balanceSheet.liabilitiesAndEquity.totalCurrentLiabilities)}</span>
                    </div>
                  </div>

                  {/* Total Liabilities */}
                  <div className="border-t-2 border-slate-300 pt-3 flex justify-between text-sm font-bold text-purple-900 bg-purple-50/50 p-2 rounded">
                    <span>जम्मा पूँजी तथा दायित्व (TOTAL LIABILITIES)</span>
                    <span className="font-mono">
                      रु. {formatNpr(balanceSheet.liabilitiesAndEquity.grandTotalLiabilitiesAndEquity)}
                    </span>
                  </div>
                </div>

                {/* Right: Assets (सम्पत्ति तथा जायजेथा) */}
                <div className="p-4 space-y-4">
                  <div className="bg-blue-50 text-blue-900 px-3 py-2 rounded-lg font-bold text-xs flex justify-between uppercase tracking-wider">
                    <span>सम्पत्ति तथा जायजेथा (ASSETS & PROPERTIES)</span>
                    <span>रकम (रु.)</span>
                  </div>

                  {/* Cash & Bank */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>१. नगद तथा बैंक मौज्दात (Cash & Bank ८०, ९०)</span>
                      <span className="font-mono">{formatNpr(balanceSheet.assets.totalCashAndBank)}</span>
                    </div>
                  </div>

                  {/* Investments */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>२. लगानी (Investments १००)</span>
                      <span className="font-mono">{formatNpr(balanceSheet.assets.totalInvestments)}</span>
                    </div>
                  </div>

                  {/* Member Loans */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>३. सदस्य ऋण लगानी (Loans to Members ११०)</span>
                      <span className="font-mono">{formatNpr(balanceSheet.assets.totalMemberLoans)}</span>
                    </div>
                  </div>

                  {/* Receivables */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>४. पाउनुपर्ने तथा पेश्की हिसाब (Receivables १२०)</span>
                      <span className="font-mono">{formatNpr(balanceSheet.assets.totalReceivables)}</span>
                    </div>
                  </div>

                  {/* Fixed Assets */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>५. स्थिर सम्पत्ति (Fixed Assets १३०)</span>
                      <span className="font-mono">{formatNpr(balanceSheet.assets.totalFixedAssets)}</span>
                    </div>
                  </div>

                  {/* Other Assets */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>६. अन्य सम्पत्ति (Other Assets १४०)</span>
                      <span className="font-mono">{formatNpr(balanceSheet.assets.totalOtherAssets)}</span>
                    </div>
                  </div>

                  {/* Total Assets */}
                  <div className="border-t-2 border-slate-300 pt-3 flex justify-between text-sm font-bold text-blue-900 bg-blue-50/50 p-2 rounded">
                    <span>जम्मा सम्पत्ति तथा जायजेथा (TOTAL ASSETS)</span>
                    <span className="font-mono">
                      रु. {formatNpr(balanceSheet.assets.grandTotalAssets)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CASH FLOW STATEMENT (नगद प्रवाह विवरण) */}
        {!loading && activeTab === 'cash-flow' && cashFlow && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
              {/* Summary Badges */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold">सुरु नगद तथा बैंक मौज्दात:</span>
                  <div className="text-base font-bold font-mono text-slate-800 mt-1">
                    रु. {formatNpr(cashFlow.openingCashAndBank)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="text-xs text-emerald-700 font-semibold">अवधिको खुद नगद प्रवाह (Net Change):</span>
                  <div className="text-base font-bold font-mono text-emerald-900 mt-1">
                    रु. {formatNpr(cashFlow.netChangeInCash)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                  <span className="text-xs text-indigo-700 font-semibold">अन्तिम नगद तथा बैंक मौज्दात:</span>
                  <div className="text-base font-bold font-mono text-indigo-900 mt-1">
                    रु. {formatNpr(cashFlow.closingCashAndBank)}
                  </div>
                </div>
              </div>

              {/* Operating Activities */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <span>(क) सञ्चालन गतिविधिहरूबाट नगद प्रवाह (Operating Activities)</span>
                  <span className="font-mono text-emerald-700 font-bold">
                    रु. {formatNpr(cashFlow.netCashFromOperating)}
                  </span>
                </div>
                <div className="space-y-1.5 pl-3">
                  {cashFlow.operatingActivities.map((act, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-slate-700 hover:bg-slate-50 py-1">
                      <span>• {act.titleNp}</span>
                      <span className={`font-mono font-medium ${act.amount >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                        {formatNpr(act.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Investing Activities */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <span>(ख) लगानी गतिविधिहरूबाट नगद प्रवाह (Investing Activities)</span>
                  <span className="font-mono text-blue-700 font-bold">
                    रु. {formatNpr(cashFlow.netCashFromInvesting)}
                  </span>
                </div>
                <div className="space-y-1.5 pl-3">
                  {cashFlow.investingActivities.map((act, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-slate-700 hover:bg-slate-50 py-1">
                      <span>• {act.titleNp}</span>
                      <span className={`font-mono font-medium ${act.amount >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                        {formatNpr(act.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financing Activities */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <span>(ग) वित्तीय गतिविधिहरूबाट नगद प्रवाह (Financing Activities)</span>
                  <span className="font-mono text-purple-700 font-bold">
                    रु. {formatNpr(cashFlow.netCashFromFinancing)}
                  </span>
                </div>
                <div className="space-y-1.5 pl-3">
                  {cashFlow.financingActivities.map((act, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-slate-700 hover:bg-slate-50 py-1">
                      <span>• {act.titleNp}</span>
                      <span className={`font-mono font-medium ${act.amount >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                        {formatNpr(act.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Reconciliation */}
              <div className="border-t-2 border-slate-300 pt-4 flex justify-between items-center text-sm font-bold text-slate-900 bg-slate-50 p-3 rounded-lg">
                <span>अन्तिम नगद तथा बैंक मौज्दात (Closing Cash & Bank Balance):</span>
                <span className="font-mono text-base text-emerald-800">
                  रु. {formatNpr(cashFlow.closingCashAndBank)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SALES REPORT (बिक्री खाता) */}
        {!loading && activeTab === 'sales' && salesReport && (
          <div className="space-y-4">
            {/* Sales Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <span className="text-xs font-semibold text-emerald-700">कुल बिक्री (Gross Sales)</span>
                <div className="text-xl font-bold font-mono text-emerald-950 mt-1">
                  रु. {formatNpr(salesReport.totalGrossSales)}
                </div>
                <div className="text-[11px] text-emerald-600 mt-1">खाता १६०.१ सामान बिक्री</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <span className="text-xs font-semibold text-amber-700">व्यापारिक छुट (Discount Allowed)</span>
                <div className="text-xl font-bold font-mono text-amber-950 mt-1">
                  रु. {formatNpr(salesReport.totalDiscount)}
                </div>
                <div className="text-[11px] text-amber-600 mt-1">खाता १५०.१५ छुट दिएको</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <span className="text-xs font-semibold text-blue-700">खुद बिक्री (Net Sales)</span>
                <div className="text-xl font-bold font-mono text-blue-950 mt-1">
                  रु. {formatNpr(salesReport.totalNetSales)}
                </div>
                <div className="text-[11px] text-blue-600 mt-1">वास्तविक प्राप्त बिक्री आय</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <span className="text-xs font-semibold text-purple-700">बिक्री कारोबार संख्या</span>
                <div className="text-xl font-bold font-mono text-purple-950 mt-1">
                  {salesReport.salesCount} वटा
                </div>
                <div className="text-[11px] text-purple-600 mt-1">
                  नगद: {formatNpr(salesReport.cashSalesTotal)} • उधारो: {formatNpr(salesReport.creditSalesTotal)}
                </div>
              </div>
            </div>

            {/* Sales Register Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    बिक्री खाता किताब (Sales Register)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    नगद, बैंक तथा उधारो बिक्री कारोबारहरूको मिति अनुसारको सूची
                  </p>
                </div>
                <div className="text-xs font-mono font-semibold text-slate-600">
                  जम्मा बिलहरू: {salesReport.entries.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">मिति (BS)</th>
                      <th className="py-2.5 px-3">भौचर नं</th>
                      <th className="py-2.5 px-3">बिल / सन्दर्भ नं</th>
                      <th className="py-2.5 px-3">ग्राहक / व्यहोरा</th>
                      <th className="py-2.5 px-3 text-center">भुक्तानी माध्यम</th>
                      <th className="py-2.5 px-3 text-right">कुल बिक्री (रु.)</th>
                      <th className="py-2.5 px-3 text-right">छुट (रु.)</th>
                      <th className="py-2.5 px-3 text-right font-bold text-emerald-800">खुद बिक्री (रु.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {salesReport.entries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                          यस अवधिमा कुनै बिक्री कारोबार फेला परेन।
                        </td>
                      </tr>
                    ) : (
                      salesReport.entries.map((sale) => (
                        <tr key={sale.journalId} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 text-slate-700">{sale.dateBS}</td>
                          <td className="py-2 px-3 font-semibold text-emerald-800">
                            <Link href={`/accounting/journal-register?search=${sale.journalNo}`} className="hover:underline">
                              {sale.journalNo}
                            </Link>
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-600">{sale.referenceNo || '-'}</td>
                          <td className="py-2 px-3 font-sans text-slate-900 max-w-xs truncate">{sale.description}</td>
                          <td className="py-2 px-3 text-center font-sans">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sale.paymentMode === 'CASH'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : sale.paymentMode === 'BANK'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-purple-50 text-purple-700'
                              }`}
                            >
                              {sale.paymentMode === 'CASH' ? 'नगद' : sale.paymentMode === 'BANK' ? 'बैंक' : 'उधारो'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">{formatNpr(sale.grossAmount)}</td>
                          <td className="py-2 px-3 text-right text-amber-700">
                            {sale.discountAmount > 0 ? formatNpr(sale.discountAmount) : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-800 bg-emerald-50/20">
                            {formatNpr(sale.netAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 font-sans text-center">
                        कुल जम्मा (GRAND TOTAL)
                      </td>
                      <td className="py-2.5 px-3 text-right">{formatNpr(salesReport.totalGrossSales)}</td>
                      <td className="py-2.5 px-3 text-right text-amber-700">{formatNpr(salesReport.totalDiscount)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-800 bg-emerald-50/50">
                        {formatNpr(salesReport.totalNetSales)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PURCHASE REPORT (खरिद खाता) */}
        {!loading && activeTab === 'purchases' && purchaseReport && (
          <div className="space-y-4">
            {/* Purchase Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <span className="text-xs font-semibold text-amber-700">कुल सामान खरिद (Gross Purchases)</span>
                <div className="text-xl font-bold font-mono text-amber-950 mt-1">
                  रु. {formatNpr(purchaseReport.totalPurchases)}
                </div>
                <div className="text-[11px] text-amber-600 mt-1">खाता १०५.१ सामान खरिद</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <span className="text-xs font-semibold text-blue-700">ढुवानी तथा ज्याला (Freight & Wages)</span>
                <div className="text-xl font-bold font-mono text-blue-950 mt-1">
                  रु. {formatNpr(purchaseReport.totalFreight)}
                </div>
                <div className="text-[11px] text-blue-600 mt-1">खाता १५०.२ प्रत्यक्ष ढुवानी</div>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <span className="text-xs font-semibold text-rose-700">खुद खरिद लागत (Net Cost of Purchases)</span>
                <div className="text-xl font-bold font-mono text-rose-950 mt-1">
                  रु. {formatNpr(purchaseReport.netTotalCost)}
                </div>
                <div className="text-[11px] text-rose-600 mt-1">खरिद + ढुवानी - प्राप्त छुट</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-xs font-semibold text-slate-700">खरिद कारोबार संख्या</span>
                <div className="text-xl font-bold font-mono text-slate-950 mt-1">
                  {purchaseReport.purchasesCount} वटा
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  नगद: {formatNpr(purchaseReport.cashPurchasesTotal)} • उधारो: {formatNpr(purchaseReport.creditPurchasesTotal)}
                </div>
              </div>
            </div>

            {/* Purchase Register Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    खरिद खाता किताब (Purchase Register)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    सामान खरिद, ढुवानी खर्च तथा सप्लायर भुक्तानीहरूको विस्तृत सूची
                  </p>
                </div>
                <div className="text-xs font-mono font-semibold text-slate-600">
                  जम्मा खरिद बिलहरू: {purchaseReport.entries.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">मिति (BS)</th>
                      <th className="py-2.5 px-3">भौचर नं</th>
                      <th className="py-2.5 px-3">बिल / इन्भोइस नं</th>
                      <th className="py-2.5 px-3">सप्लायर / विवरण</th>
                      <th className="py-2.5 px-3 text-center">भुक्तानी माध्यम</th>
                      <th className="py-2.5 px-3 text-right">खरिद रकम (रु.)</th>
                      <th className="py-2.5 px-3 text-right">ढुवानी (रु.)</th>
                      <th className="py-2.5 px-3 text-right">छुट (रु.)</th>
                      <th className="py-2.5 px-3 text-right font-bold text-rose-800">खुद लागत (रु.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {purchaseReport.entries.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                          यस अवधिमा कुनै खरिद कारोबार फेला परेन।
                        </td>
                      </tr>
                    ) : (
                      purchaseReport.entries.map((pur) => (
                        <tr key={pur.journalId} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 text-slate-700">{pur.dateBS}</td>
                          <td className="py-2 px-3 font-semibold text-emerald-800">
                            <Link href={`/accounting/journal-register?search=${pur.journalNo}`} className="hover:underline">
                              {pur.journalNo}
                            </Link>
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-600">{pur.referenceNo || '-'}</td>
                          <td className="py-2 px-3 font-sans text-slate-900 max-w-xs truncate">{pur.description}</td>
                          <td className="py-2 px-3 text-center font-sans">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                pur.paymentMode === 'CASH'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : pur.paymentMode === 'BANK'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-purple-50 text-purple-700'
                              }`}
                            >
                              {pur.paymentMode === 'CASH' ? 'नगद' : pur.paymentMode === 'BANK' ? 'बैंक' : 'उधारो (साहु)'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">{formatNpr(pur.purchaseAmount)}</td>
                          <td className="py-2 px-3 text-right text-blue-700">
                            {pur.freightAndWages > 0 ? formatNpr(pur.freightAndWages) : '-'}
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-700">
                            {pur.discountReceived > 0 ? formatNpr(pur.discountReceived) : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-rose-800 bg-rose-50/20">
                            {formatNpr(pur.netPurchaseCost)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 font-sans text-center">
                        कुल जम्मा (GRAND TOTAL)
                      </td>
                      <td className="py-2.5 px-3 text-right">{formatNpr(purchaseReport.totalPurchases)}</td>
                      <td className="py-2.5 px-3 text-right text-blue-700">{formatNpr(purchaseReport.totalFreight)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">{formatNpr(purchaseReport.totalDiscountReceived)}</td>
                      <td className="py-2.5 px-3 text-right text-rose-800 bg-rose-50/50">
                        {formatNpr(purchaseReport.netTotalCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Printable Official Signatures */}
        <div className="pt-12 mt-8 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-xs text-slate-600 print:grid">
          <div>
            <div className="border-b border-slate-400 w-32 mx-auto mb-1"></div>
            <div className="font-bold text-slate-800">तयार गर्ने</div>
            <div className="text-[11px] text-slate-500">लेखापाल (Accountant)</div>
          </div>
          <div>
            <div className="border-b border-slate-400 w-32 mx-auto mb-1"></div>
            <div className="font-bold text-slate-800">जाँच गर्ने</div>
            <div className="text-[11px] text-slate-500">लेखा सुपरीवेक्षण समिति</div>
          </div>
          <div>
            <div className="border-b border-slate-400 w-32 mx-auto mb-1"></div>
            <div className="font-bold text-slate-800">प्रमाणित गर्ने</div>
            <div className="text-[11px] text-slate-500">व्यवस्थापक (Manager)</div>
          </div>
          <div>
            <div className="border-b border-slate-400 w-32 mx-auto mb-1"></div>
            <div className="font-bold text-slate-800">स्वीकृत गर्ने</div>
            <div className="text-[11px] text-slate-500">अध्यक्ष (President)</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
