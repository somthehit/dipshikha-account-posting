import { accountingEngine } from './accountingEngine';
import { DEFAULT_ACCOUNTS, findAccountByCode } from './chartOfAccounts';
import {
  DateFilter,
  TrialBalanceReport,
  TrialBalanceItem,
  ProfitLossReport,
  ProfitLossSectionItem,
  BalanceSheetReport,
  BalanceSheetSectionItem,
  CashFlowReport,
  CashFlowActivityItem,
  SaleRegisterEntry,
  SalesReport,
  PurchaseRegisterEntry,
  PurchaseReport,
} from '../types/reports';
import { getCurrentBSDate } from './nepaliDate';
import serverCache from './cache';

export class ReportingEngine {
  // =========================================================================
  // 1. Trial Balance (सन्तुलन परीक्षण)
  // =========================================================================
  public async getTrialBalance(filter: DateFilter = {}): Promise<TrialBalanceReport> {
    const cacheKey = `tb_${JSON.stringify(filter)}`;
    const cached = serverCache.get<TrialBalanceReport>(cacheKey);
    if (cached) return cached;

    const journals = await accountingEngine.getAllJournals();
    const activeJournals = journals.filter((j) => j.status !== 'REVERSED');

    // Aggregate by account
    const openingDr: { [code: string]: number } = {};
    const openingCr: { [code: string]: number } = {};
    const periodDr: { [code: string]: number } = {};
    const periodCr: { [code: string]: number } = {};

    activeJournals.forEach((j) => {
      const jDate = j.transactionDate;
      const jBs = j.bsDate;

      const isBeforePeriod =
        (filter.dateFrom && jDate < filter.dateFrom) ||
        (filter.bsDateFrom && jBs < filter.bsDateFrom);

      const isInPeriod =
        (!filter.dateFrom || jDate >= filter.dateFrom) &&
        (!filter.dateTo || jDate <= filter.dateTo) &&
        (!filter.bsDateFrom || jBs >= filter.bsDateFrom) &&
        (!filter.bsDateTo || jBs <= filter.bsDateTo);

      j.lines.forEach((line) => {
        const code = line.accountCode;
        const dr = Number(line.debit) || 0;
        const cr = Number(line.credit) || 0;

        if (isBeforePeriod) {
          openingDr[code] = (openingDr[code] || 0) + dr;
          openingCr[code] = (openingCr[code] || 0) + cr;
        } else if (isInPeriod) {
          periodDr[code] = (periodDr[code] || 0) + dr;
          periodCr[code] = (periodCr[code] || 0) + cr;
        }
      });
    });

    const items: TrialBalanceItem[] = [];
    let totOpDr = 0;
    let totOpCr = 0;
    let totPerDr = 0;
    let totPerCr = 0;
    let totCloDr = 0;
    let totCloCr = 0;

    const groupSummary = {
      assetsDebit: 0,
      assetsCredit: 0,
      liabilitiesDebit: 0,
      liabilitiesCredit: 0,
      expensesDebit: 0,
      expensesCredit: 0,
      incomeDebit: 0,
      incomeCredit: 0,
    };

    DEFAULT_ACCOUNTS.forEach((account) => {
      const code = account.code;
      const opD = openingDr[code] || 0;
      const opC = openingCr[code] || 0;
      const pD = periodDr[code] || 0;
      const pC = periodCr[code] || 0;

      // Net opening
      let netOpD = 0;
      let netOpC = 0;
      if (account.normalBalance === 'DEBIT') {
        const net = opD - opC;
        if (net >= 0) netOpD = net;
        else netOpC = Math.abs(net);
      } else {
        const net = opC - opD;
        if (net >= 0) netOpC = net;
        else netOpD = Math.abs(net);
      }

      // Cumulative debits and credits
      const cumD = netOpD + pD;
      const cumC = netOpC + pC;

      let cloD = 0;
      let cloC = 0;
      let netBalance = 0;

      if (account.normalBalance === 'DEBIT') {
        const diff = cumD - cumC;
        if (diff >= 0) {
          cloD = diff;
        } else {
          cloC = Math.abs(diff);
        }
        netBalance = diff;
      } else {
        const diff = cumC - cumD;
        if (diff >= 0) {
          cloC = diff;
        } else {
          cloD = Math.abs(diff);
        }
        netBalance = diff;
      }

      // Filter out zero accounts if desired, but show active ones
      if (netOpD > 0 || netOpC > 0 || pD > 0 || pC > 0 || cloD > 0 || cloC > 0) {
        items.push({
          accountCode: code,
          accountName: account.nameEn || account.name,
          accountNameNp: account.nameNp || account.name,
          accountGroup: account.group,
          category: account.category || account.group,
          normalBalance: account.normalBalance,
          openingDebit: Math.round(netOpD * 100) / 100,
          openingCredit: Math.round(netOpC * 100) / 100,
          periodDebit: Math.round(pD * 100) / 100,
          periodCredit: Math.round(pC * 100) / 100,
          closingDebit: Math.round(cloD * 100) / 100,
          closingCredit: Math.round(cloC * 100) / 100,
          netBalance: Math.round(netBalance * 100) / 100,
        });

        totOpDr += netOpD;
        totOpCr += netOpC;
        totPerDr += pD;
        totPerCr += pC;
        totCloDr += cloD;
        totCloCr += cloC;

        if (account.group === 'Assets-04') {
          groupSummary.assetsDebit += cloD;
          groupSummary.assetsCredit += cloC;
        } else if (account.group === 'Liabilities 05') {
          groupSummary.liabilitiesDebit += cloD;
          groupSummary.liabilitiesCredit += cloC;
        } else if (account.group === 'Expenses-02') {
          groupSummary.expensesDebit += cloD;
          groupSummary.expensesCredit += cloC;
        } else if (account.group === 'Income-03') {
          groupSummary.incomeDebit += cloD;
          groupSummary.incomeCredit += cloC;
        }
      }
    });

    const variance = Math.abs(Math.round((totCloDr - totCloCr) * 100) / 100);

    const report: TrialBalanceReport = {
      generatedAt: new Date().toISOString(),
      filter,
      items,
      totalOpeningDebit: Math.round(totOpDr * 100) / 100,
      totalOpeningCredit: Math.round(totOpCr * 100) / 100,
      totalPeriodDebit: Math.round(totPerDr * 100) / 100,
      totalPeriodCredit: Math.round(totPerCr * 100) / 100,
      totalClosingDebit: Math.round(totCloDr * 100) / 100,
      totalClosingCredit: Math.round(totCloCr * 100) / 100,
      isBalanced: variance < 0.05,
      variance,
      groupSummary,
    };

    serverCache.set(cacheKey, report, 20000);
    return report;
  }

