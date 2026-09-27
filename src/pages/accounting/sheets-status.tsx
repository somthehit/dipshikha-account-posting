import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layout } from '../../components/Layout';
import { formatCurrencyNPR, formatAccountingDate } from '../../lib/nepaliDate';

interface SheetTab {
  id: string;
  nameNp: string;
  nameEn: string;
  code: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  is4Khata: boolean;
}

const KHATA_TABS: SheetTab[] = [
  {
    id: 'Assets-04',
    nameNp: 'सम्पत्ति हिसाब खाता',
    nameEn: 'Assets-04',
    code: '०४',
    color: 'sky',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    is4Khata: true,
  },
  {
    id: 'Liabilities 05',
    nameNp: 'दायित्व हिसाब खाता',
    nameEn: 'Liabilities 05',
    code: '०५',
    color: 'purple',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    is4Khata: true,
  },
  {
    id: 'Expenses-02',
    nameNp: 'खर्च हिसाब खाता',
    nameEn: 'Expenses-02',
    code: '०२',
    color: 'rose',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    is4Khata: true,
  },
  {
    id: 'Income-03',
    nameNp: 'आम्दानी हिसाब खाता',
    nameEn: 'Income-03',
    code: '०३',
    color: 'emerald',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    is4Khata: true,
  },
  {
    id: 'Member-Data',
    nameNp: 'सदस्य विवरण',
    nameEn: 'Member-Data',
    code: 'सदस्य',
    color: 'amber',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    is4Khata: false,
  },
  {
    id: 'Journal',
    nameNp: 'गोश्वारा भौचर दर्ता',
    nameEn: 'Journal',
    code: 'भौचर',
    color: 'indigo',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    is4Khata: false,
  },
  {
    id: 'Share_Book',
    nameNp: 'शेयर खाता',
    nameEn: 'Share_Book',
    code: 'शेयर',
    color: 'blue',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    is4Khata: false,
  },
  {
    id: 'Saving_Book',
    nameNp: 'बचत खाता',
    nameEn: 'Saving_Book',
    code: 'बचत',
    color: 'teal',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-800',
    is4Khata: false,
  },
  {
    id: 'Cross-Check',
    nameNp: '४-खाता ↔ सहायक खाता मिलान',
    nameEn: '4-Khata Cross Check',
    code: 'मिलान',
    color: 'emerald',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    is4Khata: false,
  },
  {
    id: 'Loan_Book',
    nameNp: 'ऋण लगानी खाता',
    nameEn: 'Loan_Book',
    code: 'ऋण',
    color: 'orange',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
    is4Khata: false,
  },
];

