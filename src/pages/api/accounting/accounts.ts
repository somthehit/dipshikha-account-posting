import type { NextApiRequest, NextApiResponse } from 'next';
import { DEFAULT_ACCOUNTS, searchAccounts } from '../../../lib/chartOfAccounts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, group } = req.query;
  let accounts = DEFAULT_ACCOUNTS;

  if (query && typeof query === 'string') {
    accounts = searchAccounts(query);
  }

  if (group && typeof group === 'string') {
    accounts = accounts.filter((a) => a.group === group || a.groupCode === group);
  }

  return res.status(200).json({
    accounts,
    total: accounts.length,
  });
}
