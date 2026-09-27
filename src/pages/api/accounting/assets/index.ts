import type { NextApiRequest, NextApiResponse } from 'next';
import { assetDepreciationService } from '../../../../lib/assetDepreciationService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const assets = await assetDepreciationService.getFixedAssets();
      return res.status(200).json({ success: true, assets });
    } catch (err: any) {
      console.error('Error fetching fixed assets:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch fixed assets' });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        assetCode,
        name,
        nameNp,
        category,
        purchaseDateAD,
        purchaseDateBS,
        purchaseCost,
        salvageValue = 0,
        usefulLifeYears = 5,
        depreciationRatePercent,
        depreciationMethod = 'DIMINISHING_BALANCE',
        accumulatedDepreciation = 0,
        status = 'ACTIVE',
        location,
        remarks,
      } = req.body;

      if (!assetCode || !name || !purchaseCost) {
        return res.status(400).json({
          success: false,
          message: 'Asset code, name, and purchase cost are required.',
        });
      }

      const asset = await assetDepreciationService.addFixedAsset({
        assetCode: assetCode.trim().toUpperCase(),
        name,
        nameNp: nameNp || name,
        category,
        purchaseDateAD,
        purchaseDateBS,
        purchaseCost: Number(purchaseCost),
        salvageValue: Number(salvageValue),
        usefulLifeYears: Number(usefulLifeYears),
        depreciationRatePercent: Number(depreciationRatePercent) || 15,
        depreciationMethod,
        accumulatedDepreciation: Number(accumulatedDepreciation) || 0,
        status,
        location,
        remarks,
      });

      return res.status(201).json({ success: true, asset });
    } catch (err: any) {
      console.error('Error adding fixed asset:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Failed to add fixed asset' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
