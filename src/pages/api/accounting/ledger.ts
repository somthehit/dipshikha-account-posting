import type { NextApiRequest, NextApiResponse } from 'next';
import { accountingEngine } from '../../../lib/accountingEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accountCode, group, dateFrom, dateTo, journalNo, branch } = req.query;

    const entries = await accountingEngine.getLedger({
      accountCode: accountCode as string,
      group: group as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      journalNo: journalNo as string,
      branch: branch as string,
    });

    return res.status(200).json({
      success: true,
      entries,
      total: entries.length,
    });
  } catch (error: any) {
    console.error('API /ledger error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
