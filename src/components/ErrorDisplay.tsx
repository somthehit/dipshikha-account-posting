import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getCurrentBSDate } from '../lib/nepaliDate';

export interface ErrorDisplayProps {
  statusCode?: number;
  title?: string;
  nepaliTitle?: string;
  message?: string;
  nepaliMessage?: string;
  errorDetails?: string;
  errorStack?: string;
  onRetry?: () => void;
  showNavigationShortcuts?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  statusCode = 404,
  title,
  nepaliTitle,
  message,
  nepaliMessage,
  errorDetails,
  errorStack,
  onRetry,
  showNavigationShortcuts = true,
}) => {
  const router = useRouter();
  const currentBS = getCurrentBSDate();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copied, setCopied] = useState(false);

  // Formatting status code in Nepali numerals
  const nepaliDigits: { [key: string]: string } = {
    '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
    '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
  };
  const nepaliCode = statusCode
    ? String(statusCode).split('').map((d) => nepaliDigits[d] || d).join('')
    : 'त्रुटि';

  const is404 = statusCode === 404;
  const is500 = statusCode === 500 || statusCode === 502 || statusCode === 503;

  const resolvedNepaliTitle = nepaliTitle || (
    is404
      ? 'खोज्नुभएको पृष्ठ फेला परेन'
      : is500
      ? 'प्रणालीमा आन्तरिक समस्या उत्पन्न भयो'
      : 'अनपेक्षित त्रुटि देखापर्यो'
  );

  const resolvedTitle = title || (
    is404
      ? '404 - Page Not Found'
      : is500
      ? '500 - Internal System Error'
      : 'Unexpected Application Error'
  );

  const resolvedNepaliMessage = nepaliMessage || (
    is404
      ? 'तपाईंले अनुरोध गर्नुभएको वेब ठेगाना (URL) फेला परेन वा यो पृष्ठ परिमार्जन गरिएको हुन सक्छ। कृपया तल दिइएका मुख्य लेखा मेनु वा सिफारिस गरिएका पृष्ठहरू प्रयोग गर्नुहोस्।'
      : 'सहकारी लेखा प्रणालीको सर्भर वा डाटा स्रोतमा अस्थायी अवरोध भएको हुनसक्छ। तपाईंको अघिल्लो डाटा तथा भौचरहरू सुरक्षित छन्।'
  );

  const resolvedMessage = message || (
    is404
      ? 'The requested page or resource could not be located. Your recorded transactions remain intact.'
      : 'An unexpected server condition occurred. Your recorded transactions remain safely synchronized.'
  );

  const handleCopyDiagnostics = () => {
    const diagnosticText = `[Cooperative Accounting Error Report]
Timestamp (BS): ${currentBS}
Timestamp (AD): ${new Date().toISOString()}
Status Code: ${statusCode}
Path: ${typeof window !== 'undefined' ? window.location.pathname + window.location.search : 'N/A'}
Error Title: ${resolvedTitle}
Details: ${errorDetails || 'None'}
Stack:
${errorStack || 'N/A'}
User-Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(diagnosticText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
      <Head>
        <title>{`${statusCode} - ${resolvedNepaliTitle} | श्री दीपशिखा कृषि सहकारी`}</title>
      </Head>

      {/* Top Header bar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-20">
        <Link href="/accounting" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-600 flex items-center justify-center font-bold text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
            ४खा
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tracking-wide group-hover:text-emerald-700 transition-colors">
              श्री दीपशिखा कृषि सहकारी संस्था लि.
            </div>
            <div className="text-xs text-emerald-800 font-semibold">
              चार खाता दोहोरो लेखा प्रणाली (४-Khata Co-op Core)
            </div>
          </div>
        </Link>

        <div className="flex items-center space-x-3 text-xs">
          <span className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold font-mono">
            <span>📅</span>
            <span>{currentBS} BS</span>
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold flex items-center space-x-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>डाटा सुरक्षित</span>
          </span>
        </div>
      </header>

      {/* Main Error Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col justify-center items-center text-center">
        
        {/* Status Code Badge */}
        <div className="mb-6">
          <div className={`inline-flex items-center space-x-3 px-6 py-2.5 rounded-2xl border-2 shadow-sm ${
            is404
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : is500
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}>
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900">
              {nepaliCode}
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wider text-slate-600 border-l-2 border-slate-300 pl-3">
              HTTP {statusCode}
            </span>
          </div>
        </div>

        {/* High-Contrast Main Heading in Nepali */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          {resolvedNepaliTitle}
        </h1>

        {/* English Subtitle */}
        <p className="text-base sm:text-lg font-bold text-emerald-800 mb-4">
          {resolvedTitle}
        </p>

        {/* Descriptive Guidance (High Contrast Slate-700) */}
        <div className="max-w-xl text-slate-700 text-sm sm:text-base leading-relaxed mb-8 font-medium">
          <p>{resolvedNepaliMessage}</p>
          <p className="text-xs text-slate-500 mt-2 italic">{resolvedMessage}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <Link
            href="/accounting"
            className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-sm shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>मुख्य ड्यासबोर्डमा जानुहोस् (Dashboard)</span>
          </Link>

          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm border border-slate-300 shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center space-x-2"
            >
              <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>पुनः प्रयास गर्नुहोस् (Retry)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm border border-slate-300 shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center space-x-2"
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>अघिल्लो पृष्ठमा फर्कनुहोस् (Go Back)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white font-semibold text-sm shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center space-x-2"
          >
            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>ताजा गर्नुहोस् (Refresh)</span>
          </button>
        </div>

        {/* Quick Navigation Cards (Crisp High-Contrast White Cards) */}
        {showNavigationShortcuts && (
          <div className="w-full max-w-3xl mb-8">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
              लेखा प्रणालीका प्रमुख सिफारिस गरिएका मोड्युलहरू (RECOMMENDED MODULES)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
              <Link
                href="/accounting/journal-entry"
                className="p-4 rounded-xl bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all group"
              >
                <div className="text-slate-900 font-bold text-sm group-hover:text-emerald-800 flex items-center justify-between">
                  <span>भौचर प्रविष्टि</span>
                  <span className="text-xs text-emerald-700 font-black group-hover:translate-x-1 transition-transform">→</span>
                </div>
                <div className="text-slate-500 text-xs mt-1 font-medium">Journal Entry Voucher</div>
              </Link>

              <Link
                href="/accounting/journal-register"
                className="p-4 rounded-xl bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all group"
              >
                <div className="text-slate-900 font-bold text-sm group-hover:text-emerald-800 flex items-center justify-between">
                  <span>भौचर रजिस्टर</span>
                  <span className="text-xs text-emerald-700 font-black group-hover:translate-x-1 transition-transform">→</span>
                </div>
                <div className="text-slate-500 text-xs mt-1 font-medium">Journal Register Book</div>
              </Link>

              <Link
                href="/accounting/reports"
                className="p-4 rounded-xl bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all group"
              >
                <div className="text-slate-900 font-bold text-sm group-hover:text-emerald-800 flex items-center justify-between">
                  <span>वित्तीय प्रतिवेदनहरू</span>
                  <span className="text-xs text-emerald-700 font-black group-hover:translate-x-1 transition-transform">→</span>
                </div>
                <div className="text-slate-500 text-xs mt-1 font-medium">Trial Balance, P&L, BS</div>
              </Link>

              <Link
                href="/accounting/reconciliation"
                className="p-4 rounded-xl bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all group"
              >
                <div className="text-slate-900 font-bold text-sm group-hover:text-emerald-800 flex items-center justify-between">
                  <span>बैंक हिसाब मिलान</span>
                  <span className="text-xs text-emerald-700 font-black group-hover:translate-x-1 transition-transform">→</span>
                </div>
                <div className="text-slate-500 text-xs mt-1 font-medium">Bank Reconciliation</div>
              </Link>

              <Link
                href="/accounting/assets"
                className="p-4 rounded-xl bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all group"
              >
                <div className="text-slate-900 font-bold text-sm group-hover:text-emerald-800 flex items-center justify-between">
                  <span>स्थिर सम्पत्ति तथा ह्रास</span>
                  <span className="text-xs text-emerald-700 font-black group-hover:translate-x-1 transition-transform">→</span>
                </div>
                <div className="text-slate-500 text-xs mt-1 font-medium">Fixed Assets Register</div>
              </Link>

              <Link
                href="/accounting/daybook"
                className="p-4 rounded-xl bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all group"
              >
                <div className="text-slate-900 font-bold text-sm group-hover:text-emerald-800 flex items-center justify-between">
                  <span>दैनिक खाता (Daybook)</span>
                  <span className="text-xs text-emerald-700 font-black group-hover:translate-x-1 transition-transform">→</span>
                </div>
                <div className="text-slate-500 text-xs mt-1 font-medium">Daily Transactions</div>
              </Link>
            </div>
          </div>
        )}

        {/* Collapsible Technical Diagnostics */}
        <div className="w-full max-w-3xl bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden text-left">
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>प्राविधिक जानकारी तथा निदान विवरण (Technical Diagnostics)</span>
            </div>
            <span className="text-slate-600 font-mono">
              {showDiagnostics ? '▲ लुकाउनुहोस्' : '▼ हेर्नुहोस्'}
            </span>
          </button>

          {showDiagnostics && (
            <div className="p-4 space-y-3 text-xs font-mono bg-slate-900 text-slate-100 border-t border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                <div><span className="text-emerald-400 font-semibold">HTTP Status:</span> {statusCode}</div>
                <div><span className="text-emerald-400 font-semibold">Requested Path:</span> {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}</div>
                <div><span className="text-emerald-400 font-semibold">BS Timestamp:</span> {currentBS}</div>
                <div><span className="text-emerald-400 font-semibold">AD Timestamp:</span> {new Date().toLocaleTimeString()}</div>
              </div>

              {errorDetails && (
                <div className="mt-2 p-2.5 rounded bg-rose-950/80 border border-rose-700 text-rose-200 break-words">
                  <div className="text-[10px] text-rose-300 uppercase font-bold mb-1">त्रुटि सन्देश (Error Details):</div>
                  {errorDetails}
                </div>
              )}

              {errorStack && (
                <div className="mt-2 p-2.5 rounded bg-black/60 border border-slate-700 text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px]">
                  {errorStack}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleCopyDiagnostics}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition text-xs flex items-center space-x-1.5 shadow-xs"
                >
                  {copied ? (
                    <>
                      <span>✓</span>
                      <span>विवरण कपी भयो (Copied!)</span>
                    </>
                  ) : (
                    <>
                      <span>📋</span>
                      <span>रिपोर्ट कपी गर्नुहोस् (Copy Diagnostics)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-600 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 shadow-xs">
        <div>
          श्री दीपशिखा कृषि सहकारी संस्था लि. • चार खाता दोहोरो लेखा प्रणाली (Assets-04, Expenses-02, Liabilities 05, Income-03)
        </div>
        <div className="flex items-center space-x-2 text-slate-600">
          <span>सुरक्षित प्राविधिक सहायता</span>
          <span>•</span>
          <Link href="/accounting" className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline">
            Dashboard
          </Link>
        </div>
      </footer>
    </div>
  );
};
