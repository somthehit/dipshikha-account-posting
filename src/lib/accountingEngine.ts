import { googleSheetsService } from './googleSheetsService';
import {
  AccountMaster,
  AuditLog,
  DashboardSummary,
  JournalEntry,
  JournalLine,
  LedgerEntry,
} from '../types/accounting';
import { DEFAULT_ACCOUNTS, findAccountByCode } from './chartOfAccounts';
import { getCurrentBSDate, getFiscalYear, formatAccountingDate } from './nepaliDate';
import serverCache from './cache';

export interface ValidationResult {
  isValid: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  errors: string[];
}

export class AccountingEngine {
  // =========================================================================
  // Validation
  // =========================================================================
  public validateJournal(
    header: {
      transactionDate: string;
      bsDate: string;
      branch: string;
      narration: string;
    },
    lines: JournalLine[]
  ): ValidationResult {
    const errors: string[] = [];

    if (!header.transactionDate) errors.push('Transaction Date (AD) is required.');
    if (!header.bsDate) errors.push('BS Date (Bikram Sambat) is required.');
    if (!header.narration || header.narration.trim().length === 0) {
      errors.push('Narration / Description is required.');
    }
    if (!lines || lines.length < 2) {
      errors.push('A valid double-entry journal requires at least two lines.');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      if (!line.accountCode) {
        errors.push(`Line ${lineNum}: Account is missing.`);
      } else {
        const account = findAccountByCode(line.accountCode);
        if (!account) {
          errors.push(`Line ${lineNum}: Account code ${line.accountCode} is not in the Chart of Accounts.`);
        }
      }

      const dr = Number(line.debit) || 0;
      const cr = Number(line.credit) || 0;

      if (dr < 0 || cr < 0) {
        errors.push(`Line ${lineNum}: Amounts cannot be negative.`);
      }
      if (dr === 0 && cr === 0) {
        errors.push(`Line ${lineNum}: Either Debit or Credit must be greater than zero.`);
      }
      if (dr > 0 && cr > 0) {
        errors.push(`Line ${lineNum}: A single line cannot have both Debit and Credit amounts.`);
      }

      totalDebit += dr;
      totalCredit += cr;
    });

    const difference = Math.abs(Math.round((totalDebit - totalCredit) * 100) / 100);
    if (difference > 0.009) {
      errors.push(
        `Journal Entry is not balanced. Total Debit (Rs. ${totalDebit.toFixed(
          2
        )}) must equal Total Credit (Rs. ${totalCredit.toFixed(2)}). Difference: Rs. ${difference.toFixed(2)}.`
      );
    }

