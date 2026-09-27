import type { NextApiRequest, NextApiResponse } from 'next';
import { DEFAULT_ACCOUNTS, searchAccounts } from '../../../lib/chartOfAccounts';
import { accountingEngine } from '../../../lib/accountingEngine';

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

  try {
    const balances = await accountingEngine.getAllAccountBalances();
    const enrichedAccounts = accounts.map((a) => ({
      ...a,
      currentBalance: balances[a.code] !== undefined ? balances[a.code] : 0,
    }));

    return res.status(200).json({
      accounts: enrichedAccounts,
      total: enrichedAccounts.length,
      cashBalance: balances['80'] || 0,
      bankBalance: balances['90'] || 0,
    });
  } catch {
    return res.status(200).json({
      accounts,
      total: accounts.length,
      cashBalance: 0,
      bankBalance: 0,
    });
  }
}
