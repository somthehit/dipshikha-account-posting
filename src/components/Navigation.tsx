import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getCurrentBSDate } from '../lib/nepaliDate';
import { OrganizationProfile } from '../types/settings';
import { DEFAULT_ORG_PROFILE } from '../lib/settingsService';

interface NavigationProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  mobileOpen = false,
  onMobileClose = () => {},
  isCollapsed = false,
  onToggleCollapse = () => {},
}) => {
  const router = useRouter();
  const currentBS = getCurrentBSDate();
  const [profile, setProfile] = useState<OrganizationProfile>(DEFAULT_ORG_PROFILE);

  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch('/api/accounting/settings/organization');
        const data = await res.json();
        if (data.profile) setProfile(data.profile);
      } catch {}
    }
    loadOrg();
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    const handleRouteChange = () => {
      onMobileClose();
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, onMobileClose]);

  const navSections = [
    {
      title: 'कारोबार तथा दर्ता (Core)',
      items: [
        { href: '/accounting', label: 'Dashboard', labelNp: 'ड्यासबोर्ड', icon: '📊' },
        { href: '/accounting/journal-entry', label: 'Journal Entry', labelNp: 'गोश्वारा भौचर', icon: '✍️' },
        { href: '/accounting/journal-register', label: 'Journal Register', labelNp: 'भौचर दर्ता किताब', icon: '📖' },
        { href: '/accounting/ledger', label: 'General Ledger', labelNp: 'खाता बही (लेजर)', icon: '📑' },
      ],
    },
    {
      title: 'वित्तीय विवरण तथा मिलान (Reports & Reconcile)',
      items: [
        { href: '/accounting/reports', label: 'Financial Reports', labelNp: 'वित्तीय विवरणहरू', icon: '📈' },
        { href: '/accounting/reconciliation', label: 'Bank Reconciliation', labelNp: 'बैंक हिसाब मिलान', icon: '🏦' },
        { href: '/accounting/assets', label: 'Assets & Depreciation', labelNp: 'स्थिर सम्पत्ति तथा ह्रास', icon: '🏢' },
      ],
    },
    {
      title: 'सहायक खाता र सिट (Registers & 4-Khata)',
      items: [
        { href: '/accounting/members', label: 'Members', labelNp: 'सदस्य सहायक खाता', icon: '👥' },
        { href: '/accounting/sheets-status', label: '4-Khata Sheets', labelNp: '४-खाता प्रत्यक्ष सिट', icon: '📗' },
      ],
    },
    {
      title: 'अन्त्य तथा व्यवस्थापन (Closing & Setup)',
      items: [
        { href: '/accounting/closing-setup', label: 'Closing & अ=ल्या=', labelNp: 'वर्ष अन्त्य तथा अ=ल्या=', icon: '🔒' },
        { href: '/accounting/settings', label: 'Settings', labelNp: 'संस्था सेटिङ', icon: '⚙️' },
      ],
    },
  ];

  const renderNavContent = (isDrawer = false) => {
    const collapsed = !isDrawer && isCollapsed;

    return (
      <div className="flex flex-col h-full bg-white border-r border-slate-200 select-none">
        {/* Brand & Organization Header */}
        <div className={`p-3 border-b border-slate-100 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <Link href="/accounting" className="flex items-center space-x-2.5 group min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center text-white font-bold text-base shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
              दीप
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <h1 className="text-[13px] font-bold text-slate-900 truncate leading-snug group-hover:text-emerald-700 transition">
                  {profile.nameNp || 'श्री दीपशिखा कृषि सहकारी'}
                </h1>
                <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 truncate">
                  <span className="truncate">{profile.addressNp || 'गौरादह, झापा'}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-mono font-semibold bg-emerald-50 px-1 rounded border border-emerald-200">
                    {profile.activeFiscalYear || '२०८१/८२'}
                  </span>
                </div>
              </div>
            )}
          </Link>

          {/* Close button inside mobile drawer */}
          {isDrawer && (
            <button
              onClick={onMobileClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus:outline-none"
              title="Close Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Quick Action Button */}
        <div className={`px-2.5 pt-2 pb-1.5 ${collapsed ? 'flex justify-center' : ''}`}>
          <Link
            href="/accounting/journal-entry"
            title="नयाँ भौचर प्रविष्टि (+ New Journal)"
            className={`flex items-center justify-center rounded-lg font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${
              collapsed ? 'w-9 h-9 p-0 text-lg' : 'w-full py-2 px-3 text-xs space-x-2'
            }`}
          >
            <span className="font-bold text-sm leading-none">+</span>
            {!collapsed && <span className="font-semibold text-xs tracking-wide uppercase">New Journal Entry</span>}
          </Link>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1.5 space-y-2.5">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-0.5">
              {!collapsed && (
                <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const isActive =
                  router.pathname === item.href ||
                  (item.href !== '/accounting' && router.pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={`${item.label} (${item.labelNp})`}
                    className={`flex items-center rounded-lg text-sm transition-all group ${
                      collapsed ? 'justify-center p-2' : 'px-2.5 py-1.5 space-x-2.5'
                    } ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs border border-emerald-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                    }`}
                  >
                    <span className="text-base flex-shrink-0 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-[12.5px] leading-tight text-slate-800 font-medium">
                          {item.label}
                        </div>
                        <div className={`truncate text-[10.5px] ${isActive ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                          {item.labelNp}
                        </div>
                      </div>
                    )}
                    {!collapsed && isActive && (
                      <span className="w-1.5 h-3.5 rounded-full bg-emerald-600 flex-shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          {!collapsed ? (
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex items-center justify-between bg-white p-2 rounded-md border border-slate-200">
                <span className="text-slate-400">नेपाली मिति:</span>
                <span className="font-semibold text-slate-700 font-mono">{currentBS} BS</span>
              </div>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] text-slate-600 font-medium">Google Sheets Live</span>
                </div>
                <button
                  onClick={onToggleCollapse}
                  className="hidden md:inline-flex items-center text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200/60 transition"
                  title="Collapse Sidebar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Google Sheets Live Connected"></span>
              <button
                onClick={onToggleCollapse}
                className="hidden md:inline-flex items-center text-slate-400 hover:text-slate-700 p-1.5 rounded hover:bg-slate-200 transition"
                title="Expand Sidebar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sticky Vertical Sidebar */}
      <aside
        className={`hidden md:block flex-shrink-0 h-screen sticky top-0 z-30 transition-all duration-300 no-print ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity no-print"
        />
      )}

      {/* Mobile Off-Canvas Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden no-print ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderNavContent(true)}
      </div>
    </>
  );
};
