import type { NextApiRequest, NextApiResponse } from 'next';
import { accountingEngine } from '../../../../lib/accountingEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Journal ID is required' });
  }

  // Handle Edit / Update Transaction
  if (req.method === 'PUT' || req.method === 'POST') {
    try {
      const { narration, bsDate, transactionDate, referenceNo, lines, updatedBy } = req.body;
      const result = await accountingEngine.updateJournal(id, {
        narration,
        bsDate,
        transactionDate,
        referenceNo,
        lines,
        updatedBy: updatedBy || 'Accountant',
      });
      return res.status(200).json(result);
    } catch (error: any) {
      console.error(`API PUT/POST /journal/${id} error:`, error);
      return res.status(400).json({ success: false, error: error.message || 'Failed to update transaction' });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const journal = await accountingEngine.getJournalById(id);
    if (!journal) {
      return res.status(404).json({ success: false, error: 'Journal not found' });
    }

    // Calculate ledger impact
    let assetsAmount = 0;
    let expensesAmount = 0;
    let liabilitiesAmount = 0;
    let incomeAmount = 0;
    const accountsAffected: string[] = [];

    journal.lines.forEach((l) => {
      accountsAffected.push(`${l.accountCode} - ${l.accountName}`);
      if (l.accountGroup === 'Assets-04') {
        assetsAmount += l.debit - l.credit;
      } else if (l.accountGroup === 'Expenses-02') {
        expensesAmount += l.debit - l.credit;
      } else if (l.accountGroup === 'Liabilities 05') {
        liabilitiesAmount += l.credit - l.debit;
      } else if (l.accountGroup === 'Income-03') {
        incomeAmount += l.credit - l.debit;
      }
    });

    journal.ledgerImpact = {
      assetsAmount,
      expensesAmount,
      liabilitiesAmount,
      incomeAmount,
      accountsAffected,
    };

    return res.status(200).json({ success: true, journal });
  } catch (error: any) {
    console.error(`API GET /journal/${id} error:`, error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
