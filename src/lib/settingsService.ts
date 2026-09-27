import { OrganizationProfile, AccountingSettings } from '../types/settings';

export const DEFAULT_ORG_PROFILE: OrganizationProfile = {
  nameNp: process.env.NEXT_PUBLIC_ORG_NAME || 'श्री दीपशिखा कृषि सहकारी संस्था लि.',
  nameEn: 'Shree Dipshikha Agricultural Cooperative Ltd.',
  addressNp: process.env.NEXT_PUBLIC_ORG_ADDRESS || 'गौरीगंगा नगरपालिका-१, चौमाला, कैलाली',
  addressEn: 'Gauriganga-1, Chaumala, Kailali',
  panNo: '601234567',
  registrationNo: '123/065/066',
  contactNo: '+977-91-540000',
  email: 'dipshikha.coop@gmail.com',
  activeFiscalYear: process.env.NEXT_PUBLIC_FISCAL_YEAR || '2083/84',
  affiliatedUnion: 'जिल्ला सहकारी संघ, कैलाली',
};

export const DEFAULT_ACCOUNTING_SETTINGS: AccountingSettings = {
  defaultCashAccountCode: '04-001',
  defaultBankAccountCode: '04-002',
  allowNegativeCash: false,
  strictFiscalYearLock: true,
  autoSyncGoogleSheets: true,
};

let currentProfile: OrganizationProfile = { ...DEFAULT_ORG_PROFILE };
let currentAccountingSettings: AccountingSettings = { ...DEFAULT_ACCOUNTING_SETTINGS };

export const settingsService = {
  getOrganizationProfile(): OrganizationProfile {
    return { ...currentProfile };
  },

  updateOrganizationProfile(update: Partial<OrganizationProfile>): OrganizationProfile {
    currentProfile = {
      ...currentProfile,
      ...update,
    };
    return { ...currentProfile };
  },

  getAccountingSettings(): AccountingSettings {
    return { ...currentAccountingSettings };
  },

  updateAccountingSettings(update: Partial<AccountingSettings>): AccountingSettings {
    currentAccountingSettings = {
      ...currentAccountingSettings,
      ...update,
    };
    return { ...currentAccountingSettings };
  },
};

export { currentProfile, currentAccountingSettings };
