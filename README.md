# Shree Dipsikha Krishi Sahakari Sanstha Ltd

## 4-Khata Accounting Web Application with Google Sheets as Primary Datastore

This application is a full-stack accounting web platform built for **श्री दीपशिखा कृषि सहकारी संस्था लि. (Shree Dipsikha Krishi Sahakari Sanstha Ltd., Gauriganga-1, Chaumala, Kailali)**. It uses **Google Sheets directly as its primary datastore and database**, automatically posting journal entries to the cooperative's standard 4-Khata sheets:

- **Assets-04** (सम्पत्ति हिसाब खाता) - Group Code: `04` (Normal Balance: **Debit**)
- **Expenses-02** (खर्च हिसाब खाता) - Group Code: `02` (Normal Balance: **Debit**)
- **Liabilities 05** (दायित्व हिसाब खाता) - Group Code: `05` (Normal Balance: **Credit**)
- **Income-03** (आम्दानी हिसाब खाता) - Group Code: `03` (Normal Balance: **Credit**)

---

## 1. System Architecture

```text
User (Web Browser)
       │
       ▼
Web Dashboard & Journal Entry Form (React / Next.js / Tailwind CSS)
       │ (JSON Payload / Idempotency Token)
       ▼
Backend & Validation Layer (Next.js Server API Routes)
       │ 1. Validate Debit == Credit
       │ 2. Idempotency Check (Prevent duplicate submission)
       │ 3. Determine Account Group & Column Mapping
       ▼
Google Sheets Service (googleSheetsService via Google Sheets API v4)
       │
       ├─► 1. Writes Journal Header to 'Journal' sheet
       ├─► 2. Writes Journal Lines to 'Journal_Lines' sheet
       ├─► 3. Auto-posts to Corresponding 4-Khata Sheet (Assets-04, Expenses-02, Liabilities 05, Income-03)
       ├─► 4. Appends to 'Ledger' sheet with updated running balance
       └─► 5. Records immutable audit entry in 'Audit_Log' sheet
       │
       ▼
Google Sheet (Source of Truth)
       │
       ▼
Dashboard & Reports (Live Aggregation & Controlled Server-side Cache)
```

---

## 2. 4-Khata Auto-Posting Rules

| Khata Sheet | Group Code | Normal Balance | Accounting Posting Action | Mapped Columns in Existing Sheet |
| :--- | :--- | :--- | :--- | :--- |
| **Assets-04** | `04` | **Debit** | Debit increases, Credit decreases | Col E/F/G (Cash 80), Col H/I/J (Bank 90), Col K/L/M (Investments 100), Col N/O/P (Loans to Members 110), Col Q/R/S (Receivables 120), Col T/U/V (Fixed Assets 130), Col W/X/Y (Other Assets 140) |
| **Expenses-02** | `02` | **Debit** | Debit increases, Credit decreases | Col E (105.1 Purchase), Col F (150.2 Freight/Wages), Col G (150.3 Salary), Col H (150.4 Rent), Col I (150.5 Stationery), Col J (150.6 Maintenance), Col K (150.7 Interest Paid), Col L (150.8 Misc), Col M (150.9 Taxes), Col N (150.10 Fuel), Col O (150.11 Meeting), Col P (150.12 Comm/Elec), Col Q (150.13 Transport), Col R (150.14 Food), Col S (150.15 Trade Discount), Col T (150.16 Membership), Col U (150.17 Utilities) |
| **Liabilities 05** | `05` | **Credit** | Credit increases, Debit decreases | Col E/F/G (Share Capital 10), Col H/I/J (Reserves 20), Col K/L/M (Member Savings 30), Col N/O/P (Borrowings 40), Col Q/R/S (Grants 50), Col T/U/V (Payables 60), Col W/X/Y (Other Payables 70) |
| **Income-03** | `03` | **Credit** | Credit increases, Debit decreases | Col E (160.1 Sales), Col F (160.2 Loan Interest), Col G (160.3 Investment Interest), Col H (160.4 Misc Income), Col I (160.5 Admission Fees), Col J (160.6 Discount Received), Col K (160.7 Admin Grants) |

---

## 3. Application Routes

- `/accounting`: Executive Dashboard displaying live balances for Assets-04, Expenses-02, Liabilities 05, and Income-03, double-entry equality check ($Assets + Expenses = Liabilities + Income$), today's transactions, and recent journals.
- `/accounting/journal-entry`: Double-entry journal voucher form with Bikram Sambat (BS) date support, live Debit/Credit balancing validator, auto-populated account group and normal balance, draft saving, and real-time 4-Khata posting impact preview.
- `/accounting/journal-register`: Complete journal register with search by voucher number, narration, or date range, status filters (`POSTED`, `REVERSED`), and actions for voucher view, print, and reversal.
- `/accounting/journal/[id]`: Detailed view of a posted voucher, including lines, ledger impact breakdown, and a printable double-entry voucher with signatures (*Prepared By*, *Checked By*, *Approved By*).
- `/accounting/ledger`: General Ledger inquiry tool with filters by Account, Group, Date Range, and Branch, calculating running balances.
- `/accounting/sheets-status`: Live inspector displaying the structure and column mappings of the 4-Khata and relational sheets in Google Sheets.

---

## 4. Google Sheets API Configuration

1. Enable the **Google Sheets API** and **Google Drive API** in your Google Cloud Console project.
2. Create a Service Account (e.g., `accounting-sa@your-gcp-project.iam.gserviceaccount.com`).
3. Generate a JSON private key for the Service Account.
4. Open the Google Sheet and click **Share**, then add the Service Account email with **Editor** permissions.
5. Create a `.env.local` file with the following variables:

```bash
GOOGLE_SHEET_ID=1Oc4fDm5LuMDv-_IPvbbNljM5do-syZtl
GOOGLE_SERVICE_ACCOUNT_EMAIL=accounting-sa@your-gcp-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

---

## 5. Development & Execution

```bash
# Install dependencies
npm install

# Start Next.js Development Server
npm run dev

# Open http://localhost:3000/accounting in your browser
```

### Python Sync Engine

An automated synchronization bridge is also available under `scripts/accounting_sync.py`:

```bash
python3 scripts/accounting_sync.py
```
