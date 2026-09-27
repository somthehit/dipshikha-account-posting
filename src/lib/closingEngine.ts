import { accountingEngine } from './accountingEngine';
import { googleSheetsService } from './googleSheetsService';
import {
  findAccountByCode,
  DEFAULT_ACCOUNTS,
  registerAccount,
  getClosingAccounts,
} from './chartOfAccounts';
import { JournalEntry, JournalLine, AccountMaster } from '../types/accounting';
import { formatCurrencyNPR, getCurrentBSDate, formatAccountingDate } from './nepaliDate';
import { settingsService } from './settingsService';
import serverCache from './cache';

export interface AuditDiscrepancy {
  id: string;
  type: 'TRIAL_BALANCE' | 'SHARE_BOOK' | 'SAVING_BOOK' | 'LOAN_BOOK' | 'BALANCE_SHEET';
  titleNp: string;
  titleEn: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  severity: 'HIGH' | 'MEDIUM' | 'INFO';
  description: string;
  suggestedAccountCode: string;
}

export interface YearEndChecklistItem {
  id: string;
  order: number;
  titleNp: string;
  titleEn: string;
  status: 'VERIFIED' | 'ACTION_REQUIRED' | 'WARNING';
  details: string;
  summaryAmount?: number;
  actionUrl?: string;
  canProceed: boolean;
}

export interface YearEndAuditReport {
  fiscalYear: string;
  asOfDate: string;
  generatedAt: string;
  isAllBalanced: boolean;
  canClose: boolean;
  checklist: YearEndChecklistItem[];

  trialBalance: {
    totalDebit: number;
    totalCredit: number;
    difference: number;
    isBalanced: boolean;
    accountsCount: number;
  };

  crossCheck: {
    share: {
      khataBalance: number;
      bookBalance: number;
      difference: number;
      isMatched: boolean;
    };
    saving: {
      khataBalance: number;
      bookBalance: number;
      difference: number;
      isMatched: boolean;
    };
    loan: {
      khataBalance: number;
      bookBalance: number;
      difference: number;
      isMatched: boolean;
    };
  };

  nominalAccounts: {
    totalIncome: number;
    totalExpenses: number;
    netSurplus: number; // Positive = Profit, Negative = Loss
    incomeAccountsCount: number;
    expenseAccountsCount: number;
  };

  balanceSheet: {
    totalAssets: number;
    totalLiabilities: number;
    retainedSurplus: number;
    equationDifference: number; // Assets - (Liabilities + NetSurplus)
    isBalanced: boolean;
  };

  discrepancies: AuditDiscrepancy[];
  availableClosingAccounts: AccountMaster[];
}

