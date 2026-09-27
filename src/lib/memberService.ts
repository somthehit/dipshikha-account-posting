import { googleSheetsService } from './googleSheetsService';
import { Member, ShareBookEntry, SavingBookEntry, LoanBookEntry } from '../types/member';
import { accountingEngine } from './accountingEngine';
import { getCurrentBSDate } from './nepaliDate';
import serverCache from './cache';

class MemberService {
  // =========================================================================
  // 1. Get All Members
  // =========================================================================
  public async getAllMembers(): Promise<Member[]> {
    const cached = serverCache.get<Member[]>('members_all');
    if (cached) return cached;

    const rows = await googleSheetsService.readSheet('Member-Data');
    const members: Member[] = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 2 || !r[0]) continue;
      members.push({
        memberNo: String(r[0]),
        fullName: String(r[1]),
        fullNameEn: r[2] ? String(r[2]) : '',
        citizenshipNo: r[3] ? String(r[3]) : '',
        phone: r[4] ? String(r[4]) : '',
        address: r[5] ? String(r[5]) : '',
        wardNo: r[6] ? String(r[6]) : '',
        gender: (r[7] || 'पुरुष') as any,
        membershipDate: r[8] ? String(r[8]) : '',
        status: (r[9] || 'ACTIVE') as any,
        shareKitta: Number(r[10]) || 0,
        shareAmount: Number(r[11]) || 0,
        savingBalance: Number(r[12]) || 0,
        loanOutstanding: Number(r[13]) || 0,
      });
    }

    serverCache.set('members_all', members, 30000);
    return members;
  }

  // =========================================================================
  // 2. Get Single Member with All Subsidiary Book Records
  // =========================================================================
  public async getMemberDetails(memberNo: string): Promise<{
    member: Member | null;
    shares: ShareBookEntry[];
    savings: SavingBookEntry[];
    loans: LoanBookEntry[];
  }> {
    const members = await this.getAllMembers();
    const member = members.find((m) => m.memberNo === memberNo) || null;

    // Read Share_Book
    const shareRows = await googleSheetsService.readSheet('Share_Book');
    const shares: ShareBookEntry[] = [];
    for (let i = 1; i < shareRows.length; i++) {
      const r = shareRows[i];
      if (r && String(r[3]) === memberNo) {
        shares.push({
          id: String(r[0]),
          date: String(r[1]),
          bsDate: String(r[2]),
          memberNo: String(r[3]),
          memberName: String(r[4]),
          voucherNo: String(r[5]),
          type: r[6] as any,
          kitta: Number(r[7]) || 0,
          rate: Number(r[8]) || 100,
          debit: Number(r[9]) || 0,
          credit: Number(r[10]) || 0,
          balance: Number(r[11]) || 0,
          narration: String(r[12] || ''),
        });
      }
    }

    // Read Saving_Book
    const savingRows = await googleSheetsService.readSheet('Saving_Book');
    const savings: SavingBookEntry[] = [];
    for (let i = 1; i < savingRows.length; i++) {
      const r = savingRows[i];
      if (r && String(r[3]) === memberNo) {
        savings.push({
          id: String(r[0]),
          date: String(r[1]),
          bsDate: String(r[2]),
          memberNo: String(r[3]),
          memberName: String(r[4]),
          accountNo: String(r[5]),
          savingType: String(r[6]),
          voucherNo: String(r[7]),
          deposit: Number(r[8]) || 0,
          withdraw: Number(r[9]) || 0,
          interest: Number(r[10]) || 0,
          balance: Number(r[11]) || 0,
          narration: String(r[12] || ''),
        });
      }
    }

    // Read Loan_Book
    const loanRows = await googleSheetsService.readSheet('Loan_Book');
    const loans: LoanBookEntry[] = [];
    for (let i = 1; i < loanRows.length; i++) {
      const r = loanRows[i];
      if (r && String(r[3]) === memberNo) {
        loans.push({
          id: String(r[0]),
          date: String(r[1]),
          bsDate: String(r[2]),
          memberNo: String(r[3]),
          memberName: String(r[4]),
          loanAccountNo: String(r[5]),
          loanPurpose: String(r[6]),
          voucherNo: String(r[7]),
          disbursement: Number(r[8]) || 0,
          principalRepaid: Number(r[9]) || 0,
          interestPaid: Number(r[10]) || 0,
          penalty: Number(r[11]) || 0,
          balancePrincipal: Number(r[12]) || 0,
          narration: String(r[13] || ''),
        });
      }
    }

    return { member, shares, savings, loans };
  }

  // =========================================================================
  // 3. Register New Member
  // =========================================================================
  public async createMember(member: Omit<Member, 'shareKitta' | 'shareAmount' | 'savingBalance' | 'loanOutstanding'>): Promise<Member> {
    const members = await this.getAllMembers();
    let nextNo = member.memberNo;
    if (!nextNo) {
      nextNo = `M-${(members.length + 1).toString().padStart(3, '0')}`;
    }

    const newMember: Member = {
      ...member,
      memberNo: nextNo,
      shareKitta: 0,
      shareAmount: 0,
      savingBalance: 0,
      loanOutstanding: 0,
    };

    await googleSheetsService.appendRow('Member-Data', [
      newMember.memberNo,
      newMember.fullName,
      newMember.fullNameEn || '',
      newMember.citizenshipNo || '',
      newMember.phone,
      newMember.address,
      newMember.wardNo,
      newMember.gender,
      newMember.membershipDate || getCurrentBSDate(),
      newMember.status,
      0,
      0,
      0,
      0,
    ]);

    serverCache.invalidate('members_all');
    return newMember;
  }

  // =========================================================================
  // 4. Record Member Share Transaction (with auto Journal & 4-Khata posting)
  // =========================================================================
  public async recordShareTransaction(entry: {
    memberNo: string;
    kitta: number;
    type: 'PURCHASE' | 'REFUND';
    paymentMethod: 'CASH' | 'BANK';
    narration: string;
    bsDate?: string;
  }): Promise<{ shareEntry: ShareBookEntry; journalNo: string }> {
    const { member, shares } = await this.getMemberDetails(entry.memberNo);
    if (!member) throw new Error(`Member ${entry.memberNo} not found.`);

    const bsDate = entry.bsDate || getCurrentBSDate();
    const adDate = new Date().toISOString().split('T')[0];
    const amount = entry.kitta * 100; // Rs. 100 per share
    const lastBal = shares.length > 0 ? shares[shares.length - 1].balance : member.shareAmount;
    const newBal = entry.type === 'PURCHASE' ? lastBal + amount : lastBal - amount;

    // 1. Post to 4-Khata Journal
    // Purchase: Cash/Bank Dr, Share Capital (10) Cr
    // Refund: Share Capital (10) Dr, Cash/Bank Cr
    const journalNo = await accountingEngine.generateNextJournalNo(bsDate);
    const paymentAccountCode = entry.paymentMethod === 'BANK' ? '90' : '80';
    const paymentAccountName = entry.paymentMethod === 'BANK' ? 'Cash at Bank' : 'Cash in Hand';

    const journalLines =
      entry.type === 'PURCHASE'
        ? [
            {
              accountCode: paymentAccountCode,
              accountName: paymentAccountName,
              accountGroup: 'Assets-04' as const,
              normalBalance: 'DEBIT' as const,
              debit: amount,
              credit: 0,
              narration: `Share purchase by [${member.memberNo}] ${member.fullName}`,
            },
            {
              accountCode: '10',
              accountName: 'Share Capital (शेयर पूँजी)',
              accountGroup: 'Liabilities 05' as const,
              normalBalance: 'CREDIT' as const,
              debit: 0,
              credit: amount,
              narration: `Share capital issued to [${member.memberNo}] ${member.fullName} (${entry.kitta} shares)`,
            },
          ]
        : [
            {
              accountCode: '10',
              accountName: 'Share Capital (शेयर पूँजी)',
              accountGroup: 'Liabilities 05' as const,
              normalBalance: 'CREDIT' as const,
              debit: amount,
              credit: 0,
              narration: `Share refund to [${member.memberNo}] ${member.fullName} (${entry.kitta} shares)`,
            },
            {
              accountCode: paymentAccountCode,
              accountName: paymentAccountName,
              accountGroup: 'Assets-04' as const,
              normalBalance: 'DEBIT' as const,
              debit: 0,
              credit: amount,
              narration: `Share refund payout to [${member.memberNo}] ${member.fullName}`,
            },
          ];

    await accountingEngine.postJournal({
      journalId: `SH-J-${Date.now()}`,
      journalNo,
      transactionDate: adDate,
      bsDate,
      referenceNo: member.memberNo,
      transactionType: 'Journal',
      branch: 'Main Branch',
      narration: entry.narration || `Share ${entry.type} - [${member.memberNo}] ${member.fullName}`,
      totalDebit: amount,
      totalCredit: amount,
      status: 'POSTED',
      createdBy: 'Member Service',
      createdAt: new Date().toISOString(),
      lines: journalLines,
    });

    // 2. Append to Share_Book
    const shareEntryId = `SH-${Date.now()}`;
    const shareEntry: ShareBookEntry = {
      id: shareEntryId,
      date: adDate,
      bsDate,
      memberNo: member.memberNo,
      memberName: member.fullName,
      voucherNo: journalNo,
      type: entry.type,
      kitta: entry.kitta,
      rate: 100,
      debit: entry.type === 'REFUND' ? amount : 0,
      credit: entry.type === 'PURCHASE' ? amount : 0,
      balance: newBal,
      narration: entry.narration,
    };

    await googleSheetsService.appendRow('Share_Book', [
      shareEntry.id,
      shareEntry.date,
      shareEntry.bsDate,
      shareEntry.memberNo,
      shareEntry.memberName,
      shareEntry.voucherNo,
      shareEntry.type,
      shareEntry.kitta,
      shareEntry.rate,
      shareEntry.debit,
      shareEntry.credit,
      shareEntry.balance,
      shareEntry.narration,
    ]);

    // 3. Update Member-Data row
    await this.updateMemberBalances(member.memberNo);

    return { shareEntry, journalNo };
  }

  // =========================================================================
  // 5. Record Member Savings Transaction (Deposit / Withdrawal)
  // =========================================================================
  public async recordSavingTransaction(entry: {
    memberNo: string;
    amount: number;
    type: 'DEPOSIT' | 'WITHDRAW';
    savingType: string;
    accountNo?: string;
    paymentMethod: 'CASH' | 'BANK';
    narration: string;
    bsDate?: string;
  }): Promise<{ savingEntry: SavingBookEntry; journalNo: string }> {
    const { member, savings } = await this.getMemberDetails(entry.memberNo);
    if (!member) throw new Error(`Member ${entry.memberNo} not found.`);

    const bsDate = entry.bsDate || getCurrentBSDate();
    const adDate = new Date().toISOString().split('T')[0];
    const lastBal = savings.length > 0 ? savings[savings.length - 1].balance : member.savingBalance;
    const newBal = entry.type === 'DEPOSIT' ? lastBal + entry.amount : lastBal - entry.amount;

    if (entry.type === 'WITHDRAW' && lastBal < entry.amount) {
      throw new Error(`Insufficient savings balance. Available: Rs. ${lastBal}, Requested: Rs. ${entry.amount}`);
    }

    // 1. Post to 4-Khata Journal
    // Deposit: Cash/Bank Dr, Savings (30) Cr
    // Withdrawal: Savings (30) Dr, Cash/Bank Cr
    const journalNo = await accountingEngine.generateNextJournalNo(bsDate);
    const paymentAccountCode = entry.paymentMethod === 'BANK' ? '90' : '80';
    const paymentAccountName = entry.paymentMethod === 'BANK' ? 'Cash at Bank' : 'Cash in Hand';

    const journalLines =
      entry.type === 'DEPOSIT'
        ? [
            {
              accountCode: paymentAccountCode,
              accountName: paymentAccountName,
              accountGroup: 'Assets-04' as const,
              normalBalance: 'DEBIT' as const,
              debit: entry.amount,
              credit: 0,
              narration: `Savings deposit from [${member.memberNo}] ${member.fullName}`,
            },
            {
              accountCode: '30',
              accountName: 'Member Savings & Deposits (बचत हिसाब)',
              accountGroup: 'Liabilities 05' as const,
              normalBalance: 'CREDIT' as const,
              debit: 0,
              credit: entry.amount,
              narration: `${entry.savingType} deposited by [${member.memberNo}] ${member.fullName}`,
            },
          ]
        : [
            {
              accountCode: '30',
              accountName: 'Member Savings & Deposits (बचत हिसाब)',
              accountGroup: 'Liabilities 05' as const,
              normalBalance: 'CREDIT' as const,
              debit: entry.amount,
              credit: 0,
              narration: `${entry.savingType} withdrawal by [${member.memberNo}] ${member.fullName}`,
            },
            {
              accountCode: paymentAccountCode,
              accountName: paymentAccountName,
              accountGroup: 'Assets-04' as const,
              normalBalance: 'DEBIT' as const,
              debit: 0,
              credit: entry.amount,
              narration: `Savings withdrawal payout to [${member.memberNo}] ${member.fullName}`,
            },
          ];

    await accountingEngine.postJournal({
      journalId: `SAV-J-${Date.now()}`,
      journalNo,
      transactionDate: adDate,
      bsDate,
      referenceNo: member.memberNo,
      transactionType: 'Journal',
      branch: 'Main Branch',
      narration: entry.narration || `${entry.savingType} ${entry.type} - [${member.memberNo}] ${member.fullName}`,
      totalDebit: entry.amount,
      totalCredit: entry.amount,
      status: 'POSTED',
      createdBy: 'Member Service',
      createdAt: new Date().toISOString(),
      lines: journalLines,
    });

    // 2. Append to Saving_Book
    const savingEntryId = `SAV-${Date.now()}`;
    const savingEntry: SavingBookEntry = {
      id: savingEntryId,
      date: adDate,
      bsDate,
      memberNo: member.memberNo,
      memberName: member.fullName,
      accountNo: entry.accountNo || `SB-${member.memberNo}`,
      savingType: entry.savingType,
      voucherNo: journalNo,
      deposit: entry.type === 'DEPOSIT' ? entry.amount : 0,
      withdraw: entry.type === 'WITHDRAW' ? entry.amount : 0,
      interest: 0,
      balance: newBal,
      narration: entry.narration,
    };

    await googleSheetsService.appendRow('Saving_Book', [
      savingEntry.id,
      savingEntry.date,
      savingEntry.bsDate,
      savingEntry.memberNo,
      savingEntry.memberName,
      savingEntry.accountNo,
      savingEntry.savingType,
      savingEntry.voucherNo,
      savingEntry.deposit,
      savingEntry.withdraw,
      savingEntry.interest,
      savingEntry.balance,
      savingEntry.narration,
    ]);

    // 3. Update Member-Data row
    await this.updateMemberBalances(member.memberNo);

    return { savingEntry, journalNo };
  }

  // =========================================================================
  // 6. Record Member Loan Transaction (Disbursal / Repayment)
  // =========================================================================
  public async recordLoanTransaction(entry: {
    memberNo: string;
    amount: number;
    interestAmount?: number;
    penaltyAmount?: number;
    type: 'DISBURSEMENT' | 'REPAYMENT';
    loanPurpose: string;
    loanAccountNo?: string;
    paymentMethod: 'CASH' | 'BANK';
    narration: string;
    bsDate?: string;
  }): Promise<{ loanEntry: LoanBookEntry; journalNo: string }> {
    const { member, loans } = await this.getMemberDetails(entry.memberNo);
    if (!member) throw new Error(`Member ${entry.memberNo} not found.`);

    const bsDate = entry.bsDate || getCurrentBSDate();
    const adDate = new Date().toISOString().split('T')[0];
    const lastBal = loans.length > 0 ? loans[loans.length - 1].balancePrincipal : member.loanOutstanding;
    const newBal = entry.type === 'DISBURSEMENT' ? lastBal + entry.amount : Math.max(0, lastBal - entry.amount);

    const journalNo = await accountingEngine.generateNextJournalNo(bsDate);
    const paymentAccountCode = entry.paymentMethod === 'BANK' ? '90' : '80';
    const paymentAccountName = entry.paymentMethod === 'BANK' ? 'Cash at Bank' : 'Cash in Hand';

    // 1. Post to 4-Khata Journal
    // Disbursal: Loan to Members (110) Dr, Cash/Bank Cr
    // Repayment: Cash/Bank Dr, Loan to Members (110) Cr, Loan Interest (160.2) Cr
    const interest = Number(entry.interestAmount) || 0;
    const penalty = Number(entry.penaltyAmount) || 0;
    const totalReceived = entry.amount + interest + penalty;

    let journalLines: any[] = [];
    if (entry.type === 'DISBURSEMENT') {
      journalLines = [
        {
          accountCode: '110',
          accountName: 'Loans & Advances to Members (ऋण लगानी)',
          accountGroup: 'Assets-04' as const,
          normalBalance: 'DEBIT' as const,
          debit: entry.amount,
          credit: 0,
          narration: `${entry.loanPurpose} loan disbursement to [${member.memberNo}] ${member.fullName}`,
        },
        {
          accountCode: paymentAccountCode,
          accountName: paymentAccountName,
          accountGroup: 'Assets-04' as const,
          normalBalance: 'DEBIT' as const,
          debit: 0,
          credit: entry.amount,
          narration: `Loan payout to [${member.memberNo}] ${member.fullName}`,
        },
      ];
    } else {
      // Repayment
      journalLines.push({
        accountCode: paymentAccountCode,
        accountName: paymentAccountName,
        accountGroup: 'Assets-04' as const,
        normalBalance: 'DEBIT' as const,
        debit: totalReceived,
        credit: 0,
        narration: `Loan recovery received from [${member.memberNo}] ${member.fullName}`,
      });

      journalLines.push({
        accountCode: '110',
        accountName: 'Loans & Advances to Members (ऋण लगानी)',
        accountGroup: 'Assets-04' as const,
        normalBalance: 'DEBIT' as const,
        debit: 0,
        credit: entry.amount,
        narration: `Principal repayment by [${member.memberNo}] ${member.fullName}`,
      });

      if (interest > 0) {
        journalLines.push({
          accountCode: '160.2',
          accountName: 'Interest Income from Loans (कर्जाबाट ब्याज)',
          accountGroup: 'Income-03' as const,
          normalBalance: 'CREDIT' as const,
          debit: 0,
          credit: interest,
          narration: `Loan interest from [${member.memberNo}] ${member.fullName}`,
        });
      }

      if (penalty > 0) {
        journalLines.push({
          accountCode: '160.4',
          accountName: 'Miscellaneous Income (हर्जाना आम्दानी)',
          accountGroup: 'Income-03' as const,
          normalBalance: 'CREDIT' as const,
          debit: 0,
          credit: penalty,
          narration: `Loan fine/penalty from [${member.memberNo}] ${member.fullName}`,
        });
      }
    }

    await accountingEngine.postJournal({
      journalId: `LN-J-${Date.now()}`,
      journalNo,
      transactionDate: adDate,
      bsDate,
      referenceNo: member.memberNo,
      transactionType: 'Journal',
      branch: 'Main Branch',
      narration: entry.narration || `Loan ${entry.type} - [${member.memberNo}] ${member.fullName}`,
      totalDebit: entry.type === 'DISBURSEMENT' ? entry.amount : totalReceived,
      totalCredit: entry.type === 'DISBURSEMENT' ? entry.amount : totalReceived,
      status: 'POSTED',
      createdBy: 'Member Service',
      createdAt: new Date().toISOString(),
      lines: journalLines,
    });

    // 2. Append to Loan_Book
    const loanEntryId = `LN-${Date.now()}`;
    const loanEntry: LoanBookEntry = {
      id: loanEntryId,
      date: adDate,
      bsDate,
      memberNo: member.memberNo,
      memberName: member.fullName,
      loanAccountNo: entry.loanAccountNo || `LN-${member.memberNo}`,
      loanPurpose: entry.loanPurpose,
      voucherNo: journalNo,
      disbursement: entry.type === 'DISBURSEMENT' ? entry.amount : 0,
      principalRepaid: entry.type === 'REPAYMENT' ? entry.amount : 0,
      interestPaid: interest,
      penalty,
      balancePrincipal: newBal,
      narration: entry.narration,
    };

    await googleSheetsService.appendRow('Loan_Book', [
      loanEntry.id,
      loanEntry.date,
      loanEntry.bsDate,
      loanEntry.memberNo,
      loanEntry.memberName,
      loanEntry.loanAccountNo,
      loanEntry.loanPurpose,
      loanEntry.voucherNo,
      loanEntry.disbursement,
      loanEntry.principalRepaid,
      loanEntry.interestPaid,
      loanEntry.penalty,
      loanEntry.balancePrincipal,
      loanEntry.narration,
    ]);

    // 3. Update Member-Data row
    await this.updateMemberBalances(member.memberNo);

    return { loanEntry, journalNo };
  }

  // =========================================================================
  // 7. Recompute and Update Member Balances in Member-Data
  // =========================================================================
  private async updateMemberBalances(memberNo: string): Promise<void> {
    const { member, shares, savings, loans } = await this.getMemberDetails(memberNo);
    if (!member) return;

    const totalShareAmount = shares.length > 0 ? shares[shares.length - 1].balance : member.shareAmount;
    const totalShareKitta = Math.round(totalShareAmount / 100);
    const totalSaving = savings.length > 0 ? savings[savings.length - 1].balance : member.savingBalance;
    const totalLoan = loans.length > 0 ? loans[loans.length - 1].balancePrincipal : member.loanOutstanding;

    // Find row in Member-Data sheet
    const rows = await googleSheetsService.readSheet('Member-Data');
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && String(rows[i][0]) === memberNo) {
        const rowIndex = i + 1;
        // K=11(Kitta), L=12(Share Amt), M=13(Saving Bal), N=14(Loan Bal)
        await googleSheetsService.updateRange('Member-Data', `K${rowIndex}:N${rowIndex}`, [
          [totalShareKitta, totalShareAmount, totalSaving, totalLoan],
        ]);
        break;
      }
    }

    serverCache.invalidate('members_all');
  }
}

export const memberService = new MemberService();
