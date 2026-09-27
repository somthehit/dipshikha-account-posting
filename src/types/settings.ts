export interface OrganizationProfile {
  nameNp: string;
  nameEn: string;
  addressNp: string;
  addressEn: string;
  panNo: string;
  registrationNo: string;
  contactNo: string;
  email: string;
  activeFiscalYear: string;
  affiliatedUnion?: string;
  logoUrl?: string;
}

export interface AccountingSettings {
  defaultCashAccountCode: string;
  defaultBankAccountCode: string;
  allowNegativeCash: boolean;
  strictFiscalYearLock: boolean;
  autoSyncGoogleSheets: boolean;
}
