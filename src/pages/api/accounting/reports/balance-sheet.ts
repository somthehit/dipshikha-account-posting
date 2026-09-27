import type { NextApiRequest, NextApiResponse } from 'next';
import { reportingEngine } from '../../../../lib/reportingEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { asOfBSDate } = req.query;
    const report = await reportingEngine.getBalanceSheet(asOfBSDate as string);
    return res.status(200).json({ success: true, report });
  } catch (err: any) {
    console.error('Error generating Balance Sheet:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to generate Balance Sheet' });
  }
}