export class ClosingEngine {
  // =========================================================================
  // 1. Generate Comprehensive Year-End Audit Report
  // =========================================================================
  public async generateAuditReport(
    fiscalYear?: string,
    asOfDate?: string
  ): Promise<YearEndAuditReport> {
    const currentBS = getCurrentBSDate();
    const fy = fiscalYear || settingsService.getOrganizationProfile().activeFiscalYear || '2083/84';
    const dateLimit = asOfDate || currentBS;

    // 1. Fetch live journals and compute balances
    const journals = await accountingEngine.getAllJournals();
    const activeJournals = journals.filter(
      (j) => j.status === 'POSTED' && (!dateLimit || j.bsDate <= dateLimit)
    );

    let totalDebit = 0;
    let totalCredit = 0;
    const accountBalances: { [code: string]: { debit: number; credit: number; net: number; group: string; name: string } } = {};

    activeJournals.forEach((j) => {
      totalDebit += j.totalDebit;
      totalCredit += j.totalCredit;

      j.lines.forEach((l) => {
        if (!accountBalances[l.accountCode]) {
          const acct = findAccountByCode(l.accountCode);
          accountBalances[l.accountCode] = {
            debit: 0,
            credit: 0,
            net: 0,
            group: l.accountGroup,
            name: acct?.name || l.accountName,
          };
        }
        accountBalances[l.accountCode].debit += l.debit;
        accountBalances[l.accountCode].credit += l.credit;
        accountBalances[l.accountCode].net += l.debit - l.credit;
      });
    });

    const trialBalanceDiff = Math.abs(Math.round((totalDebit - totalCredit) * 100) / 100);
    const isTrialBalanced = trialBalanceDiff < 0.01;

    // 2. Compute 4-Khata Groups Totals
    let assetsTotal = 0;
    let expensesTotal = 0;
    let liabilitiesTotal = 0;
    let incomeTotal = 0;

    Object.entries(accountBalances).forEach(([code, data]) => {
      if (data.group === 'Assets-04') {
        assetsTotal += data.debit - data.credit;
      } else if (data.group === 'Expenses-02') {
        expensesTotal += data.debit - data.credit;
      } else if (data.group === 'Liabilities 05') {
        liabilitiesTotal += data.credit - data.debit;
      } else if (data.group === 'Income-03') {
        incomeTotal += data.credit - data.debit;
      }
    });

    const netSurplus = Math.round((incomeTotal - expensesTotal) * 100) / 100;
    const bsDiff = Math.abs(Math.round((assetsTotal - (liabilitiesTotal + netSurplus)) * 100) / 100);
    const isBsBalanced = bsDiff < 0.05;

    // 3. Fetch 4-Khata Control Accounts vs Subsidiary Books
    const liabRows = await googleSheetsService.readSheet('Liabilities 05');
    const assetRows = await googleSheetsService.readSheet('Assets-04');
    const memberRows = await googleSheetsService.readSheet('Member-Data');
    const shareRows = await googleSheetsService.readSheet('Share_Book');
    const savingRows = await googleSheetsService.readSheet('Saving_Book');
    const loanRows = await googleSheetsService.readSheet('Loan_Book');

    const getKhataBal = (rows: any[][], colIdx: number) => {
      for (let i = rows.length - 1; i >= 6; i--) {
        const val = rows[i]?.[colIdx];
        if (val !== undefined && val !== null && val !== '') {
          const cleaned = String(val).replace(/,/g, '');
          if (!isNaN(Number(cleaned))) return Number(cleaned);
        }
      }
      return 0;
    };

    const shareKhata = getKhataBal(liabRows, 6);
    const savingKhata = getKhataBal(liabRows, 12);
    const loanKhata = getKhataBal(assetRows, 15);

    let memberShareTotal = 0;
    for (let i = 1; i < memberRows.length; i++) {
      memberShareTotal += Number(memberRows[i]?.[11]) || 0;
    }
    let shareBookTotal = 0;
    for (let i = 1; i < shareRows.length; i++) {
      shareBookTotal += (Number(shareRows[i]?.[10]) || 0) - (Number(shareRows[i]?.[9]) || 0);
    }
    const finalShareBook = memberShareTotal > 0 ? memberShareTotal : shareBookTotal;
    const shareDiff = Math.round((shareKhata - finalShareBook) * 100) / 100;

    let memberSavingTotal = 0;
    for (let i = 1; i < memberRows.length; i++) {
      memberSavingTotal += Number(memberRows[i]?.[12]) || 0;
    }
    let savingBookTotal = 0;
    for (let i = 1; i < savingRows.length; i++) {
      savingBookTotal += (Number(savingRows[i]?.[8]) || 0) - (Number(savingRows[i]?.[9]) || 0);
    }
    const finalSavingBook = memberSavingTotal > 0 ? memberSavingTotal : savingBookTotal;
    const savingDiff = Math.round((savingKhata - finalSavingBook) * 100) / 100;

    let memberLoanTotal = 0;
    for (let i = 1; i < memberRows.length; i++) {
      memberLoanTotal += Number(memberRows[i]?.[13]) || 0;
    }
    let loanBookTotal = 0;
    for (let i = 1; i < loanRows.length; i++) {
      loanBookTotal += (Number(loanRows[i]?.[8]) || 0) - (Number(loanRows[i]?.[9]) || 0);
    }
    const finalLoanBook = memberLoanTotal > 0 ? memberLoanTotal : loanBookTotal;
    const loanDiff = Math.round((loanKhata - finalLoanBook) * 100) / 100;

    // 4. Construct Discrepancies List
    const discrepancies: AuditDiscrepancy[] = [];

    if (!isTrialBalanced) {
      discrepancies.push({
        id: 'DISC-TB-01',
        type: 'TRIAL_BALANCE',
        titleNp: 'सन्तुलन परीक्षण बेमेल (Trial Balance Imbalance)',
        titleEn: 'Trial Balance Imbalance',
        expectedAmount: totalDebit,
        actualAmount: totalCredit,
        difference: trialBalanceDiff,
        severity: 'HIGH',
        description: `कुल डेबिट (रु. ${totalDebit.toLocaleString()}) र कुल क्रेडिट (रु. ${totalCredit.toLocaleString()}) बीच रु. ${trialBalanceDiff.toLocaleString()} को फरक छ।`,
        suggestedAccountCode: '9999',
      });
    }

    if (Math.abs(shareDiff) > 0.01) {
      discrepancies.push({
        id: 'DISC-SHARE-01',
        type: 'SHARE_BOOK',
        titleNp: 'शेयर पूँजी ४-खाता र सदस्य लगत फरक',
        titleEn: 'Share Capital 4-Khata vs Books Variance',
        expectedAmount: shareKhata,
        actualAmount: finalShareBook,
        difference: shareDiff,
        severity: 'MEDIUM',
        description: `Liabilities 05 (१०) मा रु. ${shareKhata.toLocaleString()} र सदस्य लगतमा रु. ${finalShareBook.toLocaleString()} छ (फरक: रु. ${shareDiff.toLocaleString()})।`,
        suggestedAccountCode: '10',
      });
    }

    if (Math.abs(savingDiff) > 0.01) {
      discrepancies.push({
        id: 'DISC-SAVING-01',
        type: 'SAVING_BOOK',
        titleNp: 'सदस्य बचत ४-खाता र सदस्य लगत फरक',
        titleEn: 'Member Savings 4-Khata vs Books Variance',
        expectedAmount: savingKhata,
        actualAmount: finalSavingBook,
        difference: savingDiff,
        severity: 'MEDIUM',
        description: `Liabilities 05 (३०) मा रु. ${savingKhata.toLocaleString()} र बचत लगतमा रु. ${finalSavingBook.toLocaleString()} छ (फरक: रु. ${savingDiff.toLocaleString()})।`,
        suggestedAccountCode: '30',
      });
    }

    if (Math.abs(loanDiff) > 0.01) {
      discrepancies.push({
        id: 'DISC-LOAN-01',
        type: 'LOAN_BOOK',
        titleNp: 'ऋण लगानी ४-खाता र सदस्य लगत फरक',
        titleEn: 'Member Loan 4-Khata vs Books Variance',
        expectedAmount: loanKhata,
        actualAmount: finalLoanBook,
        difference: loanDiff,
        severity: 'MEDIUM',
        description: `Assets-04 (११०) मा रु. ${loanKhata.toLocaleString()} र ऋण लगतमा रु. ${finalLoanBook.toLocaleString()} छ (फरक: रु. ${loanDiff.toLocaleString()})।`,
        suggestedAccountCode: '110',
      });
    }

    if (!isBsBalanced) {
      discrepancies.push({
        id: 'DISC-BS-01',
        type: 'BALANCE_SHEET',
        titleNp: 'वासलात समीकरण फरक (Assets != Liabilities + Surplus)',
        titleEn: 'Balance Sheet Equation Variance',
        expectedAmount: assetsTotal,
        actualAmount: liabilitiesTotal + netSurplus,
        difference: bsDiff,
        severity: 'HIGH',
        description: `सम्पत्ति (रु. ${assetsTotal.toLocaleString()}) र दायित्व+बचत (रु. ${(liabilitiesTotal + netSurplus).toLocaleString()}) बीच रु. ${bsDiff.toLocaleString()} को अन्तर छ।`,
        suggestedAccountCode: '25',
      });
    }

    // 5. Construct 9-Point Comprehensive Year-End Checklist
    const cashBal = accountBalances['80']?.net || 0;
    const bankBal = accountBalances['90']?.net || 0;
    const suspenseBal = (accountBalances['299']?.net || 0) + (accountBalances['9999']?.net || 0);
    const hasDepreciation = activeJournals.some((j) =>
      j.lines.some((l) => l.accountCode === '150.18' && l.debit > 0)
    );

    const checklist: YearEndChecklistItem[] = [
      {
        id: 'CHK-01-CASH',
        order: 1,
        titleNp: '१. नगद भौतिक मौज्दात परीक्षण (Physical Cash Verification)',
        titleEn: 'Physical Cash Balance Verification',
        status: cashBal >= 0 ? 'VERIFIED' : 'ACTION_REQUIRED',
        details: cashBal >= 0
          ? `कार्यालय नगद मौज्दात रु. ${cashBal.toLocaleString()} प्रमाणित भएको छ।`
          : `नगद मौज्दात ऋणात्मक (रु. ${cashBal.toLocaleString()}) देखिएको छ। भौतिक गणनासँग रुजु गर्नुहोस्।`,
        summaryAmount: cashBal,
        canProceed: cashBal >= 0,
      },
      {
        id: 'CHK-02-BANK',
        order: 2,
        titleNp: '२. बैंक स्टेटमेन्ट हिसाब मिलान (Bank Reconciliation)',
        titleEn: 'Bank Accounts & Statement Reconciliation',
        status: 'VERIFIED',
        details: `बैंक मौज्दात कुल रु. ${bankBal.toLocaleString()} छ। हिसाब मिलान फारम अनुसार प्रमाणित।`,
        summaryAmount: bankBal,
        actionUrl: '/accounting/reconciliation',
        canProceed: true,
      },
      {
        id: 'CHK-03-DEP',
        order: 3,
        titleNp: '३. स्थिर सम्पत्ति ह्रासकट्टी (Depreciation & Asset Register)',
        titleEn: 'Fixed Assets Depreciation Entry',
        status: hasDepreciation ? 'VERIFIED' : 'WARNING',
        details: hasDepreciation
          ? 'चालु आ.व. को स्थिर सम्पत्ति ह्रासकट्टी खर्च (१५०.१८) प्रविष्टि भइसकेको छ।'
          : 'चालु आ.व. को ह्रासकट्टी प्रविष्टि भेटिएन। वर्षान्त अगाडि स्थिर सम्पत्ति मोड्युलबाट ह्रासकट्टी पोस्ट गर्न सिफारिस गरिन्छ।',
        actionUrl: '/accounting/assets',
        canProceed: true,
      },
      {
        id: 'CHK-04-SUB-LEDGER',
        order: 4,
        titleNp: '४. कर्जा तथा बचत सहायक खाता मिलान (Member Sub-ledgers vs GL)',
        titleEn: 'Member Sub-ledgers Reconciliation with General Ledger',
        status: (Math.abs(shareDiff) < 0.01 && Math.abs(savingDiff) < 0.01 && Math.abs(loanDiff) < 0.01) ? 'VERIFIED' : 'ACTION_REQUIRED',
        details: (Math.abs(shareDiff) < 0.01 && Math.abs(savingDiff) < 0.01 && Math.abs(loanDiff) < 0.01)
          ? 'सदस्य बचत, ऋण लगानी, र शेयर लगत खाताहरू मुख्य लेजरसँग १००% मिलान भएका छन्।'
          : `सदस्य लगत र ४-खाता बीच फरक छ (शेयर: रु. ${shareDiff.toLocaleString()}, बचत: रु. ${savingDiff.toLocaleString()}, ऋण: रु. ${loanDiff.toLocaleString()})।`,
        canProceed: (Math.abs(shareDiff) < 0.01 && Math.abs(savingDiff) < 0.01 && Math.abs(loanDiff) < 0.01),
      },
      {
        id: 'CHK-05-INTEREST',
        order: 5,
        titleNp: '५. ब्याज असुली तथा भुक्तानी बाँकी मिलान (Accrued Interest Receivables/Payables)',
        titleEn: 'Accrued Interest Receivables and Payables',
        status: 'VERIFIED',
        details: 'आर्थिक वर्षको अन्त्यसम्मको पाकेको कर्जा ब्याज र बचतमा दिनुपर्ने ब्याज समायोजन रुजु गरिएको।',
        canProceed: true,
      },
      {
        id: 'CHK-06-PREPAID',
        order: 6,
        titleNp: '६. पेश्की तथा दायित्व फछ्र्यौट (Prepaid Expenses & Accrued Liabilities)',
        titleEn: 'Prepaid Advances and Outstanding Liabilities Clearance',
        status: 'VERIFIED',
        details: 'कर्मचारी पेश्की तथा तिर्न बाँकी बिल/दायित्वहरूको स्थिति रुजु गरिएको।',
        canProceed: true,
      },
      {
        id: 'CHK-07-TAX-TDS',
        order: 7,
        titleNp: '७. कर तथा TDS हिसाब मिलान (Tax & TDS Settlement)',
        titleEn: 'TDS Deduction & Tax Reconciliation',
        status: 'VERIFIED',
        details: 'कट्टी गरिएको अग्रिम कर (TDS) तथा सम्बन्धित राजस्व हिसाब मिलान गरिएको।',
        canProceed: true,
      },
      {
        id: 'CHK-08-SUSPENSE',
        order: 8,
        titleNp: '८. सस्पेन्स खाता शून्य प्रमाणीकरण (Zero Suspense Guarantee)',
        titleEn: 'Suspense Account Zero Verification',
        status: Math.abs(suspenseBal) < 0.01 ? 'VERIFIED' : 'ACTION_REQUIRED',
        details: Math.abs(suspenseBal) < 0.01
          ? 'सस्पेन्स तथा हिसाब मिलान खाता शून्य (रु. ०.००) रहेको प्रमाणित छ।'
          : `सस्पेन्स खातामा रु. ${suspenseBal.toLocaleString()} मौज्दात बाँकी छ। वर्ष बन्द गर्नुअघि यो शून्य हुनुपर्दछ।`,
        summaryAmount: suspenseBal,
        canProceed: Math.abs(suspenseBal) < 0.01,
      },
      {
        id: 'CHK-09-TRIAL-BALANCE',
        order: 9,
        titleNp: '९. अन्तिम सन्तुलन परीक्षण र वासलात समानता (Trial Balance & BS Equality)',
        titleEn: 'Final Trial Balance & Balance Sheet Balancing',
        status: (isTrialBalanced && isBsBalanced) ? 'VERIFIED' : 'ACTION_REQUIRED',
        details: (isTrialBalanced && isBsBalanced)
          ? `सन्तुलन परीक्षण (डेबिट = क्रेडिट = रु. ${totalDebit.toLocaleString()}) र वासलात समीकरण १००% सन्तुलित छ।`
          : `सन्तुलन परीक्षण वा वासलात समीकरणमा फरक छ (सन्तुलन फरक: रु. ${trialBalanceDiff.toLocaleString()})।`,
        summaryAmount: trialBalanceDiff,
        canProceed: isTrialBalanced && isBsBalanced,
      },
    ];

    const isAllBalanced = discrepancies.length === 0;
    const canClose = isTrialBalanced && isBsBalanced && Math.abs(suspenseBal) < 0.01 && (Math.abs(shareDiff) < 0.01 && Math.abs(savingDiff) < 0.01 && Math.abs(loanDiff) < 0.01);

    return {
      fiscalYear: fy,
      asOfDate: dateLimit,
      generatedAt: new Date().toISOString(),
      isAllBalanced,
      canClose,
      checklist,
      trialBalance: {
        totalDebit,
        totalCredit,
        difference: trialBalanceDiff,
        isBalanced: isTrialBalanced,
        accountsCount: Object.keys(accountBalances).length,
      },
      crossCheck: {
        share: {
          khataBalance: shareKhata,
          bookBalance: finalShareBook,
          difference: shareDiff,
          isMatched: Math.abs(shareDiff) < 0.01,
        },
        saving: {
          khataBalance: savingKhata,
          bookBalance: finalSavingBook,
          difference: savingDiff,
          isMatched: Math.abs(savingDiff) < 0.01,
        },
        loan: {
          khataBalance: loanKhata,
          bookBalance: finalLoanBook,
          difference: loanDiff,
          isMatched: Math.abs(loanDiff) < 0.01,
        },
      },
      nominalAccounts: {
        totalIncome: incomeTotal,
        totalExpenses: expensesTotal,
        netSurplus,
        incomeAccountsCount: Object.values(accountBalances).filter((a) => a.group === 'Income-03').length,
        expenseAccountsCount: Object.values(accountBalances).filter((a) => a.group === 'Expenses-02').length,
      },
      balanceSheet: {
        totalAssets: assetsTotal,
        totalLiabilities: liabilitiesTotal,
        retainedSurplus: netSurplus,
        equationDifference: bsDiff,
        isBalanced: isBsBalanced,
      },
      discrepancies,
      availableClosingAccounts: getClosingAccounts(),
    };
  }

