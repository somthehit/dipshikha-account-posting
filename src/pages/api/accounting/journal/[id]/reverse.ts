import type { NextApiRequest, NextApiResponse } from 'next';
import { accountingEngine } from '../../../../../lib/accountingEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Journal ID is required' });
  }

  try {
    const { reason, user } = req.body;
    const reversalReason = reason || 'Correction / Reversal of Journal Entry';
    const currentUser = user || 'Admin / Accountant';

    const result = await accountingEngine.reverseJournal(id, reversalReason, currentUser);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error(`API POST /journal/${id}/reverse error:`, error);
    return res.status(400).json({ success: false, error: error.message });
  }
}
