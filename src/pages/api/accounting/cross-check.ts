import type { NextApiRequest, NextApiResponse } from 'next';
import { googleSheetsService } from '../../../lib/googleSheetsService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 1. Fetch live sheets concurrently
    const [liabRows, assetsRows, memberRows, shareRows, savingRows, loanRows] = await Promise.all([
      googleSheetsService.readSheet('Liabilities 05'),
      googleSheetsService.readSheet('Assets-04'),
      googleSheetsService.readSheet('Member-Data'),
      googleSheetsService.readSheet('Share_Book').catch(() => []),
      googleSheetsService.readSheet('Saving_Book').catch(() => []),
      googleSheetsService.readSheet('Loan_Book').catch(() => []),
    ]);

    // -------------------------------------------------------------
    // Helper: Find balance from 4-Khata (either Total row or last row)
    // -------------------------------------------------------------
    const getKhataBalance = (rows: any[][], colIdx: number): number => {
      if (!rows || rows.length < 6) return 0;
      // Look for total row first
      const totalRow = rows.find((r) => r && (r[0] === 'जम्मा' || r[0] === 'Total'));
      if (totalRow && totalRow[colIdx] !== undefined && totalRow[colIdx] !== '' && !isNaN(Number(totalRow[colIdx]))) {
        return Number(totalRow[colIdx]);
      }
      // Fallback: look for the last transaction row with a number
      for (let i = rows.length - 1; i >= 6; i--) {
        const val = rows[i]?.[colIdx];
        if (val !== undefined && val !== null && val !== '' && !isNaN(Number(val))) {
          return Number(val);
        }
      }
      return 0;
    };

    // -------------------------------------------------------------
    // 1. SHARE CROSS CHECK: Liabilities 05 (शेयर १०) vs Share Books
    // -------------------------------------------------------------
    // In Liabilities 05: Col 6 is 'शेयर (१०)' balance (Col G)
    const khataShareBal = getKhataBalance(liabRows, 6);

    // From Member-Data: Col 11 is 'Share Amount'
    let memberShareTotal = 0;
    let memberCountWithShare = 0;
    for (let i = 1; i < memberRows.length; i++) {
      const r = memberRows[i];
      if (!r) continue;
      const amt = Number(r[11]) || 0;
      if (amt > 0) memberCountWithShare++;
      memberShareTotal += amt;
    }

    // From Share_Book (if entries exist)
    let shareBookTotal = 0;
    if (shareRows.length > 1) {
      for (let i = 1; i < shareRows.length; i++) {
        const r = shareRows[i];
        if (!r) continue;
        const cr = Number(r[10]) || 0; // Credit (Purchase)
        const dr = Number(r[9]) || 0;  // Debit (Refund)
        shareBookTotal += cr - dr;
      }
    }
    const finalBookShareTotal = memberShareTotal > 0 ? memberShareTotal : shareBookTotal;
    const shareDiff = Math.round((khataShareBal - finalBookShareTotal) * 100) / 100;
    const isShareMatched = Math.abs(shareDiff) < 0.01;

    // -------------------------------------------------------------
    // 2. SAVINGS CROSS CHECK: Liabilities 05 (बचत ३०) vs Saving Books
    // -------------------------------------------------------------
    // In Liabilities 05: Col 12 is 'बचत (३०)' balance (Col M)
    const khataSavingBal = getKhataBalance(liabRows, 12);

    // From Member-Data: Col 12 is 'Saving Balance'
    let memberSavingTotal = 0;
    let memberCountWithSaving = 0;
    for (let i = 1; i < memberRows.length; i++) {
      const r = memberRows[i];
      if (!r) continue;
      const amt = Number(r[12]) || 0;
      if (amt > 0) memberCountWithSaving++;
      memberSavingTotal += amt;
    }

    // From Saving_Book (if entries exist)
    let savingBookTotal = 0;
    if (savingRows.length > 1) {
      for (let i = 1; i < savingRows.length; i++) {
        const r = savingRows[i];
        if (!r) continue;
        const dep = Number(r[8]) || 0;  // Deposit (Cr)
        const wdr = Number(r[9]) || 0;  // Withdraw (Dr)
        savingBookTotal += dep - wdr;
      }
    }
    const finalBookSavingTotal = memberSavingTotal > 0 ? memberSavingTotal : savingBookTotal;
    const savingDiff = Math.round((khataSavingBal - finalBookSavingTotal) * 100) / 100;
    const isSavingMatched = Math.abs(savingDiff) < 0.01;

    // -------------------------------------------------------------
    // 3. LOAN CROSS CHECK: Assets-04 (ऋण ११०) vs Loan Books
    // -------------------------------------------------------------
    // In Assets-04: Col 15 is 'ऋण दिएको हिसाब (११०)' balance (Col P)
    const khataLoanBal = getKhataBalance(assetsRows, 15);

    // From Member-Data: Col 13 is 'Loan Outstanding'
    let memberLoanTotal = 0;
    let memberCountWithLoan = 0;
    for (let i = 1; i < memberRows.length; i++) {
      const r = memberRows[i];
      if (!r) continue;
      const amt = Number(r[13]) || 0;
      if (amt > 0) memberCountWithLoan++;
      memberLoanTotal += amt;
    }

    // From Loan_Book (if entries exist)
    let loanBookTotal = 0;
    if (loanRows.length > 1) {
      for (let i = 1; i < loanRows.length; i++) {
        const r = loanRows[i];
        if (!r) continue;
        const disb = Number(r[8]) || 0; // Disbursement (Dr)
        const rep = Number(r[9]) || 0;  // Principal Repaid (Cr)
        loanBookTotal += disb - rep;
      }
    }
    const finalBookLoanTotal = memberLoanTotal > 0 ? memberLoanTotal : loanBookTotal;
    const loanDiff = Math.round((khataLoanBal - finalBookLoanTotal) * 100) / 100;
    const isLoanMatched = Math.abs(loanDiff) < 0.01;

    const isAllBalanced = isShareMatched && isSavingMatched && isLoanMatched;

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      isAllBalanced,
      share: {
        titleNp: 'शेयर पूँजी हिसाब मिलान',
        titleEn: 'Share Capital Reconciliation',
        khataCode: '१०',
        khataName: 'Liabilities 05 (शेयर पूँजी १०)',
        khataBalance: khataShareBal,
        bookName: 'Share_Book / Member-Data',
        bookBalance: finalBookShareTotal,
        memberShareTotal,
        shareBookTotal,
        difference: shareDiff,
        isMatched: isShareMatched,
        memberCount: memberCountWithShare,
      },
      saving: {
        titleNp: 'सदस्य बचत हिसाब मिलान',
        titleEn: 'Member Savings Reconciliation',
        khataCode: '३०',
        khataName: 'Liabilities 05 (सदस्य बचत ३०)',
        khataBalance: khataSavingBal,
        bookName: 'Saving_Book / Member-Data',
        bookBalance: finalBookSavingTotal,
        memberSavingTotal,
        savingBookTotal,
        difference: savingDiff,
        isMatched: isSavingMatched,
        memberCount: memberCountWithSaving,
      },
      loan: {
        titleNp: 'ऋण लगानी हिसाब मिलान',
        titleEn: 'Loan Portfolio Reconciliation',
        khataCode: '११०',
        khataName: 'Assets-04 (ऋण लगानी ११०)',
        khataBalance: khataLoanBal,
        bookName: 'Loan_Book / Member-Data',
        bookBalance: finalBookLoanTotal,
        memberLoanTotal,
        loanBookTotal,
        difference: loanDiff,
        isMatched: isLoanMatched,
        memberCount: memberCountWithLoan,
      },
      totalMembers: Math.max(0, memberRows.length - 1),
    });
  } catch (error: any) {
    console.error('API GET /api/accounting/cross-check error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to perform 4-Khata cross-check',
    });
  }
}
