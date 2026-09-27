import { accountingEngine } from './accountingEngine';
import { googleSheetsService } from './googleSheetsService';
import {
  BankReconciliationStatement,
  BankReconciliationItem,
  PostBankAdjustmentVoucherRequest,
} from '../types/reconciliation';
import { getCurrentBSDate } from './nepaliDate';
import { findAccountByCode } from './chartOfAccounts';
import serverCache from './cache';

export class BankReconciliationService {
  // =========================================================================
  // Get Bank Ledger Items & Current Book Balance
  // =========================================================================
  public async getBankReconciliationData(
    accountCode: string = '90',
    asOfBSDate?: string
  ): Promise<{
    accountCode: string;
    accountName: string;
    bookBalance: number;
    items: BankReconciliationItem[];
  }> {
    const curBS = asOfBSDate || getCurrentBSDate();
    const journals = await accountingEngine.getAllJournals();
    const activeJournals = journals.filter((j) => j.status !== 'REVERSED');

    let runningBookBalance = 0;
    const items: BankReconciliationItem[] = [];

    activeJournals.forEach((j) => {
      if (curBS && j.bsDate > curBS) return; // Only up to as-of date

      j.lines.forEach((line, lineIdx) => {
        if (line.accountCode === accountCode) {
          const dr = Number(line.debit) || 0;
          const cr = Number(line.credit) || 0;

          // Debit to Bank increases bank balance; Credit decreases bank balance
          runningBookBalance += dr - cr;

          items.push({
            id: line.id || `${j.journalId}-${lineIdx}`,
            date: j.transactionDate,
            bsDate: j.bsDate,
            journalNo: j.journalNo,
            description: line.narration || j.narration,
            type: dr > 0 ? 'DEPOSIT' : 'WITHDRAWAL',
            amount: dr > 0 ? dr : cr,
            isCleared: false, // Default pending reconciliation
            clearedDate: '',
          });
        }
      });
    });

    const acct = findAccountByCode(accountCode);
    const accountName = acct?.nameNp || acct?.name || 'बैंक मौज्दात';

    // Sort items latest first
    items.sort((a, b) => (b.bsDate || '').localeCompare(a.bsDate || ''));

    return {
      accountCode,
      accountName,
      bookBalance: Math.round(runningBookBalance * 100) / 100,
      items,
    };
  }

  // =========================================================================
  // Compute Complete Bank Reconciliation Statement
  // =========================================================================
  public computeStatement(params: {
    accountCode: string;
    accountName: string;
    asOfDateAD: string;
    asOfDateBS: string;
    bankStatementBalance: number;
    bookBalance: number;
    items: BankReconciliationItem[];
    unrecordedBankCredits?: number;
    unrecordedBankDebits?: number;
    user?: string;
  }): BankReconciliationStatement {
    let unclearedDeposits = 0;
    let unpresentedCheques = 0;

    params.items.forEach((item) => {
      if (!item.isCleared) {
        if (item.type === 'DEPOSIT') {
          // Cheques received/deposited in book, but not yet cleared by bank
          unclearedDeposits += item.amount;
        } else if (item.type === 'WITHDRAWAL') {
          // Cheques issued in book, but not yet presented at bank
          unpresentedCheques += item.amount;
        }
      }
    });

    // Standard Bank Reconciliation Formula:
    // Adjusted Bank Balance = Bank Statement Balance + Deposits in Transit (Uncleared) - Outstanding Cheques (Unpresented)
    const adjustedBankBalance =
      params.bankStatementBalance + unclearedDeposits - unpresentedCheques;

    // Adjusted Book Balance = Book Balance + Unrecorded Credits (Interest/Direct deposit) - Unrecorded Debits (Charges/Taxes)
    const unrecordedCredits = params.unrecordedBankCredits || 0;
    const unrecordedDebits = params.unrecordedBankDebits || 0;
    const adjustedBookBalance =
      params.bookBalance + unrecordedCredits - unrecordedDebits;

    const difference = Math.abs(
      Math.round((adjustedBankBalance - adjustedBookBalance) * 100) / 100
    );

    const isReconciled = difference < 0.05;

    return {
      reconciliationId: `BRS-${Date.now()}`,
      accountCode: params.accountCode,
      accountName: params.accountName,
      asOfDateAD: params.asOfDateAD,
      asOfDateBS: params.asOfDateBS,
      bankStatementBalance: Math.round(params.bankStatementBalance * 100) / 100,
      bookBalance: Math.round(params.bookBalance * 100) / 100,
      unclearedDeposits: Math.round(unclearedDeposits * 100) / 100,
      unpresentedCheques: Math.round(unpresentedCheques * 100) / 100,
      adjustedBankBalance: Math.round(adjustedBankBalance * 100) / 100,
      unrecordedBankCredits: Math.round(unrecordedCredits * 100) / 100,
      unrecordedBankDebits: Math.round(unrecordedDebits * 100) / 100,
      adjustedBookBalance: Math.round(adjustedBookBalance * 100) / 100,
      difference,
      isReconciled,
      reconciledBy: params.user || 'Accountant',
      createdAt: new Date().toISOString(),
      status: isReconciled ? 'RECONCILED' : 'DRAFT',
      items: params.items,
    };
  }

