import type { NextApiRequest, NextApiResponse } from 'next';
import { closingEngine } from '../../../../lib/closingEngine';
import { accountingEngine } from '../../../../lib/accountingEngine';
import { JournalEntry, JournalLine } from '../../../../types/accounting';
import { getCurrentBSDate } from '../../../../lib/nepaliDate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { mode, fiscalYear, closingDate, adjustmentAccountCode, newAccount, manualLines, narration, user } = req.body;

    // 1. Mode: CREATE_COA (Auto-create or register a custom COA for adjustment)
    if (mode === 'CREATE_COA') {
      if (!newAccount || !newAccount.code) {
        return res.status(400).json({ success: false, error: 'Account code is required.' });
      }
      const created = closingEngine.ensureClosingCOA({
        code: newAccount.code,
        name: newAccount.name,
        nameNp: newAccount.nameNp,
        group: newAccount.group,
      });
      return res.status(200).json({
        success: true,
        account: created,
        message: `✓ खाता ${created.code} - ${created.nameNp} सफलतापूर्वक तयार भयो।`,
      });
    }

    // 2. Mode: AUTO (Auto-fix differences into selected/created COA)
    if (mode === 'AUTO') {
      const result = await closingEngine.autoFixDifferences({
        fiscalYear,
        closingDate,
        adjustmentAccountCode,
        narration,
        user,
      });
      return res.status(200).json(result);
    }

    // 3. Mode: MANUAL (Post custom adjusting lines)
    if (mode === 'MANUAL') {
      if (!manualLines || !Array.isArray(manualLines) || manualLines.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'At least two balanced adjustment lines are required.',
        });
      }

      const bsDate = closingDate || getCurrentBSDate();
      const journalNo = await accountingEngine.generateNextJournalNo(bsDate);
      const journalId = `ADJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const entry: JournalEntry = {
        journalId,
        journalNo,
        transactionDate: new Date().toISOString().split('T')[0],
        bsDate,
        referenceNo: 'MANUAL-ADJ',
        transactionType: 'Adjustment',
        branch: 'Main Branch',
        narration: narration || `वर्षान्त हिसाब समायोजन (Manual Audit Adjustment Entry)`,
        totalDebit: manualLines.reduce((sum: number, l: JournalLine) => sum + (Number(l.debit) || 0), 0),
        totalCredit: manualLines.reduce((sum: number, l: JournalLine) => sum + (Number(l.credit) || 0), 0),
        status: 'POSTED',
        createdBy: user || 'Manual Adjustment',
        createdAt: new Date().toISOString(),
        lines: manualLines,
      };

      const postResult = await accountingEngine.postJournal(entry);
      return res.status(200).json({
        success: true,
        journal: postResult.journal,
        message: `✓ म्यानुअल समायोजन भौचर ${journalNo} सफलतापूर्वक दर्ता गरियो।`,
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid adjustment mode.' });
  } catch (error: any) {
    console.error('API POST /api/accounting/closing/adjust error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to process adjustment',
    });
  }
}