  // =========================================================================
  // 2. Profit & Loss / Income Statement (नाफा-नोक्सान हिसाब)
  // =========================================================================
  public async getProfitAndLoss(filter: DateFilter = {}): Promise<ProfitLossReport> {
    const cacheKey = `pl_${JSON.stringify(filter)}`;
    const cached = serverCache.get<ProfitLossReport>(cacheKey);
    if (cached) return cached;

    const tb = await this.getTrialBalance(filter);

    const tradingRevenue: ProfitLossSectionItem[] = [];
    const otherIncome: ProfitLossSectionItem[] = [];
    let totalIncome = 0;

    const operatingExpenses: ProfitLossSectionItem[] = [];
    const administrativeExpenses: ProfitLossSectionItem[] = [];
    const financialExpenses: ProfitLossSectionItem[] = [];
    const depreciationExpenses: ProfitLossSectionItem[] = [];
    let totalExpenses = 0;

    tb.items.forEach((item) => {
      const acct = findAccountByCode(item.accountCode);
      if (!acct) return;

      // Income (Income-03)
      if (acct.group === 'Income-03') {
        const amount = item.closingCredit - item.closingDebit;
        if (amount !== 0) {
          const pItem: ProfitLossSectionItem = {
            accountCode: item.accountCode,
            accountName: item.accountName,
            accountNameNp: item.accountNameNp,
            category: item.category,
            amount: Math.round(amount * 100) / 100,
          };
          if (item.accountCode === '160.1' || item.category.toLowerCase().includes('trading')) {
            tradingRevenue.push(pItem);
          } else {
            otherIncome.push(pItem);
          }
          totalIncome += amount;
        }
      }

      // Expenses (Expenses-02)
      if (acct.group === 'Expenses-02') {
        const amount = item.closingDebit - item.closingCredit;
        if (amount !== 0) {
          const pItem: ProfitLossSectionItem = {
            accountCode: item.accountCode,
            accountName: item.accountName,
            accountNameNp: item.accountNameNp,
            category: item.category,
            amount: Math.round(amount * 100) / 100,
          };

          if (item.accountCode === '150.18' || item.category.toLowerCase().includes('depreciation')) {
            depreciationExpenses.push(pItem);
          } else if (item.accountCode === '150.7' || item.category.toLowerCase().includes('financial')) {
            financialExpenses.push(pItem);
          } else if (
            item.accountCode === '105.1' ||
            item.accountCode === '150.2' ||
            item.category.toLowerCase().includes('operating')
          ) {
            operatingExpenses.push(pItem);
          } else {
            administrativeExpenses.push(pItem);
          }
          totalExpenses += amount;
        }
      }
    });

    const grossRevenue = tradingRevenue.reduce((sum, r) => sum + r.amount, 0);
    const costOfSales = operatingExpenses
      .filter((e) => e.accountCode === '105.1' || e.accountCode === '150.2')
      .reduce((sum, e) => sum + e.amount, 0);
    const grossProfit = grossRevenue - costOfSales;

    const netSurplus = totalIncome - totalExpenses;
    const operatingSurplus =
      totalIncome -
      (totalExpenses -
        depreciationExpenses.reduce((s, d) => s + d.amount, 0) -
        financialExpenses.reduce((s, f) => s + f.amount, 0));

    const report: ProfitLossReport = {
      generatedAt: new Date().toISOString(),
      filter,
      tradingRevenue,
      otherIncome,
      totalIncome: Math.round(totalIncome * 100) / 100,
      operatingExpenses,
      administrativeExpenses,
      financialExpenses,
      depreciationExpenses,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      operatingSurplus: Math.round(operatingSurplus * 100) / 100,
      netSurplus: Math.round(netSurplus * 100) / 100,
    };

    serverCache.set(cacheKey, report, 20000);
    return report;
  }