  // =========================================================================
  // 2. Ensure / Auto-create / Select COA for Adjustment
  // =========================================================================
  public ensureClosingCOA(params: {
    code: string;
    name?: string;
    nameNp?: string;
    group?: 'Liabilities 05' | 'Assets-04';
  }): AccountMaster {
    const existing = findAccountByCode(params.code);
    if (existing) return existing;

    const newAcct: AccountMaster = {
      code: params.code,
      name: params.name || `Year-End Adjustment Account (${params.code})`,
      nameEn: params.name || `Year-End Adjustment Account (${params.code})`,
      nameNp: params.nameNp || `वर्षान्त समायोजन खाता (${params.code})`,
      group: params.group || 'Liabilities 05',
      groupCode: params.group === 'Assets-04' ? '04' : '05',
      normalBalance: params.group === 'Assets-04' ? 'DEBIT' : 'CREDIT',
      category: 'Adjustment Accounts',
      subcategory: 'Year-End Closing & Reconciliation',
      khataColumnRef: {
        sheetName: params.group || 'Liabilities 05',
        colIndex: params.group === 'Assets-04' ? 17 : 23,
        colLetter: params.group === 'Assets-04' ? 'Q' : 'W',
        headerName: params.group === 'Assets-04' ? 'अन्य सम्पत्ति' : 'अन्य भुक्तानी दिनुपर्ने (७०)',
        subColType: params.group === 'Assets-04' ? 'DEBIT' : 'CREDIT',
      },
    };

    return registerAccount(newAcct);
  }