    return {
      isValid: errors.length === 0,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      difference,
      errors,
    };
  }

  // =========================================================================
  // Generate Next Journal Number (e.g. JE-2083-000001)
  // =========================================================================
  public async generateNextJournalNo(bsDate: string): Promise<string> {
    const year = bsDate ? bsDate.split('-')[0] : '2083';
    try {
      const journals = await this.getAllJournals();
      const prefix = `JE-${year}-`;
      const yearJournals = journals.filter((j) => j.journalNo.startsWith(prefix));
      const nextSeq = yearJournals.length + 1;
      return `${prefix}${nextSeq.toString().padStart(6, '0')}`;
    } catch {
      return `JE-${year}-000001`;
    }
  }

  // =========================================================================
  // Post Journal Entry (with Idempotency & Auto-posting to 4-Khata sheets)
  // =========================================================================
  public async postJournal(entry: JournalEntry): Promise<{ success: boolean; journal: JournalEntry }> {
    // 1. Idempotency Check: verify if journalId or journalNo already exists
    const existing = await this.getJournalById(entry.journalId);
    if (existing) {
      console.warn(`[AccountingEngine] Idempotency: Journal ID ${entry.journalId} already posted.`);
      return { success: true, journal: existing };
    }

    const validation = this.validateJournal(entry, entry.lines);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(' ')}`);
    }

    // Ensure system sheets exist
    await googleSheetsService.ensureSystemSheets();

    const timestamp = new Date().toISOString();
    const finalEntry: JournalEntry = {
      ...entry,
      totalDebit: validation.totalDebit,
      totalCredit: validation.totalCredit,
      status: 'POSTED',
      createdAt: entry.createdAt || timestamp,
    };

    try {
      // 2. Insert into 'Journal' sheet
      await googleSheetsService.appendRow('Journal', [
        finalEntry.journalId,
        finalEntry.journalNo,
        finalEntry.transactionDate,
        finalEntry.bsDate,
        finalEntry.referenceNo || '',
        finalEntry.transactionType,
        finalEntry.branch,
        finalEntry.narration,
        finalEntry.totalDebit,
        finalEntry.totalCredit,
        finalEntry.status,
        finalEntry.reversalJournalId || '',
        finalEntry.createdBy,
        finalEntry.createdAt,
      ]);

      // 3. Insert lines into 'Journal_Lines' sheet
      for (let i = 0; i < finalEntry.lines.length; i++) {
        const line = finalEntry.lines[i];
        const lineId = line.id || `${finalEntry.journalId}-L${i + 1}`;
        await googleSheetsService.appendRow('Journal_Lines', [
          lineId,
          finalEntry.journalId,
          finalEntry.journalNo,
          line.accountCode,
          line.accountName,
          line.accountGroup,
          line.debit,
          line.credit,
          line.narration || finalEntry.narration,
        ]);
      }

      // 4. Auto-post to corresponding 4-Khata sheets:
      // Assets-04, Expenses-02, Liabilities 05, Income-03
      await this.autoPostToKhataSheets(finalEntry);

      // 5. Append to 'Ledger' sheet
      for (const line of finalEntry.lines) {
        const lastLedgerRows = await googleSheetsService.readSheet('Ledger');
        const prevBal =
          lastLedgerRows.length > 1
            ? Number(lastLedgerRows[lastLedgerRows.length - 1][11]) || 0
            : 0;

        const delta =
          line.accountGroup === 'Assets-04' || line.accountGroup === 'Expenses-02'
            ? line.debit - line.credit
            : line.credit - line.debit;

        const newBal = prevBal + delta;
        const entryId = `LED-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        await googleSheetsService.appendRow('Ledger', [
          entryId,
          finalEntry.transactionDate,
          finalEntry.bsDate,
          finalEntry.journalNo,
          line.accountCode,
          line.accountName,
          line.accountGroup,
          finalEntry.branch,
          line.narration || finalEntry.narration,
          line.debit,
          line.credit,
          newBal,
        ]);
      }

      // 6. Record Audit Log
      await googleSheetsService.appendRow('Audit_Log', [
        `LOG-${Date.now()}`,
        timestamp,
        'POST_JOURNAL',
        'JOURNAL',
        finalEntry.journalId,
        finalEntry.createdBy || 'System',
        'SUCCESS',
        `Posted Journal ${finalEntry.journalNo} with total Rs. ${finalEntry.totalDebit}. Lines: ${finalEntry.lines.length}`,
        '',
      ]);

      // Invalidate server cache
      serverCache.invalidateAccounting();

      return { success: true, journal: finalEntry };
    } catch (err: any) {
      console.error('[AccountingEngine] Error during posting:', err);

      // Record failed audit log
      try {
        await googleSheetsService.appendRow('Audit_Log', [
          `LOG-${Date.now()}`,
          timestamp,
          'POST_JOURNAL',
          'JOURNAL',
          finalEntry.journalId,
          finalEntry.createdBy || 'System',
          'FAILED',
          `Failed posting ${finalEntry.journalNo}`,
          err?.message || String(err),
        ]);
      } catch (logErr) {
        console.error('Failed to write failure audit log:', logErr);
      }

      throw new Error(`Journal posting failed. Please verify the accounting records. Details: ${err?.message || err}`);
    }
  }

  // =========================================================================
  // 4-Khata Sheet Posting Logic
  // Matches exact layout of: Assets-04, Expenses-02, Liabilities 05, Income-03
  // Preserves ALL formulas in columns A, G, J, M, P, S, V, Y, Z and Total row!
  // =========================================================================
  private colLetter(index1Based: number): string {
    return String.fromCharCode(64 + index1Based);
  }

  private async findFirstAvailableRow(sheetName: string): Promise<number> {
    const existing = await googleSheetsService.readSheet(sheetName, 'A7:D500');
    for (let i = 0; i < existing.length; i++) {
      const r = existing[i];
      if (!r) continue;
      const colB = r[1] !== undefined && r[1] !== null ? String(r[1]).trim() : '';
      const colD = r[3] !== undefined && r[3] !== null ? String(r[3]).trim() : '';

      // If Date and Narration/Voucher are empty and not the bottom Total row
      if (colB === '' && colD === '' && r[0] !== 'जम्मा' && r[0] !== 'Total') {
        return 7 + i;
      }
    }
    return 7 + existing.length;
  }

  private async autoPostToKhataSheets(journal: JournalEntry): Promise<void> {
    for (const line of journal.lines) {
      const acct = findAccountByCode(line.accountCode);
      if (!acct || !acct.khataColumnRef) continue;

      const { sheetName, colIndex } = acct.khataColumnRef;
      const targetRow = await this.findFirstAvailableRow(sheetName);

      try {
        if (sheetName === 'Assets-04') {
          // Col B (2): मिति, Col C (3): भौचर नं, Col D (4): विवरण
          await googleSheetsService.updateRange(sheetName, `B${targetRow}:D${targetRow}`, [
            [journal.bsDate, journal.journalNo, line.narration || journal.narration],
          ]);

          // Update ONLY the exact Debit or Credit column (Never touch running balance or formula columns!)
          if (line.debit > 0) {
            const letter = this.colLetter(colIndex); // colIndex is Debit column (e.g. 5 -> 'E')
            await googleSheetsService.updateRange(sheetName, `${letter}${targetRow}`, [[line.debit]]);
          }
          if (line.credit > 0) {
            const letter = this.colLetter(colIndex + 1); // colIndex + 1 is Credit column (e.g. 6 -> 'F')
            await googleSheetsService.updateRange(sheetName, `${letter}${targetRow}`, [[line.credit]]);
          }
        } else if (sheetName === 'Liabilities 05') {
          // Col B (2): मिति, Col C (3): भौ.नं., Col D (4): विवरण
          await googleSheetsService.updateRange(sheetName, `B${targetRow}:D${targetRow}`, [
            [journal.bsDate, journal.journalNo, line.narration || journal.narration],
          ]);

          // Update ONLY the exact Debit or Credit column
          if (line.debit > 0) {
            const letter = this.colLetter(colIndex); // Debit column (e.g. 5 -> 'E')
            await googleSheetsService.updateRange(sheetName, `${letter}${targetRow}`, [[line.debit]]);
          }
          if (line.credit > 0) {
            const letter = this.colLetter(colIndex + 1); // Credit column (e.g. 6 -> 'F')
            await googleSheetsService.updateRange(sheetName, `${letter}${targetRow}`, [[line.credit]]);
          }
        } else if (sheetName === 'Expenses-02') {
          // Col B (2): मिति, Col C (3): विवरण, Col D (4): भौचर नं
          await googleSheetsService.updateRange(sheetName, `B${targetRow}:D${targetRow}`, [
            [journal.bsDate, line.narration || journal.narration, journal.journalNo],
          ]);

          const amount = line.debit > 0 ? line.debit : -line.credit;
          const letter = this.colLetter(colIndex);
          await googleSheetsService.updateRange(sheetName, `${letter}${targetRow}`, [[amount]]);
        } else if (sheetName === 'Income-03') {
          // Col B (2): मिति, Col C (3): विवरण, Col D (4): भौचर नं
          await googleSheetsService.updateRange(sheetName, `B${targetRow}:D${targetRow}`, [
            [journal.bsDate, line.narration || journal.narration, journal.journalNo],
          ]);

          const amount = line.credit > 0 ? line.credit : -line.debit;
          const letter = this.colLetter(colIndex);
          await googleSheetsService.updateRange(sheetName, `${letter}${targetRow}`, [[amount]]);
        }
      } catch (err) {
        console.error(`[accountingEngine] Error targeted posting to ${sheetName}:`, err);
      }
    }
  }

  // =========================================================================
  // Reversal Journal Creation
  // =========================================================================
  public async reverseJournal(
    originalJournalId: string,
    reason: string,
    user: string
  ): Promise<{ success: boolean; reversalJournal: JournalEntry }> {
    const original = await this.getJournalById(originalJournalId);
    if (!original) {
      throw new Error(`Original journal ${originalJournalId} not found.`);
    }
    if (original.status === 'REVERSED') {
      throw new Error(`Journal ${original.journalNo} is already reversed.`);
    }

    const currentBS = getCurrentBSDate();
    const reversalJournalNo = await this.generateNextJournalNo(currentBS);
    const reversalJournalId = `REV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Flip debits and credits
    const reversalLines: JournalLine[] = original.lines.map((l, idx) => ({
      id: `${reversalJournalId}-L${idx + 1}`,
      journalId: reversalJournalId,
      journalNo: reversalJournalNo,
      accountCode: l.accountCode,
      accountName: l.accountName,
      accountGroup: l.accountGroup,
      normalBalance: l.normalBalance,
      debit: l.credit,  // swapped!
      credit: l.debit,  // swapped!
      narration: `Reversal of ${original.journalNo}: ${l.narration || original.narration}`,
    }));

    const reversalJournal: JournalEntry = {
      journalId: reversalJournalId,
      journalNo: reversalJournalNo,
      transactionDate: new Date().toISOString().split('T')[0],
      bsDate: currentBS,
      referenceNo: original.journalNo,
      transactionType: 'Reversal',
      branch: original.branch,
      narration: `[REVERSAL] ${reason}. (Reversing ${original.journalNo})`,
      totalDebit: original.totalCredit,
      totalCredit: original.totalDebit,
      status: 'POSTED',
      createdBy: user,
      createdAt: new Date().toISOString(),
      lines: reversalLines,
    };

    // 1. Post reversal journal
    await this.postJournal(reversalJournal);

    // 2. Mark original journal as REVERSED
    await this.updateJournalStatus(originalJournalId, 'REVERSED', reversalJournalNo);

    return { success: true, reversalJournal };
  }

  private async updateJournalStatus(
    journalId: string,
    newStatus: 'REVERSED',
    reversalJournalId: string
  ): Promise<void> {
    const rows = await googleSheetsService.readSheet('Journal');
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === journalId) {
        const rowIndex = i + 1;
        // Status is Col K (11), ReversalJournalId is Col L (12)
        await googleSheetsService.updateRange('Journal', `K${rowIndex}:L${rowIndex}`, [
          [newStatus, reversalJournalId],
        ]);
        break;
      }
    }
  }

  // =========================================================================
  // Update / Edit Journal Entry (Correction of Mistakes)
  // =========================================================================
  public async updateJournal(
    journalId: string,
    updated: {
      transactionDate?: string;
      bsDate?: string;
      referenceNo?: string;
      narration: string;
      lines: JournalLine[];
      updatedBy?: string;
    }
  ): Promise<{ success: boolean; journal: JournalEntry }> {
    const existing = await this.getJournalById(journalId);
    if (!existing) {
      throw new Error(`Journal with ID ${journalId} not found.`);
    }

    const transactionDate = updated.transactionDate || existing.transactionDate;
    const bsDate = updated.bsDate || existing.bsDate;
    const referenceNo = updated.referenceNo !== undefined ? updated.referenceNo : existing.referenceNo;
    const narration = updated.narration || existing.narration;

    // 1. Validate Lines & Balance
    const validation = this.validateJournal(
      {
        transactionDate,
        bsDate,
        branch: existing.branch,
        narration,
      },
      updated.lines
    );
    if (!validation.isValid) {
      throw new Error(`Journal validation failed: ${validation.errors.join('; ')}`);
    }

    const totalDebit = validation.totalDebit;
    const totalCredit = validation.totalCredit;

    // 2. Update 'Journal' Sheet
    const journalRows = await googleSheetsService.readSheet('Journal');
    let journalRowIndex = -1;
    for (let i = 1; i < journalRows.length; i++) {
      if (journalRows[i] && journalRows[i][0] === journalId) {
        journalRowIndex = i + 1; // 1-based row index
        break;
      }
    }

    if (journalRowIndex > 0) {
      // Columns: C (Date), D (BS Date), E (Ref No), F (Type), G (Branch), H (Narration), I (Total Debit), J (Total Credit)
      await googleSheetsService.updateRange('Journal', `C${journalRowIndex}:J${journalRowIndex}`, [
        [
          transactionDate,
          bsDate,
          referenceNo,
          existing.transactionType,
          existing.branch,
          narration,
          totalDebit,
          totalCredit,
        ],
      ]);
    }

    // 3. Update 'Journal_Lines' Sheet
    const linesRows = await googleSheetsService.readSheet('Journal_Lines');
    const existingLineRowIndices: number[] = [];
    for (let i = 1; i < linesRows.length; i++) {
      if (linesRows[i] && linesRows[i][1] === journalId) {
        existingLineRowIndices.push(i + 1);
      }
    }

    for (let i = 0; i < updated.lines.length; i++) {
      const line = updated.lines[i];
      const lineId = line.id || `${journalId}-L${i + 1}`;
      const lineData = [
        lineId,
        journalId,
        existing.journalNo,
        line.accountCode,
        line.accountName,
        line.accountGroup,
        line.debit,
        line.credit,
        line.narration || narration,
      ];

      if (i < existingLineRowIndices.length) {
        // Overwrite existing line row
        const rowIdx = existingLineRowIndices[i];
        await googleSheetsService.updateRange('Journal_Lines', `A${rowIdx}:I${rowIdx}`, [lineData]);
      } else {
        // Append new line row
        await googleSheetsService.appendRow('Journal_Lines', lineData);
      }
    }

    // 4. Update in 4-Khata sheets (Assets-04, Liabilities 05, Expenses-02, Income-03)
    const khataSheets = ['Assets-04', 'Liabilities 05', 'Expenses-02', 'Income-03'];
    for (const sheet of khataSheets) {
      try {
        const rows = await googleSheetsService.readSheet(sheet, 'A7:D350');
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          if (r && r[2] === existing.journalNo) {
            const rowNum = 7 + i;
            await googleSheetsService.updateRange(sheet, `B${rowNum}`, [[bsDate]]);
            await googleSheetsService.updateRange(sheet, `D${rowNum}`, [[narration]]);
          }
        }
      } catch (err) {
        console.warn(`Could not update 4-Khata sheet ${sheet}:`, err);
      }
    }

    // 5. Record Audit Log
    try {
      await googleSheetsService.appendRow('Audit_Log', [
        `LOG-${Date.now()}`,
        new Date().toISOString(),
        'UPDATE_JOURNAL',
        'JOURNAL',
        journalId,
        updated.updatedBy || 'Accountant',
        'SUCCESS',
        `Corrected mistake in ${existing.journalNo}. New Total: Rs. ${totalDebit}. Narration: ${narration}`,
        '',
      ]);
    } catch {}

    // Invalidate cache
    serverCache.invalidateAccounting();

    const updatedJournal: JournalEntry = {
      ...existing,
      transactionDate,
      bsDate,
      referenceNo,
      narration,
      totalDebit,
      totalCredit,
      lines: updated.lines,
    };

    return { success: true, journal: updatedJournal };
  }

  // =========================================================================
  // Read All Journals & Lines
  // =========================================================================
  public async getAllJournals(): Promise<JournalEntry[]> {
    const cached = serverCache.get<JournalEntry[]>('journals_all');
    if (cached) return cached;

    const rows = await googleSheetsService.readSheet('Journal');
    const linesRows = await googleSheetsService.readSheet('Journal_Lines');

    const linesByJournalId: { [jId: string]: JournalLine[] } = {};
    for (let i = 1; i < linesRows.length; i++) {
      const r = linesRows[i];
      if (!r || r.length < 7) continue;
      const jId = String(r[1]);
      if (!linesByJournalId[jId]) linesByJournalId[jId] = [];
      const acct = findAccountByCode(String(r[3])) || {
        normalBalance: 'DEBIT',
      };

      linesByJournalId[jId].push({
        id: String(r[0]),
        journalId: jId,
        journalNo: String(r[2]),
        accountCode: String(r[3]),
        accountName: String(r[4]),
        accountGroup: r[5] as any,
        normalBalance: acct.normalBalance as any,
        debit: Number(r[6]) || 0,
        credit: Number(r[7]) || 0,
        narration: r[8] ? String(r[8]) : '',
      });
    }

    const journals: JournalEntry[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 10) continue;
      const jId = String(r[0]);
      journals.push({
        journalId: jId,
        journalNo: String(r[1]),
        transactionDate: formatAccountingDate(r[2]),
        bsDate: formatAccountingDate(r[3]),
        referenceNo: r[4] ? String(r[4]) : '',
        transactionType: (r[5] || 'Journal') as any,
        branch: String(r[6] || 'Main Branch'),
        narration: String(r[7]),
        totalDebit: Number(String(r[8] || '0').replace(/,/g, '')) || 0,
        totalCredit: Number(String(r[9] || '0').replace(/,/g, '')) || 0,
        status: (r[10] || 'POSTED') as any,
        reversalJournalId: r[11] ? String(r[11]) : '',
        createdBy: String(r[12] || ''),
        createdAt: String(r[13] || ''),
        lines: linesByJournalId[jId] || [],
      });
    }

    // Sort descending by date / created
    journals.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    serverCache.set('journals_all', journals, 30000);
    return journals;
  }

  public async getJournalById(journalId: string): Promise<JournalEntry | null> {
    const all = await this.getAllJournals();
    return all.find((j) => j.journalId === journalId || j.journalNo === journalId) || null;
  }

  // =========================================================================
  // Ledger Queries with Filters
  // =========================================================================
  public async getLedger(filters?: {
    accountCode?: string;
    group?: string;
    dateFrom?: string;
    dateTo?: string;
    journalNo?: string;
    branch?: string;
  }): Promise<LedgerEntry[]> {
    const cachedKey = `ledger_${JSON.stringify(filters || {})}`;
    const cached = serverCache.get<LedgerEntry[]>(cachedKey);
    if (cached) return cached;

    const rows = await googleSheetsService.readSheet('Ledger');
    let entries: LedgerEntry[] = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 11) continue;
      entries.push({
        entryId: String(r[0]),
        date: String(r[1]),
        bsDate: String(r[2]),
        journalNo: String(r[3]),
        accountCode: String(r[4]),
        accountName: String(r[5]),
        accountGroup: r[6] as any,
        branch: String(r[7] || ''),
        description: String(r[8] || ''),
        debit: Number(r[9]) || 0,
        credit: Number(r[10]) || 0,
        runningBalance: Number(r[11]) || 0,
      });
    }

    if (filters) {
      if (filters.accountCode) {
        entries = entries.filter((e) => e.accountCode === filters.accountCode);
      }
      if (filters.group) {
        entries = entries.filter((e) => e.accountGroup === filters.group);
      }
      if (filters.dateFrom) {
        entries = entries.filter((e) => e.date >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        entries = entries.filter((e) => e.date <= filters.dateTo!);
      }
      if (filters.journalNo) {
        entries = entries.filter((e) =>
          e.journalNo.toLowerCase().includes(filters.journalNo!.toLowerCase())
        );
      }
      if (filters.branch) {
        entries = entries.filter((e) =>
          e.branch.toLowerCase().includes(filters.branch!.toLowerCase())
        );
      }
    }

    serverCache.set(cachedKey, entries, 30000);
    return entries;
  }

  // =========================================================================
  // Dashboard Summary & Live Balances from 4-Khata System
  // =========================================================================
  public async getDashboardSummary(): Promise<DashboardSummary> {
    const cached = serverCache.get<DashboardSummary>('dashboard_summary');
    if (cached) return cached;

    const journals = await this.getAllJournals();
    const todayAD = new Date().toISOString().split('T')[0];
    const currentBS = getCurrentBSDate();
    const currentFY = getFiscalYear(currentBS);

    // Compute active (non-reversed) balances from posted journals
    let assetsTotal = 0;
    let expensesTotal = 0;
    let liabilitiesTotal = 0;
    let incomeTotal = 0;

    let overallDebit = 0;
    let overallCredit = 0;

    const accountBalances: { [code: string]: number } = {};

    journals.forEach((j) => {
      overallDebit += j.totalDebit;
      overallCredit += j.totalCredit;

      j.lines.forEach((l) => {
        const netChange = l.debit - l.credit;
        accountBalances[l.accountCode] = (accountBalances[l.accountCode] || 0) + netChange;

        if (l.accountGroup === 'Assets-04') {
          assetsTotal += l.debit - l.credit;
        } else if (l.accountGroup === 'Expenses-02') {
          expensesTotal += l.debit - l.credit;
        } else if (l.accountGroup === 'Liabilities 05') {
          liabilitiesTotal += l.credit - l.debit;
        } else if (l.accountGroup === 'Income-03') {
          incomeTotal += l.credit - l.debit;
        }
      });
    });

    const todayCount = journals.filter((j) => j.transactionDate === todayAD).length;

    // Check 4-khata double entry balance equation:
    // Assets + Expenses = Liabilities + Income
    const debitSide = assetsTotal + expensesTotal;
    const creditSide = liabilitiesTotal + incomeTotal;
    const variance = Math.abs(Math.round((debitSide - creditSide) * 100) / 100);
    const isBalanced = variance < 0.01;

    // Group breakdown
    const groupBreakdown = {
      assets: DEFAULT_ACCOUNTS.filter((a) => a.group === 'Assets-04').map((a) => ({
        code: a.code,
        name: a.name,
        balance: accountBalances[a.code] || 0,
      })),
      liabilities: DEFAULT_ACCOUNTS.filter((a) => a.group === 'Liabilities 05').map((a) => ({
        code: a.code,
        name: a.name,
        balance: (accountBalances[a.code] ? -accountBalances[a.code] : 0),
      })),
      expenses: DEFAULT_ACCOUNTS.filter((a) => a.group === 'Expenses-02').map((a) => ({
        code: a.code,
        name: a.name,
        balance: accountBalances[a.code] || 0,
      })),
      income: DEFAULT_ACCOUNTS.filter((a) => a.group === 'Income-03').map((a) => ({
        code: a.code,
        name: a.name,
        balance: (accountBalances[a.code] ? -accountBalances[a.code] : 0),
      })),
    };

    const summary: DashboardSummary = {
      assetsTotal: Math.round(assetsTotal * 100) / 100,
      expensesTotal: Math.round(expensesTotal * 100) / 100,
      liabilitiesTotal: Math.round(liabilitiesTotal * 100) / 100,
      incomeTotal: Math.round(incomeTotal * 100) / 100,
      totalDebit: Math.round(overallDebit * 100) / 100,
      totalCredit: Math.round(overallCredit * 100) / 100,
      numberOfJournals: journals.length,
      todayTransactionsCount: todayCount,
      currentFiscalYear: currentFY,
      isBalanced,
      variance,
      auditObservations: isBalanced
        ? 'चार खाता दोहोरो सन्तुलन पूर्ण रूपमा मिलेको छ (Assets + Expenses = Liabilities + Income)'
        : `अन्तर फेला पर्यो (Variance: Rs. ${variance.toFixed(2)})`,
      recentJournals: journals.slice(0, 10),
      groupBreakdown,
    };

    serverCache.set('dashboard_summary', summary, 30000);
    return summary;
  }
}

export const accountingEngine = new AccountingEngine();