  // =========================================================================
  // 3. Balance Sheet (वासलात)
  // =========================================================================
  public async getBalanceSheet(asOfBSDate?: string): Promise<BalanceSheetReport> {
    const curBS = asOfBSDate || getCurrentBSDate();
    const cacheKey = `bs_${curBS}`;
    const cached = serverCache.get<BalanceSheetReport>(cacheKey);
    if (cached) return cached;

    // Filter up to this as of date
    const filter: DateFilter = { bsDateTo: curBS };
    const tb = await this.getTrialBalance(filter);
    const pl = await this.getProfitAndLoss(filter);

    // Liabilities & Capital items
    const shareCapital: BalanceSheetSectionItem[] = [];
    const reservesAndSurplus: BalanceSheetSectionItem[] = [];
    const memberDeposits: BalanceSheetSectionItem[] = [];
    const borrowings: BalanceSheetSectionItem[] = [];
    const grantsAndSubsidies: BalanceSheetSectionItem[] = [];
    const currentLiabilitiesAndPayables: BalanceSheetSectionItem[] = [];

    // Assets items
    const cashAndBank: BalanceSheetSectionItem[] = [];
    const investments: BalanceSheetSectionItem[] = [];
    const memberLoans: BalanceSheetSectionItem[] = [];
    const receivablesAndAdvances: BalanceSheetSectionItem[] = [];
    const fixedAssets: BalanceSheetSectionItem[] = [];
    const otherAssets: BalanceSheetSectionItem[] = [];

    tb.items.forEach((item) => {
      const netCr = item.closingCredit - item.closingDebit;
      const netDr = item.closingDebit - item.closingCredit;

      // Group: Liabilities 05
      if (item.accountGroup === 'Liabilities 05') {
        const bItem: BalanceSheetSectionItem = {
          accountCode: item.accountCode,
          accountName: item.accountName,
          accountNameNp: item.accountNameNp,
          category: item.category,
          amount: Math.round(netCr * 100) / 100,
        };

        if (item.accountCode === '10') {
          shareCapital.push(bItem);
        } else if (item.accountCode === '20' || item.accountCode === '25' || item.accountCode === '3900') {
          reservesAndSurplus.push(bItem);
        } else if (item.accountCode === '30') {
          memberDeposits.push(bItem);
        } else if (item.accountCode === '40') {
          borrowings.push(bItem);
        } else if (item.accountCode === '50') {
          grantsAndSubsidies.push(bItem);
        } else {
          currentLiabilitiesAndPayables.push(bItem);
        }
      }

      // Group: Assets-04
      if (item.accountGroup === 'Assets-04') {
        const bItem: BalanceSheetSectionItem = {
          accountCode: item.accountCode,
          accountName: item.accountName,
          accountNameNp: item.accountNameNp,
          category: item.category,
          amount: Math.round(netDr * 100) / 100,
        };

        if (item.accountCode === '80' || item.accountCode === '90') {
          if (item.accountCode === '90' && bItem.amount < 0) {
            borrowings.push({
              accountCode: '40',
              accountName: 'Bank Overdraft / Loans Payable (बैंक ओभरड्राफ्ट / सापटी ४०)',
              accountNameNp: 'लिएको ऋण / सापटी (बैंक ओभरड्राफ्ट ४०)',
              category: 'Loans Payable / Borrowings',
              amount: Math.abs(bItem.amount),
            });
          } else {
            cashAndBank.push(bItem);
          }
        } else if (item.accountCode === '100') {
          investments.push(bItem);
        } else if (item.accountCode === '110') {
          memberLoans.push(bItem);
        } else if (item.accountCode === '120') {
          receivablesAndAdvances.push(bItem);
        } else if (item.accountCode === '130') {
          fixedAssets.push(bItem);
        } else {
          otherAssets.push(bItem);
        }
      }
    });

    const totalShareCapital = shareCapital.reduce((s, i) => s + i.amount, 0);
    const existingReserves = reservesAndSurplus.reduce((s, i) => s + i.amount, 0);
    const currentPeriodSurplus = pl.netSurplus;
    const totalReservesAndSurplus = existingReserves + currentPeriodSurplus;
    const totalMemberDeposits = memberDeposits.reduce((s, i) => s + i.amount, 0);
    const totalBorrowings = borrowings.reduce((s, i) => s + i.amount, 0);
    const totalGrants = grantsAndSubsidies.reduce((s, i) => s + i.amount, 0);
    const totalCurrentLiabilities = currentLiabilitiesAndPayables.reduce((s, i) => s + i.amount, 0);

    const grandTotalLiabilitiesAndEquity =
      totalShareCapital +
      totalReservesAndSurplus +
      totalMemberDeposits +
      totalBorrowings +
      totalGrants +
      totalCurrentLiabilities;

    const totalCashAndBank = cashAndBank.reduce((s, i) => s + i.amount, 0);
    const totalInvestments = investments.reduce((s, i) => s + i.amount, 0);
    const totalMemberLoans = memberLoans.reduce((s, i) => s + i.amount, 0);
    const totalReceivables = receivablesAndAdvances.reduce((s, i) => s + i.amount, 0);
    const totalFixedAssets = fixedAssets.reduce((s, i) => s + i.amount, 0);
    const totalOtherAssets = otherAssets.reduce((s, i) => s + i.amount, 0);

    const grandTotalAssets =
      totalCashAndBank +
      totalInvestments +
      totalMemberLoans +
      totalReceivables +
      totalFixedAssets +
      totalOtherAssets;

    const variance = Math.abs(Math.round((grandTotalAssets - grandTotalLiabilitiesAndEquity) * 100) / 100);

    const report: BalanceSheetReport = {
      asOfDateAD: new Date().toISOString().split('T')[0],
      asOfDateBS: curBS,
      fiscalYear: curBS ? `${curBS.split('-')[0]}/${parseInt(curBS.split('-')[0], 10) + 1 - 2000}` : '२०८१/८२',
      liabilitiesAndEquity: {
        shareCapital,
        totalShareCapital: Math.round(totalShareCapital * 100) / 100,
        reservesAndSurplus,
        currentPeriodSurplus: Math.round(currentPeriodSurplus * 100) / 100,
        totalReservesAndSurplus: Math.round(totalReservesAndSurplus * 100) / 100,
        memberDeposits,
        totalMemberDeposits: Math.round(totalMemberDeposits * 100) / 100,
        borrowings,
        totalBorrowings: Math.round(totalBorrowings * 100) / 100,
        grantsAndSubsidies,
        totalGrants: Math.round(totalGrants * 100) / 100,
        currentLiabilitiesAndPayables,
        totalCurrentLiabilities: Math.round(totalCurrentLiabilities * 100) / 100,
        grandTotalLiabilitiesAndEquity: Math.round(grandTotalLiabilitiesAndEquity * 100) / 100,
      },
      assets: {
        cashAndBank,
        totalCashAndBank: Math.round(totalCashAndBank * 100) / 100,
        investments,
        totalInvestments: Math.round(totalInvestments * 100) / 100,
        memberLoans,
        totalMemberLoans: Math.round(totalMemberLoans * 100) / 100,
        receivablesAndAdvances,
        totalReceivables: Math.round(totalReceivables * 100) / 100,
        fixedAssets,
        totalFixedAssets: Math.round(totalFixedAssets * 100) / 100,
        otherAssets,
        totalOtherAssets: Math.round(totalOtherAssets * 100) / 100,
        grandTotalAssets: Math.round(grandTotalAssets * 100) / 100,
      },
      isBalanced: variance < 0.05,
      variance,
    };

    serverCache.set(cacheKey, report, 20000);
    return report;
  }

