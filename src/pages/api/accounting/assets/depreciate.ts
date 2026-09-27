import type { NextApiRequest, NextApiResponse } from 'next';
import { assetDepreciationService } from '../../../../lib/assetDepreciationService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Preview calculation
    try {
      const { periodBSDate, selectedAssetIds } = req.query;
      const assetIds = selectedAssetIds
        ? String(selectedAssetIds).split(',')
        : undefined;

      const schedule = await assetDepreciationService.calculateDepreciation(
        periodBSDate as string,
        assetIds
      );

      return res.status(200).json({ success: true, schedule });
    } catch (err: any) {
      console.error('Error previewing depreciation schedule:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Failed to calculate depreciation' });
    }
  }

  if (req.method === 'POST') {
    // Post depreciation journal voucher (Adjustment / Hisab Milan)
    try {
      const {
        periodBSDate,
        fiscalYear = '२०८१/८२',
        narration,
        selectedAssetIds,
        user = 'Accountant',
        depreciationExpenseAccountCode = '150.18',
        fixedAssetAccountCode = '130',
      } = req.body;

      const result = await assetDepreciationService.postDepreciationVoucher({
        periodBSDate,
        fiscalYear,
        narration,
        selectedAssetIds,
        user,
        depreciationExpenseAccountCode,
        fixedAssetAccountCode,
      });

      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Error posting asset depreciation voucher:', err);
      return res.status(500).json({
        success: false,
        message: err?.message || 'Failed to post asset depreciation voucher',
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
