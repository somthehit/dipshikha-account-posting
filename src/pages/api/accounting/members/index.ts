import type { NextApiRequest, NextApiResponse } from 'next';
import { memberService } from '../../../../lib/memberService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { search } = req.query;
      let members = await memberService.getAllMembers();

      if (search && typeof search === 'string') {
        const q = search.toLowerCase().trim();
        members = members.filter(
          (m) =>
            m.memberNo.toLowerCase().includes(q) ||
            m.fullName.toLowerCase().includes(q) ||
            (m.fullNameEn && m.fullNameEn.toLowerCase().includes(q)) ||
            m.phone.includes(q) ||
            (m.citizenshipNo && m.citizenshipNo.includes(q))
        );
      }

      return res.status(200).json({
        success: true,
        members,
        total: members.length,
      });
    } catch (error: any) {
      console.error('API GET /members error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      if (!body.fullName || !body.phone) {
        return res.status(400).json({ success: false, error: 'Member full name and phone number are required.' });
      }

      const newMember = await memberService.createMember({
        memberNo: body.memberNo || '',
        fullName: body.fullName,
        fullNameEn: body.fullNameEn || '',
        citizenshipNo: body.citizenshipNo || '',
        phone: body.phone,
        address: body.address || 'गौरीगंगा-१, चौमाला, कैलाली',
        wardNo: body.wardNo || '१',
        gender: body.gender || 'पुरुष',
        membershipDate: body.membershipDate || '',
        status: body.status || 'ACTIVE',
      });

      return res.status(201).json({
        success: true,
        member: newMember,
      });
    } catch (error: any) {
      console.error('API POST /members error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