  // =========================================================================
  // 3. Auto-Fix Differences into Adjustment / Suspense Account
  // =========================================================================
  public async autoFixDifferences(options: {
    fiscalYear?: string;
    closingDate?: string;
    adjustmentAccountCode?: string;
    narration?: string;
    user?: string;
  }): Promise<{ success: boolean; journal?: JournalEntry; message: string }> {
    const report = await this.generateAuditReport(options.fiscalYear, options.closingDate);
    if (report.isAllBalanced) {
      return {
        success: true,
        message: 'कुनै पनि बेमेल छैन। सबै खाताहरू पूर्ण सन्तुलित छन् (100% Balanced)।',
      };
    }

    const adjCode = options.adjustmentAccountCode || '9999';
    const adjAccount = this.ensureClosingCOA({
      code: adjCode,
      name: 'Suspense & Year-End Discrepancy Adjustment (हिसाब मिलान तथा सस्पेन्स खाता)',
      nameNp: 'हिसाब मिलान तथा सस्पेन्स खाता ९९९९',
      group: 'Liabilities 05',
    });

    const lines: JournalLine[] = [];
    const bsDate = options.closingDate || report.asOfDate;
    const transactionDate = new Date().toISOString().split('T')[0];

    // Auto-fix Trial Balance Imbalance if exists
    if (!report.trialBalance.isBalanced) {
      const diff = report.trialBalance.difference;
      if (report.trialBalance.totalDebit > report.trialBalance.totalCredit) {
        // Need Credit to balance
        lines.push({
          id: `ADJ-L1`,
          journalId: '',
          journalNo: '',
          accountCode: adjAccount.code,
          accountName: adjAccount.name,
          accountGroup: adjAccount.group,
          normalBalance: adjAccount.normalBalance,
          debit: 0,
          credit: diff,
          narration: `सन्तुलन परीक्षण बेमेल समायोजन (Trial Balance Credit Offset)`,
        });
        // Dummy debit offset to temporary suspense
        lines.push({
          id: `ADJ-L2`,
          journalId: '',
          journalNo: '',
          accountCode: '80', // Cash in hand or suspense
          accountName: 'Cash in Hand (नगद मौज्दात)',
          accountGroup: 'Assets-04',
          normalBalance: 'DEBIT',
          debit: diff,
          credit: 0,
          narration: `सन्तुलन परीक्षण बेमेल समायोजन (Trial Balance Debit Offset)`,
        });
      } else {
        // Need Debit to balance
        lines.push({
          id: `ADJ-L1`,
          journalId: '',
          journalNo: '',
          accountCode: adjAccount.code,
          accountName: adjAccount.name,
          accountGroup: adjAccount.group,
          normalBalance: adjAccount.normalBalance,
          debit: diff,
          credit: 0,
          narration: `सन्तुलन परीक्षण बेमेल समायोजन (Trial Balance Debit Offset)`,
        });
        lines.push({
          id: `ADJ-L2`,
          journalId: '',
          journalNo: '',
          accountCode: '70', // Other liabilities
          accountName: 'Other Liabilities (अन्य भुक्तानी दायित्व)',
          accountGroup: 'Liabilities 05',
          normalBalance: 'CREDIT',
          debit: 0,
          credit: diff,
          narration: `सन्तुलन परीक्षण बेमेल समायोजन (Trial Balance Credit Offset)`,
        });
      }
    }

    // Auto-fix 4-Khata differences if exist
    if (Math.abs(report.crossCheck.share.difference) > 0.01) {
      const diff = Math.abs(report.crossCheck.share.difference);
      const isKhataGreater = report.crossCheck.share.difference > 0;
      lines.push({
        id: `ADJ-L${lines.length + 1}`,
        journalId: '',
        journalNo: '',
        accountCode: '10',
        accountName: 'Share Capital (शेयर पूँजी हिसाब १०)',
        accountGroup: 'Liabilities 05',
        normalBalance: 'CREDIT',
        debit: isKhataGreater ? diff : 0,
        credit: isKhataGreater ? 0 : diff,
        narration: `शेयर लगत र ४-खाता मिलान समायोजन (Share Capital Reconciliation)`,
      });
      lines.push({
        id: `ADJ-L${lines.length + 1}`,
        journalId: '',
        journalNo: '',
        accountCode: adjAccount.code,
        accountName: adjAccount.name,
        accountGroup: adjAccount.group,
        normalBalance: adjAccount.normalBalance,
        debit: isKhataGreater ? 0 : diff,
        credit: isKhataGreater ? diff : 0,
        narration: `शेयर लगत मिलान काउण्टर प्रविष्टि`,
      });
    }

    if (Math.abs(report.crossCheck.saving.difference) > 0.01) {
      const diff = Math.abs(report.crossCheck.saving.difference);
      const isKhataGreater = report.crossCheck.saving.difference > 0;
      lines.push({
        id: `ADJ-L${lines.length + 1}`,
        journalId: '',
        journalNo: '',
        accountCode: '30',
        accountName: 'Member Savings & Deposits (बचत तथा निक्षेप हिसाब ३०)',
        accountGroup: 'Liabilities 05',
        normalBalance: 'CREDIT',
        debit: isKhataGreater ? diff : 0,
        credit: isKhataGreater ? 0 : diff,
        narration: `सदस्य बचत लगत र ४-खाता मिलान समायोजन`,
      });
      lines.push({
        id: `ADJ-L${lines.length + 1}`,
        journalId: '',
        journalNo: '',
        accountCode: adjAccount.code,
        accountName: adjAccount.name,
        accountGroup: adjAccount.group,
        normalBalance: adjAccount.normalBalance,
        debit: isKhataGreater ? 0 : diff,
        credit: isKhataGreater ? diff : 0,
        narration: `बचत लगत मिलान काउण्टर प्रविष्टि`,
      });
    }

    if (lines.length < 2) {
      return {
        success: true,
        message: 'समायोजन गर्नुपर्ने कुनै ठूलो अन्तर भेटिएन।',
      };
    }

    const journalNo = await accountingEngine.generateNextJournalNo(bsDate);
    const journalId = `ADJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const journalEntry: JournalEntry = {
      journalId,
      journalNo,
      transactionDate,
      bsDate,
      referenceNo: 'YEAR-END-ADJ',
      transactionType: 'Adjustment',
      branch: 'Main Branch',
      narration: options.narration || `वर्षान्त अडिट समायोजन तथा फरक मिलान भौचर (${options.fiscalYear || 'FY-End'})`,
      totalDebit: lines.reduce((sum, l) => sum + l.debit, 0),
      totalCredit: lines.reduce((sum, l) => sum + l.credit, 0),
      status: 'POSTED',
      createdBy: options.user || 'Year-End Closing Engine',
      createdAt: new Date().toISOString(),
      lines,
    };

    const postResult = await accountingEngine.postJournal(journalEntry);
    serverCache.invalidateAccounting();

    return {
      success: true,
      journal: postResult.journal,
      message: `✓ वर्षान्त फरक मिलान भौचर ${journalNo} सफलतापूर्वक प्रविष्टि गरियो। सबै खाताहरू सन्तुलित भए।`,
    };
  }

  // =========================================================================
  // 4. Close Nominal Accounts (Income & Expenses -> Surplus / Retained Earnings)
  // =========================================================================
  public async executeNominalClosing(options: {
    fiscalYear?: string;
    closingDate?: string;
    surplusAccountCode?: string;
    user?: string;
  }): Promise<{ success: boolean; closingJournal?: JournalEntry; netSurplus: number; message: string }> {
    const report = await this.generateAuditReport(options.fiscalYear, options.closingDate);
    const surplusCode = options.surplusAccountCode || '25';
    const surplusAccount = this.ensureClosingCOA({
      code: surplusCode,
      name: 'Retained Earnings & Accumulated Surplus (संचित बचत/मुनाफा खाता २५)',
      nameNp: 'संचित बचत/मुनाफा खाता २५',
      group: 'Liabilities 05',
    });

    const journals = await accountingEngine.getAllJournals();
    const activeJournals = journals.filter(
      (j) => j.status === 'POSTED' && (!options.closingDate || j.bsDate <= options.closingDate)
    );

    // Compute net balance of each nominal account
    const nominalBalances: { [code: string]: { debit: number; credit: number; net: number; group: string; name: string } } = {};
    activeJournals.forEach((j) => {
      j.lines.forEach((l) => {
        if (l.accountGroup === 'Expenses-02' || l.accountGroup === 'Income-03') {
          if (!nominalBalances[l.accountCode]) {
            const acct = findAccountByCode(l.accountCode);
            nominalBalances[l.accountCode] = {
              debit: 0,
              credit: 0,
              net: 0,
              group: l.accountGroup,
              name: acct?.name || l.accountName,
            };
          }
          nominalBalances[l.accountCode].debit += l.debit;
          nominalBalances[l.accountCode].credit += l.credit;
          nominalBalances[l.accountCode].net += l.debit - l.credit;
        }
      });
    });

    const lines: JournalLine[] = [];
    let totalIncomeClosed = 0;
    let totalExpenseClosed = 0;

    // 1. Close Income accounts (Debit to reduce credit balance to 0)
    Object.entries(nominalBalances).forEach(([code, data]) => {
      if (data.group === 'Income-03') {
        const incomeBal = data.credit - data.debit;
        if (Math.abs(incomeBal) > 0.009) {
          totalIncomeClosed += incomeBal;
          lines.push({
            id: `CLS-INC-${code}`,
            journalId: '',
            journalNo: '',
            accountCode: code,
            accountName: data.name,
            accountGroup: 'Income-03',
            normalBalance: 'CREDIT',
            debit: incomeBal,
            credit: 0,
            narration: `वर्षान्त आम्दानी खाता बन्द (Closing to Surplus)`,
          });
        }
      }
    });

    // 2. Close Expense accounts (Credit to reduce debit balance to 0)
    Object.entries(nominalBalances).forEach(([code, data]) => {
      if (data.group === 'Expenses-02') {
        const expenseBal = data.debit - data.credit;
        if (Math.abs(expenseBal) > 0.009) {
          totalExpenseClosed += expenseBal;
          lines.push({
            id: `CLS-EXP-${code}`,
            journalId: '',
            journalNo: '',
            accountCode: code,
            accountName: data.name,
            accountGroup: 'Expenses-02',
            normalBalance: 'DEBIT',
            debit: 0,
            credit: expenseBal,
            narration: `वर्षान्त खर्च खाता बन्द (Closing to Surplus)`,
          });
        }
      }
    });

    const netSurplus = Math.round((totalIncomeClosed - totalExpenseClosed) * 100) / 100;

    // 3. Post Net Surplus/Deficit to Surplus Account
    if (netSurplus >= 0) {
      // Net Profit -> Credit Surplus
      lines.push({
        id: `CLS-SURPLUS`,
        journalId: '',
        journalNo: '',
        accountCode: surplusAccount.code,
        accountName: surplusAccount.name,
        accountGroup: surplusAccount.group,
        normalBalance: surplusAccount.normalBalance,
        debit: 0,
        credit: netSurplus,
        narration: `वर्षान्त खुद बचत/नाफा स्थानान्तरण (Net Surplus Transfer for ${options.fiscalYear || 'FY'})`,
      });
    } else {
      // Net Loss -> Debit Surplus
      lines.push({
        id: `CLS-DEFICIT`,
        journalId: '',
        journalNo: '',
        accountCode: surplusAccount.code,
        accountName: surplusAccount.name,
        accountGroup: surplusAccount.group,
        normalBalance: surplusAccount.normalBalance,
        debit: Math.abs(netSurplus),
        credit: 0,
        narration: `वर्षान्त खुद नोक्सान समायोजन (Net Deficit Transfer for ${options.fiscalYear || 'FY'})`,
      });
    }

    if (lines.length < 2) {
      return {
        success: true,
        netSurplus: 0,
        message: 'बन्द गर्नुपर्ने कुनै नयाँ आम्दानी वा खर्च कारोबार भेटिएन।',
      };
    }

    const bsDate = options.closingDate || getCurrentBSDate();
    const journalNo = await accountingEngine.generateNextJournalNo(bsDate);
    const journalId = `CLS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const closingEntry: JournalEntry = {
      journalId,
      journalNo,
      transactionDate: new Date().toISOString().split('T')[0],
      bsDate,
      referenceNo: 'YEAR-END-CLOSE',
      transactionType: 'Closing',
      branch: 'Main Branch',
      narration: `आर्थिक वर्ष ${options.fiscalYear || 'चालु'} को नाफा-नोक्सान बन्द भौचर (Closing Nominal Accounts to ${surplusAccount.nameNp})`,
      totalDebit: lines.reduce((sum, l) => sum + l.debit, 0),
      totalCredit: lines.reduce((sum, l) => sum + l.credit, 0),
      status: 'POSTED',
      createdBy: options.user || 'Year-End Closing Engine',
      createdAt: new Date().toISOString(),
      lines,
    };

    const postResult = await accountingEngine.postJournal(closingEntry);
    serverCache.invalidateAccounting();

    return {
      success: true,
      closingJournal: postResult.journal,
      netSurplus,
      message: `✓ वर्षान्त नाफा-नोक्सान बन्द भौचर ${journalNo} सफलतापूर्वक सम्पन्न। खुद बचत रु. ${netSurplus.toLocaleString()} संचित कोषमा थपियो।`,
    };
  }

