import { AccountMaster, AccountGroup } from '../types/accounting';

export const DEFAULT_ACCOUNTS: AccountMaster[] = [
  // ==========================================
  // ASSETS-04 (Group code: 04, Normal: DEBIT)
  // Maps to sheet 'Assets-04'
  // ==========================================
  {
    code: '80',
    name: 'Cash in Hand (नगद मौज्दात)',
    nameEn: 'Cash in Hand',
    nameNp: 'नगद मौज्दात',
    group: 'Assets-04',
    groupCode: '04',
    normalBalance: 'DEBIT',
    category: 'Current Assets',
    subcategory: 'Cash',
    khataColumnRef: {
      sheetName: 'Assets-04',
      colIndex: 5, // Col E (Dr), Col F (Cr), Col G (Balance)
      colLetter: 'E',
      headerName: 'नगद ८०',
      subColType: 'DEBIT',
    },
  },
  {
    code: '90',
    name: 'Cash at Bank (बैंक मौज्दात)',
    nameEn: 'Cash at Bank',
    nameNp: 'बैंक मौज्दात',
    group: 'Assets-04',
    groupCode: '04',
    normalBalance: 'DEBIT',
    category: 'Current Assets',
    subcategory: 'Bank Accounts',
    khataColumnRef: {
      sheetName: 'Assets-04',
      colIndex: 8, // Col H (Dr), Col I (Cr), Col J (Balance)
      colLetter: 'H',
      headerName: 'बैंक (९०)',
      subColType: 'DEBIT',
    },
  },
  {
    code: '100',
    name: 'Investments (लगानी हिसाब)',
    nameEn: 'Investments',
    nameNp: 'लगानी हिसाब',
    group: 'Assets-04',
    groupCode: '04',
    normalBalance: 'DEBIT',
    category: 'Investments',
    subcategory: 'Cooperative Shares / Fixed Deposits',
    khataColumnRef: {
      sheetName: 'Assets-04',
      colIndex: 11, // Col K (Dr), Col L (Cr), Col M (Balance)
      colLetter: 'K',
      headerName: 'लगानी (१००)',
      subColType: 'DEBIT',
    },
  },
  {
    code: '110',
    name: 'Loans & Advances to Members (सदस्यहरूलाई ऋण लगानी)',
    nameEn: 'Loans to Members',
    nameNp: 'सदस्यहरूलाई ऋण लगानी',
    group: 'Assets-04',
    groupCode: '04',
    normalBalance: 'DEBIT',
    category: 'Loans & Advances',
    subcategory: 'Member Loan Portfolio',
    khataColumnRef: {
      sheetName: 'Assets-04',
      colIndex: 14, // Col N (Dr), Col O (Cr), Col P (Balance)
      colLetter: 'N',
      headerName: 'ऋण दिएको हिसाब (११०)',
      subColType: 'DEBIT',
    },
  },
  {
    code: '120',
    name: 'Receivables & Advances (पाउनुपर्ने हिसाब)',
    nameEn: 'Receivables & Advances',
    nameNp: 'पाउनुपर्ने हिसाब',
    group: 'Assets-04',
    groupCode: '04',
    normalBalance: 'DEBIT',
    category: 'Current Assets',
    subcategory: 'Sundry Debtors & Advances',
    khataColumnRef: {
      sheetName: 'Assets-04',
      colIndex: 17, // Col Q (Dr), Col R (Cr), Col S (Balance)
      colLetter: 'Q',
      headerName: 'पाउनुपर्ने (१२०)',
      subColType: 'DEBIT',
    },
  },
  {
    code: '130',
    name: 'Fixed Assets (स्थिर सम्पत्ति)',
    nameEn: 'Fixed Assets',
    nameNp: 'स्थिर सम्पत्ति',
    group: 'Assets-04',
    groupCode: '04',
    normalBalance: 'DEBIT',
    category: 'Property & Equipment',
    subcategory: 'Office Furniture, Computers, Buildings',
    khataColumnRef: {
      sheetName: 'Assets-04',
      colIndex: 20, // Col T (Dr), Col U (Cr), Col V (Balance)
      colLetter: 'T',
      headerName: 'सम्पत्ति (१३०)',
      subColType: 'DEBIT',
    },
  },
  {
    code: '140',
    name: 'Other Assets (अन्य सम्पत्ति हिसाब)',
    nameEn: 'Other Assets',
    nameNp: 'अन्य सम्पत्ति हिसाब',
    group: 'Assets-04',
    groupCode: '04',
    normalBalance: 'DEBIT',
    category: 'Other Assets',
    subcategory: 'Prepayments & Deposits',
    khataColumnRef: {
      sheetName: 'Assets-04',
      colIndex: 23, // Col W (Dr), Col X (Cr), Col Y (Balance)
      colLetter: 'W',
      headerName: 'अन्य सम्पत्ति (१४०)',
      subColType: 'DEBIT',
    },
  },

  // ==========================================
  // LIABILITIES-05 (Group code: 05, Normal: CREDIT)
  // Maps to sheet 'Liabilities 05'
  // ==========================================
  {
    code: '10',
    name: 'Share Capital (शेयर पूँजी खाता)',
    nameEn: 'Share Capital',
    nameNp: 'शेयर पूँजी खाता',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Member Equity',
    subcategory: 'Core Share Capital',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 5, // Col E (Dr), Col F (Cr), Col G (Balance)
      colLetter: 'E',
      headerName: 'शेयर (१०)',
      subColType: 'CREDIT',
    },
  },
  {
    code: '20',
    name: 'Reserve & Statutory Funds (जगेडा कोष खाता)',
    nameEn: 'Reserve & Statutory Funds',
    nameNp: 'जगेडा कोष खाता',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Reserves',
    subcategory: 'General Reserve & Cooperative Funds',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 8, // Col H (Dr), Col I (Cr), Col J (Balance)
      colLetter: 'H',
      headerName: 'कोष (२०)',
      subColType: 'CREDIT',
    },
  },
  {
    code: '20.1',
    name: 'General Reserve Fund (साधारण जगेडा कोष २०.१ - कम्तीमा २५%)',
    nameEn: 'General Reserve Fund',
    nameNp: 'साधारण जगेडा कोष २०.१',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Reserves',
    subcategory: 'Statutory Reserve (Min 25%)',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 8,
      colLetter: 'H',
      headerName: 'कोष (२०)',
      subColType: 'CREDIT',
    },
  },
  {
    code: '20.2',
    name: 'Capital Return Reserve Fund (संरक्षित पूँजी फिर्ता कोष २०.२ - कम्तीमा २५%)',
    nameEn: 'Capital Return Reserve Fund',
    nameNp: 'संरक्षित पूँजी फिर्ता कोष २०.२',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Reserves',
    subcategory: 'Patronage Refund / Capital Return (Min 25%)',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 8,
      colLetter: 'H',
      headerName: 'कोष (२०)',
      subColType: 'CREDIT',
    },
  },
  {
    code: '20.3',
    name: 'Cooperative Education Fund (सहकारी शिक्षा कोष २०.३)',
    nameEn: 'Cooperative Education Fund',
    nameNp: 'सहकारी शिक्षा कोष २०.३',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Reserves',
    subcategory: 'Education & Training Fund',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 8,
      colLetter: 'H',
      headerName: 'कोष (२०)',
      subColType: 'CREDIT',
    },
  },
  {
    code: '20.4',
    name: 'Employee Bonus & Welfare Fund (कर्मचारी बोनस तथा कल्याणकारी कोष २०.४)',
    nameEn: 'Employee Bonus & Welfare Fund',
    nameNp: 'कर्मचारी बोनस तथा कल्याणकारी कोष २०.४',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Reserves',
    subcategory: 'Staff Bonus & Welfare',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 8,
      colLetter: 'H',
      headerName: 'कोष (२०)',
      subColType: 'CREDIT',
    },
  },
  {
    code: '20.5',
    name: 'Share Dividend Equalization Fund (शेयर लाभांश कोष २०.५ - बढीमा १८%)',
    nameEn: 'Share Dividend Equalization Fund',
    nameNp: 'शेयर लाभांश कोष २०.५',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Reserves',
    subcategory: 'Dividend Equalization (Max 18%)',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 8,
      colLetter: 'H',
      headerName: 'कोष (२०)',
      subColType: 'CREDIT',
    },
  },
  {
    code: '20.6',
    name: 'Cooperative Promotion & Community Fund (सहकारी प्रवर्द्धन तथा समुदाय विकास कोष २०.६)',
    nameEn: 'Cooperative Promotion & Community Fund',
    nameNp: 'सहकारी प्रवर्द्धन तथा समुदाय विकास कोष २०.६',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Reserves',
    subcategory: 'Promotion & Development Fund',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 8,
      colLetter: 'H',
      headerName: 'कोष (२०)',
      subColType: 'CREDIT',
    },
  },
  {
    code: '30',
    name: 'Member Savings & Deposits (बचत तथा निक्षेप हिसाब)',
    nameEn: 'Member Savings & Deposits',
    nameNp: 'बचत तथा निक्षेप हिसाब',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Deposits',
    subcategory: 'Voluntary & Compulsory Savings',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 11, // Col K (Dr), Col L (Cr), Col M (Balance)
      colLetter: 'K',
      headerName: 'बचत (३०)',
      subColType: 'CREDIT',
    },
  },
  {
    code: '40',
    name: 'Borrowings & Loans Payable (लिएको ऋण / सापट खाता)',
    nameEn: 'Borrowings & Loans Payable',
    nameNp: 'लिएको ऋण / सापट खाता',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Borrowings',
    subcategory: 'Bank Borrowings / Inter-cooperative Loans',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 14, // Col N (Dr), Col O (Cr), Col P (Balance)
      colLetter: 'N',
      headerName: 'कर्जा लिएको (४०)',
      subColType: 'CREDIT',
    },
  },
  {
    code: '50',
    name: 'Grants & Subsidies (पूँजीगत अनुदान हिसाब)',
    nameEn: 'Grants & Subsidies',
    nameNp: 'पूँजीगत अनुदान हिसाब',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Grants',
    subcategory: 'Government & Partner Subsidies',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 17, // Col Q (Dr), Col R (Cr), Col S (Balance)
      colLetter: 'Q',
      headerName: 'अनुदान (५०)',
      subColType: 'CREDIT',
    },
  },
  {
    code: '60',
    name: 'Sundry Creditors & Payables (भुक्तानी दिनुपर्ने दायित्व)',
    nameEn: 'Sundry Creditors & Payables',
    nameNp: 'भुक्तानी दिनुपर्ने दायित्व',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Current Liabilities',
    subcategory: 'Bills Payable & Accounts Payable',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 20, // Col T (Dr), Col U (Cr), Col V (Balance)
      colLetter: 'T',
      headerName: 'भुक्तानी दिनुपर्ने (६०)',
      subColType: 'CREDIT',
    },
  },
  {
    code: '70',
    name: 'Other Liabilities (अन्य भुक्तानी दायित्व)',
    nameEn: 'Other Liabilities',
    nameNp: 'अन्य भुक्तानी दायित्व',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Current Liabilities',
    subcategory: 'Accrued Expenses & Provisions',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 23, // Col W (Dr), Col X (Cr), Col Y (Balance)
      colLetter: 'W',
      headerName: 'अन्य भुक्तानी दिनुपर्ने (७०)',
      subColType: 'CREDIT',
    },
  },
  {
    code: '25',
    name: 'Retained Earnings & Accumulated Surplus (संचित बचत/मुनाफा खाता २५)',
    nameEn: 'Retained Earnings & Accumulated Surplus',
    nameNp: 'संचित बचत/मुनाफा खाता २५',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Reserves & Surplus',
    subcategory: 'Accumulated Profit / Loss',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 8,
      colLetter: 'H',
      headerName: 'कोष (२०)',
      subColType: 'CREDIT',
    },
  },
  {
    code: '3900',
    name: 'Profit & Loss / Income Summary Closing (नाफा-नोक्सान हिसाब मिलान ३९००)',
    nameEn: 'Profit & Loss / Income Summary Closing',
    nameNp: 'नाफा-नोक्सान हिसाब मिलान ३९००',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Closing Accounts',
    subcategory: 'Year-End P&L Summary',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 8,
      colLetter: 'H',
      headerName: 'कोष (२०)',
      subColType: 'CREDIT',
    },
  },
  {
    code: '9999',
    name: 'Suspense & Year-End Discrepancy Adjustment (हिसाब मिलान तथा सस्पेन्स खाता ९९९९)',
    nameEn: 'Suspense & Year-End Discrepancy Adjustment',
    nameNp: 'हिसाब मिलान तथा सस्पेन्स खाता ९९९९',
    group: 'Liabilities 05',
    groupCode: '05',
    normalBalance: 'CREDIT',
    category: 'Adjustment Accounts',
    subcategory: 'Year-End Discrepancy / Suspense',
    khataColumnRef: {
      sheetName: 'Liabilities 05',
      colIndex: 23,
      colLetter: 'W',
      headerName: 'अन्य भुक्तानी दिनुपर्ने (७०)',
      subColType: 'CREDIT',
    },
  },

  // ==========================================
  // EXPENSES-02 (Group code: 02, Normal: DEBIT)
  // Maps to sheet 'Expenses-02'
  // ==========================================
  {
    code: '105.1',
    name: 'Purchase of Goods (सामान खरिद १०५=१)',
    nameEn: 'Purchase of Goods',
    nameNp: 'सामान खरिद १०५=१',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Operating Expenses',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 5,
      colLetter: 'E',
      headerName: 'सामान खरिद १०५=१',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.2',
    name: 'Freight & Wages (ढुवानी तथा ज्याला १५०=२)',
    nameEn: 'Freight & Wages',
    nameNp: 'ढुवानी तथा ज्याला १५०=२',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Operating Expenses',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 6,
      colLetter: 'F',
      headerName: 'ढुवानी तथा ज्याला १५०=२',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.3',
    name: 'Salaries & Allowances (तलब तथा भत्ता १५०=३)',
    nameEn: 'Salaries & Allowances',
    nameNp: 'तलब तथा भत्ता १५०=३',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Operating Expenses',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 7,
      colLetter: 'G',
      headerName: 'तलब तथा भत्ता १५०=३',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.4',
    name: 'Office Rent (घर गोदाम भाडा १५०=४)',
    nameEn: 'Office Rent',
    nameNp: 'घर गोदाम भाडा १५०=४',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Administrative Expenses',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 8,
      colLetter: 'H',
      headerName: 'घर गोदाम भाडा १५०=४',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.5',
    name: 'Stationery & Office Supplies (मसलन्द तथा स्टेशनरी १५०=५)',
    nameEn: 'Stationery & Office Supplies',
    nameNp: 'मसलन्द तथा स्टेशनरी १५०=५',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Administrative Expenses',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 9,
      colLetter: 'I',
      headerName: 'मसलन्द तथा स्टेशनरी १५०=५',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.6',
    name: 'Maintenance & Repairs (मर्मत १५०=६)',
    nameEn: 'Maintenance & Repairs',
    nameNp: 'मर्मत १५०=६',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Administrative Expenses',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 10,
      colLetter: 'J',
      headerName: 'मर्मत १५०=६',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.7',
    name: 'Interest Paid on Borrowings (तिरेको ब्याज १५०=७)',
    nameEn: 'Interest Paid on Borrowings',
    nameNp: 'तिरेको ब्याज १५०=७',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Financial Expenses',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 11,
      colLetter: 'K',
      headerName: 'तिरेको ब्याज १५०=७',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.8',
    name: 'Miscellaneous Expenses (विविध खर्च १५०=८)',
    nameEn: 'Miscellaneous Expenses',
    nameNp: 'विविध खर्च १५०=८',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Administrative Expenses',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 12,
      colLetter: 'L',
      headerName: 'विविध खर्च १५०=८',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.9',
    name: 'Taxes Paid (तिरेको कर १५०=९)',
    nameEn: 'Taxes Paid',
    nameNp: 'तिरेको कर १५०=९',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Statutory Taxes',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 13,
      colLetter: 'M',
      headerName: 'तिरेको कर १५०=९',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.10',
    name: 'Fuel Expenses (इन्धन खर्च १५०=१०)',
    nameEn: 'Fuel Expenses',
    nameNp: 'इन्धन खर्च १५०=१०',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Operational Expenses',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 14,
      colLetter: 'N',
      headerName: 'इन्धन खर्च १५०=१०',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.11',
    name: 'Meeting Allowances (बैठक भत्ता १५०=११)',
    nameEn: 'Meeting Allowances',
    nameNp: 'बैठक भत्ता १५०=११',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Governance & Board',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 15,
      colLetter: 'O',
      headerName: 'बैठक भत्ता १५०=११',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.12',
    name: 'Communication & Electricity (सञ्चार तथा विद्युत खर्च १५०=१२)',
    nameEn: 'Communication & Electricity',
    nameNp: 'सञ्चार तथा विद्युत खर्च १५०=१२',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Utilities',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 16,
      colLetter: 'P',
      headerName: 'सञ्चार तथा विद्युत खर्च १५०=१२',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.13',
    name: 'Transportation Expenses (यातायात खर्च १५०=१३)',
    nameEn: 'Transportation Expenses',
    nameNp: 'यातायात खर्च १५०=१३',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Operational Expenses',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 17,
      colLetter: 'Q',
      headerName: 'यातायात खर्च १५०=१३',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.14',
    name: 'Food & Refreshments (खाना तथा नास्ता १५०=१४)',
    nameEn: 'Food & Refreshments',
    nameNp: 'खाना तथा नास्ता १५०=१४',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Operational Expenses',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 18,
      colLetter: 'R',
      headerName: 'खाना तथा नास्ता १५०=१४',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.15',
    name: 'Trade Discount Allowed (व्यापारिक छुट दिएको 150=15)',
    nameEn: 'Trade Discount Allowed',
    nameNp: 'व्यापारिक छुट दिएको 150=15',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Financial Discounts',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 19,
      colLetter: 'S',
      headerName: 'व्यापारिक छुट दिएको 150=15',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.16',
    name: 'Membership Fee Expense (सदस्यता शुल्क खर्च 150=16)',
    nameEn: 'Membership Fee Expense',
    nameNp: 'सदस्यता शुल्क खर्च 150=16',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Statutory / Association Fees',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 20,
      colLetter: 'T',
      headerName: 'सदस्यता शुल्क खर्च 150=16',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.17',
    name: 'Electricity & Utilities (विद्युत तथा सञ्चार खर्च १५०=१7)',
    nameEn: 'Electricity & Utilities',
    nameNp: 'विद्युत तथा सञ्चार खर्च १५०=१7',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Utilities',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 21,
      colLetter: 'U',
      headerName: 'विद्युत तथा सञ्चार खर्च १५०=१7',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '150.18',
    name: 'Depreciation Expense (स्थिर सम्पत्ति ह्रासकट्टी खर्च १५०=१८)',
    nameEn: 'Depreciation Expense',
    nameNp: 'स्थिर सम्पत्ति ह्रासकट्टी खर्च १५०=१८',
    group: 'Expenses-02',
    groupCode: '02',
    normalBalance: 'DEBIT',
    category: 'Depreciation & Amortization',
    khataColumnRef: {
      sheetName: 'Expenses-02',
      colIndex: 22,
      colLetter: 'V',
      headerName: 'ह्रासकट्टी खर्च १५०=१८',
      subColType: 'AMOUNT',
    },
  },

  // ==========================================
  // INCOME-03 (Group code: 03, Normal: CREDIT)
  // Maps to sheet 'Income-03'
  // ==========================================
  {
    code: '160.1',
    name: 'Sale of Goods (सामान बिक्री १६०=१)',
    nameEn: 'Sale of Goods',
    nameNp: 'सामान बिक्री १६०=१',
    group: 'Income-03',
    groupCode: '03',
    normalBalance: 'CREDIT',
    category: 'Trading Revenue',
    khataColumnRef: {
      sheetName: 'Income-03',
      colIndex: 5,
      colLetter: 'E',
      headerName: 'सामान बिक्री १६०=१',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '160.2',
    name: 'Interest Income from Loans (कर्जाबाट ब्याज १६०=२)',
    nameEn: 'Interest Income from Loans',
    nameNp: 'कर्जाबाट ब्याज १६०=२',
    group: 'Income-03',
    groupCode: '03',
    normalBalance: 'CREDIT',
    category: 'Financial Revenue',
    khataColumnRef: {
      sheetName: 'Income-03',
      colIndex: 6,
      colLetter: 'F',
      headerName: 'कर्जाबाट ब्याज १६०=२',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '160.3',
    name: 'Interest on Investments (लगानीबाट ब्याज प्राप्त १६०=३)',
    nameEn: 'Interest on Investments',
    nameNp: 'लगानीबाट ब्याज प्राप्त १६०=३',
    group: 'Income-03',
    groupCode: '03',
    normalBalance: 'CREDIT',
    category: 'Financial Revenue',
    khataColumnRef: {
      sheetName: 'Income-03',
      colIndex: 7,
      colLetter: 'G',
      headerName: 'लगानीबाट ब्याज प्राप्त १६०=३',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '160.4',
    name: 'Miscellaneous Income (विविध आम्दानी १६०=४)',
    nameEn: 'Miscellaneous Income',
    nameNp: 'विविध आम्दानी १६०=४',
    group: 'Income-03',
    groupCode: '03',
    normalBalance: 'CREDIT',
    category: 'Other Operating Income',
    khataColumnRef: {
      sheetName: 'Income-03',
      colIndex: 8,
      colLetter: 'H',
      headerName: 'विविध आम्दानी १६०=४',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '160.5',
    name: 'Membership & Admission Fees (प्रवेश शुल्क १६०=५)',
    nameEn: 'Membership & Admission Fees',
    nameNp: 'प्रवेश शुल्क १६०=५',
    group: 'Income-03',
    groupCode: '03',
    normalBalance: 'CREDIT',
    category: 'Member Fees',
    khataColumnRef: {
      sheetName: 'Income-03',
      colIndex: 9,
      colLetter: 'I',
      headerName: 'प्रवेश शुल्क १६०=५',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '160.6',
    name: 'Trade Discount Received (व्यापारिक छुट प्राप्त १६०=६)',
    nameEn: 'Trade Discount Received',
    nameNp: 'व्यापारिक छुट प्राप्त १६०=६',
    group: 'Income-03',
    groupCode: '03',
    normalBalance: 'CREDIT',
    category: 'Financial Discounts',
    khataColumnRef: {
      sheetName: 'Income-03',
      colIndex: 10,
      colLetter: 'J',
      headerName: 'व्यापारिक छुट प्राप्त १६०=६',
      subColType: 'AMOUNT',
    },
  },
  {
    code: '160.7',
    name: 'Administrative Grants (प्रशासनिक अनुदान प्राप्त १६०=७)',
    nameEn: 'Administrative Grants',
    nameNp: 'प्रशासनिक अनुदान प्राप्त १६०=७',
    group: 'Income-03',
    groupCode: '03',
    normalBalance: 'CREDIT',
    category: 'Grants & Subsidies',
    khataColumnRef: {
      sheetName: 'Income-03',
      colIndex: 11,
      colLetter: 'K',
      headerName: 'प्रशासनिक अनुदान प्राप्त १६०=७',
      subColType: 'AMOUNT',
    },
  },
];

export function findAccountByCode(code: string): AccountMaster | undefined {
  return DEFAULT_ACCOUNTS.find(
    (a) => a.code.toLowerCase() === code.trim().toLowerCase()
  );
}

export function searchAccounts(query: string): AccountMaster[] {
  if (!query) return DEFAULT_ACCOUNTS;
  const q = query.toLowerCase().trim();
  return DEFAULT_ACCOUNTS.filter(
    (a) =>
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.nameEn.toLowerCase().includes(q) ||
      a.nameNp.toLowerCase().includes(q) ||
      a.group.toLowerCase().includes(q)
  );
}

export function getGroupCode(group: AccountGroup): '04' | '02' | '05' | '03' {
  switch (group) {
    case 'Assets-04':
      return '04';
    case 'Expenses-02':
      return '02';
    case 'Liabilities 05':
      return '05';
    case 'Income-03':
      return '03';
  }
}

export function registerAccount(account: AccountMaster): AccountMaster {
  const existing = findAccountByCode(account.code);
  if (existing) {
    Object.assign(existing, account);
    return existing;
  }
  DEFAULT_ACCOUNTS.push(account);
  return account;
}

export function getClosingAccounts(): AccountMaster[] {
  return DEFAULT_ACCOUNTS.filter(
    (a) =>
      a.code === '20' ||
      a.code === '25' ||
      a.code === '3900' ||
      a.code === '9999' ||
      a.category?.includes('Reserve') ||
      a.category?.includes('Closing') ||
      a.category?.includes('Adjustment')
  );
}

