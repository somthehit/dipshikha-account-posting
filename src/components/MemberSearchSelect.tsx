import React, { useState, useRef, useEffect } from 'react';
import { Member } from '../types/member';
import { formatCurrencyNPR } from '../lib/nepaliDate';

interface MemberSearchSelectProps {
  members: Member[];
  selectedMemberNo: string;
  onSelectMember: (member: Member) => void;
  entryType: 'SAVING' | 'SHARE' | 'LOAN';
  label?: string;
  required?: boolean;
}

export const MemberSearchSelect: React.FC<MemberSearchSelectProps> = ({
  members,
  selectedMemberNo,
  onSelectMember,
  entryType,
  label = 'सदस्य छान्नुहोस् (Select Member)',
  required = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMember = members.find((m) => m.memberNo === selectedMemberNo);

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter members based on search query
  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      m.memberNo.toLowerCase().includes(q) ||
      m.fullName.toLowerCase().includes(q) ||
      (m.fullNameEn && m.fullNameEn.toLowerCase().includes(q)) ||
      (m.phone && m.phone.includes(q)) ||
      (m.citizenshipNo && m.citizenshipNo.toLowerCase().includes(q)) ||
      (m.address && m.address.toLowerCase().includes(q)) ||
      (m.wardNo && String(m.wardNo).includes(q))
    );
  });

  const getThemeColor = () => {
    switch (entryType) {
      case 'SAVING':
        return {
          badge: 'bg-sky-100 text-sky-800 border-sky-200',
          ring: 'focus:ring-sky-500 focus:border-sky-500',
          bgSelected: 'bg-sky-50/70 border-sky-200',
          highlight: 'text-sky-700',
        };
      case 'SHARE':
        return {
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          ring: 'focus:ring-emerald-500 focus:border-emerald-500',
          bgSelected: 'bg-emerald-50/70 border-emerald-200',
          highlight: 'text-emerald-700',
        };
      case 'LOAN':
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          ring: 'focus:ring-amber-500 focus:border-amber-500',
          bgSelected: 'bg-amber-50/70 border-amber-200',
          highlight: 'text-amber-700',
        };
    }
  };

  const theme = getThemeColor();

  const handleSelect = (member: Member) => {
    onSelectMember(member);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex justify-between items-center">
        <label className="block font-semibold text-slate-800 text-xs sm:text-sm">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {selectedMember && (
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center space-x-1"
          >
            <span>🔄</span>
            <span>सदस्य फेर्नुहोस् (Change Member)</span>
          </button>
        )}
      </div>

      {/* Selected Member Preview Card */}
      {selectedMember && !isOpen ? (
        <div className={`p-4 rounded-xl border ${theme.bgSelected} transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3`}>
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
              {selectedMember.memberNo.replace('M-', '') || 'M'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base">{selectedMember.fullName}</span>
                <span className={`px-2 py-0.5 rounded text-2xs font-mono font-bold border ${theme.badge}`}>
                  {selectedMember.memberNo}
                </span>
                {selectedMember.status === 'ACTIVE' ? (
                  <span className="text-3xs px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-bold rounded-full">सक्रिय</span>
                ) : (
                  <span className="text-3xs px-1.5 py-0.2 bg-slate-100 text-slate-600 font-bold rounded-full">निष्क्रिय</span>
                )}
              </div>
              <div className="text-2xs text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>📍 {selectedMember.address} (वडा {selectedMember.wardNo || '१'})</span>
                {selectedMember.phone && <span>📞 {selectedMember.phone}</span>}
                {selectedMember.citizenshipNo && <span>🪪 नागरिकता: {selectedMember.citizenshipNo}</span>}
              </div>
            </div>
          </div>

          {/* Quick Balance Metrics for Current Entry Context */}
          <div className="w-full sm:w-auto text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
            {entryType === 'SAVING' && (
              <div>
                <span className="text-2xs text-slate-500 block">हालको बचत मौज्दात (Saving Balance)</span>
                <span className="text-base sm:text-lg font-bold font-mono text-sky-900">
                  {formatCurrencyNPR(selectedMember.savingBalance || 0)}
                </span>
              </div>
            )}
            {entryType === 'SHARE' && (
              <div>
                <span className="text-2xs text-slate-500 block">हालको शेयर पूँजी (Share Capital)</span>
                <span className="text-base sm:text-lg font-bold font-mono text-emerald-900">
                  {selectedMember.shareKitta || 0} कित्ता ({formatCurrencyNPR(selectedMember.shareAmount || 0)})
                </span>
              </div>
            )}
            {entryType === 'LOAN' && (
              <div>
                <span className="text-2xs text-slate-500 block">बाँकी ऋण लगानी (Loan Outstanding)</span>
                <span className="text-base sm:text-lg font-bold font-mono text-amber-900">
                  {formatCurrencyNPR(selectedMember.loanOutstanding || 0)}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Search Box and Dropdown */
        <div className="relative">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="सदस्य नं (M-001), नाम, फोन, नागरिकता वा ठेगाना टाइप गरी खोज्नुहोस्..."
              className={`w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white shadow-2xs ${theme.ring}`}
              autoFocus={isOpen && !selectedMember}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
              <div className="p-2 bg-slate-50 text-2xs font-semibold text-slate-500 flex justify-between items-center sticky top-0 border-b border-slate-100">
                <span>फेला परेका सदस्यहरू: {filteredMembers.length} जना</span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  बन्द गर्नुहोस् ✕
                </button>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  <span>'{searchQuery}' नाम वा विवरण भएको कुनै सदस्य फेला परेन।</span>
                  <div className="mt-2">
                    <a
                      href="/accounting/members/new"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 font-bold hover:underline"
                    >
                      + नयाँ सदस्य दर्ता गर्नुहोस्
                    </a>
                  </div>
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const isCur = m.memberNo === selectedMemberNo;
                  return (
                    <div
                      key={m.memberNo}
                      onClick={() => handleSelect(m)}
                      className={`p-3 cursor-pointer transition hover:bg-slate-50 flex items-center justify-between gap-3 ${
                        isCur ? 'bg-slate-100/70 font-semibold' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-0.5 rounded text-2xs font-mono font-bold border ${theme.badge}`}>
                          {m.memberNo}
                        </span>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{m.fullName}</span>
                            {m.phone && <span className="text-2xs font-normal text-slate-500">({m.phone})</span>}
                          </div>
                          <div className="text-2xs text-slate-500">
                            {m.address} {m.citizenshipNo && `• ना.नं: ${m.citizenshipNo}`}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {entryType === 'SAVING' && (
                          <div className="text-2xs">
                            <span className="text-slate-400 block">बचत:</span>
                            <span className="font-mono font-bold text-sky-800">
                              {formatCurrencyNPR(m.savingBalance || 0)}
                            </span>
                          </div>
                        )}
                        {entryType === 'SHARE' && (
                          <div className="text-2xs">
                            <span className="text-slate-400 block">शेयर:</span>
                            <span className="font-mono font-bold text-emerald-800">
                              {m.shareKitta || 0} कित्ता ({formatCurrencyNPR(m.shareAmount || 0)})
                            </span>
                          </div>
                        )}
                        {entryType === 'LOAN' && (
                          <div className="text-2xs">
                            <span className="text-slate-400 block">ऋण बाँकी:</span>
                            <span className="font-mono font-bold text-amber-800">
                              {formatCurrencyNPR(m.loanOutstanding || 0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
