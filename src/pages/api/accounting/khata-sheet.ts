import type { NextApiRequest, NextApiResponse } from 'next';
import { googleSheetsService } from '../../../lib/googleSheetsService';

const ALLOWED_SHEETS = [
  'Assets-04',
  'Expenses-02',
  'Liabilities 05',
  'Income-03',
  'Trial_Balance',
  'Journal',
  'Member-Data',
  'Share_Book',
  'Saving_Book',
  'Loan_Book',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { sheet = 'Assets-04', maxRows = '200' } = req.query;
    const sheetName = typeof sheet === 'string' ? sheet : 'Assets-04';

    if (!ALLOWED_SHEETS.includes(sheetName)) {
      return res.status(400).json({ success: false, error: 'Invalid sheet name requested' });
    }

    const rows = await googleSheetsService.readSheet(sheetName);
    const limit = parseInt(typeof maxRows === 'string' ? maxRows : '200', 10);
    const slicedRows = rows.slice(0, Math.min(rows.length, limit));

    return res.status(200).json({
      success: true,
      sheetName,
      totalRows: rows.length,
      rows: slicedRows,
      spreadsheetId: googleSheetsService.getSpreadsheetId(),
      isConfigured: googleSheetsService.getIsConfigured(),
    });
  } catch (error: any) {
    console.error('API GET /api/accounting/khata-sheet error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch 4-Khata sheet data',
    });
  }
}
