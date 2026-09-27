import type { NextApiRequest, NextApiResponse } from 'next';
import { bankReconciliationService } from '../../../../lib/bankReconciliationService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const {
      bankAccountCode = '90',
      adjustmentType,
      amount,
      offsetAccountCode,
      narration,
      bsDate,
      referenceNo,
      user = 'Accountant',
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero.' });
    }
    if (!offsetAccountCode) {
      return res.status(400).json({ success: false, message: 'Offset account is required.' });
    }
    if (!narration) {
      return res.status(400).json({ success: false, message: 'Narration is required.' });
    }

    const result = await bankReconciliationService.postAdjustmentVoucher({
      bankAccountCode,
      adjustmentType,
      amount: Number(amount),
      offsetAccountCode,
      narration,
      bsDate,
      referenceNo,
      user,
    });

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Error posting bank adjustment voucher:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to post bank adjustment voucher',
    });
  }
}
