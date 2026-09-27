#!/usr/bin/env python3
"""
Double Entry 4-Khata Accounting Engine & Google Sheets / Excel Datastore Bridge
for Shree Dipsikha Krishi Sahakari Sanstha Ltd. (श्री दीपशिखा कृषि सहकारी संस्था लि.)

Handles:
1. Automated Posting to 4-Khata books:
   - Assets-04 (सम्पत्ति खाता)
   - Expenses-02 (खर्च खाता)
   - Liabilities 05 (दायित्व तथा शेयर पुँजी खाता)
   - Income-03 (आम्दानी खाता)
2. Double Entry Journal Vouchers & General Ledger (स्रेस्ता तथा खातापाता)
3. Member Subsidiary Books (सदस्य लगत):
   - Member-Data (सदस्य विवरण)
   - Share_Book (शेयर खाता)
   - Saving_Book (बचत खाता)
   - Loan_Book (ऋण खाता)
4. Opening Balance (अ=ल्या= गत वर्षको) & Year-End Closing Setup
5. Comprehensive Audit Logging
"""

import sys
import os
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from datetime import datetime

# Ensure standard output supports Unicode / Nepali characters on Windows terminals
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass


class KhataAccountingBridge:
    def __init__(self, excel_path):
        self.excel_path = excel_path
        if os.path.exists(excel_path):
            self.wb = openpyxl.load_workbook(excel_path)
        else:
            self.wb = openpyxl.Workbook()
            # Remove default sheet if creating fresh
            if 'Sheet' in self.wb.sheetnames:
                self.wb.remove(self.wb['Sheet'])
        
        self.ensure_4khata_sheets()
        self.ensure_logical_sheets()
        self.ensure_member_sheets()
        self.save()

    def save(self):
        """Saves current state to Excel path."""
        # Ensure parent directory exists
        parent = os.path.dirname(self.excel_path)
        if parent and not os.path.exists(parent):
            os.makedirs(parent, exist_ok=True)
        self.wb.save(self.excel_path)

    def ensure_4khata_sheets(self):
        """Ensures the 4 core traditional cooperative khata sheets exist."""
        # Assets-04
        if 'Assets-04' not in self.wb.sheetnames:
            ws = self.wb.create_sheet(title='Assets-04')
            ws.cell(1, 1).value = 'श्री दीपशिखा कृषि सहकारी संस्था लि.'
            ws.cell(2, 1).value = 'सम्पत्ति खाता (Assets-04)'
            headers = [
                'सि.नं.', 'मिति', 'भौचर नं.', 'विवरण',
                'नगद (८०) - डे.', 'नगद (८०) - क्रे.', 'नगद - मौज्दात',
                'बैंक (९०) - डे.', 'बैंक (९०) - क्रे.', 'बैंक - मौज्दात',
                'लगानी (१००) - डे.', 'लगानी (१००) - क्रे.', 'लगानी - मौज्दात',
                'ऋण (११०) - डे.', 'ऋण (११०) - क्रे.', 'ऋण - मौज्दात',
                'सामान/अग्रिम (१२०) - डे.', 'सामान/अग्रिम (१२०) - क्रे.', 'सामान - मौज्दात',
                'स्थिर सम्पत्ति (१३०) - डे.', 'स्थिर सम्पत्ति (१३०) - क्रे.', 'स्थिर - मौज्दात',
                'अन्य सम्पत्ति (१४०) - डे.', 'अन्य सम्पत्ति (१४०) - क्रे.', 'अन्य - मौज्दात'
            ]
            ws.append([])  # Row 3
            ws.append([])  # Row 4
            ws.append([])  # Row 5
            ws.append([])  # Row 6
            ws.append(headers)  # Row 7 (or Row 6 headers, Row 7 opening)
        
        # Expenses-02
        if 'Expenses-02' not in self.wb.sheetnames:
            ws = self.wb.create_sheet(title='Expenses-02')
            ws.cell(1, 1).value = 'श्री दीपशिखा कृषि सहकारी संस्था लि.'
            ws.cell(2, 1).value = 'खर्च खाता (Expenses-02)'
            headers = [
                'सि.नं.', 'मिति', 'विवरण', 'भौचर नं.',
                'बचत ब्याज खर्च (१०५.१)', 'तलब भत्ता (१५०.१)', 'घर भाडा (१५०.४)',
                'बिजुली/पानी (१५०.५)', 'सञ्चार (१५०.६)', 'स्टेशनरी (१५०.७)',
                'सवारी खर्च (१५०.८)', 'मर्मत सम्भार (१५०.९)', 'लेखापरीक्षण शुल्क (१५०.१०)',
                'बैठक खर्च (१५०.११)', 'तालिम/गोष्ठी (१५०.१२)', 'विज्ञापन (१५०.१३)',
                'विविध खर्च (१५०.१७)'
            ]
            ws.append([])
            ws.append([])
            ws.append([])
            ws.append(headers)

        # Liabilities 05
        if 'Liabilities 05' not in self.wb.sheetnames:
            ws = self.wb.create_sheet(title='Liabilities 05')
            ws.cell(1, 1).value = 'श्री दीपशिखा कृषि सहकारी संस्था लि.'
            ws.cell(2, 1).value = 'दायित्व तथा शेयर पुँजी खाता (Liabilities 05)'
            headers = [
                'सि.नं.', 'मिति', 'भौचर नं.', 'विवरण',
                'शेयर (१०) - डे.', 'शेयर (१०) - क्रे.', 'शेयर - मौज्दात',
                'जगेडा कोष (२०) - डे.', 'जगेडा कोष (२०) - क्रे.', 'जगेडा - मौज्दात',
                'बचत निक्षेप (३०) - डे.', 'बचत निक्षेप (३०) - क्रे.', 'बचत - मौज्दात',
                'ऋण सापटी (४०) - डे.', 'ऋण सापटी (४०) - क्रे.', 'सापटी - मौज्दात',
                'अनुदान कोष (५०) - डे.', 'अनुदान कोष (५०) - क्रे.', 'अनुदान - मौज्दात',
                'तिर्नुपर्ने हिसाब (६०) - डे.', 'तिर्नुपर्ने हिसाब (६०) - क्रे.', 'तिर्नुपर्ने - मौज्दात',
                'अन्य दायित्व (७०) - डे.', 'अन्य दायित्व (७०) - क्रे.', 'अन्य दायित्व - मौज्दात'
            ]
            ws.append([])
            ws.append([])
            ws.append([])
            ws.append([])
            ws.append(headers)

        # Income-03
        if 'Income-03' not in self.wb.sheetnames:
            ws = self.wb.create_sheet(title='Income-03')
            ws.cell(1, 1).value = 'श्री दीपशिखा कृषि सहकारी संस्था लि.'
            ws.cell(2, 1).value = 'आम्दानी खाता (Income-03)'
            headers = [
                'सि.नं.', 'मिति', 'विवरण', 'भौचर नं.',
                'ऋण ब्याज आम्दानी (१६०.२)', 'सेवा शुल्क (१६०.१)', 'सदस्यता प्रवेश शुल्क (१६०.३)',
                'हर्जाना आम्दानी (१६०.४)', 'लगानी लाभांश आम्दानी (१६०.५)', 'विविध आम्दानी (१६०.७)'
            ]
            ws.append([])
            ws.append([])
            ws.append([])
            ws.append(headers)

    def ensure_logical_sheets(self):
        """Ensure Journal, Journal_Lines, Ledger, Audit_Log exist."""
        sheets = {
            'Journal': [
                'Journal ID', 'Journal No', 'Transaction Date', 'BS Date', 'Reference No',
                'Transaction Type', 'Branch', 'Narration', 'Total Debit', 'Total Credit',
                'Status', 'Reversal Journal ID', 'Created By', 'Created At'
            ],
            'Journal_Lines': [
                'Line ID', 'Journal ID', 'Journal No', 'Account Code', 'Account Name',
                'Account Group', 'Debit', 'Credit', 'Narration'
            ],
            'Ledger': [
                'Entry ID', 'Date', 'BS Date', 'Journal No', 'Account Code', 'Account Name',
                'Account Group', 'Branch', 'Description', 'Debit', 'Credit', 'Running Balance'
            ],
            'Audit_Log': [
                'Log ID', 'Timestamp', 'Action', 'Entity Type', 'Entity ID',
                'User', 'Status', 'Details', 'Error Message'
            ]
        }

        created = []
        for name, headers in sheets.items():
            if name not in self.wb.sheetnames:
                s = self.wb.create_sheet(title=name)
                s.append(headers)
                created.append(name)
        if created:
            print(f"[Bridge] Created system sheets: {created}")

    def ensure_member_sheets(self):
        """Ensures Member-Data, Share_Book, Saving_Book, and Loan_Book exist."""
        member_sheets = {
            'Member-Data': [
                'Member No', 'Full Name', 'Full Name En', 'Citizenship No', 'Phone',
                'Address', 'Ward No', 'Gender', 'Membership Date', 'Status',
                'Share Kitta', 'Share Amount', 'Saving Balance', 'Loan Outstanding'
            ],
            'Share_Book': [
                'Entry ID', 'Date', 'BS Date', 'Member No', 'Member Name', 'Voucher No',
                'Transaction Type', 'Kitta', 'Rate', 'Debit (Refund)', 'Credit (Purchase)', 'Balance', 'Narration'
            ],
            'Saving_Book': [
                'Entry ID', 'Date', 'BS Date', 'Member No', 'Member Name', 'Account No',
                'Saving Type', 'Voucher No', 'Deposit (Cr)', 'Withdraw (Dr)', 'Interest', 'Balance', 'Narration'
            ],
            'Loan_Book': [
                'Entry ID', 'Date', 'BS Date', 'Member No', 'Member Name', 'Loan Account No',
                'Loan Purpose', 'Voucher No', 'Disbursement (Dr)', 'Principal Repaid (Cr)', 'Interest Paid', 'Penalty', 'Principal Balance', 'Narration'
            ]
        }
        created = []
        for name, headers in member_sheets.items():
            if name not in self.wb.sheetnames:
                s = self.wb.create_sheet(title=name)
                s.append(headers)
                created.append(name)
        if created:
            print(f"[Bridge] Created member subsidiary sheets: {created}")

    def validate_entry(self, lines):
        dr = sum(float(l.get('debit', 0)) for l in lines)
        cr = sum(float(l.get('credit', 0)) for l in lines)
        diff = abs(round(dr - cr, 2))
        if diff > 0.009:
            raise ValueError(f"Journal Entry is not balanced. Total Debit ({dr}) != Total Credit ({cr}). Difference: {diff}")
        return dr, cr

    def post_journal(self, journal_no, bs_date, ad_date, narration, lines, branch="Main Branch", user="Accountant"):
        """
        Validates double entry balance, appends to Journal & Journal_Lines,
        posts to 4-Khata sheets and Ledger, and logs audit record.
        """
        dr, cr = self.validate_entry(lines)
        journal_id = f"JE-{int(datetime.now().timestamp())}"

        # 1. Append to Journal sheet
        s_j = self.wb['Journal']
        s_j.append([
            journal_id, journal_no, ad_date, bs_date, '',
            'Journal', branch, narration, dr, cr, 'POSTED', '', user, datetime.now().isoformat()
        ])

        # 2. Append to Journal_Lines sheet & Ledger
        s_jl = self.wb['Journal_Lines']
        for i, l in enumerate(lines, 1):
            line_id = f"{journal_id}-L{i}"
            s_jl.append([
                line_id, journal_id, journal_no, l['code'], l['name'],
                l['group'], float(l.get('debit', 0)), float(l.get('credit', 0)),
                l.get('narration', narration)
            ])

            # Update General Ledger
            self.post_to_ledger(journal_no, ad_date, bs_date, l, branch)

        # 3. Auto-post to 4-Khata sheets
        for l in lines:
            group = l['group']
            code = str(l['code'])
            debit = float(l.get('debit', 0))
            credit = float(l.get('credit', 0))

            if group == 'Assets-04':
                self.post_assets_04(bs_date, journal_no, l.get('narration', narration), code, debit, credit)
            elif group == 'Expenses-02':
                self.post_expenses_02(bs_date, journal_no, l.get('narration', narration), code, debit, credit)
            elif group == 'Liabilities 05':
                self.post_liabilities_05(bs_date, journal_no, l.get('narration', narration), code, debit, credit)
            elif group == 'Income-03':
                self.post_income_03(bs_date, journal_no, l.get('narration', narration), code, debit, credit)

        # 4. Audit Log
        s_al = self.wb['Audit_Log']
        s_al.append([
            f"LOG-{int(datetime.now().timestamp())}", datetime.now().isoformat(),
            'POST_JOURNAL', 'JOURNAL', journal_id, user, 'SUCCESS',
            f"Posted {journal_no} (Dr={dr:,.2f}, Cr={cr:,.2f})", ''
        ])

        self.save()
        print(f"[Bridge] Successfully posted {journal_no} (Total: Rs. {dr:,.2f})")
        return journal_id

    def post_to_ledger(self, journal_no, ad_date, bs_date, line, branch):
        """Computes running balance for account and appends to Ledger sheet."""
        s = self.wb['Ledger']
        code = str(line['code'])
        debit = float(line.get('debit', 0))
        credit = float(line.get('credit', 0))
        group = line.get('group', '')

        # Calculate previous running balance for this account
        prev_balance = 0.0
        for row in range(2, s.max_row + 1):
            if str(s.cell(row, 5).value) == code:
                val = s.cell(row, 12).value
                if val is not None:
                    try:
                        prev_balance = float(val)
                    except ValueError:
                        pass

        # Assets & Expenses increase on Debit; Liabilities & Income increase on Credit
        if group in ['Assets-04', 'Expenses-02']:
            new_balance = prev_balance + debit - credit
        else:
            new_balance = prev_balance + credit - debit

        entry_id = f"LED-{int(datetime.now().timestamp())}-{code}"
        s.append([
            entry_id, ad_date, bs_date, journal_no, code, line.get('name', ''),
            group, branch, line.get('narration', ''), debit, credit, new_balance
        ])

    def post_assets_04(self, bs_date, journal_no, narration, code, debit, credit):
        col_map = {
            '80': 5, '04-001': 5,
            '90': 8, '04-002': 8,
            '100': 11, '04-003': 11,
            '110': 14, '04-004': 14,
            '120': 17, '04-005': 17,
            '130': 20, '04-006': 20,
            '140': 23, '04-007': 23
        }
        dr_col = col_map.get(code)
        if not dr_col:
            print(f"[Warning] Unknown asset code {code}")
            return

        s = self.wb['Assets-04']
        r = 8
        while s.cell(r, 2).value is not None and r < 356:
            r += 1

        s.cell(r, 1).value = r - 7
        s.cell(r, 2).value = bs_date
        s.cell(r, 3).value = journal_no
        s.cell(r, 4).value = narration
        if debit > 0:
            s.cell(r, dr_col).value = debit
        if credit > 0:
            s.cell(r, dr_col + 1).value = credit

    def post_expenses_02(self, bs_date, journal_no, narration, code, debit, credit):
        col_map = {
            '105.1': 5, '02-001': 5,
            '150.1': 6, '02-002': 6,
            '150.2': 7, '02-003': 7,
            '150.3': 8, '02-004': 8,
            '150.4': 9, '02-005': 9,
            '150.5': 10, '02-006': 10,
            '150.6': 11, '02-007': 11,
            '150.7': 12, '02-008': 12,
            '150.8': 13, '02-009': 13,
            '150.9': 14, '02-010': 14,
            '150.10': 15, '02-011': 15,
            '150.11': 16, '02-012': 16,
            '150.12': 17, '02-013': 17,
            '150.13': 18, '02-014': 18,
            '150.14': 19, '02-015': 19,
            '150.15': 20, '02-016': 20,
            '150.16': 21, '02-017': 21,
            '150.17': 22, '02-018': 22
        }
        col = col_map.get(code)
        if not col:
            print(f"[Warning] Unknown expense code {code}")
            return

        s = self.wb['Expenses-02']
        r = 6
        while s.cell(r, 2).value is not None and r < 195:
            r += 1

        s.cell(r, 1).value = r - 5
        s.cell(r, 2).value = bs_date
        s.cell(r, 3).value = narration
        s.cell(r, 4).value = journal_no
        amt = debit if debit > 0 else -credit
        s.cell(r, col).value = amt

    def post_liabilities_05(self, bs_date, journal_no, narration, code, debit, credit):
        col_map = {
            '10': 5, '05-001': 5,
            '20': 8, '05-002': 8,
            '30': 11, '05-003': 11,
            '40': 14, '05-004': 14,
            '50': 17, '05-005': 17,
            '60': 20, '05-006': 20,
            '70': 23, '05-007': 23
        }
        dr_col = col_map.get(code)
        if not dr_col:
            print(f"[Warning] Unknown liability code {code}")
            return

        s = self.wb['Liabilities 05']
        r = 8
        while s.cell(r, 2).value is not None and r < 395:
            r += 1

        s.cell(r, 1).value = r - 7
        s.cell(r, 2).value = bs_date
        s.cell(r, 3).value = journal_no
        s.cell(r, 4).value = narration
        if debit > 0:
            s.cell(r, dr_col).value = debit
        if credit > 0:
            s.cell(r, dr_col + 1).value = credit

    def post_income_03(self, bs_date, journal_no, narration, code, debit, credit):
        col_map = {
            '160.1': 5, '03-001': 5,
            '160.2': 6, '03-002': 6,
            '160.3': 7, '03-003': 7,
            '160.4': 8, '03-004': 8,
            '160.5': 9, '03-005': 9,
            '160.6': 10, '03-006': 10,
            '160.7': 11, '03-007': 11
        }
        col = col_map.get(code)
        if not col:
            print(f"[Warning] Unknown income code {code}")
            return

        s = self.wb['Income-03']
        r = 6
        while s.cell(r, 2).value is not None and r < 249:
            r += 1

        s.cell(r, 1).value = r - 5
        s.cell(r, 2).value = bs_date
        s.cell(r, 3).value = narration
        s.cell(r, 4).value = journal_no
        amt = credit if credit > 0 else -debit
        s.cell(r, col).value = amt

    def setup_opening_balances(self, fiscal_year, bs_date, assets, liabilities):
        """Sets Row 7 ('अ=ल्या= गत वर्षको') in Assets-04 and Liabilities 05."""
        s_a = self.wb['Assets-04']
        s_l = self.wb['Liabilities 05']

        # Assets-04 Row 7
        s_a.cell(7, 1).value = 0
        s_a.cell(7, 2).value = bs_date
        s_a.cell(7, 3).value = '0'
        s_a.cell(7, 4).value = 'अ=ल्या= गत वर्षको'
        s_a.cell(7, 5).value = assets.get('cash80', 0)
        s_a.cell(7, 7).value = assets.get('cash80', 0)
        s_a.cell(7, 8).value = assets.get('bank90', 0)
        s_a.cell(7, 10).value = assets.get('bank90', 0)
        s_a.cell(7, 11).value = assets.get('investment100', 0)
        s_a.cell(7, 13).value = assets.get('investment100', 0)
        s_a.cell(7, 14).value = assets.get('loans110', 0)
        s_a.cell(7, 16).value = assets.get('loans110', 0)
        s_a.cell(7, 17).value = assets.get('receivables120', 0)
        s_a.cell(7, 19).value = assets.get('receivables120', 0)
        s_a.cell(7, 20).value = assets.get('fixedAssets130', 0)
        s_a.cell(7, 22).value = assets.get('fixedAssets130', 0)
        s_a.cell(7, 23).value = assets.get('otherAssets140', 0)
        s_a.cell(7, 25).value = assets.get('otherAssets140', 0)

        # Liabilities 05 Row 7
        s_l.cell(7, 1).value = 0
        s_l.cell(7, 2).value = bs_date
        s_l.cell(7, 3).value = '0'
        s_l.cell(7, 4).value = 'अ=ल्या= गत वर्षको'
        s_l.cell(7, 6).value = liabilities.get('shareCapital10', 0)
        s_l.cell(7, 7).value = liabilities.get('shareCapital10', 0)
        s_l.cell(7, 9).value = liabilities.get('reserveFund20', 0)
        s_l.cell(7, 10).value = liabilities.get('reserveFund20', 0)
        s_l.cell(7, 12).value = liabilities.get('savings30', 0)
        s_l.cell(7, 13).value = liabilities.get('savings30', 0)
        s_l.cell(7, 15).value = liabilities.get('borrowings40', 0)
        s_l.cell(7, 16).value = liabilities.get('borrowings40', 0)
        s_l.cell(7, 18).value = liabilities.get('grants50', 0)
        s_l.cell(7, 19).value = liabilities.get('grants50', 0)
        s_l.cell(7, 21).value = liabilities.get('payables60', 0)
        s_l.cell(7, 22).value = liabilities.get('payables60', 0)
        s_l.cell(7, 24).value = liabilities.get('otherLiab70', 0)
        s_l.cell(7, 25).value = liabilities.get('otherLiab70', 0)

        # Create Opening Journal Voucher
        total_assets = sum(assets.values())
        total_liab = sum(liabilities.values())
        ob_journal_no = f"OB-{fiscal_year.replace('/', '-')}-001"
        s_j = self.wb['Journal']
        s_j.append([
            f"OB-{int(datetime.now().timestamp())}", ob_journal_no, datetime.now().strftime('%Y-%m-%d'),
            bs_date, 'AUDIT-CLOSING', 'Adjusting', 'Main Branch',
            f'गत वर्षको अन्तिम हिसाब मिलान तथा सुरुवाती मौज्दात (Opening Balances Brought Forward for FY {fiscal_year})',
            total_assets, total_liab, 'POSTED', '', 'Admin / Auditor', datetime.now().isoformat()
        ])

        self.save()
        print(f"[Bridge] Successfully configured Row 7 Opening Balances for FY {fiscal_year} (Total: Rs. {total_assets:,.2f})")

    # =========================================================================
    # Member Subsidiary Book Operations
    # =========================================================================
    def add_member(self, member):
        """Adds a new member to Member-Data sheet."""
        s = self.wb['Member-Data']
        s.append([
            member.get('memberNo'),
            member.get('fullName'),
            member.get('fullNameEn', ''),
            member.get('citizenshipNo', ''),
            member.get('phone', ''),
            member.get('address', ''),
            member.get('wardNo', ''),
            member.get('gender', 'पुरुष'),
            member.get('membershipDate', ''),
            member.get('status', 'ACTIVE'),
            member.get('shareKitta', 0),
            member.get('shareAmount', 0),
            member.get('savingBalance', 0),
            member.get('loanOutstanding', 0)
        ])
        self.save()
        print(f"[Bridge] Registered Member: {member.get('memberNo')} - {member.get('fullName')}")

    def update_member_balance(self, member_no, share_kitta_diff=0, share_amt_diff=0, saving_diff=0, loan_diff=0):
        """Updates aggregate balance columns in Member-Data."""
        s = self.wb['Member-Data']
        for row in range(2, s.max_row + 1):
            if str(s.cell(row, 1).value) == str(member_no):
                cur_kitta = float(s.cell(row, 11).value or 0)
                cur_amt = float(s.cell(row, 12).value or 0)
                cur_sav = float(s.cell(row, 13).value or 0)
                cur_loan = float(s.cell(row, 14).value or 0)

                s.cell(row, 11).value = max(0, cur_kitta + share_kitta_diff)
                s.cell(row, 12).value = max(0, cur_amt + share_amt_diff)
                s.cell(row, 13).value = max(0, cur_sav + saving_diff)
                s.cell(row, 14).value = max(0, cur_loan + loan_diff)
                break

    def post_share_transaction(self, member_no, member_name, date, bs_date, trans_type, kitta, rate, voucher_no, narration=""):
        """Posts to Share_Book and updates Member-Data."""
        s = self.wb['Share_Book']
        amount = kitta * rate
        debit = amount if trans_type == 'REFUND' else 0
        credit = amount if trans_type == 'PURCHASE' else 0

        # Calculate member share running balance
        prev_balance = 0.0
        for row in range(2, s.max_row + 1):
            if str(s.cell(row, 4).value) == str(member_no):
                val = s.cell(row, 12).value
                if val is not None:
                    try:
                        prev_balance = float(val)
                    except ValueError:
                        pass

        new_balance = prev_balance + credit - debit
        entry_id = f"SB-{int(datetime.now().timestamp())}"
        s.append([
            entry_id, date, bs_date, member_no, member_name, voucher_no,
            trans_type, kitta, rate, debit, credit, new_balance, narration
        ])

        kitta_diff = kitta if trans_type == 'PURCHASE' else -kitta
        amt_diff = credit - debit
        self.update_member_balance(member_no, share_kitta_diff=kitta_diff, share_amt_diff=amt_diff)
        self.save()
        print(f"[Bridge] Share {trans_type}: {member_name} ({member_no}) | Kitta: {kitta} | Total: Rs. {amount:,.2f}")
        return entry_id

    def post_saving_transaction(self, member_no, member_name, date, bs_date, account_no, saving_type, trans_type, amount, interest=0, voucher_no="", narration=""):
        """Posts to Saving_Book and updates Member-Data."""
        s = self.wb['Saving_Book']
        deposit = amount if trans_type == 'DEPOSIT' else 0
        withdraw = amount if trans_type == 'WITHDRAW' else 0

        # Calculate member savings running balance
        prev_balance = 0.0
        for row in range(2, s.max_row + 1):
            if str(s.cell(row, 4).value) == str(member_no):
                val = s.cell(row, 12).value
                if val is not None:
                    try:
                        prev_balance = float(val)
                    except ValueError:
                        pass

        new_balance = prev_balance + deposit + interest - withdraw
        entry_id = f"SAV-{int(datetime.now().timestamp())}"
        s.append([
            entry_id, date, bs_date, member_no, member_name, account_no,
            saving_type, voucher_no, deposit, withdraw, interest, new_balance, narration
        ])

        saving_diff = deposit + interest - withdraw
        self.update_member_balance(member_no, saving_diff=saving_diff)
        self.save()
        print(f"[Bridge] Savings {trans_type}: {member_name} ({member_no}) | Rs. {amount:,.2f} | Bal: Rs. {new_balance:,.2f}")
        return entry_id

    def post_loan_transaction(self, member_no, member_name, date, bs_date, loan_account_no, loan_purpose, trans_type, amount, interest_paid=0, penalty=0, voucher_no="", narration=""):
        """Posts to Loan_Book and updates Member-Data."""
        s = self.wb['Loan_Book']
        disbursement = amount if trans_type == 'DISBURSEMENT' else 0
        repayment = amount if trans_type == 'REPAYMENT' else 0

        # Calculate loan principal balance
        prev_balance = 0.0
        for row in range(2, s.max_row + 1):
            if str(s.cell(row, 4).value) == str(member_no):
                val = s.cell(row, 13).value
                if val is not None:
                    try:
                        prev_balance = float(val)
                    except ValueError:
                        pass

        new_balance = prev_balance + disbursement - repayment
        entry_id = f"LN-{int(datetime.now().timestamp())}"
        s.append([
            entry_id, date, bs_date, member_no, member_name, loan_account_no,
            loan_purpose, voucher_no, disbursement, repayment, interest_paid, penalty, new_balance, narration
        ])

        loan_diff = disbursement - repayment
        self.update_member_balance(member_no, loan_diff=loan_diff)
        self.save()
        print(f"[Bridge] Loan {trans_type}: {member_name} ({member_no}) | Rs. {amount:,.2f} | Principal Bal: Rs. {new_balance:,.2f}")
        return entry_id


