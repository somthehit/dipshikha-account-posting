import { AccountGroup } from './accounting';

export interface DateFilter {
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  bsDateFrom?: string;
  bsDateTo?: string;
  fiscalYear?: string;
}

export interface TrialBalanceItem {
  accountCode: string;
  accountName: string;
  accountNameNp: string;
  accountGroup: AccountGroup;
  category: string;
  normalBalance: 'DEBIT' | 'CREDIT';
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
  netBalance: number; // positive for normal balance, negative for opposite
}

export interface TrialBalanceReport {
  generatedAt: string;
  filter: DateFilter;
  items: TrialBalanceItem[];
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  isBalanced: boolean;
  variance: number;
  groupSummary: {
    assetsDebit: number;
    assetsCredit: number;
    liabilitiesDebit: number;
    liabilitiesCredit: number;
    expensesDebit: number;
    expensesCredit: number;
    incomeDebit: number;
    incomeCredit: number;
  };
}

export interface ProfitLossSectionItem {
  accountCode: string;
  accountName: string;
  accountNameNp: string;
  category: string;
  amount: number;
}

export interface ProfitLossReport {
  generatedAt: string;
  filter: DateFilter;
  tradingRevenue: ProfitLossSectionItem[];
  otherIncome: ProfitLossSectionItem[];
  totalIncome: number;
  operatingExpenses: ProfitLossSectionItem[];
  administrativeExpenses: ProfitLossSectionItem[];
  financialExpenses: ProfitLossSectionItem[];
  depreciationExpenses: ProfitLossSectionItem[];
  totalExpenses: number;
  grossProfit: number;
  operatingSurplus: number;
  netSurplus: number; // Positive = Net Profit (खुद नाफा), Negative = Net Deficit (खुद नोक्सान)
}

export interface BalanceSheetSectionItem {
  accountCode: string;
  accountName: string;
  accountNameNp: string;
  category: string;
  amount: number;
  note?: string;
}

export interface BalanceSheetReport {
  asOfDateAD: string;
  asOfDateBS: string;
  fiscalYear: string;
  liabilitiesAndEquity: {
    shareCapital: BalanceSheetSectionItem[];
    totalShareCapital: number;
    reservesAndSurplus: BalanceSheetSectionItem[];
    currentPeriodSurplus: number;
    totalReservesAndSurplus: number;
    memberDeposits: BalanceSheetSectionItem[];
    totalMemberDeposits: number;
    borrowings: BalanceSheetSectionItem[];
    totalBorrowings: number;
    grantsAndSubsidies: BalanceSheetSectionItem[];
    totalGrants: number;
    currentLiabilitiesAndPayables: BalanceSheetSectionItem[];
    totalCurrentLiabilities: number;
    grandTotalLiabilitiesAndEquity: number;
  };
  assets: {
    cashAndBank: BalanceSheetSectionItem[];
    totalCashAndBank: number;
    investments: BalanceSheetSectionItem[];
    totalInvestments: number;
    memberLoans: BalanceSheetSectionItem[];
    totalMemberLoans: number;
    receivablesAndAdvances: BalanceSheetSectionItem[];
    totalReceivables: number;
    fixedAssets: BalanceSheetSectionItem[];
    totalFixedAssets: number;
    otherAssets: BalanceSheetSectionItem[];
    totalOtherAssets: number;
    grandTotalAssets: number;
  };
  isBalanced: boolean;
  variance: number;
}

export interface CashFlowActivityItem {
  title: string;
  titleNp: string;
  amount: number; // positive = inflow, negative = outflow
}

export interface CashFlowReport {
  generatedAt: string;
  filter: DateFilter;
  operatingActivities: CashFlowActivityItem[];
  netCashFromOperating: number;
  investingActivities: CashFlowActivityItem[];
  netCashFromInvesting: number;
  financingActivities: CashFlowActivityItem[];
  netCashFromFinancing: number;
  netChangeInCash: number;
  openingCashAndBank: number;
  closingCashAndBank: number;
  reconciliationCheckPassed: boolean;
}

export interface SaleRegisterEntry {
  journalId: string;
  journalNo: string;
  dateAD: string;
  dateBS: string;
  referenceNo: string;
  partyName: string;
  paymentMode: 'CASH' | 'BANK' | 'CREDIT' | 'OTHER';
  description: string;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  settlementAccount: string;
}

export interface SalesReport {
  generatedAt: string;
  filter: DateFilter;
  entries: SaleRegisterEntry[];
  totalGrossSales: number;
  totalDiscount: number;
  totalNetSales: number;
  cashSalesTotal: number;
  bankSalesTotal: number;
  creditSalesTotal: number;
  salesCount: number;
}

export interface PurchaseRegisterEntry {
  journalId: string;
  journalNo: string;
  dateAD: string;
  dateBS: string;
  referenceNo: string;
  vendorName: string;
  paymentMode: 'CASH' | 'BANK' | 'CREDIT' | 'OTHER';
  description: string;
  purchaseAmount: number;
  freightAndWages: number;
  discountReceived: number;
  netPurchaseCost: number;
  settlementAccount: string;
}

export interface PurchaseReport {
  generatedAt: string;
  filter: DateFilter;
  entries: PurchaseRegisterEntry[];
  totalPurchases: number;
  totalFreight: number;
  totalDiscountReceived: number;
  netTotalCost: number;
  cashPurchasesTotal: number;
  bankPurchasesTotal: number;
  creditPurchasesTotal: number;
  purchasesCount: number;
}

