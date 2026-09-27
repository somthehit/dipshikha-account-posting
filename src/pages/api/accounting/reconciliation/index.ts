import type { NextApiRequest, NextApiResponse } from 'next';
import { bankReconciliationService } from '../../../../lib/bankReconciliationService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { accountCode = '90', asOfBSDate, history } = req.query;

      if (history === 'true') {
        const historyList = await bankReconciliationService.getHistory();
        return res.status(200).json({ success: true, history: historyList });
      }

      const data = await bankReconciliationService.getBankReconciliationData(
        accountCode as string,
        asOfBSDate as string
      );

      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      console.error('Error fetching bank reconciliation data:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch bank reconciliation data' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      const stmt = bankReconciliationService.computeStatement(body);
      await bankReconciliationService.saveReconciliation(stmt);
      return res.status(200).json({ success: true, statement: stmt });
    } catch (err: any) {
      console.error('Error saving bank reconciliation statement:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Failed to save reconciliation' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
