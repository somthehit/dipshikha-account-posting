import type { NextApiRequest, NextApiResponse } from 'next';
import { accountingEngine } from '../../../lib/accountingEngine';
import { googleSheetsService } from '../../../lib/googleSheetsService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const summary = await accountingEngine.getDashboardSummary();
    return res.status(200).json({
      success: true,
      data: summary,
      spreadsheetId: googleSheetsService.getSpreadsheetId(),
      isConfigured: googleSheetsService.getIsConfigured(),
    });
  } catch (error: any) {
    console.error('API /dashboard error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