  // =========================================================================
  // Save Reconciliation Record to Google Sheets
  // =========================================================================
  public async saveReconciliation(
    stmt: BankReconciliationStatement
  ): Promise<void> {
    await googleSheetsService.ensureSystemSheets();
    await googleSheetsService.appendRow('Bank_Reconciliations', [
      stmt.reconciliationId,
      stmt.accountCode,
      stmt.accountName,
      stmt.asOfDateAD,
      stmt.asOfDateBS,
      stmt.bankStatementBalance,
      stmt.bookBalance,
      stmt.unclearedDeposits,
      stmt.unpresentedCheques,
      stmt.adjustedBankBalance,
      stmt.unrecordedBankCredits,
      stmt.unrecordedBankDebits,
      stmt.adjustedBookBalance,
      stmt.difference,
      stmt.status,
      stmt.adjustmentJournalNo || '',
      stmt.reconciledBy,
      stmt.createdAt,
      JSON.stringify(stmt.items || []),
    ]);

    serverCache.invalidateAccounting();
  }

  // =========================================================================
  // Post Bank Adjustment Journal Voucher (हिसाब मिलान भौचर)
  // E.g., Bank Interest received, Bank service charges, or Discrepancy adjustment
  // =========================================================================
  public async postAdjustmentVoucher(
    req: PostBankAdjustmentVoucherRequest
  ): Promise<{
    success: boolean;
    journalNo: string;
    journal: any;
  }> {
    if (!req.amount || req.amount <= 0) {
      throw new Error('Adjustment amount must be greater than zero.');
    }

    const bankAcct = findAccountByCode(req.bankAccountCode) || {
      code: '90',
      name: 'Cash at Bank (बैंक मौज्दात ९०)',
      group: 'Assets-04',
      normalBalance: 'DEBIT',
    };

    const offsetAcct = findAccountByCode(req.offsetAccountCode);
    if (!offsetAcct) {
      throw new Error(`Offset account code ${req.offsetAccountCode} is invalid.`);
    }

    const currentBS = req.bsDate || getCurrentBSDate();
    const journalNo = await accountingEngine.generateNextJournalNo(currentBS);
    const journalId = `ADJ-BANK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let lines: any[] = [];

    // Determine debits and credits based on adjustment type
    // If Bank received interest / direct deposit:
    // Debit: Bank (Assets-04)
    // Credit: Offset Account (Income-03 or other)
    if (
      req.adjustmentType === 'INTEREST_RECEIVED' ||
      req.adjustmentType === 'DIRECT_CREDIT'
    ) {
      lines = [
        {
          id: `${journalId}-L1`,
          journalId,
          journalNo,
          accountCode: bankAcct.code,
          accountName: bankAcct.name,
          accountGroup: 'Assets-04',
          normalBalance: 'DEBIT',
          debit: req.amount,
          credit: 0,
          narration: `बैंक हिसाब मिलान - दाखिला/ब्याज आम्दानी (${req.narration})`,
        },
        {
          id: `${journalId}-L2`,
          journalId,
          journalNo,
          accountCode: offsetAcct.code,
          accountName: offsetAcct.name,
          accountGroup: offsetAcct.group,
          normalBalance: offsetAcct.normalBalance,
          debit: 0,
          credit: req.amount,
          narration: `बैंक हिसाब मिलान - दाखिला/ब्याज आम्दानी (${req.narration})`,
        },
      ];
    } else {
      // Bank charges / direct debits / expenses:
      // Debit: Offset Account (Expenses-02 or other)
      // Credit: Bank (Assets-04)
      lines = [
        {
          id: `${journalId}-L1`,
          journalId,
          journalNo,
          accountCode: offsetAcct.code,
          accountName: offsetAcct.name,
          accountGroup: offsetAcct.group,
          normalBalance: offsetAcct.normalBalance,
          debit: req.amount,
          credit: 0,
          narration: `बैंक हिसाब मिलान - खर्च/शुल्क कट्टी (${req.narration})`,
        },
        {
          id: `${journalId}-L2`,
          journalId,
          journalNo,
          accountCode: bankAcct.code,
          accountName: bankAcct.name,
          accountGroup: 'Assets-04',
          normalBalance: 'DEBIT',
          debit: 0,
          credit: req.amount,
          narration: `बैंक हिसाब मिलान - खर्च/शुल्क कट्टी (${req.narration})`,
        },
      ];
    }

    const journalEntry = {
      journalId,
      journalNo,
      transactionDate: new Date().toISOString().split('T')[0],
      bsDate: currentBS,
      referenceNo: req.referenceNo || 'BANK-RECON-ADJ',
      transactionType: 'Adjustment' as const,
      branch: 'Main Branch',
      narration: `[बैंक हिसाब मिलान भौचर] ${req.narration}`,
      totalDebit: req.amount,
      totalCredit: req.amount,
      status: 'POSTED' as const,
      createdBy: req.user || 'Accountant',
      createdAt: new Date().toISOString(),
      lines,
    };

    const postResult = await accountingEngine.postJournal(journalEntry as any);

    return {
      success: true,
      journalNo,
      journal: postResult.journal,
    };
  }

  // =========================================================================
  // Get Reconciliation History
  // =========================================================================
  public async getHistory(): Promise<BankReconciliationStatement[]> {
    try {
      const rows = await googleSheetsService.readSheet('Bank_Reconciliations');
      if (rows.length <= 1) return [];

      const list: BankReconciliationStatement[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length < 15) continue;
        let items: any[] = [];
        try {
          items = r[18] ? JSON.parse(r[18]) : [];
        } catch {}

        list.push({
          reconciliationId: String(r[0]),
          accountCode: String(r[1]),
          accountName: String(r[2]),
          asOfDateAD: String(r[3]),
          asOfDateBS: String(r[4]),
          bankStatementBalance: Number(r[5]) || 0,
          bookBalance: Number(r[6]) || 0,
          unclearedDeposits: Number(r[7]) || 0,
          unpresentedCheques: Number(r[8]) || 0,
          adjustedBankBalance: Number(r[9]) || 0,
          unrecordedBankCredits: Number(r[10]) || 0,
          unrecordedBankDebits: Number(r[11]) || 0,
          adjustedBookBalance: Number(r[12]) || 0,
          difference: Number(r[13]) || 0,
          isReconciled: (Number(r[13]) || 0) < 0.05,
          status: (r[14] || 'DRAFT') as any,
          adjustmentJournalNo: r[15] ? String(r[15]) : '',
          reconciledBy: String(r[16] || ''),
          createdAt: String(r[17] || ''),
          items,
        });
      }

      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return list;
    } catch {
      return [];
    }
  }
}

export const bankReconciliationService = new BankReconciliationService();