export default function KhataSheetsLivePage() {
  const [activeTab, setActiveTab] = useState<string>('Assets-04');
  const [rows, setRows] = useState<any[][]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lastSynced, setLastSynced] = useState<string>('');

  // Cross-Check State
  const [crossCheck, setCrossCheck] = useState<any | null>(null);
  const [crossCheckLoading, setCrossCheckLoading] = useState<boolean>(false);

  const fetchCrossCheck = async () => {
    try {
      setCrossCheckLoading(true);
      const res = await fetch('/api/accounting/cross-check');
      const data = await res.json();
      if (data.success) {
        setCrossCheck(data);
      }
    } catch (err: any) {
      console.warn('Cross check fetch error:', err);
    } finally {
      setCrossCheckLoading(false);
    }
  };

  const fetchSheetData = async (tabName: string) => {
    if (tabName === 'Cross-Check') {
      await fetchCrossCheck();
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/accounting/khata-sheet?sheet=${encodeURIComponent(tabName)}&maxRows=300`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch sheet data');
      }
      setRows(data.rows || []);
      setTotalRows(data.totalRows || 0);
      if (data.spreadsheetId) setSpreadsheetId(data.spreadsheetId);
      setLastSynced(new Date().toLocaleTimeString('ne-NP'));
    } catch (err: any) {
      setError(err?.message || 'Error fetching sheet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetData(activeTab);
    fetchCrossCheck();
  }, [activeTab]);

  const currentTabInfo = KHATA_TABS.find((t) => t.id === activeTab) || KHATA_TABS[0];
  const is4KhataSheet = currentTabInfo.is4Khata;

  // ----------------------------------------------------
  // Helpers
  // ----------------------------------------------------
  const isNumeric = (val: any) => {
    if (val === null || val === undefined || val === '') return false;
    const num = Number(val);
    return !isNaN(num) && typeof val !== 'boolean';
  };

  // ----------------------------------------------------
  // 4-Khata Specific Data Processing
  // ----------------------------------------------------
  const hasSubHeaders =
    is4KhataSheet &&
    rows.length > 5 &&
    rows[5] &&
    rows[5].some((c: any) => String(c).includes('डेबिट') || String(c).includes('क्रेडिट') || String(c).includes('जम्मा'));

  // Multi-tier header groups for 4-khata
  const khataHeaderGroups: { name: string; colSpan: number }[] = [];
  if (is4KhataSheet && rows.length > 4 && rows[4]) {
    const row4 = rows[4];
    for (let c = 4; c < row4.length; ) {
      const name = String(row4[c] || '').trim();
      let span = 1;
      while (c + span < row4.length && (!row4[c + span] || String(row4[c + span]).trim() === '')) {
        span++;
      }
      khataHeaderGroups.push({ name: name || `खाता ${khataHeaderGroups.length + 1}`, colSpan: span });
      c += span;
    }
  }

  // 4-Khata Filtered Rows (Row 6 onwards)
  const khataDataRows = is4KhataSheet
    ? rows.slice(6).filter((r) => {
        const isTotal = r[0] === 'जम्मा' || r[0] === 'Total';
        if (isTotal) return true;
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return r.some((cell: any) => cell !== null && cell !== undefined && String(cell).toLowerCase().includes(term));
      })
    : [];

  // ----------------------------------------------------
  // Standard Tabular Sheet (Member-Data, Journal, etc.)
  // ----------------------------------------------------
  const standardHeaderRow = !is4KhataSheet && rows.length > 0 ? rows[0] : [];
  const standardDataRows = !is4KhataSheet
    ? rows.slice(1).filter((r) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return r.some((cell: any) => cell !== null && cell !== undefined && String(cell).toLowerCase().includes(term));
      })
    : [];

  // Standard Sheet Cell Renderer
  const renderStandardCell = (cell: any, colIdx: number) => {
    if (cell === null || cell === undefined || cell === '') {
      return <span className="text-slate-300">-</span>;
    }

    const header = String(standardHeaderRow[colIdx] || '').toLowerCase();
    const strVal = String(cell).trim();

    // 1. Status Badges
    if (header.includes('status')) {
      const upper = strVal.toUpperCase();
      if (upper === 'ACTIVE' || upper === 'POSTED' || upper === 'PAID') {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            ● {strVal}
          </span>
        );
      }
      if (upper === 'INACTIVE' || upper === 'DRAFT' || upper === 'PENDING') {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            ○ {strVal}
          </span>
        );
      }
      if (upper === 'CANCELLED' || upper === 'REVERSED') {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            ✕ {strVal}
          </span>
        );
      }
      return <span className="font-semibold text-slate-700">{strVal}</span>;
    }

    // 2. Member No / Voucher No / ID
    if (colIdx === 0 || header.includes('member no') || header.includes('journal no') || header.includes('voucher')) {
      return (
        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-2xs whitespace-nowrap shadow-2xs">
          {strVal}
        </span>
      );
    }

    // 3. Phone / Mobile (Keep as clean digits without commas/decimals)
    if (header.includes('phone') || header.includes('contact') || header.includes('mobile')) {
      return <span className="font-mono text-slate-700 whitespace-nowrap">{strVal}</span>;
    }

    // 4. Counts, Wards, Kitta
    if (header.includes('ward') || header.includes('kitta') || header.includes('count') || header.includes('qty')) {
      if (isNumeric(cell)) {
        return <span className="font-mono text-center font-medium text-slate-700">{Math.round(Number(cell))}</span>;
      }
      return <span className="text-slate-700 text-center">{strVal}</span>;
    }

    // 5. Currency Amounts and Balances
    if (
      header.includes('amount') ||
      header.includes('balance') ||
      header.includes('debit') ||
      header.includes('credit') ||
      header.includes('deposit') ||
      header.includes('withdraw') ||
      header.includes('outstanding') ||
      header.includes('interest') ||
      header.includes('penalty') ||
      header.includes('rate')
    ) {
      if (isNumeric(cell)) {
        const num = Number(cell);
        if (num === 0) return <span className="font-mono text-slate-400 text-2xs">0.00</span>;
        return (
          <span className="font-mono font-semibold text-slate-900 text-2xs">
            {num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      }
    }

    // 6. Dates
    if (header.includes('date') || header.includes('मिति')) {
      return <span className="font-mono text-slate-600 text-2xs whitespace-nowrap">{formatAccountingDate(strVal)}</span>;
    }

    // Default text
    return <span className="text-slate-800 font-medium">{strVal}</span>;
  };

  return (
    <Layout title={`${currentTabInfo.nameNp} (${currentTabInfo.nameEn}) - 4-Khata Live Viewer`}>
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${currentTabInfo.badgeBg} ${currentTabInfo.badgeText}`}>
                {currentTabInfo.code} • {currentTabInfo.nameNp}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                गुगल सिट प्रत्यक्ष जडान (Live Connected)
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              चार खाता तथा सिट प्रत्यक्ष पुस्तिका (Live Google Sheet Viewer)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              गुगल सिटका सम्पत्ति, दायित्व, खर्च, आम्दानी र सदस्य विवरणहरू प्रत्यक्ष रूपमै हेर्नुहोस्।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchSheetData(activeTab)}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg shadow-xs transition flex items-center space-x-1.5"
            >
              <span className={loading ? 'animate-spin' : ''}>🔄</span>
              <span>ताजा गर्नुहोस् (Sync)</span>
            </button>

            {spreadsheetId && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition flex items-center space-x-1.5"
              >
                <span>📊</span>
                <span>Google Sheet मा खोल्नुहोस् ↗</span>
              </a>
            )}
          </div>
        </div>

        {/* Khata Selector Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {KHATA_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchTerm('');
                }}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center space-x-2 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>
                  {tab.id === 'Cross-Check'
                    ? '⚖️'
                    : tab.id.startsWith('Assets')
                    ? '🔵'
                    : tab.id.startsWith('Liabilities')
                    ? '🟣'
                    : tab.id.startsWith('Expenses')
                    ? '🔴'
                    : tab.id.startsWith('Income')
                    ? '🟢'
                    : tab.id === 'Member-Data'
                    ? '👥'
                    : tab.id === 'Journal'
                    ? '📑'
                    : '📄'}
                </span>
                <span>{tab.nameNp}</span>
                <span
                  className={`text-2xs px-1.5 py-0.2 rounded font-mono ${
                    isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.nameEn}
                </span>
              </button>
            );
          })}
        </div>

        {/* 4-Khata ↔ Subsidiary Books Cross Check Summary Banner */}
        {crossCheck && (
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl shadow-xs border border-slate-700 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-700/80 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="text-xl">⚖️</span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    ४-खाता ↔ सहायक खाता मिलान स्थिति (4-Khata = Books Cross Check)
                    {crossCheck.isAllBalanced ? (
                      <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        ✓ १००% पूर्ण सन्तुलित (100% Balanced)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        ⚠️ बेमेल फेला पर्यो (Discrepancy Detected)
                      </span>
                    )}
                  </h3>
                  <p className="text-2xs text-slate-300 mt-0.5">
                    सहकारी लेखा नियम: ४-खाताको मौज्दात र सदस्य सहायक खाताहरू (शेयर, बचत, ऋण) बराबर हुनै पर्छ।
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchCrossCheck}
                  disabled={crossCheckLoading}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg transition flex items-center space-x-1"
                >
                  <span className={crossCheckLoading ? 'animate-spin' : ''}>🔄</span>
                  <span>पुनः मिलान जाँच्नुहोस्</span>
                </button>
                <Link
                  href="/accounting/journal-register"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center space-x-1"
                >
                  <span>✏️</span>
                  <span>गल्ती सच्याउनुहोस्</span>
                </Link>
              </div>
            </div>

            {/* 3 Cross Check Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Share */}
              <div
                onClick={() => setActiveTab(crossCheck.share.isMatched ? 'Share_Book' : 'Liabilities 05')}
                className={`p-3.5 rounded-xl border transition cursor-pointer ${
                  crossCheck.share.isMatched
                    ? 'bg-emerald-950/40 border-emerald-700/50 hover:bg-emerald-900/40'
                    : 'bg-amber-950/40 border-amber-700/50 hover:bg-amber-900/40'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-200">📜 १. शेयर पुँजी (Share Capital)</span>
                  <span
                    className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                      crossCheck.share.isMatched ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {crossCheck.share.isMatched ? '✓ Matched' : '⚠️ Mismatched'}
                  </span>
                </div>
                <div className="mt-2.5 space-y-1 text-2xs">
                  <div className="flex justify-between text-slate-300">
                    <span>४-खाता (Liabilities 05 - १०):</span>
                    <span className="font-mono font-bold text-white">रु. {crossCheck.share.khataBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>सहायक खाता (Share Books):</span>
                    <span className="font-mono font-bold text-white">रु. {crossCheck.share.bookBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-700/60 font-semibold">
                    <span className={crossCheck.share.isMatched ? 'text-emerald-300' : 'text-amber-300'}>फरक (Difference):</span>
                    <span className={`font-mono ${crossCheck.share.isMatched ? 'text-emerald-300' : 'text-amber-300 font-bold'}`}>
                      रु. {Math.abs(crossCheck.share.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Savings */}
              <div
                onClick={() => setActiveTab(crossCheck.saving.isMatched ? 'Saving_Book' : 'Liabilities 05')}
                className={`p-3.5 rounded-xl border transition cursor-pointer ${
                  crossCheck.saving.isMatched
                    ? 'bg-emerald-950/40 border-emerald-700/50 hover:bg-emerald-900/40'
                    : 'bg-amber-950/40 border-amber-700/50 hover:bg-amber-900/40'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-200">📥 २. सदस्य बचत (Member Savings)</span>
                  <span
                    className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                      crossCheck.saving.isMatched ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {crossCheck.saving.isMatched ? '✓ Matched' : '⚠️ Mismatched'}
                  </span>
                </div>
                <div className="mt-2.5 space-y-1 text-2xs">
                  <div className="flex justify-between text-slate-300">
                    <span>४-खाता (Liabilities 05 - ३०):</span>
                    <span className="font-mono font-bold text-white">रु. {crossCheck.saving.khataBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>सहायक खाता (Saving Books):</span>
                    <span className="font-mono font-bold text-white">रु. {crossCheck.saving.bookBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-700/60 font-semibold">
                    <span className={crossCheck.saving.isMatched ? 'text-emerald-300' : 'text-amber-300'}>फरक (Difference):</span>
                    <span className={`font-mono ${crossCheck.saving.isMatched ? 'text-emerald-300' : 'text-amber-300 font-bold'}`}>
                      रु. {Math.abs(crossCheck.saving.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Loan */}
              <div
                onClick={() => setActiveTab(crossCheck.loan.isMatched ? 'Loan_Book' : 'Assets-04')}
                className={`p-3.5 rounded-xl border transition cursor-pointer ${
                  crossCheck.loan.isMatched
                    ? 'bg-emerald-950/40 border-emerald-700/50 hover:bg-emerald-900/40'
                    : 'bg-amber-950/40 border-amber-700/50 hover:bg-amber-900/40'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-200">💼 ३. ऋण लगानी (Loan Portfolio)</span>
                  <span
                    className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                      crossCheck.loan.isMatched ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {crossCheck.loan.isMatched ? '✓ Matched' : '⚠️ Mismatched'}
                  </span>
                </div>
                <div className="mt-2.5 space-y-1 text-2xs">
                  <div className="flex justify-between text-slate-300">
                    <span>४-खाता (Assets-04 - ११०):</span>
                    <span className="font-mono font-bold text-white">रु. {crossCheck.loan.khataBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>सहायक खाता (Loan Books):</span>
                    <span className="font-mono font-bold text-white">रु. {crossCheck.loan.bookBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-700/60 font-semibold">
                    <span className={crossCheck.loan.isMatched ? 'text-emerald-300' : 'text-amber-300'}>फरक (Difference):</span>
                    <span className={`font-mono ${crossCheck.loan.isMatched ? 'text-emerald-300' : 'text-amber-300 font-bold'}`}>
                      रु. {Math.abs(crossCheck.loan.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search & Meta Bar (Only for spreadsheet tabs) */}
        {activeTab !== 'Cross-Check' && (
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="w-full sm:w-96">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="भौचर नं, नाम, फोन, विवरण, वा मितिबाट खोज्नुहोस्..."
                className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-4">
              {lastSynced && (
                <span>
                  पछिल्लो सिङ्क: <strong className="font-mono text-slate-700">{lastSynced}</strong>
                </span>
              )}
              <span>
                कुल पङ्क्तिहरू:{' '}
                <strong className="font-mono text-slate-900">
                  {is4KhataSheet ? khataDataRows.length : standardDataRows.length}
                </strong>{' '}
                / <span className="font-mono text-slate-500">{totalRows}</span>
              </span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => fetchSheetData(activeTab)} className="underline font-bold">
              पुनः प्रयास गर्नुहोस्
            </button>
          </div>
        )}

        {/* Live Spreadsheet Table Container */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          {activeTab === 'Cross-Check' ? (
            /* ========================================================= */
            /* CASE 0: DEDICATED CROSS-CHECK RECONCILIATION AUDIT VIEW  */
            /* ========================================================= */
            <div className="p-6 space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  ४-खाता र सहायक खाताहरूको पूर्ण मिलान विवरण (Cross-Check Reconciliation Audit)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  नेपालको सहकारी ऐन तथा दोहोरो लेखा सिद्धान्त बमोजिम नियन्त्रण खाताहरू (४-खाता) र व्यक्तिगत सदस्य लगत (सहायक पुस्तिका) बीचको तुलनात्मक विश्लेषण।
                </p>
              </div>

              {crossCheck ? (
                <div className="space-y-6">
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-900 text-white font-bold text-2xs uppercase">
                        <tr>
                          <th className="py-3 px-4">खाता शीर्षक (Account Title)</th>
                          <th className="py-3 px-4">४-खाता सिट (4-Khata Reference)</th>
                          <th className="py-3 px-4 text-right">४-खाता मौज्दात (4-Khata Bal)</th>
                          <th className="py-3 px-4">सहायक खाता (Subsidiary Book)</th>
                          <th className="py-3 px-4 text-right">सहायक मौज्दात (Book Bal)</th>
                          <th className="py-3 px-4 text-right">फरक (Variance)</th>
                          <th className="py-3 px-4 text-center">स्थिति (Status)</th>
                          <th className="py-3 px-4 text-center">कार्य (Action)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* Share Row */}
                        <tr className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                            <span>📜</span>
                            <span>{crossCheck.share.titleNp} ({crossCheck.share.titleEn})</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {crossCheck.share.khataName}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-right text-slate-900">
                            रु. {crossCheck.share.khataBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {crossCheck.share.bookName} ({crossCheck.share.memberCount} सदस्यहरू)
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-right text-slate-900">
                            रु. {crossCheck.share.bookBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-right font-bold">
                            <span className={crossCheck.share.isMatched ? 'text-emerald-700' : 'text-rose-600'}>
                              रु. {Math.abs(crossCheck.share.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-2xs font-bold ${
                                crossCheck.share.isMatched
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {crossCheck.share.isMatched ? '✓ पूर्ण मिलान (Balanced)' : '⚠️ बेमेल (Difference)'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center space-x-1">
                            <button
                              onClick={() => setActiveTab('Liabilities 05')}
                              className="text-2xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold transition"
                            >
                              ४-खाता हेर्नुहोस्
                            </button>
                            <Link
                              href="/accounting/members/share-entry"
                              className="text-2xs px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-semibold border border-emerald-300 transition"
                            >
                              शेयर प्रविष्टि
                            </Link>
                          </td>
                        </tr>

                        {/* Saving Row */}
                        <tr className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                            <span>📥</span>
                            <span>{crossCheck.saving.titleNp} ({crossCheck.saving.titleEn})</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {crossCheck.saving.khataName}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-right text-slate-900">
                            रु. {crossCheck.saving.khataBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {crossCheck.saving.bookName} ({crossCheck.saving.memberCount} सदस्यहरू)
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-right text-slate-900">
                            रु. {crossCheck.saving.bookBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-right font-bold">
                            <span className={crossCheck.saving.isMatched ? 'text-emerald-700' : 'text-rose-600'}>
                              रु. {Math.abs(crossCheck.saving.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-2xs font-bold ${
                                crossCheck.saving.isMatched
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {crossCheck.saving.isMatched ? '✓ पूर्ण मिलान (Balanced)' : '⚠️ बेमेल (Difference)'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center space-x-1">
                            <button
                              onClick={() => setActiveTab('Liabilities 05')}
                              className="text-2xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold transition"
                            >
                              ४-खाता हेर्नुहोस्
                            </button>
                            <Link
                              href="/accounting/members/saving-entry"
                              className="text-2xs px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded font-semibold border border-sky-300 transition"
                            >
                              बचत प्रविष्टि
                            </Link>
                          </td>
                        </tr>

                        {/* Loan Row */}
                        <tr className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                            <span>💼</span>
                            <span>{crossCheck.loan.titleNp} ({crossCheck.loan.titleEn})</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {crossCheck.loan.khataName}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-right text-slate-900">
                            रु. {crossCheck.loan.khataBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {crossCheck.loan.bookName} ({crossCheck.loan.memberCount} सदस्यहरू)
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-right text-slate-900">
                            रु. {crossCheck.loan.bookBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-right font-bold">
                            <span className={crossCheck.loan.isMatched ? 'text-emerald-700' : 'text-rose-600'}>
                              रु. {Math.abs(crossCheck.loan.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-2xs font-bold ${
                                crossCheck.loan.isMatched
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {crossCheck.loan.isMatched ? '✓ पूर्ण मिलान (Balanced)' : '⚠️ बेमेल (Difference)'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center space-x-1">
                            <button
                              onClick={() => setActiveTab('Assets-04')}
                              className="text-2xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold transition"
                            >
                              ४-खाता हेर्नुहोस्
                            </button>
                            <Link
                              href="/accounting/members/loan-entry"
                              className="text-2xs px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold border border-amber-300 transition"
                            >
                              ऋण प्रविष्टि
                            </Link>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Accounting Guidance Alert Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span>💡</span>
                      <span>लेखा परीक्षण तथा मिलान सुझावहरू (Audit & Reconciliation Tips):</span>
                    </h4>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5">
                      <li>
                        <strong>शेयर पूँजी (Share Capital):</strong> यदि ४-खाता दायित्व (Liabilities 05) र सदस्य शेयर लगतमा फरक देखिएमा कुनै भौचरमा शेयर बापत रकम प्रविष्टि भएको तर सदस्यको शेयर कित्ता दाखिला नभएको वा भौचरमा गल्ती भएको हुन सक्छ।
                      </li>
                      <li>
                        <strong>सदस्य बचत (Savings):</strong> सदस्य बचत खातामा रकम थप गर्दा वा झिक्दा सिधै <Link href="/accounting/members/saving-entry" className="underline font-bold text-emerald-700">Saving Entry</Link> बाट गर्दा ४-खाता र बचत पुस्तिका दुवैमा एकसाथ स्वचालित पोस्टिङ हुन्छ।
                      </li>
                      <li>
                        <strong>भौचरमा गल्ती भएमा:</strong> यदि कुनै भौचरमा रकम, खाता वा मिति गलत भएको छ भने सिधा <Link href="/accounting/journal-register" className="underline font-bold text-indigo-700">गोश्वारा भौचर दर्ता (Journal Register)</Link> मा गएर <strong>"✏️ Edit"</strong> बटन थिचेर सच्याउन सक्नुहुन्छ।
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400">
                  मिलान विवरण तानिँदैछ...
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="p-16 text-center">
              <div className="inline-block animate-spin text-3xl mb-2">🔄</div>
              <p className="text-sm font-semibold text-slate-700">गुगल सिटबाट प्रत्यक्ष विवरण तानिँदैछ...</p>
              <p className="text-xs text-slate-400 mt-1">Fetching live cells from '{activeTab}' sheet</p>
            </div>
          ) : (
            <>
              {/* ========================================================= */}
              {/* CASE 1: 4-KHATA SHEETS (Assets, Liabilities, Expenses, Income) */}
              {/* ========================================================= */}
              {is4KhataSheet ? (
                <div>
                  {/* Institution Letterhead Banner */}
                  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 border-b border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold tracking-wide text-center sm:text-left">
                        {rows[1]?.[0] || 'श्री दीपशिखा कृषि सहकारी संस्था लि='}
                      </h2>
                      <p className="text-2xs sm:text-xs text-slate-300 text-center sm:text-left">
                        {rows[2]?.[0] || 'गौरीगंगा न.पा. १ चौमाला, कैलाली'}
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-bold rounded-lg text-xs border border-emerald-500/30">
                      {rows[3]?.[0] || currentTabInfo.nameNp}
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[700px]">
                    <table className="w-full text-left border-collapse text-xs">
                      {/* 4-Khata Table Headers */}
                      <thead>
                        {/* Main Group Header Row */}
                        <tr className="bg-teal-700 text-white font-bold text-2xs sticky top-0 z-20 shadow-xs">
                          <th rowSpan={hasSubHeaders ? 2 : 1} className="py-2.5 px-3 border border-teal-600 text-center whitespace-nowrap bg-teal-800">
                            {rows[4]?.[0] || 'सि.नं.'}
                          </th>
                          <th rowSpan={hasSubHeaders ? 2 : 1} className="py-2.5 px-3 border border-teal-600 text-center whitespace-nowrap bg-teal-800">
                            {rows[4]?.[1] || 'मिति'}
                          </th>
                          <th rowSpan={hasSubHeaders ? 2 : 1} className="py-2.5 px-3 border border-teal-600 text-center whitespace-nowrap bg-teal-800">
                            {rows[4]?.[2] || 'भौचर नं='}
                          </th>
                          <th rowSpan={hasSubHeaders ? 2 : 1} className="py-2.5 px-3 border border-teal-600 text-left whitespace-nowrap bg-teal-800 min-w-44">
                            {rows[4]?.[3] || 'विवरण'}
                          </th>

                          {hasSubHeaders ? (
                            khataHeaderGroups.map((grp, gIdx) => (
                              <th
                                key={gIdx}
                                colSpan={grp.colSpan}
                                className="py-2 px-3 border border-teal-600 text-center whitespace-nowrap bg-teal-700 text-teal-50"
                              >
                                {grp.name}
                              </th>
                            ))
                          ) : (
                            (rows[4]?.slice(4) || []).map((colName: any, cIdx: number) => (
                              <th key={cIdx} className="py-2 px-3 border border-teal-600 text-center whitespace-nowrap">
                                {colName || ''}
                              </th>
                            ))
                          )}
                        </tr>

                        {/* Sub-header (Row 5: Debit, Credit, Balance) */}
                        {hasSubHeaders && rows[5] && (
                          <tr className="bg-teal-800 text-teal-100 font-semibold text-2xs sticky top-8 z-20 border-b-2 border-teal-900 shadow-xs">
                            {rows[5].slice(4).map((cell: any, cIdx: number) => {
                              const isBal = String(cell).includes('जम्मा');
                              const isDr = String(cell).includes('डेबिट');
                              const isCr = String(cell).includes('क्रेडिट');
                              return (
                                <th
                                  key={cIdx}
                                  className={`py-1.5 px-2 border border-teal-700 whitespace-nowrap text-center ${
                                    isBal ? 'bg-sky-900 text-sky-200 font-bold' : isDr ? 'text-emerald-200' : isCr ? 'text-amber-200' : ''
                                  }`}
                                >
                                  {cell || ''}
                                </th>
                              );
                            })}
                          </tr>
                        )}
                      </thead>

                      {/* 4-Khata Table Body */}
                      <tbody>
                        {khataDataRows.length === 0 ? (
                          <tr>
                            <td colSpan={26} className="p-12 text-center text-slate-400">
                              कुनै पनि कारोबार पङ्क्ति फेला परेन।
                            </td>
                          </tr>
                        ) : (
                          khataDataRows.map((row, rIdx) => {
                            const isTotalRow = row[0] === 'जम्मा' || row[0] === 'Total';

                            // Bottom Total Row
                            if (isTotalRow) {
                              return (
                                <tr
                                  key={rIdx}
                                  className="bg-amber-100/95 font-bold text-slate-900 border-t-2 border-b-2 border-amber-300 sticky bottom-0 z-10 shadow-xs"
                                >
                                  <td colSpan={4} className="py-2.5 px-3 border border-amber-200 text-center font-bold text-amber-900">
                                    {row[0] || 'जम्मा (Total)'}
                                  </td>
                                  {row.slice(4).map((cell: any, cellIdx: number) => {
                                    const num = Number(cell);
                                    const formatted =
                                      isNumeric(cell) && num !== 0
                                        ? num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        : cell === 0 || cell === '0'
                                        ? '0.00'
                                        : '-';
                                    return (
                                      <td
                                        key={cellIdx}
                                        className="py-2 px-2.5 border border-amber-200 whitespace-nowrap font-mono text-2xs text-right font-bold text-slate-900"
                                      >
                                        {formatted}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            }

                            // Regular Transaction Row
                            const hasData = row[1] || row[2] || row[3];
                            if (!hasData && !searchTerm) {
                              return (
                                <tr key={rIdx} className="hover:bg-slate-50/50 border-b border-slate-100">
                                  <td className="py-1 px-2 border border-slate-200 text-center font-mono text-slate-300 text-2xs">
                                    {rIdx + 1}
                                  </td>
                                  <td className="py-1 px-2 border border-slate-200 text-slate-300 text-2xs text-center">-</td>
                                  <td className="py-1 px-2 border border-slate-200 text-slate-300 text-2xs text-center">-</td>
                                  <td className="py-1 px-2 border border-slate-200 text-slate-300 text-2xs">-</td>
                                  {row.slice(4).map((cell: any, cellIdx: number) => (
                                    <td key={cellIdx} className="py-1 px-2 border border-slate-200 font-mono text-2xs text-right text-slate-300">
                                      {cell === 0 || cell === '0' ? '0.00' : '-'}
                                    </td>
                                  ))}
                                </tr>
                              );
                            }

                            return (
                              <tr key={rIdx} className="hover:bg-emerald-50/40 border-b border-slate-200 transition">
                                <td className="py-1.5 px-2 border border-slate-200 text-center font-mono font-bold text-slate-700 bg-slate-50">
                                  {row[0] || rIdx + 1}
                                </td>
                                <td className="py-1.5 px-2 border border-slate-200 whitespace-nowrap text-slate-800 text-center font-medium">
                                  {formatAccountingDate(row[1]) || '-'}
                                </td>
                                <td className="py-1.5 px-2 border border-slate-200 whitespace-nowrap font-mono font-bold text-emerald-700 text-center">
                                  {row[2] || '-'}
                                </td>
                                <td className="py-1.5 px-3 border border-slate-200 text-slate-900 font-medium max-w-xs truncate">
                                  {row[3] || '-'}
                                </td>
                                {row.slice(4).map((cell: any, cellIdx: number) => {
                                  const actualCol = cellIdx + 4;
                                  const isBalCol =
                                    actualCol === 6 ||
                                    actualCol === 9 ||
                                    actualCol === 12 ||
                                    actualCol === 15 ||
                                    actualCol === 18 ||
                                    actualCol === 21 ||
                                    actualCol === 24 ||
                                    actualCol === 25;
                                  const hasVal = cell !== null && cell !== undefined && cell !== '' && cell !== 0 && cell !== '0';

                                  return (
                                    <td
                                      key={cellIdx}
                                      className={`py-1.5 px-2.5 border border-slate-200 font-mono text-2xs text-right whitespace-nowrap ${
                                        isBalCol
                                          ? 'bg-sky-50 font-bold text-sky-900'
                                          : hasVal
                                          ? 'font-semibold text-slate-900 bg-emerald-50/50'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {isNumeric(cell)
                                        ? Number(cell).toLocaleString('en-IN', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })
                                        : cell || '-'}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* ========================================================= */
                /* CASE 2: STANDARD TABULAR SHEETS (Member-Data, Journal, etc.) */
                /* ========================================================= */
                <div className="overflow-x-auto max-h-[700px]">
                  <table className="w-full text-left border-collapse text-xs">
                    {/* Standard Table Header */}
                    <thead className="bg-slate-900 text-white sticky top-0 z-20 shadow-xs">
                      <tr>
                        <th className="py-3 px-3 border border-slate-800 text-center font-bold text-slate-300 text-2xs w-12">
                          सि.नं.
                        </th>
                        {standardHeaderRow.map((head: any, idx: number) => {
                          const headStr = String(head || '').trim();
                          const isRight =
                            headStr.toLowerCase().includes('amount') ||
                            headStr.toLowerCase().includes('balance') ||
                            headStr.toLowerCase().includes('debit') ||
                            headStr.toLowerCase().includes('credit') ||
                            headStr.toLowerCase().includes('outstanding');
                          return (
                            <th
                              key={idx}
                              className={`py-3 px-3.5 border border-slate-800 font-bold text-slate-100 whitespace-nowrap text-2xs tracking-wider ${
                                isRight ? 'text-right' : 'text-left'
                              }`}
                            >
                              {headStr || `स्तम्भ ${idx + 1}`}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    {/* Standard Table Body */}
                    <tbody>
                      {standardDataRows.length === 0 ? (
                        <tr>
                          <td colSpan={standardHeaderRow.length + 1} className="p-16 text-center text-slate-400">
                            कुनै पनि विवरण फेला परेन।
                          </td>
                        </tr>
                      ) : (
                        standardDataRows.map((row, rowIdx) => (
                          <tr
                            key={rowIdx}
                            className="hover:bg-emerald-50/50 border-b border-slate-200 transition even:bg-slate-50/40"
                          >
                            <td className="py-2.5 px-3 border border-slate-200 text-center font-mono font-medium text-slate-400 text-2xs bg-slate-50/70">
                              {rowIdx + 1}
                            </td>
                            {standardHeaderRow.map((head: any, colIdx: number) => {
                              const cell = row[colIdx];
                              const headStr = String(head || '').toLowerCase();
                              const isRight =
                                headStr.includes('amount') ||
                                headStr.includes('balance') ||
                                headStr.includes('debit') ||
                                headStr.includes('credit') ||
                                headStr.includes('deposit') ||
                                headStr.includes('withdraw') ||
                                headStr.includes('outstanding');
                              const isCenter =
                                headStr.includes('ward') ||
                                headStr.includes('status') ||
                                headStr.includes('gender') ||
                                headStr.includes('date') ||
                                headStr.includes('मिति');

                              return (
                                <td
                                  key={colIdx}
                                  className={`py-2.5 px-3.5 border border-slate-200 text-xs ${
                                    isRight ? 'text-right' : isCenter ? 'text-center' : 'text-left'
                                  }`}
                                >
                                  {renderStandardCell(cell, colIdx)}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

