import type { NextApiRequest, NextApiResponse } from 'next';
import { closingEngine } from '../../../../lib/closingEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { fiscalYear, asOfDate } = req.query;
    const report = await closingEngine.generateAuditReport(
      typeof fiscalYear === 'string' ? fiscalYear : undefined,
      typeof asOfDate === 'string' ? asOfDate : undefined
    );

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('API GET /api/accounting/closing/audit error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate year-end audit report',
    });
  }
}
