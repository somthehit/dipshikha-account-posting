import type { NextApiRequest, NextApiResponse } from 'next';
import { settingsService } from '../../../../lib/settingsService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const profile = settingsService.getOrganizationProfile();
      return res.status(200).json({ success: true, profile });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch settings' });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const updated = settingsService.updateOrganizationProfile(req.body);
      return res.status(200).json({ success: true, profile: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to update settings' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