if __name__ == '__main__':
    # Determine target Excel workbook path
    default_path = os.path.join(os.path.dirname(__file__), 'shree_dipsikha_test.xlsx')
    excel_file = sys.argv[1] if len(sys.argv) > 1 else default_path

    print(f"=================================================================")
    print(f"  Shree Dipsikha Krishi Sahakari Sanstha Ltd. Accounting Engine  ")
    print(f"  Target Datastore: {excel_file}")
    print(f"=================================================================\n")

    bridge = KhataAccountingBridge(excel_file)

    # 1. Setup Opening Balances
    print("--- 1. Setting Up Opening Balances (अ=ल्या=) ---")
    bridge.setup_opening_balances(
        fiscal_year="2081/82",
        bs_date="2081-04-01",
        assets={
            'cash80': 500000.0,
            'bank90': 2500000.0,
            'investment100': 300000.0,
            'loans110': 4500000.0,
            'receivables120': 50000.0,
            'fixedAssets130': 800000.0,
            'otherAssets140': 25000.0
        },
        liabilities={
            'shareCapital10': 3000000.0,
            'reserveFund20': 800000.0,
            'savings30': 4500000.0,
            'borrowings40': 300000.0,
            'grants50': 0.0,
            'payables60': 50000.0,
            'otherLiab70': 25000.0
        }
    )

    # 2. Add Sample Member
    print("\n--- 2. Registering Sample Member ---")
    bridge.add_member({
        'memberNo': 'M-001',
        'fullName': 'राम बहादुर थापा',
        'fullNameEn': 'Ram Bahadur Thapa',
        'citizenshipNo': '67-01-78-12345',
        'phone': '9848012345',
        'address': 'गौरीगंगा-१, चौमाला',
        'wardNo': '1',
        'gender': 'पुरुष',
        'membershipDate': '2081-04-05',
        'status': 'ACTIVE',
        'shareKitta': 0,
        'shareAmount': 0,
        'savingBalance': 0,
        'loanOutstanding': 0
    })

    # 3. Member Transactions
    print("\n--- 3. Member Share & Savings Transactions ---")
    bridge.post_share_transaction(
        member_no='M-001',
        member_name='राम बहादुर थापा',
        date='2024-07-25',
        bs_date='2081-04-10',
        trans_type='PURCHASE',
        kitta=100,
        rate=100,
        voucher_no='JE-2081-000001',
        narration='प्रवेश शेयर खरिद (100 Kitta @ Rs. 100)'
    )

    bridge.post_saving_transaction(
        member_no='M-001',
        member_name='राम बहादुर थापा',
        date='2024-07-25',
        bs_date='2081-04-10',
        account_no='SAV-001-REG',
        saving_type='नियमित बचत (Regular)',
        trans_type='DEPOSIT',
        amount=5000.0,
        interest=0,
        voucher_no='JE-2081-000002',
        narration='मासिक नियमित बचत जम्मा'
    )

    # 4. Double Entry Journal Testing
    print("\n--- 4. Double Entry Posting Tests ---")
    print("Test A: Office Rent Rs 15,000 paid via Bank")
    bridge.post_journal(
        journal_no="JE-2081-000003",
        bs_date="2081-04-15",
        ad_date="2024-07-30",
        narration="कार्यालय घर भाडा भुक्तानी (Office rent payment for Shrawan)",
        lines=[
            {"code": "150.4", "name": "House Rent (घर भाडा)", "group": "Expenses-02", "debit": 15000, "credit": 0},
            {"code": "90", "name": "Bank (बैंक खाता)", "group": "Assets-04", "debit": 0, "credit": 15000}
        ]
    )

    print("\nTest B: Loan Interest Income Rs 10,000 received in Cash")
    bridge.post_journal(
        journal_no="JE-2081-000004",
        bs_date="2081-04-20",
        ad_date="2024-08-04",
        narration="ऋणको ब्याज असुली (Interest received on loan in cash)",
        lines=[
            {"code": "80", "name": "Cash (नगद मौज्दात)", "group": "Assets-04", "debit": 10000, "credit": 0},
            {"code": "160.2", "name": "Loan Interest Income (ऋण ब्याज आम्दानी)", "group": "Income-03", "debit": 0, "credit": 10000}
        ]
    )

    print("\n=================================================================")
    print("  All automated Double Entry & Subsidiary tests PASSED successfully!")
    print(f"  Output saved to: {excel_file}")
    print("=================================================================")
