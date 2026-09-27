import type { NextApiRequest, NextApiResponse } from 'next';
import { reportingEngine } from '../../../../lib/reportingEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { dateFrom, dateTo, bsDateFrom, bsDateTo, fiscalYear } = req.query;

    const report = await reportingEngine.getTrialBalance({
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      bsDateFrom: bsDateFrom as string,
      bsDateTo: bsDateTo as string,
      fiscalYear: fiscalYear as string,
    });

    return res.status(200).json({ success: true, report });
  } catch (err: any) {
    console.error('Error generating Trial Balance:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to generate Trial Balance' });
  }
}