  // =========================================================================
  // 4. Cash Flow Statement (नगद प्रवाह विवरण)
  // =========================================================================
  public async getCashFlowStatement(filter: DateFilter = {}): Promise<CashFlowReport> {
    const cacheKey = `cf_${JSON.stringify(filter)}`;
    const cached = serverCache.get<CashFlowReport>(cacheKey);
    if (cached) return cached;

    const tb = await this.getTrialBalance(filter);
    const pl = await this.getProfitAndLoss(filter);

    // Operating Activities
    const operatingActivities: CashFlowActivityItem[] = [];
    operatingActivities.push({
      title: 'Net Surplus / Deficit from Operations (सञ्चालन मुनाफा)',
      titleNp: 'सञ्चालन मुनाफा / (नोक्सान)',
      amount: pl.netSurplus,
    });

    // Add back non-cash Depreciation
    const deprTotal = pl.depreciationExpenses.reduce((s, d) => s + d.amount, 0);
    if (deprTotal > 0) {
      operatingActivities.push({
        title: 'Add: Depreciation Adjustment (ह्रासकट्टी समायोजन)',
        titleNp: 'ह्रासकट्टी समायोजन (गैर-नगद)',
        amount: deprTotal,
      });
    }

    // Change in member savings & current liabilities
    const savingsItem = tb.items.find((i) => i.accountCode === '30');
    if (savingsItem) {
      const netSavingsInflow = savingsItem.periodCredit - savingsItem.periodDebit;
      if (netSavingsInflow !== 0) {
        operatingActivities.push({
          title: 'Net Inflow / (Outflow) from Member Savings (सदस्य बचत मौज्दात परिवर्तन)',
          titleNp: 'सदस्य बचत तथा निक्षेप संकलन / भुक्तानी',
          amount: Math.round(netSavingsInflow * 100) / 100,
        });
      }
    }

    // Change in receivables & payables
    const recItem = tb.items.find((i) => i.accountCode === '120');
    if (recItem) {
      const netRecChange = recItem.periodCredit - recItem.periodDebit;
      if (netRecChange !== 0) {
        operatingActivities.push({
          title: 'Change in Receivables & Debtors (पाउनुपर्ने हिसाब परिवर्तन)',
          titleNp: 'पाउनुपर्ने हिसाब असुली / पेश्की प्रवाह',
          amount: Math.round(netRecChange * 100) / 100,
        });
      }
    }

    const payItem = tb.items.find((i) => i.accountCode === '60');
    if (payItem) {
      const netPayChange = payItem.periodCredit - payItem.periodDebit;
      if (netPayChange !== 0) {
        operatingActivities.push({
          title: 'Change in Sundry Creditors & Payables (तिर्नुपर्ने दायित्व परिवर्तन)',
          titleNp: 'भुक्तानी दिनुपर्ने दायित्व वृद्धि / चुक्ता',
          amount: Math.round(netPayChange * 100) / 100,
        });
      }
    }

    const netCashFromOperating = operatingActivities.reduce((s, a) => s + a.amount, 0);

    // Investing Activities
    const investingActivities: CashFlowActivityItem[] = [];
    const loanItem = tb.items.find((i) => i.accountCode === '110');
    if (loanItem) {
      const netLoanFlow = loanItem.periodCredit - loanItem.periodDebit;
      if (netLoanFlow !== 0) {
        investingActivities.push({
          title: 'Net Loan Disbursement / Principal Recovery (ऋण लगानी तथा साँवा असुली)',
          titleNp: 'सदस्य ऋण प्रवाह तथा साँवा असुली',
          amount: Math.round(netLoanFlow * 100) / 100,
        });
      }
    }

    const invItem = tb.items.find((i) => i.accountCode === '100');
    if (invItem) {
      const netInvFlow = invItem.periodCredit - invItem.periodDebit;
      if (netInvFlow !== 0) {
        investingActivities.push({
          title: 'Investments in Shares / Fixed Deposits (लगानी खरिद / फिर्ता)',
          titleNp: 'अन्य संस्था / मुद्दतीमा लगानी तथा फिर्ता',
          amount: Math.round(netInvFlow * 100) / 100,
        });
      }
    }

    const fixedAssetItem = tb.items.find((i) => i.accountCode === '130');
    if (fixedAssetItem) {
      // Exclude depreciation which was added back
      const netAssetAcq = -(fixedAssetItem.periodDebit - fixedAssetItem.periodCredit + deprTotal);
      if (netAssetAcq !== 0) {
        investingActivities.push({
          title: 'Purchase of Fixed Assets (स्थिर सम्पत्ति खरिद)',
          titleNp: 'स्थिर सम्पत्ति खरिद / बिक्री',
          amount: Math.round(netAssetAcq * 100) / 100,
        });
      }
    }

    const netCashFromInvesting = investingActivities.reduce((s, a) => s + a.amount, 0);

    // Financing Activities
    const financingActivities: CashFlowActivityItem[] = [];
    const shareItem = tb.items.find((i) => i.accountCode === '10');
    if (shareItem) {
      const netShareFlow = shareItem.periodCredit - shareItem.periodDebit;
      if (netShareFlow !== 0) {
        financingActivities.push({
          title: 'Proceeds from Share Capital (शेयर पूँजी संकलन / फिर्ता)',
          titleNp: 'सदस्य शेयर पूँजी बिक्री / फिर्ता',
          amount: Math.round(netShareFlow * 100) / 100,
        });
      }
    }

    const borrowItem = tb.items.find((i) => i.accountCode === '40');
    if (borrowItem) {
      const netBorrowFlow = borrowItem.periodCredit - borrowItem.periodDebit;
      if (netBorrowFlow !== 0) {
        financingActivities.push({
          title: 'Borrowings / Loans Taken & Repaid (लिएको ऋण / सापट)',
          titleNp: 'बैंक तथा बाह्य ऋण प्राप्ति / भुक्तानी',
          amount: Math.round(netBorrowFlow * 100) / 100,
        });
      }
    }

    const netCashFromFinancing = financingActivities.reduce((s, a) => s + a.amount, 0);

    const netChangeInCash = netCashFromOperating + netCashFromInvesting + netCashFromFinancing;

    // Cash and Bank Accounts (80 and 90)
    const cashItem = tb.items.find((i) => i.accountCode === '80');
    const bankItem = tb.items.find((i) => i.accountCode === '90');

    const opCash = (cashItem ? cashItem.openingDebit - cashItem.openingCredit : 0) +
                   (bankItem ? bankItem.openingDebit - bankItem.openingCredit : 0);

    const cloCash = (cashItem ? cashItem.closingDebit - cashItem.closingCredit : 0) +
                    (bankItem ? bankItem.closingDebit - bankItem.closingCredit : 0);

    const expectedClosing = opCash + netChangeInCash;
    const reconciliationCheckPassed = Math.abs(expectedClosing - cloCash) < 1.0;

    const report: CashFlowReport = {
      generatedAt: new Date().toISOString(),
      filter,
      operatingActivities,
      netCashFromOperating: Math.round(netCashFromOperating * 100) / 100,
      investingActivities,
      netCashFromInvesting: Math.round(netCashFromInvesting * 100) / 100,
      financingActivities,
      netCashFromFinancing: Math.round(netCashFromFinancing * 100) / 100,
      netChangeInCash: Math.round(netChangeInCash * 100) / 100,
      openingCashAndBank: Math.round(opCash * 100) / 100,
      closingCashAndBank: Math.round(cloCash * 100) / 100,
      reconciliationCheckPassed,
    };

    serverCache.set(cacheKey, report, 20000);
    return report;
  }

