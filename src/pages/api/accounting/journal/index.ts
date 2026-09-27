import type { NextApiRequest, NextApiResponse } from 'next';
import { accountingEngine } from '../../../../lib/accountingEngine';
import { JournalEntry } from '../../../../types/accounting';
import { getCurrentBSDate } from '../../../../lib/nepaliDate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { search, status, dateFrom, dateTo } = req.query;
      let journals = await accountingEngine.getAllJournals();

      if (search && typeof search === 'string') {
        const q = search.toLowerCase();
        journals = journals.filter(
          (j) =>
            j.journalNo.toLowerCase().includes(q) ||
            j.narration.toLowerCase().includes(q) ||
            (j.referenceNo && j.referenceNo.toLowerCase().includes(q))
        );
      }

      if (status && typeof status === 'string') {
        journals = journals.filter((j) => j.status === status);
      }

      if (dateFrom && typeof dateFrom === 'string') {
        journals = journals.filter((j) => j.transactionDate >= dateFrom);
      }

      if (dateTo && typeof dateTo === 'string') {
        journals = journals.filter((j) => j.transactionDate <= dateTo);
      }

      return res.status(200).json({
        success: true,
        journals,
        total: journals.length,
      });
    } catch (error: any) {
      console.error('API GET /journal error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;

      if (!body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
        return res.status(400).json({ success: false, error: 'Journal lines cannot be empty.' });
      }

      const bsDate = body.bsDate || getCurrentBSDate();
      const journalNo = body.journalNo || (await accountingEngine.generateNextJournalNo(bsDate));
      const journalId = body.journalId || `JE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const entry: JournalEntry = {
        journalId,
        journalNo,
        transactionDate: body.transactionDate || new Date().toISOString().split('T')[0],
        bsDate,
        referenceNo: body.referenceNo || '',
        transactionType: body.transactionType || 'Journal',
        branch: body.branch || 'Main Branch',
        narration: body.narration || '',
        totalDebit: 0,
        totalCredit: 0,
        status: 'POSTED',
        createdBy: body.createdBy || 'Staff User',
        createdAt: new Date().toISOString(),
        lines: body.lines,
      };

      const result = await accountingEngine.postJournal(entry);
      return res.status(201).json(result);
    } catch (error: any) {
      console.error('API POST /journal error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Journal posting failed. Please verify the accounting records.',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
