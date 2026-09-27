import { accountingEngine } from './accountingEngine';
import { googleSheetsService } from './googleSheetsService';
import {
  FixedAsset,
  DepreciationCalculation,
  PostAssetDepreciationVoucherRequest,
} from '../types/assets';
import { getCurrentBSDate } from './nepaliDate';
import { findAccountByCode } from './chartOfAccounts';
import serverCache from './cache';

export class AssetDepreciationService {
  // =========================================================================
  // 1. Get All Fixed Assets
  // =========================================================================
  public async getFixedAssets(): Promise<FixedAsset[]> {
    const cached = serverCache.get<FixedAsset[]>('fixed_assets_all');
    if (cached) return cached;

    await googleSheetsService.ensureSystemSheets();
    const rows = await googleSheetsService.readSheet('Fixed_Assets');
    if (rows.length <= 1) return [];

    const assets: FixedAsset[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 12) continue;

      const purchaseCost = Number(r[7]) || 0;
      const accumulatedDepreciation = Number(r[12]) || 0;
      const currentBookValue =
        r[13] !== undefined && r[13] !== null && r[13] !== ''
          ? Number(r[13])
          : Math.max(0, purchaseCost - accumulatedDepreciation);

      assets.push({
        assetId: String(r[0]),
        assetCode: String(r[1]),
        name: String(r[2]),
        nameNp: String(r[3] || r[2]),
        category: (r[4] || 'Other Fixed Assets') as any,
        purchaseDateAD: String(r[5] || ''),
        purchaseDateBS: String(r[6] || ''),
        purchaseCost,
        salvageValue: Number(r[8]) || 0,
        usefulLifeYears: Number(r[9]) || 0,
        depreciationRatePercent: Number(r[10]) || 0,
        depreciationMethod: (r[11] || 'DIMINISHING_BALANCE') as any,
        accumulatedDepreciation,
        currentBookValue,
        lastDepreciationBSDate: r[14] ? String(r[14]) : '',
        status: (r[15] || 'ACTIVE') as any,
        location: r[16] ? String(r[16]) : '',
        remarks: r[17] ? String(r[17]) : '',
        createdAt: r[18] ? String(r[18]) : '',
      });
    }

