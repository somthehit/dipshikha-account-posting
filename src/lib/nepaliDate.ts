/**
 * Bikram Sambat (BS) date utility for Nepali Accounting
 * Handles BS/AD calculations and formatting.
 */

// Nepali calendar month days for common years around 2080-2085 BS
const BS_MONTH_DAYS: { [year: number]: number[] } = {
  2080: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2083: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
};

// Reference point: 2080-01-01 BS = 2023-04-14 AD
const REF_BS_YEAR = 2080;
const REF_BS_MONTH = 1;
const REF_BS_DAY = 1;
const REF_AD_DATE = new Date(2023, 3, 14); // month is 0-indexed in JS

export function convertADtoBS(adDate: Date | string): string {
  const target = typeof adDate === 'string' ? new Date(adDate) : adDate;
  if (isNaN(target.getTime())) return '';

  let diffDays = Math.floor((target.getTime() - REF_AD_DATE.getTime()) / (1000 * 60 * 60 * 24));

  let bsYear = REF_BS_YEAR;
  let bsMonth = REF_BS_MONTH;
  let bsDay = REF_BS_DAY + diffDays;

  while (true) {
    const daysInYear = (BS_MONTH_DAYS[bsYear] || [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30]).reduce(
      (a, b) => a + b,
      0
    );
    if (bsDay > daysInYear) {
      bsDay -= daysInYear;
      bsYear++;
    } else if (bsDay <= 0) {
      bsYear--;
      const prevYearDays = (BS_MONTH_DAYS[bsYear] || [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30]).reduce(
        (a, b) => a + b,
        0
      );
      bsDay += prevYearDays;
    } else {
      break;
    }
  }

  const months = BS_MONTH_DAYS[bsYear] || [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30];
  bsMonth = 1;
  for (let i = 0; i < 12; i++) {
    if (bsDay > months[i]) {
      bsDay -= months[i];
      bsMonth++;
    } else {
      break;
    }
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${bsYear}-${pad(bsMonth)}-${pad(bsDay)}`;
}

export function getCurrentBSDate(): string {
  return convertADtoBS(new Date());
}

export function getFiscalYear(bsDateStr: string): string {
  // Nepali FY runs from Shrawan 1 (approx mid-July) to Ashadh end (approx mid-July next year)
  // Month 4 (Shrawan) starts the new fiscal year
  const parts = bsDateStr.split('-');
  if (parts.length < 2) return '2083/084';
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  if (month >= 4) {
    const nextYear = (year + 1).toString().slice(-2);
    return `${year}/${nextYear}`;
  } else {
    const prevYear = year - 1;
    const currentYearShort = year.toString().slice(-2);
    return `${prevYear}/${currentYearShort}`;
  }
}

export function formatCurrencyNPR(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rs. 0.00';
  return 'Rs. ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Converts potential Excel/Google Sheets serial date numbers (e.g. 46291 -> 2026-09-26, 67002 -> 2083-06-10)
 * or slash formatted dates (6/10/2083 -> 2083-06-10) into standard YYYY-MM-DD string.
 */
export function formatAccountingDate(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  const str = String(val).trim();

  // If already standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // If YYYY/MM/DD
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(str)) {
    const [y, m, d] = str.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // If M/D/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [m, d, y] = str.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // If numeric Excel serial date (e.g. 46291 -> 2026-09-26, 67002 -> 2083-06-10)
  const num = Number(str);
  if (!isNaN(num) && num > 20000 && num < 100000) {
    const utc_days = Math.floor(num - 25569);
    const utc_value = utc_days * 86400;
    const d = new Date(utc_value * 1000);
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return str;
}

