import type { NextApiRequest, NextApiResponse } from 'next';
import { googleSheetsService } from '../../../lib/googleSheetsService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await googleSheetsService.ensureSystemSheets();
    return res.status(200).json({
      success: true,
      message: 'System sheets verified / created successfully without modifying existing sheets.',
      spreadsheetId: googleSheetsService.getSpreadsheetId(),
      isConfigured: googleSheetsService.getIsConfigured(),
    });
  } catch (error: any) {
    console.error('API /init-sheets error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
