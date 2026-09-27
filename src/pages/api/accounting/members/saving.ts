import type { NextApiRequest, NextApiResponse } from 'next';
import { memberService } from '../../../../lib/memberService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    if (!body.memberNo || !body.amount) {
      return res.status(400).json({ success: false, error: 'Member No and Amount are required.' });
    }

    const result = await memberService.recordSavingTransaction({
      memberNo: body.memberNo,
      amount: Number(body.amount),
      type: body.type || 'DEPOSIT',
      savingType: body.savingType || 'नियमित बचत',
      accountNo: body.accountNo,
      paymentMethod: body.paymentMethod || 'CASH',
      narration: body.narration || '',
      bsDate: body.bsDate,
    });

    return res.status(200).json({
      success: true,
      message: `Savings transaction recorded. Voucher ${result.journalNo} auto-posted to General Ledger.`,
      ...result,
    });
  } catch (error: any) {
    console.error('API /members/saving error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
}
