import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Layout } from '../../../components/Layout';
import { getCurrentBSDate } from '../../../lib/nepaliDate';
import {
  FixedAsset,
  AssetCategory,
  DepreciationCalculation,
} from '../../../types/assets';

export default function AssetsDepreciationPage() {
  const currentBS = getCurrentBSDate();
  const currentYear = currentBS.split('-')[0] || '2081';

  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal: Add New Asset
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAssetCode, setNewAssetCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newNameNp, setNewNameNp] = useState('');
  const [newCategory, setNewCategory] = useState<AssetCategory>('Computer & IT Accessories');
  const [newPurchaseDateBS, setNewPurchaseDateBS] = useState(currentBS);
  const [newPurchaseCost, setNewPurchaseCost] = useState<number>(0);
  const [newSalvageValue, setNewSalvageValue] = useState<number>(0);
  const [newUsefulLife, setNewUsefulLife] = useState<number>(4);
  const [newRatePercent, setNewRatePercent] = useState<number>(25);
  const [newMethod, setNewMethod] = useState<'DIMINISHING_BALANCE' | 'STRAIGHT_LINE'>('DIMINISHING_BALANCE');
  const [newLocation, setNewLocation] = useState('मुख्य कार्यालय');
  const [newRemarks, setNewRemarks] = useState('');
  const [addingAsset, setAddingAsset] = useState(false);

  // Modal: Depreciation Calculation & Voucher Posting
  const [showDeprModal, setShowDeprModal] = useState(false);
  const [deprPeriodBS, setDeprPeriodBS] = useState(currentBS);
  const [deprFiscalYear, setDeprFiscalYear] = useState('२०८१/८२');
  const [schedulePreview, setSchedulePreview] = useState<DepreciationCalculation[]>([]);
  const [totalDeprAmount, setTotalDeprAmount] = useState<number>(0);
  const [calculatingDepr, setCalculatingDepr] = useState(false);
  const [postingDepr, setPostingDepr] = useState(false);

  // Fetch all assets
  const fetchAssets = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/accounting/assets');
      const data = await res.json();
      if (data.success) {
        setAssets(data.assets || []);
      } else {
        setErrorMessage(data.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'स्थिर सम्पत्ति विवरण लोड गर्न असफल।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // Update default rate when category changes
  const handleCategoryChange = (cat: AssetCategory) => {
    setNewCategory(cat);
    switch (cat) {
      case 'Building & Land':
        setNewRatePercent(5);
        setNewUsefulLife(20);
        setNewMethod('STRAIGHT_LINE');
        break;
      case 'Furniture & Fixture':
        setNewRatePercent(15);
        setNewUsefulLife(6.67);
        setNewMethod('DIMINISHING_BALANCE');
        break;
      case 'Computer & IT Accessories':
        setNewRatePercent(25);
        setNewUsefulLife(4);
        setNewMethod('DIMINISHING_BALANCE');
        break;
      case 'Vehicles':
        setNewRatePercent(20);
        setNewUsefulLife(5);
        setNewMethod('DIMINISHING_BALANCE');
        break;
      case 'Office Equipment':
      case 'Machinery':
        setNewRatePercent(15);
        setNewUsefulLife(6.67);
        setNewMethod('DIMINISHING_BALANCE');
        break;
      default:
        setNewRatePercent(15);
        setNewUsefulLife(5);
        setNewMethod('DIMINISHING_BALANCE');
    }
  };

  // Add Asset submit
  const handleAddAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetCode || !newName || newPurchaseCost <= 0) {
      alert('कृपया सम्पत्ति कोड, नाम र खरिद मूल्य खुलाउनुहोस्।');
      return;
    }

    setAddingAsset(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/accounting/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: newAssetCode,
          name: newName,
          nameNp: newNameNp || newName,
          category: newCategory,
          purchaseDateAD: new Date().toISOString().split('T')[0],
          purchaseDateBS: newPurchaseDateBS,
          purchaseCost: Number(newPurchaseCost),
          salvageValue: Number(newSalvageValue),
          usefulLifeYears: Number(newUsefulLife),
          depreciationRatePercent: Number(newRatePercent),
          depreciationMethod: newMethod,
          accumulatedDepreciation: 0,
          status: 'ACTIVE',
          location: newLocation,
          remarks: newRemarks,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`सम्पत्ति ${data.asset.nameNp} (${data.asset.assetCode}) सफलतापूर्वक दर्ता गरियो!`);
        setShowAddModal(false);
        // Reset form
        setNewAssetCode('');
        setNewName('');
        setNewNameNp('');
        setNewPurchaseCost(0);
        await fetchAssets();
      } else {
        setErrorMessage(data.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'सम्पत्ति दर्ता गर्न असफल।');
    } finally {
      setAddingAsset(false);
    }
  };

  // Preview Depreciation Schedule
  const openDepreciationModal = async () => {
    setShowDeprModal(true);
    setCalculatingDepr(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/accounting/assets/depreciate?periodBSDate=${deprPeriodBS}`
      );
      const data = await res.json();
      if (data.success) {
        setSchedulePreview(data.schedule.calculations || []);
        setTotalDeprAmount(data.schedule.totalDepreciation || 0);
      } else {
        setErrorMessage(data.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'ह्रासकट्टी गणना गर्न असफल।');
    } finally {
      setCalculatingDepr(false);
    }
  };

  // Post Depreciation Journal Voucher (Adjustment / Hisab Milan)
  const handlePostDepreciationVoucher = async () => {
    if (totalDeprAmount <= 0) {
      alert('ह्रासकट्टी रकम शून्य छ। भौचर जारी गर्न सकिँदैन।');
      return;
    }

    setPostingDepr(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/accounting/assets/depreciate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodBSDate: deprPeriodBS,
          fiscalYear: deprFiscalYear,
          user: 'Accountant',
          depreciationExpenseAccountCode: '150.18',
          fixedAssetAccountCode: '130',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(
          `स्थिर सम्पत्ति ह्रासकट्टी हिसाब मिलान भौचर नं. ${data.journalNo} जारी भयो! (कुल ह्रासकट्टी: रु. ${formatNpr(
            data.totalDepreciation
          )})`
        );
        setShowDeprModal(false);
        await fetchAssets();
      } else {
        setErrorMessage(data.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'ह्रासकट्टी भौचर जारी गर्न असफल।');
    } finally {
      setPostingDepr(false);
    }
  };

  // Currency Formatter
  const formatNpr = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return '०.००';
    return val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Totals
  const totalGrossCost = assets.reduce((s, a) => s + (a.purchaseCost || 0), 0);
  const totalAccumDepr = assets.reduce((s, a) => s + (a.accumulatedDepreciation || 0), 0);
  const totalBookValue = assets.reduce((s, a) => s + (a.currentBookValue || 0), 0);

  return (
    <Layout title="स्थिर सम्पत्ति तथा ह्रासकट्टी (Assets & Depreciation)">
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
              <span>🏢</span>
              <span>स्थिर सम्पत्ति तथा ह्रासकट्टी प्रणाली (Fixed Assets & Depreciation)</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              सहकारीको स्थिर सम्पत्ति दर्ता, ह्रासकट्टी तालिका (SLM/WDV) र हिसाब मिलान समायोजन भौचर
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openDepreciationModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition"
            >
              <span>⚙️</span>
              <span>ह्रासकट्टी हिसाब तथा भौचर प्रविष्टि</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition"
            >
              <span>+</span>
              <span>नयाँ सम्पत्ति दर्ता</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <span>✓ {successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">✕</button>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-900">✕</button>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">कुल खरिद लागत (Gross Cost)</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1.5">
              रु. {formatNpr(totalGrossCost)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">खाता संकेत १३० स्थिर सम्पत्ति</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-amber-600">कुल ह्रासकट्टी (Accum. Depr.)</span>
            <div className="text-xl font-bold font-mono text-amber-900 mt-1.5">
              रु. {formatNpr(totalAccumDepr)}
            </div>
            <div className="text-[11px] text-amber-600 mt-1">हालसम्म कट्टा गरिएको रकम</div>
          </div>

          <div className="bg-emerald-50/70 p-5 rounded-xl border border-emerald-200 shadow-xs">
            <span className="text-xs font-semibold text-emerald-700">खुद किताबी मूल्य (Net Book Value)</span>
            <div className="text-xl font-bold font-mono text-emerald-900 mt-1.5">
              रु. {formatNpr(totalBookValue)}
            </div>
            <div className="text-[11px] text-emerald-700 mt-1">वासलातमा देखिने वास्तविक मूल्य</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">दर्ता सम्पत्ति संख्या (Assets Count)</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1.5">
              {assets.length} वटा
            </div>
            <div className="text-[11px] text-slate-400 mt-1">सक्रिय स्थिर सम्पत्ति एकाइहरू</div>
          </div>
        </div>

        {/* Fixed Asset Register Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                सहकारी स्थिर सम्पत्ति दर्ता किताब (Fixed Assets Register)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                नेपाल सहकारी मापदण्ड अनुसार वर्गीकृत सम्पूर्ण स्थिर सम्पत्ति विवरण
              </p>
            </div>
            <button
              onClick={fetchAssets}
              className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50"
            >
              रिफ्रेस
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">संकेत (Code)</th>
                  <th className="py-2.5 px-3">सम्पत्तिको नाम (Asset Name)</th>
                  <th className="py-2.5 px-3">वर्ग (Category)</th>
                  <th className="py-2.5 px-3">खरिद मिति (BS)</th>
                  <th className="py-2.5 px-3 text-right">खरिद मूल्य (Cost)</th>
                  <th className="py-2.5 px-3 text-center">ह्रास दर %</th>
                  <th className="py-2.5 px-3 text-center">विधि (Method)</th>
                  <th className="py-2.5 px-3 text-right">हालसम्म ह्रासकट्टी</th>
                  <th className="py-2.5 px-3 text-right font-bold">खुद किताबी मूल्य (WDV)</th>
                  <th className="py-2.5 px-3 text-center">अवस्था</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                      कुनै स्थिर सम्पत्ति दर्ता भएको छैन। "+ नयाँ सम्पत्ति दर्ता" मा क्लिक गरी थप्नुहोस्।
                    </td>
                  </tr>
                ) : (
                  assets.map((asset) => (
                    <tr key={asset.assetId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-800">{asset.assetCode}</td>
                      <td className="py-2 px-3 font-sans">
                        <div className="font-medium text-slate-900">{asset.nameNp}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{asset.name}</div>
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {asset.category}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{asset.purchaseDateBS}</td>
                      <td className="py-2 px-3 text-right font-medium text-slate-900">
                        {formatNpr(asset.purchaseCost)}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-700">
                        {asset.depreciationRatePercent}%
                      </td>
                      <td className="py-2 px-3 text-center font-sans text-[11px] text-slate-600">
                        {asset.depreciationMethod === 'STRAIGHT_LINE' ? 'स्थिर (SLM)' : 'घट्दो (WDV)'}
                      </td>
                      <td className="py-2 px-3 text-right text-amber-700">
                        {formatNpr(asset.accumulatedDepreciation)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800 bg-emerald-50/20">
                        {formatNpr(asset.currentBookValue)}
                      </td>
                      <td className="py-2 px-3 text-center font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            asset.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {asset.status === 'ACTIVE' ? 'सक्रिय' : 'ह्रासकट्टी सम्पन्न'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100/80 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3 font-sans text-center">
                    कुल जम्मा (GRAND TOTAL)
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {formatNpr(totalGrossCost)}
                  </td>
                  <td colSpan={2}></td>
                  <td className="py-2.5 px-3 text-right text-amber-800">
                    {formatNpr(totalAccumDepr)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-900">
                    {formatNpr(totalBookValue)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* MODAL 1: REGISTER NEW ASSET */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
              <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
                <h3 className="font-bold text-sm flex items-center space-x-2">
                  <span>🏢</span>
                  <span>नयाँ स्थिर सम्पत्ति दर्ता फारम</span>
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-white/80 hover:text-white text-base font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddAssetSubmit} className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      सम्पत्ति संकेत (Asset Code):
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="FA-COMP-02"
                      value={newAssetCode}
                      onChange={(e) => setNewAssetCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      सम्पत्ति वर्ग (Category):
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e: any) => handleCategoryChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                    >
                      <option value="Computer & IT Accessories">कम्प्युटर तथा आइटी (२५%)</option>
                      <option value="Furniture & Fixture">कार्यालय फर्निचर तथा फिक्चर्स (१५%)</option>
                      <option value="Vehicles">सवारी साधन (२०%)</option>
                      <option value="Building & Land">भवन तथा संरचना (५%)</option>
                      <option value="Office Equipment">कार्यालय उपकरण (१५%)</option>
                      <option value="Machinery">मेसिनरी तथा औजार (१५%)</option>
                      <option value="Other Fixed Assets">अन्य स्थिर सम्पत्ति (१५%)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      सम्पत्तिको नाम (नेपालीमा):
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="एचपी ल्यापटप तथा प्रिन्टर"
                      value={newNameNp}
                      onChange={(e) => setNewNameNp(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Name in English:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="HP Laptop & Canon Printer"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      खरिद मूल्य (रु.):
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newPurchaseCost || ''}
                      onChange={(e) => setNewPurchaseCost(Number(e.target.value))}
                      placeholder="100000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      कवाडी मूल्य (Salvage Value):
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={newSalvageValue || ''}
                      onChange={(e) => setNewSalvageValue(Number(e.target.value))}
                      placeholder="5000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      खरिद मिति (BS):
                    </label>
                    <input
                      type="text"
                      required
                      value={newPurchaseDateBS}
                      onChange={(e) => setNewPurchaseDateBS(e.target.value)}
                      placeholder={currentBS}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ह्रासकट्टी दर % (Rate %):
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newRatePercent}
                      onChange={(e) => setNewRatePercent(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ह्रासकट्टी विधि (Method):
                    </label>
                    <select
                      value={newMethod}
                      onChange={(e: any) => setNewMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                    >
                      <option value="DIMINISHING_BALANCE">घट्दो किताबी मौज्दात (Diminishing / WDV)</option>
                      <option value="STRAIGHT_LINE">स्थिर किस्ता विधि (Straight Line / SLM)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      राखिएको स्थान / शाखा:
                    </label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      कैफियत (Remarks):
                    </label>
                    <input
                      type="text"
                      value={newRemarks}
                      onChange={(e) => setNewRemarks(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="submit"
                    disabled={addingAsset}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs transition"
                  >
                    {addingAsset ? 'दर्ता हुँदैछ...' : '✓ सम्पत्ति दर्ता गर्नुहोस्'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: DEPRECIATION CALCULATION & VOUCHER POSTING */}
        {showDeprModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
              <div className="p-4 bg-indigo-900 text-white flex justify-between items-center">
                <h3 className="font-bold text-sm flex items-center space-x-2">
                  <span>⚙️</span>
                  <span>स्थिर सम्पत्ति ह्रासकट्टी गणना तथा हिसाब मिलान भौचर पोष्टिङ</span>
                </h3>
                <button
                  onClick={() => setShowDeprModal(false)}
                  className="text-white/80 hover:text-white text-base font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                {/* Config Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ह्रासकट्टी हिसाब मिति (BS):
                    </label>
                    <input
                      type="text"
                      value={deprPeriodBS}
                      onChange={(e) => setDeprPeriodBS(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      आर्थिक वर्ष (Fiscal Year):
                    </label>
                    <input
                      type="text"
                      value={deprFiscalYear}
                      onChange={(e) => setDeprFiscalYear(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Calculation Preview Table */}
                <div>
                  <div className="font-bold text-sm text-slate-800 mb-2 flex justify-between items-center">
                    <span>सम्पत्ति अनुसार ह्रासकट्टी पूर्व-अवलोकन (Schedule Preview):</span>
                    <span className="font-mono text-indigo-700 font-bold">
                      जम्मा ह्रासकट्टी: रु. {formatNpr(totalDeprAmount)}
                    </span>
                  </div>

                  {calculatingDepr ? (
                    <div className="text-center py-8 text-slate-500">
                      ह्रासकट्टी गणना गरिँदैछ...
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left font-mono">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="py-2 px-3">संकेत</th>
                            <th className="py-2 px-3 font-sans">सम्पत्ति</th>
                            <th className="py-2 px-2 text-right">खरिद मूल्य</th>
                            <th className="py-2 px-2 text-center">दर %</th>
                            <th className="py-2 px-2 text-right">अघिल्लो किताबी मूल्य</th>
                            <th className="py-2 px-2 text-right text-indigo-900 bg-indigo-50 font-bold">
                              यस अवधिको ह्रास
                            </th>
                            <th className="py-2 px-2 text-right">ह्रास पछिको WDV</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {schedulePreview.map((calc) => (
                            <tr key={calc.assetId} className="hover:bg-slate-50">
                              <td className="py-1.5 px-3 font-semibold text-slate-800">{calc.assetCode}</td>
                              <td className="py-1.5 px-3 font-sans text-slate-900">{calc.assetName}</td>
                              <td className="py-1.5 px-2 text-right">{formatNpr(calc.cost)}</td>
                              <td className="py-1.5 px-2 text-center">{calc.ratePercent}%</td>
                              <td className="py-1.5 px-2 text-right">{formatNpr(calc.bookValueBefore)}</td>
                              <td className="py-1.5 px-2 text-right font-bold text-indigo-800 bg-indigo-50/50">
                                {formatNpr(calc.depreciationAmount)}
                              </td>
                              <td className="py-1.5 px-2 text-right text-emerald-800 font-semibold">
                                {formatNpr(calc.bookValueAfter)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
                          <tr>
                            <td colSpan={5} className="py-2 px-3 font-sans text-center">
                              जम्मा ह्रासकट्टी (TOTAL DEPRECIATION)
                            </td>
                            <td className="py-2 px-2 text-right text-indigo-900 bg-indigo-100">
                              {formatNpr(totalDeprAmount)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Journal Entry Preview Box */}
                <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                  <div className="font-bold text-xs text-emerald-400">
                    जारी हुने दोहोरो लेखा गोश्वारा भौचर (Double Entry Preview):
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-slate-800 p-2.5 rounded border border-slate-700">
                      <span className="text-slate-400">डेबिट (Dr):</span>
                      <div className="font-bold text-white mt-0.5">
                        १५०.१८ स्थिर सम्पत्ति ह्रासकट्टी खर्च (Expenses-02)
                      </div>
                      <div className="text-emerald-400 font-bold mt-1">रु. {formatNpr(totalDeprAmount)}</div>
                    </div>
                    <div className="bg-slate-800 p-2.5 rounded border border-slate-700">
                      <span className="text-slate-400">क्रेडिट (Cr):</span>
                      <div className="font-bold text-white mt-0.5">
                        १३० स्थिर सम्पत्ति हिसाब (Assets-04)
                      </div>
                      <div className="text-emerald-400 font-bold mt-1">रु. {formatNpr(totalDeprAmount)}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    व्यहोरा: आ.व. {deprFiscalYear} को स्थिर सम्पत्ति ह्रासकट्टी हिसाब मिलान (जम्मा सम्पत्ति संख्या: {schedulePreview.length})
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDeprModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-white text-xs"
                >
                  बन्द गर्नुहोस्
                </button>
                <button
                  type="button"
                  onClick={handlePostDepreciationVoucher}
                  disabled={postingDepr || totalDeprAmount <= 0}
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg font-semibold shadow-xs transition text-xs flex items-center space-x-1.5"
                >
                  <span>{postingDepr ? 'भौचर पोष्टिङ हुँदैछ...' : '✓ ह्रासकट्टी समायोजन भौचर पोष्टिङ गर्नुहोस्'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
