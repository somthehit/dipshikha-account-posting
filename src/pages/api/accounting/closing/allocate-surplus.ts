import type { NextApiRequest, NextApiResponse } from 'next';
import { closingEngine } from '../../../../lib/closingEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const {
      fiscalYear,
      decisionDate,
      agmResolutionNo,
      surplusAccountCode,
      allocations,
      user,
      notes,
    } = req.body;

    if (!fiscalYear || !decisionDate || !agmResolutionNo) {
      return res.status(400).json({
        success: false,
        error: 'Fiscal Year, Decision Date (BS), and AGM Resolution Reference are required.',
      });
    }

    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one statutory fund allocation is required.',
      });
    }

    const result = await closingEngine.executeSurplusAllocation({
      fiscalYear,
      decisionDate,
      agmResolutionNo,
      surplusAccountCode,
      allocations,
      user: user || 'Auditor / Board Decision',
      notes,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('API POST /api/accounting/closing/allocate-surplus error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to execute statutory surplus allocation',
    });
  }
}
