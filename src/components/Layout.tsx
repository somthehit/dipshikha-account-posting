import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Navigation } from './Navigation';
import { getCurrentBSDate } from '../lib/nepaliDate';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, title = 'Accounting Dashboard' }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentBS = getCurrentBSDate();

  // Retrieve collapse preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {}
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800">
      <Head>
        <title>{`${title} | श्री दीपशिखा कृषि सहकारी`}</title>
        <meta name="description" content="Double Entry 4-Khata Accounting with Google Sheets as Primary Datastore" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Left Vertical Navigation Menu */}
      <Navigation
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs no-print">
          <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            {/* Left: Mobile hamburger & Page Title / Breadcrumb */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none"
                aria-label="Open Navigation Menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hidden sm:inline-block">
                  ४-खाता सहकारी
                </span>
                <span className="text-sm font-semibold text-slate-700 truncate max-w-xs sm:max-w-md md:max-w-lg">
                  {title}
                </span>
              </div>
            </div>

            {/* Right: Date, Sheets sync badge & Quick Action */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                <span className="text-slate-400">📅</span>
                <span className="font-semibold text-slate-700 font-mono">{currentBS} BS</span>
              </div>

              <div className="hidden lg:flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50/60 border border-emerald-200/60 px-2 py-1 rounded-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Sheets Connected</span>
              </div>

              <Link
                href="/accounting/journal-entry"
                className="inline-flex items-center space-x-1 px-3 py-1.5 border border-transparent text-xs font-semibold rounded-md shadow-xs text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none transition"
              >
                <span>+</span>
                <span className="hidden sm:inline">भौचर प्रविष्टि</span>
                <span className="sm:hidden">भौचर</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <div>
              श्री दीपशिखा कृषि सहकारी संस्था लि. • चार खाता दोहोरो लेखा प्रणाली (Assets-04, Expenses-02, Liabilities 05, Income-03)
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span>Google Sheets Datastore Synchronized</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
