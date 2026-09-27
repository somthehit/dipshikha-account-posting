export type AccountGroup = 'Assets-04' | 'Expenses-02' | 'Liabilities 05' | 'Income-03';
export type GroupCode = '04' | '02' | '05' | '03';
export type NormalBalance = 'DEBIT' | 'CREDIT';
export type JournalStatus = 'POSTED' | 'REVERSED' | 'DRAFT';
export type TransactionType = 'Cash' | 'Bank' | 'Transfer' | 'Journal' | 'Adjusting' | 'Reversal' | 'Adjustment' | 'Closing' | 'Opening' | 'Receipt' | 'Payment' | 'Sales' | 'Purchase';

export interface AccountMaster {
  code: string;
  name: string;
  nameEn: string;
  nameNp: string;
  group: AccountGroup;
  groupCode: GroupCode;
  normalBalance: NormalBalance;
  category?: string;
  subcategory?: string;
  // Specific sheet column target in 4-Khata system
  khataColumnRef?: {
    sheetName: string;
    colIndex: number; // 1-based
    colLetter: string;
    headerName: string;
    subColType?: 'DEBIT' | 'CREDIT' | 'AMOUNT';
  };
}

export interface JournalLine {
  id?: string;
  journalId?: string;
  journalNo?: string;
  accountCode: string;
  accountName: string;
  accountGroup: AccountGroup;
  normalBalance: NormalBalance;
  debit: number;
  credit: number;
  narration?: string;
}

export interface JournalEntry {
  journalId: string;
  journalNo: string;
  transactionDate: string; // YYYY-MM-DD (Gregorian AD)
  bsDate: string;          // YYYY-MM-DD (Bikram Sambat BS)
  referenceNo?: string;
  transactionType: TransactionType;
  branch: string;
  narration: string;
  totalDebit: number;
  totalCredit: number;
  status: JournalStatus;
  reversalJournalId?: string;
  createdBy: string;
  createdAt: string;
  lines: JournalLine[];
  ledgerImpact?: LedgerImpactSummary;
}

export interface LedgerImpactSummary {
  assetsAmount: number;
  expensesAmount: number;
  liabilitiesAmount: number;
  incomeAmount: number;
  accountsAffected: string[];
}

export interface LedgerEntry {
  entryId: string;
  date: string;
  bsDate: string;
  journalNo: string;
  accountCode: string;
  accountName: string;
  accountGroup: AccountGroup;
  branch: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface DashboardSummary {
  assetsTotal: number;
  expensesTotal: number;
  liabilitiesTotal: number;
  incomeTotal: number;
  totalDebit: number;
  totalCredit: number;
  numberOfJournals: number;
  todayTransactionsCount: number;
  currentFiscalYear: string;
  isBalanced: boolean;
  variance: number;
  auditObservations?: string;
  recentJournals: JournalEntry[];
  groupBreakdown: {
    assets: { code: string; name: string; balance: number }[];
    liabilities: { code: string; name: string; balance: number }[];
    expenses: { code: string; name: string; balance: number }[];
    income: { code: string; name: string; balance: number }[];
  };
}

export interface AuditLog {
  logId: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  user: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  details: string;
  errorMessage?: string;
}
