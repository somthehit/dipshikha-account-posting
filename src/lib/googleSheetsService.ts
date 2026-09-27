import { google, sheets_v4 } from 'googleapis';
import { AuditLog, JournalEntry, JournalLine, LedgerEntry } from '../types/accounting';
import { Member, ShareBookEntry, SavingBookEntry, LoanBookEntry } from '../types/member';
import serverCache from './cache';

export interface SheetRangeData {
  range: string;
  values: any[][];
}

export interface MockStore {
  journals: JournalEntry[];
  journalLines: JournalLine[];
  ledger: LedgerEntry[];
  auditLogs: AuditLog[];
  assetsRows: any[][];
  expensesRows: any[][];
  liabilitiesRows: any[][];
  incomeRows: any[][];
  members: Member[];
  shareBook: ShareBookEntry[];
  savingBook: SavingBookEntry[];
  loanBook: LoanBookEntry[];
  fixedAssets: any[];
  bankReconciliations: any[];
}

const DEFAULT_MOCK_STORE: MockStore = {
  journals: [] as JournalEntry[],
  journalLines: [] as JournalLine[],
  ledger: [] as LedgerEntry[],
  auditLogs: [] as AuditLog[],
  assetsRows: [] as any[][],
  expensesRows: [] as any[][],
  liabilitiesRows: [] as any[][],
  incomeRows: [] as any[][],
  members: [
    {
      memberNo: 'M-001',
      fullName: 'सोम प्रकाश चौधरी',
      fullNameEn: 'Som Prakash Chaudhary',
      citizenshipNo: '67-01-72-01234',
      phone: '9800000001',
      address: 'पुनर्वास-२, कञ्चनपुर',
      wardNo: '२',
      gender: 'पुरुष' as const,
      membershipDate: '2075-04-01',
      status: 'ACTIVE' as const,
      shareKitta: 0,
      shareAmount: 0,
      savingBalance: 0,
      loanOutstanding: 0,
    },
    {
      memberNo: 'M-002',
      fullName: 'माधवी चौधरी',
      fullNameEn: 'Madhavi Chaudhary',
      citizenshipNo: '67-01-74-05678',
      phone: '9800000002',
      address: 'पुनर्वास-२, कञ्चनपुर',
      wardNo: '२',
      gender: 'महिला' as const,
      membershipDate: '2075-04-01',
      status: 'ACTIVE' as const,
      shareKitta: 0,
      shareAmount: 0,
      savingBalance: 0,
      loanOutstanding: 0,
    },
    {
      memberNo: 'M-003',
      fullName: 'दिलिप चौधरी',
      fullNameEn: 'Dilip Chaudhary',
      citizenshipNo: '67-01-76-09876',
      phone: '9800000003',
      address: 'गौरीगंगा-१, चौमाला, कैलाली',
      wardNo: '१',
      gender: 'पुरुष' as const,
      membershipDate: '2075-05-15',
      status: 'ACTIVE' as const,
      shareKitta: 0,
      shareAmount: 0,
      savingBalance: 0,
      loanOutstanding: 0,
    },
  ],
  shareBook: [] as ShareBookEntry[],
  savingBook: [] as SavingBookEntry[],
  loanBook: [] as LoanBookEntry[],
  fixedAssets: [
    {
      assetId: 'AST-001',
      assetCode: 'FA-COMP-01',
      name: 'Computer & Office IT Equipment',
      nameNp: 'कम्प्युटर तथा आइटी उपकरण',
      category: 'Computer & IT Accessories',
      purchaseDateAD: '2023-07-17',
      purchaseDateBS: '2080-04-01',
      purchaseCost: 120000,
      salvageValue: 5000,
      usefulLifeYears: 4,
      depreciationRatePercent: 25,
      depreciationMethod: 'DIMINISHING_BALANCE',
      accumulatedDepreciation: 30000,
      currentBookValue: 90000,
      lastDepreciationBSDate: '2080-12-30',
      status: 'ACTIVE',
      location: 'मुख्यालय / लेखा शाखा',
      remarks: 'Dell Desktop PCs & Canon Multi-function Printer',
      createdAt: '2023-07-17T00:00:00.000Z',
    },
    {
      assetId: 'AST-002',
      assetCode: 'FA-FURN-01',
      name: 'Office Furniture & Fixtures',
      nameNp: 'कार्यालय फर्निचर तथा फिक्चर्स',
      category: 'Furniture & Fixture',
      purchaseDateAD: '2022-07-17',
      purchaseDateBS: '2079-04-01',
      purchaseCost: 250000,
      salvageValue: 10000,
      usefulLifeYears: 6.67,
      depreciationRatePercent: 15,
      depreciationMethod: 'DIMINISHING_BALANCE',
      accumulatedDepreciation: 70000,
      currentBookValue: 180000,
      lastDepreciationBSDate: '2080-12-30',
      status: 'ACTIVE',
      location: 'व्यवस्थापक तथा बैठक कक्ष',
      remarks: 'Meeting tables, revolving chairs & steel almirahs',
      createdAt: '2022-07-17T00:00:00.000Z',
    },
    {
      assetId: 'AST-003',
      assetCode: 'FA-BLDG-01',
      name: 'Cooperative Office Building',
      nameNp: 'सहकारी कार्यालय भवन',
      category: 'Building & Land',
      purchaseDateAD: '2020-07-16',
      purchaseDateBS: '2077-04-01',
      purchaseCost: 2000000,
      salvageValue: 200000,
      usefulLifeYears: 20,
      depreciationRatePercent: 5,
      depreciationMethod: 'STRAIGHT_LINE',
      accumulatedDepreciation: 300000,
      currentBookValue: 1700000,
      lastDepreciationBSDate: '2080-12-30',
      status: 'ACTIVE',
      location: 'गौरादह-१, झापा',
      remarks: '2-storey administrative building',
      createdAt: '2020-07-16T00:00:00.000Z',
    },
  ],
  bankReconciliations: [] as any[],
};


