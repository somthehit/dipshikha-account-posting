export interface BankReconciliationItem {
  id: string;
  date: string;
  bsDate: string;
  journalNo: string;
  description: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  isCleared: boolean;
  clearedDate?: string;
  notes?: string;
}

export interface BankReconciliationStatement {
  reconciliationId: string;
  accountCode: string;
  accountName: string;
  asOfDateAD: string;
  asOfDateBS: string;
  bankStatementBalance: number; // Balance as per Bank Statement
  bookBalance: number;          // Balance as per General Ledger
  unclearedDeposits: number;    // Cheques deposited but not cleared (Adds to Bank)
  unpresentedCheques: number;   // Cheques issued but not presented (Deducts from Bank)
  adjustedBankBalance: number;  // Bank Statement + Uncleared Deposits - Unpresented Cheques
  unrecordedBankCredits: number; // Direct deposit/interest in bank not in books (Adds to Book)
  unrecordedBankDebits: number;  // Bank charges/service fees not in books (Deducts from Book)
  adjustedBookBalance: number;  // Book Balance + Direct Credits - Direct Debits
  difference: number;           // adjustedBankBalance - adjustedBookBalance (Should be 0)
  isReconciled: boolean;
  reconciledBy: string;
  createdAt: string;
  status: 'DRAFT' | 'RECONCILED' | 'POSTED_ADJUSTMENT';
  adjustmentJournalNo?: string;
  items: BankReconciliationItem[];
}

export interface PostBankAdjustmentVoucherRequest {
  reconciliationId?: string;
  bankAccountCode: string; // e.g. '90'
  adjustmentType: 'INTEREST_RECEIVED' | 'BANK_CHARGES' | 'DIRECT_CREDIT' | 'DIRECT_DEBIT' | 'DISCREPANCY_ADJUSTMENT';
  amount: number;
  offsetAccountCode: string; // e.g. '160.3' (Interest income) or '150.8' (Misc Exp / Bank charge) or '9999' (Suspense)
  narration: string;
  bsDate: string;
  referenceNo?: string;
  user: string;
}
