import type { NextApiRequest, NextApiResponse } from 'next';
import { memberService } from '../../../../lib/memberService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Member No is required' });
  }

  try {
    const details = await memberService.getMemberDetails(id);
    if (!details.member) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    return res.status(200).json({
      success: true,
      ...details,
    });
  } catch (error: any) {
    console.error(`API GET /members/${id} error:`, error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
