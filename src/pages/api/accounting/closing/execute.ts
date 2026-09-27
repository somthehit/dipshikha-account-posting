import type { NextApiRequest, NextApiResponse } from 'next';
import { closingEngine } from '../../../../lib/closingEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const {
      currentFiscalYear,
      nextFiscalYear,
      closingDate,
      newYearOpeningDate,
      surplusAccountCode,
      archivePreviousYearSheets,
      user,
    } = req.body;

    if (!currentFiscalYear || !nextFiscalYear || !closingDate) {
      return res.status(400).json({
        success: false,
        error: 'Current Fiscal Year, Next Fiscal Year, and Closing Date are required.',
      });
    }

    // 1. Close nominal accounts (Expenses & Income -> Surplus)
    const nominalResult = await closingEngine.executeNominalClosing({
      fiscalYear: currentFiscalYear,
      closingDate,
      surplusAccountCode: surplusAccountCode || '25',
      user: user || 'Closing Auditor',
    });

    // 2. Rollover ending balances of Real Accounts to new year opening (अ=ल्या=)
    const rolloverResult = await closingEngine.rolloverToNewYear({
      currentFiscalYear,
      nextFiscalYear,
      closingDate,
      newYearOpeningDate: newYearOpeningDate || closingDate,
      archivePreviousYearSheets: archivePreviousYearSheets !== false,
      user: user || 'Closing Auditor',
    });

    return res.status(200).json({
      success: true,
      message: rolloverResult.message,
      nominalClosing: nominalResult,
      openingRollover: rolloverResult,
      archivedSheets: rolloverResult.archivedSheets || [],
    });
  } catch (error: any) {
    console.error('API POST /api/accounting/closing/execute error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to execute year-end closing and rollover',
    });
  }
}