  // =========================================================================
  // 5. Sales Report (बिक्री प्रतिवेदन / बिक्री खाता)
  // =========================================================================
  public async getSalesReport(filter: DateFilter = {}): Promise<SalesReport> {
    const cacheKey = `sales_${JSON.stringify(filter)}`;
    const cached = serverCache.get<SalesReport>(cacheKey);
    if (cached) return cached;

    const journals = await accountingEngine.getAllJournals();
    const activeJournals = journals.filter((j) => j.status !== 'REVERSED');

    const entries: SaleRegisterEntry[] = [];
    let totalGrossSales = 0;
    let totalDiscount = 0;
    let totalNetSales = 0;
    let cashSalesTotal = 0;
    let bankSalesTotal = 0;
    let creditSalesTotal = 0;

    activeJournals.forEach((j) => {
      const jDate = j.transactionDate;
      const jBs = j.bsDate;

      const isInPeriod =
        (!filter.dateFrom || jDate >= filter.dateFrom) &&
        (!filter.dateTo || jDate <= filter.dateTo) &&
        (!filter.bsDateFrom || jBs >= filter.bsDateFrom) &&
        (!filter.bsDateTo || jBs <= filter.bsDateTo);

      if (!isInPeriod) return;

      // Find sales lines (Account 160.1 or similar Trading revenue)
      const salesLines = j.lines.filter(
        (l) => l.accountCode === '160.1' || (l.accountGroup === 'Income-03' && (l.credit > 0 || l.debit > 0))
      );

      if (salesLines.length === 0) return;

      // Calculate sale amount in this voucher
      const voucherGrossSale = salesLines.reduce((sum, l) => sum + (l.credit - l.debit), 0);
      if (voucherGrossSale <= 0) return;

      // Find discount allowed lines (150.15)
      const discountLines = j.lines.filter((l) => l.accountCode === '150.15');
      const discountAmount = discountLines.reduce((sum, l) => sum + (l.debit - l.credit), 0);

      // Determine payment mode and settlement account
      let paymentMode: 'CASH' | 'BANK' | 'CREDIT' | 'OTHER' = 'CASH';
      let settlementAccount = '८० नगद मौज्दात';

      const hasCash = j.lines.some((l) => l.accountCode === '80' && l.debit > 0);
      const hasBank = j.lines.some((l) => (l.accountCode === '90' || l.accountCode.startsWith('90.')) && l.debit > 0);
      const hasCredit = j.lines.some((l) => (l.accountCode === '120' || l.accountCode.startsWith('120.')) && l.debit > 0);

      if (hasBank) {
        paymentMode = 'BANK';
        settlementAccount = '९० बैंक मौज्दात';
        bankSalesTotal += voucherGrossSale - discountAmount;
      } else if (hasCredit) {
        paymentMode = 'CREDIT';
        settlementAccount = '१२० पाउनुपर्ने (उधारो)';
        creditSalesTotal += voucherGrossSale - discountAmount;
      } else {
        paymentMode = 'CASH';
        settlementAccount = '८० नगद मौज्दात';
        cashSalesTotal += voucherGrossSale - discountAmount;
      }

      const netSale = voucherGrossSale - discountAmount;

      entries.push({
        journalId: j.journalId,
        journalNo: j.journalNo,
        dateAD: j.transactionDate,
        dateBS: j.bsDate,
        referenceNo: j.referenceNo || '',
        partyName: j.referenceNo ? `बिल नं ${j.referenceNo}` : 'सामान्य ग्राहक / सदस्य',
        paymentMode,
        description: j.narration,
        grossAmount: Math.round(voucherGrossSale * 100) / 100,
        discountAmount: Math.round(discountAmount * 100) / 100,
        netAmount: Math.round(netSale * 100) / 100,
        taxAmount: 0,
        totalAmount: Math.round(netSale * 100) / 100,
        settlementAccount,
      });

      totalGrossSales += voucherGrossSale;
      totalDiscount += discountAmount;
      totalNetSales += netSale;
    });

    entries.sort((a, b) => b.dateBS.localeCompare(a.dateBS));

    const report: SalesReport = {
      generatedAt: new Date().toISOString(),
      filter,
      entries,
      totalGrossSales: Math.round(totalGrossSales * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalNetSales: Math.round(totalNetSales * 100) / 100,
      cashSalesTotal: Math.round(cashSalesTotal * 100) / 100,
      bankSalesTotal: Math.round(bankSalesTotal * 100) / 100,
      creditSalesTotal: Math.round(creditSalesTotal * 100) / 100,
      salesCount: entries.length,
    };

    serverCache.set(cacheKey, report, 20000);
    return report;
  }

  // =========================================================================
  // 6. Purchase Report (खरिद प्रतिवेदन / खरिद खाता)
  // =========================================================================
  public async getPurchaseReport(filter: DateFilter = {}): Promise<PurchaseReport> {
    const cacheKey = `purchase_${JSON.stringify(filter)}`;
    const cached = serverCache.get<PurchaseReport>(cacheKey);
    if (cached) return cached;

    const journals = await accountingEngine.getAllJournals();
    const activeJournals = journals.filter((j) => j.status !== 'REVERSED');

    const entries: PurchaseRegisterEntry[] = [];
    let totalPurchases = 0;
    let totalFreight = 0;
    let totalDiscountReceived = 0;
    let netTotalCost = 0;
    let cashPurchasesTotal = 0;
    let bankPurchasesTotal = 0;
    let creditPurchasesTotal = 0;

    activeJournals.forEach((j) => {
      const jDate = j.transactionDate;
      const jBs = j.bsDate;

      const isInPeriod =
        (!filter.dateFrom || jDate >= filter.dateFrom) &&
        (!filter.dateTo || jDate <= filter.dateTo) &&
        (!filter.bsDateFrom || jBs >= filter.bsDateFrom) &&
        (!filter.bsDateTo || jBs <= filter.bsDateTo);

      if (!isInPeriod) return;

      // Find goods purchase lines (105.1)
      const purchaseLines = j.lines.filter((l) => l.accountCode === '105.1');
      if (purchaseLines.length === 0) return;

      const voucherPurchase = purchaseLines.reduce((sum, l) => sum + (l.debit - l.credit), 0);
      if (voucherPurchase <= 0) return;

      // Freight lines (150.2)
      const freightLines = j.lines.filter((l) => l.accountCode === '150.2');
      const voucherFreight = freightLines.reduce((sum, l) => sum + (l.debit - l.credit), 0);

      // Discount received lines (160.6)
      const discountRecLines = j.lines.filter((l) => l.accountCode === '160.6');
      const voucherDiscount = discountRecLines.reduce((sum, l) => sum + (l.credit - l.debit), 0);

      const netCost = voucherPurchase + voucherFreight - voucherDiscount;

      // Determine payment mode
      let paymentMode: 'CASH' | 'BANK' | 'CREDIT' | 'OTHER' = 'CASH';
      let settlementAccount = '८० नगद मौज्दात';

      const hasCash = j.lines.some((l) => l.accountCode === '80' && l.credit > 0);
      const hasBank = j.lines.some((l) => (l.accountCode === '90' || l.accountCode.startsWith('90.')) && l.credit > 0);
      const hasCredit = j.lines.some((l) => (l.accountCode === '60' || l.accountCode.startsWith('60.')) && l.credit > 0);

      if (hasBank) {
        paymentMode = 'BANK';
        settlementAccount = '९० बैंक भुक्तानी';
        bankPurchasesTotal += netCost;
      } else if (hasCredit) {
        paymentMode = 'CREDIT';
        settlementAccount = '६० साहु भुक्तानी बाँकी (उधारो)';
        creditPurchasesTotal += netCost;
      } else {
        paymentMode = 'CASH';
        settlementAccount = '८० नगद भुक्तानी';
        cashPurchasesTotal += netCost;
      }

      entries.push({
        journalId: j.journalId,
        journalNo: j.journalNo,
        dateAD: j.transactionDate,
        dateBS: j.bsDate,
        referenceNo: j.referenceNo || '',
        vendorName: j.referenceNo ? `खरिद बिल नं ${j.referenceNo}` : 'सप्लायर / बिक्रेता',
        paymentMode,
        description: j.narration,
        purchaseAmount: Math.round(voucherPurchase * 100) / 100,
        freightAndWages: Math.round(voucherFreight * 100) / 100,
        discountReceived: Math.round(voucherDiscount * 100) / 100,
        netPurchaseCost: Math.round(netCost * 100) / 100,
        settlementAccount,
      });

      totalPurchases += voucherPurchase;
      totalFreight += voucherFreight;
      totalDiscountReceived += voucherDiscount;
      netTotalCost += netCost;
    });

    entries.sort((a, b) => b.dateBS.localeCompare(a.dateBS));

    const report: PurchaseReport = {
      generatedAt: new Date().toISOString(),
      filter,
      entries,
      totalPurchases: Math.round(totalPurchases * 100) / 100,
      totalFreight: Math.round(totalFreight * 100) / 100,
      totalDiscountReceived: Math.round(totalDiscountReceived * 100) / 100,
      netTotalCost: Math.round(netTotalCost * 100) / 100,
      cashPurchasesTotal: Math.round(cashPurchasesTotal * 100) / 100,
      bankPurchasesTotal: Math.round(bankPurchasesTotal * 100) / 100,
      creditPurchasesTotal: Math.round(creditPurchasesTotal * 100) / 100,
      purchasesCount: entries.length,
    };

    serverCache.set(cacheKey, report, 20000);
    return report;
  }
}

export const reportingEngine = new ReportingEngine();