    serverCache.set('fixed_assets_all', assets, 30000);
    return assets;
  }

  // =========================================================================
  // 2. Add New Fixed Asset
  // =========================================================================
  public async addFixedAsset(
    assetData: Omit<FixedAsset, 'assetId' | 'currentBookValue' | 'createdAt'>
  ): Promise<FixedAsset> {
    const assets = await this.getFixedAssets();
    const existing = assets.find(
      (a) => a.assetCode.toLowerCase() === assetData.assetCode.toLowerCase().trim()
    );
    if (existing) {
      throw new Error(`Asset code ${assetData.assetCode} already exists.`);
    }

    const assetId = `AST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const accumulatedDepreciation = assetData.accumulatedDepreciation || 0;
    const currentBookValue = Math.max(
      0,
      assetData.purchaseCost - accumulatedDepreciation
    );
    const createdAt = new Date().toISOString();

    const newAsset: FixedAsset = {
      ...assetData,
      assetId,
      currentBookValue,
      createdAt,
    };

    await googleSheetsService.appendRow('Fixed_Assets', [
      newAsset.assetId,
      newAsset.assetCode,
      newAsset.name,
      newAsset.nameNp,
      newAsset.category,
      newAsset.purchaseDateAD,
      newAsset.purchaseDateBS,
      newAsset.purchaseCost,
      newAsset.salvageValue,
      newAsset.usefulLifeYears,
      newAsset.depreciationRatePercent,
      newAsset.depreciationMethod,
      newAsset.accumulatedDepreciation,
      newAsset.currentBookValue,
      newAsset.lastDepreciationBSDate || '',
      newAsset.status,
      newAsset.location || '',
      newAsset.remarks || '',
      newAsset.createdAt,
    ]);

    serverCache.invalidateAccounting();
    return newAsset;
  }

  // =========================================================================
  // 3. Calculate Depreciation Schedule for Period
  // =========================================================================
  public async calculateDepreciation(
    periodBSDate?: string,
    selectedAssetIds?: string[]
  ): Promise<{
    calculations: DepreciationCalculation[];
    totalDepreciation: number;
    totalBookValueBefore: number;
    totalBookValueAfter: number;
  }> {
    const assets = await this.getFixedAssets();
    const activeAssets = assets.filter(
      (a) =>
        a.status === 'ACTIVE' &&
        (!selectedAssetIds || selectedAssetIds.length === 0 || selectedAssetIds.includes(a.assetId))
    );

    const calculations: DepreciationCalculation[] = [];
    let totalDepr = 0;
    let totalBvBefore = 0;
    let totalBvAfter = 0;

    activeAssets.forEach((asset) => {
      const bvBefore = asset.currentBookValue;
      if (bvBefore <= (asset.salvageValue || 0)) {
        // Already fully depreciated to salvage
        return;
      }

      let deprAmount = 0;
      const rate = asset.depreciationRatePercent || 0;

      if (asset.depreciationMethod === 'STRAIGHT_LINE') {
        // (Cost - Salvage) * Rate%
        const depreciableBase = Math.max(0, asset.purchaseCost - (asset.salvageValue || 0));
        deprAmount = Math.round((depreciableBase * (rate / 100)) * 100) / 100;
      } else {
        // Diminishing Balance / Written Down Value (WDV)
        deprAmount = Math.round((bvBefore * (rate / 100)) * 100) / 100;
      }

      // Ensure depreciation doesn't reduce book value below salvage value
      const minAllowableBv = asset.salvageValue || 0;
      if (bvBefore - deprAmount < minAllowableBv) {
        deprAmount = Math.max(0, bvBefore - minAllowableBv);
      }

      const bvAfter = Math.max(minAllowableBv, bvBefore - deprAmount);

      calculations.push({
        assetId: asset.assetId,
        assetCode: asset.assetCode,
        assetName: asset.nameNp || asset.name,
        category: asset.category,
        cost: asset.purchaseCost,
        ratePercent: asset.depreciationRatePercent,
        method: asset.depreciationMethod,
        accumulatedDepreciationBefore: asset.accumulatedDepreciation,
        bookValueBefore: bvBefore,
        depreciationAmount: deprAmount,
        bookValueAfter: bvAfter,
      });

      totalDepr += deprAmount;
      totalBvBefore += bvBefore;
      totalBvAfter += bvAfter;
    });

    return {
      calculations,
      totalDepreciation: Math.round(totalDepr * 100) / 100,
      totalBookValueBefore: Math.round(totalBvBefore * 100) / 100,
      totalBookValueAfter: Math.round(totalBvAfter * 100) / 100,
    };
  }

  // =========================================================================
  // 4. Post Depreciation as Journal Voucher (Adjustment / Hisab Milan)
  // Dr: Depreciation Expense (150.18)
  // Cr: Fixed Assets (130)
  // =========================================================================
  public async postDepreciationVoucher(
    req: PostAssetDepreciationVoucherRequest
  ): Promise<{
    success: boolean;
    journalNo: string;
    totalDepreciation: number;
    assetsUpdatedCount: number;
    journal: any;
  }> {
    const calcResult = await this.calculateDepreciation(
      req.periodBSDate,
      req.selectedAssetIds
    );

    if (calcResult.totalDepreciation <= 0) {
      throw new Error('Total depreciation amount is 0.00. No active assets requiring depreciation.');
    }

    const currentBS = req.periodBSDate || getCurrentBSDate();
    const journalNo = await accountingEngine.generateNextJournalNo(currentBS);
    const journalId = `ADJ-DEPR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const deprExpCode = req.depreciationExpenseAccountCode || '150.18';
    const fixedAssetCode = req.fixedAssetAccountCode || '130';

    const deprExpAcct = findAccountByCode(deprExpCode) || {
      code: '150.18',
      name: 'Depreciation Expense (स्थिर सम्पत्ति ह्रासकट्टी खर्च १५०=१८)',
      group: 'Expenses-02',
      normalBalance: 'DEBIT',
    };

    const fixedAssetAcct = findAccountByCode(fixedAssetCode) || {
      code: '130',
      name: 'Fixed Assets (स्थिर सम्पत्ति १३०)',
      group: 'Assets-04',
      normalBalance: 'DEBIT',
    };

    const summaryNarration =
      req.narration ||
      `आ.व. ${req.fiscalYear || '२०८१/८२'} को स्थिर सम्पत्ति ह्रासकट्टी हिसाब मिलान (जम्मा सम्पत्ति संख्या: ${calcResult.calculations.length})`;

    const lines = [
      {
        id: `${journalId}-L1`,
        journalId,
        journalNo,
        accountCode: deprExpAcct.code,
        accountName: deprExpAcct.name,
        accountGroup: 'Expenses-02' as const,
        normalBalance: 'DEBIT' as const,
        debit: calcResult.totalDepreciation,
        credit: 0,
        narration: summaryNarration,
      },
      {
        id: `${journalId}-L2`,
        journalId,
        journalNo,
        accountCode: fixedAssetAcct.code,
        accountName: fixedAssetAcct.name,
        accountGroup: 'Assets-04' as const,
        normalBalance: 'DEBIT' as const,
        debit: 0,
        credit: calcResult.totalDepreciation,
        narration: summaryNarration,
      },
    ];

    const journalEntry = {
      journalId,
      journalNo,
      transactionDate: new Date().toISOString().split('T')[0],
      bsDate: currentBS,
      referenceNo: `DEPR-${req.fiscalYear || '2081'}`,
      transactionType: 'Adjustment' as const,
      branch: 'Main Branch',
      narration: `[स्थिर सम्पत्ति ह्रासकट्टी समायोजन भौचर] ${summaryNarration}`,
      totalDebit: calcResult.totalDepreciation,
      totalCredit: calcResult.totalDepreciation,
      status: 'POSTED' as const,
      createdBy: req.user || 'Accountant',
      createdAt: new Date().toISOString(),
      lines,
    };

    // 1. Post to Journal, Journal_Lines, Ledger, and 4-Khata sheets!
    const postResult = await accountingEngine.postJournal(journalEntry as any);

    // 2. Update Fixed_Assets sheet records
    const allRows = await googleSheetsService.readSheet('Fixed_Assets');
    const updateRanges: { range: string; values: any[][] }[] = [];

    calcResult.calculations.forEach((calc) => {
      for (let i = 1; i < allRows.length; i++) {
        const r = allRows[i];
        if (r && (r[0] === calc.assetId || r[1] === calc.assetCode)) {
          const rowIdx = i + 1;
          const newAccum = calc.accumulatedDepreciationBefore + calc.depreciationAmount;
          const newBv = calc.bookValueAfter;
          const newStatus = newBv <= 0 ? 'FULLY_DEPRECIATED' : 'ACTIVE';

          // Update Col M (13: Accumulated), Col N (14: Book Value), Col O (15: Last Depr Date), Col P (16: Status)
          updateRanges.push({
            range: `'Fixed_Assets'!M${rowIdx}:P${rowIdx}`,
            values: [[newAccum, newBv, currentBS, newStatus]],
          });
          break;
        }
      }
    });

    for (const u of updateRanges) {
      await googleSheetsService.updateRange('Fixed_Assets', u.range.replace(/'Fixed_Assets'!/, ''), u.values);
    }

    serverCache.invalidateAccounting();

    return {
      success: true,
      journalNo,
      totalDepreciation: calcResult.totalDepreciation,
      assetsUpdatedCount: calcResult.calculations.length,
      journal: postResult.journal,
    };
  }
}

export const assetDepreciationService = new AssetDepreciationService();