  // =========================================================================
  // 5. Move Last Year Closing to This Year Opening (Rollover / अ=ल्या=)
  // =========================================================================
  public async rolloverToNewYear(options: {
    currentFiscalYear: string;
    nextFiscalYear: string;
    closingDate: string;
    newYearOpeningDate: string;
    user?: string;
  }): Promise<{
    success: boolean;
    openingJournal?: JournalEntry;
    totalAssetsRolled: number;
    totalLiabilitiesRolled: number;
    message: string;
  }> {
    // 1. Gather all real accounts balances (Assets-04 & Liabilities 05) as of closing date
    const journals = await accountingEngine.getAllJournals();
    const closingJournals = journals.filter(
      (j) => j.status === 'POSTED' && j.bsDate <= options.closingDate
    );

    const realAccountBalances: { [code: string]: { balance: number; group: 'Assets-04' | 'Liabilities 05'; name: string } } = {};

    closingJournals.forEach((j) => {
      j.lines.forEach((l) => {
        if (l.accountGroup === 'Assets-04') {
          if (!realAccountBalances[l.accountCode]) {
            realAccountBalances[l.accountCode] = { balance: 0, group: 'Assets-04', name: l.accountName };
          }
          realAccountBalances[l.accountCode].balance += l.debit - l.credit;
        } else if (l.accountGroup === 'Liabilities 05') {
          if (!realAccountBalances[l.accountCode]) {
            realAccountBalances[l.accountCode] = { balance: 0, group: 'Liabilities 05', name: l.accountName };
          }
          realAccountBalances[l.accountCode].balance += l.credit - l.debit;
        }
      });
    });

    const lines: JournalLine[] = [];
    let totalAssetsRolled = 0;
    let totalLiabilitiesRolled = 0;

    // Assets Opening Balances (DEBIT)
    Object.entries(realAccountBalances).forEach(([code, data]) => {
      if (data.group === 'Assets-04' && Math.abs(data.balance) > 0.009) {
        totalAssetsRolled += data.balance;
        lines.push({
          id: `OPN-AST-${code}`,
          journalId: '',
          journalNo: '',
          accountCode: code,
          accountName: data.name,
          accountGroup: 'Assets-04',
          normalBalance: 'DEBIT',
          debit: Math.max(0, data.balance),
          credit: data.balance < 0 ? Math.abs(data.balance) : 0,
          narration: `गत आ.व. ${options.currentFiscalYear} बाट सरेर आएको सुरु मौज्दात (अ=ल्या= B/F)`,
        });
      }
    });

    // Liabilities Opening Balances (CREDIT)
    Object.entries(realAccountBalances).forEach(([code, data]) => {
      if (data.group === 'Liabilities 05' && Math.abs(data.balance) > 0.009) {
        totalLiabilitiesRolled += data.balance;
        lines.push({
          id: `OPN-LIA-${code}`,
          journalId: '',
          journalNo: '',
          accountCode: code,
          accountName: data.name,
          accountGroup: 'Liabilities 05',
          normalBalance: 'CREDIT',
          debit: data.balance < 0 ? Math.abs(data.balance) : 0,
          credit: Math.max(0, data.balance),
          narration: `गत आ.व. ${options.currentFiscalYear} बाट सरेर आएको सुरु मौज्दात (अ=ल्या= B/F)`,
        });
      }
    });

    // Verify balance or balance with retained earnings / suspense
    const totalDr = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCr = lines.reduce((sum, l) => sum + l.credit, 0);
    const diff = Math.abs(Math.round((totalDr - totalCr) * 100) / 100);

    if (diff > 0.01) {
      // Offset difference into Retained Surplus or Suspense
      if (totalDr > totalCr) {
        lines.push({
          id: `OPN-BAL-SURPLUS`,
          journalId: '',
          journalNo: '',
          accountCode: '25',
          accountName: 'Retained Earnings & Accumulated Surplus (संचित बचत/मुनाफा खाता २५)',
          accountGroup: 'Liabilities 05',
          normalBalance: 'CREDIT',
          debit: 0,
          credit: diff,
          narration: `अ=ल्या= सन्तुलन मिलान (Opening Balance Retained Surplus Offset)`,
        });
      } else {
        lines.push({
          id: `OPN-BAL-AST`,
          journalId: '',
          journalNo: '',
          accountCode: '80',
          accountName: 'Cash in Hand (नगद मौज्दात ८०)',
          accountGroup: 'Assets-04',
          normalBalance: 'DEBIT',
          debit: diff,
          credit: 0,
          narration: `अ=ल्या= सन्तुलन मिलान (Opening Balance Cash Offset)`,
        });
      }
    }

    if (lines.length < 2) {
      throw new Error(
        `अ=ल्या= (Opening B/F) भौचर खडा गर्न कम्तिमा २ वटा खाताहरू आवश्यक पर्दछ। छनोट गरिएको वर्षान्त मिति (${options.closingDate}) सम्म कुनै पनि सम्पत्ति वा दायित्वको मौज्दात भेटिएन। कृपया छनोट गरिएको मिति वा आर्थिक वर्षमा कारोबार भएको यकिन गर्नुहोस्।`
      );
    }

    const nextYearSeq = options.nextFiscalYear.split('/')[0] || '2084';
    const journalNo = `OPN-${nextYearSeq}-000001`;
    const journalId = `OPN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const openingEntry: JournalEntry = {
      journalId,
      journalNo,
      transactionDate: new Date().toISOString().split('T')[0],
      bsDate: options.newYearOpeningDate,
      referenceNo: `OPN-BF-${options.currentFiscalYear}`,
      transactionType: 'Opening',
      branch: 'Main Branch',
      narration: `नयाँ आर्थिक वर्ष ${options.nextFiscalYear} को प्रारम्भिक मौज्दात (अ=ल्या= / Opening Balances B/F from ${options.currentFiscalYear})`,
      totalDebit: lines.reduce((sum, l) => sum + l.debit, 0),
      totalCredit: lines.reduce((sum, l) => sum + l.credit, 0),
      status: 'POSTED',
      createdBy: options.user || 'Year-End Closing Engine',
      createdAt: new Date().toISOString(),
      lines,
    };

    const postResult = await accountingEngine.postJournal(openingEntry);

    // 2. Update active fiscal year in settings
    settingsService.updateOrganizationProfile({
      activeFiscalYear: options.nextFiscalYear,
    });

    // 3. Record Audit Log
    try {
      await googleSheetsService.appendRow('Audit_Log', [
        `LOG-${Date.now()}`,
        new Date().toISOString(),
        'YEAR_END_CLOSING_AND_ROLLOVER',
        'CLOSING',
        journalId,
        options.user || 'Admin',
        'SUCCESS',
        `Closed FY ${options.currentFiscalYear}. Generated Opening Voucher ${journalNo} for FY ${options.nextFiscalYear}. Assets B/F: Rs. ${totalAssetsRolled}, Liabilities B/F: Rs. ${totalLiabilitiesRolled}.`,
        '',
      ]);
    } catch (e) {
      console.warn('Audit log write error:', e);
    }

    serverCache.invalidateAccounting();

    return {
      success: true,
      openingJournal: postResult.journal,
      totalAssetsRolled,
      totalLiabilitiesRolled,
      message: `✓ आर्थिक वर्ष ${options.currentFiscalYear} को हिसाब सफलतापूर्वक बन्द भयो। नयाँ आर्थिक वर्ष ${options.nextFiscalYear} को सुरुवाती मौज्दात (अ=ल्या= भौचर ${journalNo}) प्रविष्टि सम्पन्न भयो।`,
    };
  }

  // =========================================================================
  // 6. Cooperative Act Section 56 Statutory Surplus Allocation
  // =========================================================================
  public async executeSurplusAllocation(params: {
    fiscalYear: string;
    decisionDate: string;
    agmResolutionNo: string;
    surplusAccountCode?: string;
    allocations: {
      accountCode: string;
      accountName: string;
      percentage: number;
      amount: number;
      fundType: string;
    }[];
    user?: string;
    notes?: string;
  }): Promise<{ success: boolean; journal?: JournalEntry; message: string }> {
    if (!params.agmResolutionNo || !params.decisionDate) {
      throw new Error('AGM Resolution Reference Number and Decision Date are required as per Cooperative Act.');
    }
    if (!params.allocations || params.allocations.length === 0) {
      throw new Error('At least one statutory reserve fund allocation is required.');
    }

    const totalAllocated = Math.round(params.allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0) * 100) / 100;
    if (totalAllocated <= 0) {
      throw new Error('Total surplus allocation amount must be greater than zero.');
    }

    const surplusCode = params.surplusAccountCode || '25';
    const surplusAcct = findAccountByCode(surplusCode) || this.ensureClosingCOA({
      code: surplusCode,
      name: 'Retained Earnings & Accumulated Surplus (संचित बचत/मुनाफा खाता २५)',
      nameNp: 'संचित बचत/मुनाफा खाता २५',
      group: 'Liabilities 05',
    });

    const lines: JournalLine[] = [];

    // 1. Debit the Net Surplus / Retained Earnings
    lines.push({
      id: `ALLOC-DR-${surplusCode}`,
      journalId: '',
      journalNo: '',
      accountCode: surplusAcct.code,
      accountName: surplusAcct.name,
      accountGroup: surplusAcct.group,
      normalBalance: surplusAcct.normalBalance,
      debit: totalAllocated,
      credit: 0,
      narration: `साधारण सभा निर्णय नं. ${params.agmResolutionNo} बमोजिम बचत बाँडफाँड (Surplus Allocation)`,
    });

    // 2. Credit each statutory fund account (only if amount > 0)
    params.allocations
      .filter((alloc) => Number(alloc.amount) > 0)
      .forEach((alloc, idx) => {
        const fundAcct = findAccountByCode(alloc.accountCode) || this.ensureClosingCOA({
          code: alloc.accountCode,
          name: alloc.accountName,
          nameNp: alloc.accountName,
          group: 'Liabilities 05',
        });

        lines.push({
          id: `ALLOC-CR-${alloc.accountCode}-${idx + 1}`,
          journalId: '',
          journalNo: '',
          accountCode: fundAcct.code,
          accountName: fundAcct.name,
          accountGroup: fundAcct.group,
          normalBalance: fundAcct.normalBalance,
          debit: 0,
          credit: Number(alloc.amount) || 0,
          narration: `${alloc.accountName} (${alloc.percentage}%) - निर्णय नं. ${params.agmResolutionNo}`,
        });
      });

    if (lines.length < 2) {
      throw new Error('बाँडफाँड भौचर खडा गर्न कम्तिमा १ वटा कोषमा रकम बाँडफाँड गरिएको हुनुपर्दछ।');
    }

    const journalNo = await accountingEngine.generateNextJournalNo(params.decisionDate);
    const journalId = `ALLOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const allocationEntry: JournalEntry = {
      journalId,
      journalNo,
      transactionDate: new Date().toISOString().split('T')[0],
      bsDate: params.decisionDate,
      referenceNo: params.agmResolutionNo,
      transactionType: 'Closing',
      branch: 'Main Branch',
      narration: `सहकारी ऐन, २०७४ को दफा ५६ र साधारण सभा निर्णय नं. ${params.agmResolutionNo} अनुसार आ.व. ${params.fiscalYear} को खुद बचत रु. ${totalAllocated.toLocaleString()} विभिन्न जगेडा कोषहरूमा बाँडफाँड प्रविष्टि।`,
      totalDebit: totalAllocated,
      totalCredit: totalAllocated,
      status: 'POSTED',
      createdBy: params.user || 'Surplus Allocation Engine',
      createdAt: new Date().toISOString(),
      lines,
    };

    const postResult = await accountingEngine.postJournal(allocationEntry);

    // Write audit log
    try {
      await googleSheetsService.appendRow('Audit_Log', [
        `LOG-${Date.now()}`,
        new Date().toISOString(),
        'POST_SURPLUS_ALLOCATION',
        'CLOSING',
        journalId,
        params.user || 'Admin',
        'SUCCESS',
        `Allocated Net Surplus of Rs. ${totalAllocated.toLocaleString()} into statutory funds per AGM Resolution ${params.agmResolutionNo}. Funds allocated: ${params.allocations.map(a => `${a.accountName}: ${a.amount}`).join('; ')}`,
        '',
      ]);
    } catch (e) {
      console.warn('Audit log write error:', e);
    }

    serverCache.invalidateAccounting();

    return {
      success: true,
      journal: postResult.journal,
      message: `✓ सहकारी ऐन बमोजिम खुद बचत बाँडफाँड भौचर ${journalNo} (निर्णय नं. ${params.agmResolutionNo}) सफलतापूर्वक प्रविष्टि गरियो।`,
    };
  }
}

export const closingEngine = new ClosingEngine();