class GoogleSheetsService {
  private sheetsClient: sheets_v4.Sheets | null = null;
  private spreadsheetId: string = '';
  private isConfigured: boolean = false;

  private get mockStore(): MockStore {
    if (!(global as any).__accountingMockStore) {
      (global as any).__accountingMockStore = JSON.parse(JSON.stringify(DEFAULT_MOCK_STORE));
    }
    return (global as any).__accountingMockStore;
  }

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let rawKey = process.env.GOOGLE_PRIVATE_KEY;

    // Check if a service account json file path is configured or exists locally
    const fs = require('fs');
    const path = require('path');
    const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE 
      ? path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE)
      : path.join(process.cwd(), 'service-account.json');

    if (fs.existsSync(jsonPath)) {
      try {
        const fileContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (fileContent.client_email && fileContent.private_key) {
          clientEmail = fileContent.client_email;
          rawKey = fileContent.private_key;
          console.log(`[GoogleSheetsService] Loaded credentials from: ${jsonPath}`);
        }
      } catch (err) {
        console.warn(`[GoogleSheetsService] Could not parse key file at ${jsonPath}:`, err);
      }
    }

    if (sheetId && clientEmail && rawKey && rawKey !== 'PASTE_YOUR_PRIVATE_KEY_HERE') {
      try {
        let privateKey = rawKey.trim();
        if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
          privateKey = privateKey.slice(1, -1);
        }
        privateKey = privateKey.replace(/\\n/g, '\n');

        const auth = new google.auth.JWT({
          email: clientEmail,
          key: privateKey,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        this.sheetsClient = google.sheets({ version: 'v4', auth });
        this.spreadsheetId = sheetId;
        this.isConfigured = true;
        console.log('[GoogleSheetsService] Initialized Google Sheets API with Service Account:', clientEmail);
      } catch (err) {
        console.error('[GoogleSheetsService] Error initializing Google Auth:', err);
        this.isConfigured = false;
      }
    } else {
      console.warn(
        '[GoogleSheetsService] Missing valid Google Sheets credentials in environment. Operating in Local High-Fidelity Simulation Mode.'
      );
      this.isConfigured = false;
    }
  }

  private ensureClient(): boolean {
    if (!this.isConfigured || !this.sheetsClient) {
      this.initClient();
    }
    return this.isConfigured && !!this.sheetsClient;
  }

  public getIsConfigured(): boolean {
    return this.ensureClient();
  }

  public getSpreadsheetId(): string {
    return this.spreadsheetId || process.env.GOOGLE_SHEET_ID || '1hQ_kWBeCER_aRbsh6gu3W1G_8L9hr3j3lwqiKWBEGEc';
  }

  // =========================================================================
  // 1. Read Sheet Data
  // =========================================================================
  public async readSheet(
    sheetName: string,
    range?: string,
    valueRenderOption: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' = 'FORMATTED_VALUE'
  ): Promise<any[][]> {
    const fullRange = range ? `'${sheetName}'!${range}` : `'${sheetName}'`;

    if (!this.ensureClient() || !this.sheetsClient) {
      return this.readMockSheet(sheetName, range);
    }

    try {
      const response = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: fullRange,
        valueRenderOption,
      });
      return response.data.values || [];
    } catch (error: any) {
      console.error(`[GoogleSheetsService] readSheet error on ${fullRange}:`, error?.message || error);
      return this.readMockSheet(sheetName, range);
    }
  }

  // =========================================================================
  // 2. Read Multiple Ranges
  // =========================================================================
  public async readRanges(ranges: string[]): Promise<SheetRangeData[]> {
    if (!this.ensureClient() || !this.sheetsClient) {
      const results: SheetRangeData[] = [];
      for (const r of ranges) {
        const parts = r.split('!');
        const sheetName = parts[0].replace(/'/g, '');
        const cellRange = parts[1];
        const values = await this.readMockSheet(sheetName, cellRange);
        results.push({ range: r, values });
      }
      return results;
    }

    try {
      const response = await this.sheetsClient.spreadsheets.values.batchGet({
        spreadsheetId: this.spreadsheetId,
        ranges,
      });

      return (
        response.data.valueRanges?.map((vr) => ({
          range: vr.range || '',
          values: vr.values || [],
        })) || []
      );
    } catch (error: any) {
      console.error('[GoogleSheetsService] readRanges error:', error?.message || error);
      throw error;
    }
  }

  // =========================================================================
  // 3. Append Row
  // =========================================================================
  public async appendRow(sheetName: string, rowValues: any[]): Promise<any> {
    if (!this.ensureClient() || !this.sheetsClient) {
      return this.appendMockRow(sheetName, rowValues);
    }

    try {
      const response = await this.sheetsClient.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `'${sheetName}'!A:A`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowValues],
        },
      });
      serverCache.invalidateAccounting();
      return response.data;
    } catch (error: any) {
      console.error(`[GoogleSheetsService] appendRow error on ${sheetName}:`, error?.message || error);
      return this.appendMockRow(sheetName, rowValues);
    }
  }

  // =========================================================================
  // 4. Update Row / Range
  // =========================================================================
  public async updateRange(sheetName: string, range: string, values: any[][]): Promise<any> {
    const fullRange = `'${sheetName}'!${range}`;

    if (!this.ensureClient() || !this.sheetsClient) {
      return this.updateMockRange(sheetName, range, values);
    }

    try {
      const response = await this.sheetsClient.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: fullRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values,
        },
      });
      serverCache.invalidateAccounting();
      return response.data;
    } catch (error: any) {
      console.error(`[GoogleSheetsService] updateRange error on ${fullRange}:`, error?.message || error);
      return this.updateMockRange(sheetName, range, values);
    }
  }

  // =========================================================================
  // 5. Ensure System Sheets & Member Books Exist
  // =========================================================================
  public async ensureSystemSheets(): Promise<void> {
    if (!this.ensureClient() || !this.sheetsClient) {
      return;
    }

    try {
      const meta = await this.sheetsClient.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const existingSheets = meta.data.sheets?.map((s) => s.properties?.title || '') || [];

      const requiredSheets: { name: string; headers: string[] }[] = [
        {
          name: 'Journal',
          headers: [
            'Journal ID',
            'Journal No',
            'Transaction Date',
            'BS Date',
            'Reference No',
            'Transaction Type',
            'Branch',
            'Narration',
            'Total Debit',
            'Total Credit',
            'Status',
            'Reversal Journal ID',
            'Created By',
            'Created At',
          ],
        },
        {
          name: 'Journal_Lines',
          headers: [
            'Line ID',
            'Journal ID',
            'Journal No',
            'Account Code',
            'Account Name',
            'Account Group',
            'Debit',
            'Credit',
            'Narration',
          ],
        },
        {
          name: 'Ledger',
          headers: [
            'Entry ID',
            'Date',
            'BS Date',
            'Journal No',
            'Account Code',
            'Account Name',
            'Account Group',
            'Branch',
            'Description',
            'Debit',
            'Credit',
            'Running Balance',
          ],
        },
        {
          name: 'Audit_Log',
          headers: [
            'Log ID',
            'Timestamp',
            'Action',
            'Entity Type',
            'Entity ID',
            'User',
            'Status',
            'Details',
            'Error Message',
          ],
        },
        {
          name: 'Organization_Settings',
          headers: ['Key', 'Value', 'Description'],
        },
        // Member-specific subsidiary books
        {
          name: 'Member-Data',
          headers: [
            'Member No',
            'Full Name',
            'Full Name En',
            'Citizenship No',
            'Phone',
            'Address',
            'Ward No',
            'Gender',
            'Membership Date',
            'Status',
            'Share Kitta',
            'Share Amount',
            'Saving Balance',
            'Loan Outstanding',
          ],
        },
        {
          name: 'Share_Book',
          headers: [
            'Entry ID',
            'Date',
            'BS Date',
            'Member No',
            'Member Name',
            'Voucher No',
            'Transaction Type',
            'Kitta',
            'Rate',
            'Debit (Refund)',
            'Credit (Purchase)',
            'Balance',
            'Narration',
          ],
        },
        {
          name: 'Saving_Book',
          headers: [
            'Entry ID',
            'Date',
            'BS Date',
            'Member No',
            'Member Name',
            'Account No',
            'Saving Type',
            'Voucher No',
            'Deposit (Cr)',
            'Withdraw (Dr)',
            'Interest',
            'Balance',
            'Narration',
          ],
        },
        {
          name: 'Loan_Book',
          headers: [
            'Entry ID',
            'Date',
            'BS Date',
            'Member No',
            'Member Name',
            'Loan Account No',
            'Loan Purpose',
            'Voucher No',
            'Disbursement (Dr)',
            'Principal Repaid (Cr)',
            'Interest Paid',
            'Penalty',
            'Principal Balance',
            'Narration',
          ],
        },
        {
          name: 'Fixed_Assets',
          headers: [
            'Asset ID',
            'Asset Code',
            'Name',
            'Name Np',
            'Category',
            'Purchase Date AD',
            'Purchase Date BS',
            'Purchase Cost',
            'Salvage Value',
            'Useful Life',
            'Depreciation Rate',
            'Depreciation Method',
            'Accumulated Depreciation',
            'Current Book Value',
            'Last Depr Date BS',
            'Status',
            'Location',
            'Remarks',
            'Created At',
          ],
        },
        {
          name: 'Bank_Reconciliations',
          headers: [
            'Reconciliation ID',
            'Account Code',
            'Account Name',
            'As Of AD',
            'As Of BS',
            'Bank Statement Balance',
            'Book Balance',
            'Uncleared Deposits',
            'Unpresented Cheques',
            'Adjusted Bank Balance',
            'Unrecorded Credits',
            'Unrecorded Debits',
            'Adjusted Book Balance',
            'Difference',
            'Status',
            'Adjustment Voucher No',
            'Reconciled By',
            'Created At',
            'Items JSON',
          ],
        },
      ];

      const addSheetRequests: sheets_v4.Schema$Request[] = [];
      for (const req of requiredSheets) {
        if (!existingSheets.includes(req.name)) {
          addSheetRequests.push({
            addSheet: {
              properties: { title: req.name },
            },
          });
        }
      }

      if (addSheetRequests.length > 0) {
        await this.sheetsClient.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: { requests: addSheetRequests },
        });

        // Write headers for newly created sheets
        for (const req of requiredSheets) {
          if (!existingSheets.includes(req.name)) {
            await this.updateRange(req.name, 'A1:Z1', [req.headers]);
          }
        }
      }
    } catch (err: any) {
      console.warn('[GoogleSheetsService] ensureSystemSheets note:', err?.message || err);
    }
  }

  // =========================================================================
  // Mock Store Implementation for Local Dev / Testing
  // =========================================================================
  private readMockSheet(sheetName: string, range?: string): any[][] {
    if (sheetName === 'Member-Data') {
      const rows: any[][] = [
        [
          'Member No',
          'Full Name',
          'Full Name En',
          'Citizenship No',
          'Phone',
          'Address',
          'Ward No',
          'Gender',
          'Membership Date',
          'Status',
          'Share Kitta',
          'Share Amount',
          'Saving Balance',
          'Loan Outstanding',
        ],
      ];
      this.mockStore.members.forEach((m) => {
        rows.push([
          m.memberNo,
          m.fullName,
          m.fullNameEn || '',
          m.citizenshipNo || '',
          m.phone,
          m.address,
          m.wardNo,
          m.gender,
          m.membershipDate,
          m.status,
          m.shareKitta,
          m.shareAmount,
          m.savingBalance,
          m.loanOutstanding,
        ]);
      });
      return rows;
    }

    if (sheetName === 'Share_Book') {
      const rows: any[][] = [
        [
          'Entry ID',
          'Date',
          'BS Date',
          'Member No',
          'Member Name',
          'Voucher No',
          'Transaction Type',
          'Kitta',
          'Rate',
          'Debit (Refund)',
          'Credit (Purchase)',
          'Balance',
          'Narration',
        ],
      ];
      this.mockStore.shareBook.forEach((s) => {
        rows.push([
          s.id,
          s.date,
          s.bsDate,
          s.memberNo,
          s.memberName,
          s.voucherNo,
          s.type,
          s.kitta,
          s.rate,
          s.debit,
          s.credit,
          s.balance,
          s.narration,
        ]);
      });
      return rows;
    }

    if (sheetName === 'Saving_Book') {
      const rows: any[][] = [
        [
          'Entry ID',
          'Date',
          'BS Date',
          'Member No',
          'Member Name',
          'Account No',
          'Saving Type',
          'Voucher No',
          'Deposit (Cr)',
          'Withdraw (Dr)',
          'Interest',
          'Balance',
          'Narration',
        ],
      ];
      this.mockStore.savingBook.forEach((sb) => {
        rows.push([
          sb.id,
          sb.date,
          sb.bsDate,
          sb.memberNo,
          sb.memberName,
          sb.accountNo,
          sb.savingType,
          sb.voucherNo,
          sb.deposit,
          sb.withdraw,
          sb.interest,
          sb.balance,
          sb.narration,
        ]);
      });
      return rows;
    }

    if (sheetName === 'Loan_Book') {
      const rows: any[][] = [
        [
          'Entry ID',
          'Date',
          'BS Date',
          'Member No',
          'Member Name',
          'Loan Account No',
          'Loan Purpose',
          'Voucher No',
          'Disbursement (Dr)',
          'Principal Repaid (Cr)',
          'Interest Paid',
          'Penalty',
          'Principal Balance',
          'Narration',
        ],
      ];
      this.mockStore.loanBook.forEach((lb) => {
        rows.push([
          lb.id,
          lb.date,
          lb.bsDate,
          lb.memberNo,
          lb.memberName,
          lb.loanAccountNo,
          lb.loanPurpose,
          lb.voucherNo,
          lb.disbursement,
          lb.principalRepaid,
          lb.interestPaid,
          lb.penalty,
          lb.balancePrincipal,
          lb.narration,
        ]);
      });
      return rows;
    }

    if (sheetName === 'Journal') {
      const rows: any[][] = [
        [
          'Journal ID',
          'Journal No',
          'Transaction Date',
          'BS Date',
          'Reference No',
          'Transaction Type',
          'Branch',
          'Narration',
          'Total Debit',
          'Total Credit',
          'Status',
          'Reversal Journal ID',
          'Created By',
          'Created At',
        ],
      ];
      this.mockStore.journals.forEach((j) => {
        rows.push([
          j.journalId,
          j.journalNo,
          j.transactionDate,
          j.bsDate,
          j.referenceNo || '',
          j.transactionType,
          j.branch,
          j.narration,
          j.totalDebit,
          j.totalCredit,
          j.status,
          j.reversalJournalId || '',
          j.createdBy,
          j.createdAt,
        ]);
      });
      return rows;
    }

    if (sheetName === 'Journal_Lines') {
      const rows: any[][] = [
        [
          'Line ID',
          'Journal ID',
          'Journal No',
          'Account Code',
          'Account Name',
          'Account Group',
          'Debit',
          'Credit',
          'Narration',
        ],
      ];
      this.mockStore.journalLines.forEach((l) => {
        rows.push([
          l.id || '',
          l.journalId || '',
          l.journalNo || '',
          l.accountCode,
          l.accountName,
          l.accountGroup,
          l.debit,
          l.credit,
          l.narration || '',
        ]);
      });
      return rows;
    }

    if (sheetName === 'Ledger') {
      const rows: any[][] = [
        [
          'Entry ID',
          'Date',
          'BS Date',
          'Journal No',
          'Account Code',
          'Account Name',
          'Account Group',
          'Branch',
          'Description',
          'Debit',
          'Credit',
          'Running Balance',
        ],
      ];
      this.mockStore.ledger.forEach((e) => {
        rows.push([
          e.entryId,
          e.date,
          e.bsDate,
          e.journalNo,
          e.accountCode,
          e.accountName,
          e.accountGroup,
          e.branch,
          e.description,
          e.debit,
          e.credit,
          e.runningBalance,
        ]);
      });
      return rows;
    }

    if (sheetName === 'Audit_Log') {
      const rows: any[][] = [
        [
          'Log ID',
          'Timestamp',
          'Action',
          'Entity Type',
          'Entity ID',
          'User',
          'Status',
          'Details',
          'Error Message',
        ],
      ];
      this.mockStore.auditLogs.forEach((a) => {
        rows.push([
          a.logId,
          a.timestamp,
          a.action,
          a.entityType,
          a.entityId,
          a.user,
          a.status,
          a.details,
          a.errorMessage || '',
        ]);
      });
      return rows;
    }

    if (sheetName === 'Assets-04') {
      return this.mockStore.assetsRows;
    }
    if (sheetName === 'Expenses-02') {
      return this.mockStore.expensesRows;
    }
    if (sheetName === 'Liabilities 05') {
      return this.mockStore.liabilitiesRows;
    }
    if (sheetName === 'Income-03') {
      return this.mockStore.incomeRows;
    }

    if (sheetName === 'Fixed_Assets') {
      const rows: any[][] = [
        [
          'Asset ID',
          'Asset Code',
          'Name',
          'Name Np',
          'Category',
          'Purchase Date AD',
          'Purchase Date BS',
          'Purchase Cost',
          'Salvage Value',
          'Useful Life',
          'Depreciation Rate',
          'Depreciation Method',
          'Accumulated Depreciation',
          'Current Book Value',
          'Last Depr Date BS',
          'Status',
          'Location',
          'Remarks',
          'Created At',
        ],
      ];
      (this.mockStore.fixedAssets || []).forEach((a: any) => {
        rows.push([
          a.assetId,
          a.assetCode,
          a.name,
          a.nameNp,
          a.category,
          a.purchaseDateAD,
          a.purchaseDateBS,
          a.purchaseCost,
          a.salvageValue,
          a.usefulLifeYears,
          a.depreciationRatePercent,
          a.depreciationMethod,
          a.accumulatedDepreciation,
          a.currentBookValue,
          a.lastDepreciationBSDate || '',
          a.status,
          a.location || '',
          a.remarks || '',
          a.createdAt,
        ]);
      });
      return rows;
    }

    if (sheetName === 'Bank_Reconciliations') {
      const rows: any[][] = [
        [
          'Reconciliation ID',
          'Account Code',
          'Account Name',
          'As Of AD',
          'As Of BS',
          'Bank Statement Balance',
          'Book Balance',
          'Uncleared Deposits',
          'Unpresented Cheques',
          'Adjusted Bank Balance',
          'Unrecorded Credits',
          'Unrecorded Debits',
          'Adjusted Book Balance',
          'Difference',
          'Status',
          'Adjustment Voucher No',
          'Reconciled By',
          'Created At',
          'Items JSON',
        ],
      ];
      (this.mockStore.bankReconciliations || []).forEach((b: any) => {
        rows.push([
          b.reconciliationId,
          b.accountCode,
          b.accountName,
          b.asOfDateAD,
          b.asOfDateBS,
          b.bankStatementBalance,
          b.bookBalance,
          b.unclearedDeposits,
          b.unpresentedCheques,
          b.adjustedBankBalance,
          b.unrecordedBankCredits,
          b.unrecordedBankDebits,
          b.adjustedBookBalance,
          b.difference,
          b.status,
          b.adjustmentJournalNo || '',
          b.reconciledBy,
          b.createdAt,
          JSON.stringify(b.items || []),
        ]);
      });
      return rows;
    }

    return [];
  }

  private appendMockRow(sheetName: string, rowValues: any[]): any {
    if (sheetName === 'Member-Data') {
      this.mockStore.members.push({
        memberNo: rowValues[0],
        fullName: rowValues[1],
        fullNameEn: rowValues[2],
        citizenshipNo: rowValues[3],
        phone: rowValues[4],
        address: rowValues[5],
        wardNo: rowValues[6],
        gender: rowValues[7],
        membershipDate: rowValues[8],
        status: rowValues[9],
        shareKitta: Number(rowValues[10]) || 0,
        shareAmount: Number(rowValues[11]) || 0,
        savingBalance: Number(rowValues[12]) || 0,
        loanOutstanding: Number(rowValues[13]) || 0,
      });
    } else if (sheetName === 'Share_Book') {
      this.mockStore.shareBook.push({
        id: rowValues[0],
        date: rowValues[1],
        bsDate: rowValues[2],
        memberNo: rowValues[3],
        memberName: rowValues[4],
        voucherNo: rowValues[5],
        type: rowValues[6],
        kitta: Number(rowValues[7]),
        rate: Number(rowValues[8]),
        debit: Number(rowValues[9]),
        credit: Number(rowValues[10]),
        balance: Number(rowValues[11]),
        narration: rowValues[12],
      });
    } else if (sheetName === 'Saving_Book') {
      this.mockStore.savingBook.push({
        id: rowValues[0],
        date: rowValues[1],
        bsDate: rowValues[2],
        memberNo: rowValues[3],
        memberName: rowValues[4],
        accountNo: rowValues[5],
        savingType: rowValues[6],
        voucherNo: rowValues[7],
        deposit: Number(rowValues[8]),
        withdraw: Number(rowValues[9]),
        interest: Number(rowValues[10]),
        balance: Number(rowValues[11]),
        narration: rowValues[12],
      });
    } else if (sheetName === 'Loan_Book') {
      this.mockStore.loanBook.push({
        id: rowValues[0],
        date: rowValues[1],
        bsDate: rowValues[2],
        memberNo: rowValues[3],
        memberName: rowValues[4],
        loanAccountNo: rowValues[5],
        loanPurpose: rowValues[6],
        voucherNo: rowValues[7],
        disbursement: Number(rowValues[8]),
        principalRepaid: Number(rowValues[9]),
        interestPaid: Number(rowValues[10]),
        penalty: Number(rowValues[11]),
        balancePrincipal: Number(rowValues[12]),
        narration: rowValues[13],
      });
    } else if (sheetName === 'Journal') {
      this.mockStore.journals.push({
        journalId: rowValues[0],
        journalNo: rowValues[1],
        transactionDate: rowValues[2],
        bsDate: rowValues[3],
        referenceNo: rowValues[4],
        transactionType: rowValues[5],
        branch: rowValues[6],
        narration: rowValues[7],
        totalDebit: Number(rowValues[8]),
        totalCredit: Number(rowValues[9]),
        status: rowValues[10],
        reversalJournalId: rowValues[11],
        createdBy: rowValues[12],
        createdAt: rowValues[13],
        lines: [],
      });
    } else if (sheetName === 'Journal_Lines') {
      this.mockStore.journalLines.push({
        id: rowValues[0],
        journalId: rowValues[1],
        journalNo: rowValues[2],
        accountCode: rowValues[3],
        accountName: rowValues[4],
        accountGroup: rowValues[5],
        normalBalance: 'DEBIT',
        debit: Number(rowValues[6]),
        credit: Number(rowValues[7]),
        narration: rowValues[8],
      });
    } else if (sheetName === 'Ledger') {
      this.mockStore.ledger.push({
        entryId: rowValues[0],
        date: rowValues[1],
        bsDate: rowValues[2],
        journalNo: rowValues[3],
        accountCode: rowValues[4],
        accountName: rowValues[5],
        accountGroup: rowValues[6],
        branch: rowValues[7],
        description: rowValues[8],
        debit: Number(rowValues[9]),
        credit: Number(rowValues[10]),
        runningBalance: Number(rowValues[11]),
      });
    } else if (sheetName === 'Audit_Log') {
      this.mockStore.auditLogs.push({
        logId: rowValues[0],
        timestamp: rowValues[1],
        action: rowValues[2],
        entityType: rowValues[3],
        entityId: rowValues[4],
        user: rowValues[5],
        status: rowValues[6],
        details: rowValues[7],
        errorMessage: rowValues[8],
      });
    } else if (sheetName === 'Fixed_Assets') {
      if (!this.mockStore.fixedAssets) this.mockStore.fixedAssets = [];
      this.mockStore.fixedAssets.push({
        assetId: rowValues[0],
        assetCode: rowValues[1],
        name: rowValues[2],
        nameNp: rowValues[3],
        category: rowValues[4],
        purchaseDateAD: rowValues[5],
        purchaseDateBS: rowValues[6],
        purchaseCost: Number(rowValues[7]) || 0,
        salvageValue: Number(rowValues[8]) || 0,
        usefulLifeYears: Number(rowValues[9]) || 0,
        depreciationRatePercent: Number(rowValues[10]) || 0,
        depreciationMethod: rowValues[11],
        accumulatedDepreciation: Number(rowValues[12]) || 0,
        currentBookValue: Number(rowValues[13]) || 0,
        lastDepreciationBSDate: rowValues[14],
        status: rowValues[15] || 'ACTIVE',
        location: rowValues[16],
        remarks: rowValues[17],
        createdAt: rowValues[18],
      });
    } else if (sheetName === 'Bank_Reconciliations') {
      if (!this.mockStore.bankReconciliations) this.mockStore.bankReconciliations = [];
      let parsedItems: any[] = [];
      try {
        parsedItems = rowValues[18] ? JSON.parse(rowValues[18]) : [];
      } catch {}
      this.mockStore.bankReconciliations.push({
        reconciliationId: rowValues[0],
        accountCode: rowValues[1],
        accountName: rowValues[2],
        asOfDateAD: rowValues[3],
        asOfDateBS: rowValues[4],
        bankStatementBalance: Number(rowValues[5]) || 0,
        bookBalance: Number(rowValues[6]) || 0,
        unclearedDeposits: Number(rowValues[7]) || 0,
        unpresentedCheques: Number(rowValues[8]) || 0,
        adjustedBankBalance: Number(rowValues[9]) || 0,
        unrecordedBankCredits: Number(rowValues[10]) || 0,
        unrecordedBankDebits: Number(rowValues[11]) || 0,
        adjustedBookBalance: Number(rowValues[12]) || 0,
        difference: Number(rowValues[13]) || 0,
        status: rowValues[14] || 'DRAFT',
        adjustmentJournalNo: rowValues[15] || '',
        reconciledBy: rowValues[16],
        createdAt: rowValues[17],
        items: parsedItems,
      });
    }
    serverCache.invalidateAccounting();
    return { status: 'mock_appended' };
  }

  private updateMockRange(sheetName: string, range: string, values: any[][]): any {
    if (sheetName === 'Journal') {
      values.forEach((row) => {
        const jId = row[0];
        const existing = this.mockStore.journals.find((j: any) => j.journalId === jId);
        if (existing) {
          existing.status = row[10] || existing.status;
          existing.reversalJournalId = row[11] || existing.reversalJournalId;
        }
      });
    } else if (sheetName === 'Member-Data') {
      const match = range.match(/\d+/);
      if (match && values[0]) {
        const rowIdx = parseInt(match[0], 10) - 2; // header is row 1 (index 0 is row 2)
        if (this.mockStore.members[rowIdx]) {
          const vals = values[0];
          this.mockStore.members[rowIdx].shareKitta = Number(vals[0]) || 0;
          this.mockStore.members[rowIdx].shareAmount = Number(vals[1]) || 0;
          this.mockStore.members[rowIdx].savingBalance = Number(vals[2]) || 0;
          this.mockStore.members[rowIdx].loanOutstanding = Number(vals[3]) || 0;
        }
      }
    } else if (sheetName === 'Fixed_Assets') {
      if (!this.mockStore.fixedAssets) this.mockStore.fixedAssets = [];
      values.forEach((row) => {
        const id = row[0];
        const existing = this.mockStore.fixedAssets.find((a: any) => a.assetId === id || a.assetCode === id);
        if (existing) {
          existing.accumulatedDepreciation = Number(row[12]) || existing.accumulatedDepreciation;
          existing.currentBookValue = Number(row[13]) || existing.currentBookValue;
          existing.lastDepreciationBSDate = row[14] || existing.lastDepreciationBSDate;
          existing.status = row[15] || existing.status;
        }
      });
    }
    serverCache.invalidateAccounting();
    return { status: 'mock_updated' };
  }
}

const globalSheetsService: GoogleSheetsService =
  (global as any).__googleSheetsService || new GoogleSheetsService();
if (process.env.NODE_ENV !== 'production') {
  (global as any).__googleSheetsService = globalSheetsService;
}

export const googleSheetsService = globalSheetsService;
