import type { NextApiRequest, NextApiResponse } from 'next';
import { googleSheetsService } from '../../../../lib/googleSheetsService';
import { AuditLog } from '../../../../types/accounting';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { action, status, user, limit = '100' } = req.query;

    const rows = await googleSheetsService.readSheet('Audit_Log');
    const logs: AuditLog[] = [];

    // Header is row 0: Log ID, Timestamp, Action, Entity Type, Entity ID, User, Status, Details, Error Message
    for (let i = rows.length - 1; i >= 1; i--) {
      const r = rows[i];
      if (!r || r.length === 0 || !r[0]) continue;

      const logItem: AuditLog = {
        logId: String(r[0] || ''),
        timestamp: String(r[1] || ''),
        action: String(r[2] || ''),
        entityType: String(r[3] || ''),
        entityId: String(r[4] || ''),
        user: String(r[5] || ''),
        status: (r[6] === 'SUCCESS' || r[6] === 'FAILED' || r[6] === 'WARNING') ? r[6] : 'SUCCESS',
        details: String(r[7] || ''),
        errorMessage: r[8] ? String(r[8]) : undefined,
      };

      // Filter by action
      if (action && typeof action === 'string' && logItem.action !== action) {
        continue;
      }
      // Filter by status
      if (status && typeof status === 'string' && logItem.status !== status) {
        continue;
      }
      // Filter by user
      if (user && typeof user === 'string' && !logItem.user.toLowerCase().includes(user.toLowerCase())) {
        continue;
      }

      logs.push(logItem);
      if (logs.length >= Number(limit)) break;
    }

    return res.status(200).json({
      success: true,
      totalCount: logs.length,
      logs,
    });
  } catch (error: any) {
    console.error('API GET /api/accounting/audit-log error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch audit logs',
    });
  }
}
